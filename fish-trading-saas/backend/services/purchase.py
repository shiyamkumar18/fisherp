"""
Purchase Service
================
Handles the full purchase lifecycle:
  - Input validation (qty, price, supplier)
  - Atomic batch + inventory creation per line-item
  - Supplier ledger update (outstanding / total_purchases)
  - Price-trend analytics
  - Duplicate-entry guard
  - Full audit-trail via AuditLog

Design decisions
----------------
* All public methods are ``@staticmethod`` so callers never need to
  instantiate the service – consistent with the rest of this codebase.
* ``create_purchase`` is wrapped in ``@transaction.atomic`` so every
  sub-operation either fully succeeds or rolls back as a unit.
* Custom exceptions (``PurchaseValidationError``, ``PurchaseError``)
  are raised for domain errors; callers that need a dict-style response
  can use ``create_purchase_safe`` which catches them and returns the
  familiar ``{'success': bool, ...}`` shape.
* Supplier ledger fields (``total_purchases``, ``outstanding_amount``,
  ``last_purchase_date``) are updated inside the same atomic block so
  they stay consistent with batch records at all times.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any

from django.db import transaction
from django.utils import timezone

from accounts.models_audit import AuditLog
from trading.models import Fish, Inventory, PurchaseBatch, Supplier

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PRICE_TREND_THRESHOLD = Decimal("0.05")   # 5 % deviation = meaningful trend

VALID_PAYMENT_METHODS = {"cash", "upi", "credit"}


# ---------------------------------------------------------------------------
# Custom exceptions – callers can import and catch these individually
# ---------------------------------------------------------------------------


class PurchaseError(Exception):
    """Base exception for all purchase-service errors."""


class PurchaseValidationError(PurchaseError):
    """Raised when input data fails business-rule validation."""

    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        super().__init__("; ".join(errors))


class SupplierNotFoundError(PurchaseError):
    """Raised when a supplier_id is given but cannot be located."""


class ProductNotFoundError(PurchaseError):
    """Raised when a product_id cannot be resolved for this company."""


# ---------------------------------------------------------------------------
# Data-transfer objects (immutable result shapes)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class BatchResult:
    """Summary of one successfully created purchase batch."""

    batch_id: str
    batch_number: str
    fish_name: str
    qty: Decimal
    cost_price: Decimal
    total_cost: Decimal
    price_trend: str


@dataclass
class PurchaseResult:
    """Aggregate result returned by ``create_purchase``."""

    success: bool
    batches: list[BatchResult] = field(default_factory=list)
    total_amount: Decimal = Decimal("0")
    payment_method: str = "cash"
    amount_paid: Decimal = Decimal("0")
    pending_amount: Decimal = Decimal("0")
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Serialise to a plain dict (API-response friendly)."""
        return {
            "success": self.success,
            "batches": [
                {
                    "batch_id": b.batch_id,
                    "batch_number": b.batch_number,
                    "fish": b.fish_name,
                    "qty": float(b.qty),
                    "cost_price": float(b.cost_price),
                    "total": float(b.total_cost),
                    "trend": b.price_trend,
                }
                for b in self.batches
            ],
            "total_amount": float(self.total_amount),
            "payment_status": {
                "method": self.payment_method,
                "paid": float(self.amount_paid),
                "pending": float(self.pending_amount),
            },
            "errors": self.errors,
        }


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class PurchaseService:
    """
    Stateless service for creating fish-trading purchase batches.

    Every method is a ``@staticmethod`` – no instantiation required.
    """

    # ------------------------------------------------------------------
    # Validation helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _to_decimal(value: Any, label: str) -> Decimal:
        """
        Safely convert *value* to :class:`~decimal.Decimal`.

        Raises
        ------
        PurchaseValidationError
            If the value cannot be parsed as a positive decimal.
        """
        try:
            result = Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise PurchaseValidationError([f"{label} must be a valid number"]) from exc
        if result <= 0:
            raise PurchaseValidationError([f"{label} must be greater than 0"])
        return result

    @staticmethod
    def validate_purchase_data(items: list[dict[str, Any]]) -> list[str]:
        """
        Validate a list of purchase line-items.

        Returns a list of human-readable error strings (empty = valid).
        Does **not** raise – callers decide how to handle the errors.
        """
        errors: list[str] = []

        if not items:
            return ["At least one product must be added"]

        for idx, item in enumerate(items, start=1):
            prefix = f"Item {idx}"

            if not item.get("product_id"):
                errors.append(f"{prefix}: Product is required")

            qty_raw = item.get("qty")
            if qty_raw is None:
                errors.append(f"{prefix}: Quantity is required")
            else:
                try:
                    if Decimal(str(qty_raw)) <= 0:
                        errors.append(f"{prefix}: Quantity must be > 0")
                except (InvalidOperation, ValueError):
                    errors.append(f"{prefix}: Quantity must be a valid number")

            price_raw = item.get("cost_price")
            if price_raw is None:
                errors.append(f"{prefix}: Cost price is required")
            else:
                try:
                    if Decimal(str(price_raw)) <= 0:
                        errors.append(f"{prefix}: Cost price must be > 0")
                except (InvalidOperation, ValueError):
                    errors.append(f"{prefix}: Cost price must be a valid number")

        return errors

    # ------------------------------------------------------------------
    # Price-trend analytics
    # ------------------------------------------------------------------

    @staticmethod
    def get_price_trend_indicator(fish: Fish, current_price: Decimal) -> str:
        """
        Compare *current_price* against the fish's historical average.

        Returns
        -------
        ``'increased'`` | ``'decreased'`` | ``'stable'``
        """
        avg = fish.avg_price_per_kg
        if not avg or avg == 0:
            return "stable"

        historical = Decimal(str(avg))
        current = Decimal(str(current_price))
        threshold = historical * PRICE_TREND_THRESHOLD

        if current > historical + threshold:
            return "increased"
        if current < historical - threshold:
            return "decreased"
        return "stable"

    # ------------------------------------------------------------------
    # Batch-ID generation
    # ------------------------------------------------------------------

    @staticmethod
    def generate_batch_id(company: Any, purchase_date: date | None = None) -> str:
        """
        Generate a human-readable, sequential batch reference.

        Format: ``B<YYYYMMDD>-<NN>``   e.g. ``B20260526-03``

        .. note::
           This is the *legacy* batch reference stored in
           ``PurchaseBatch.batch_number``.  The authoritative unique
           key is ``PurchaseBatch.purchase_number`` which is generated
           by ``generate_purchase_number()`` inside the model's
           ``save()`` method using ``SELECT FOR UPDATE``.
        """
        if purchase_date is None:
            purchase_date = timezone.now().date()

        date_str = purchase_date.strftime("%Y%m%d")
        today_count = PurchaseBatch.objects.filter(
            company=company,
            created_at__date=purchase_date,
        ).count()
        return f"B{date_str}-{today_count + 1:02d}"

    # ------------------------------------------------------------------
    # Supplier resolution
    # ------------------------------------------------------------------

    @staticmethod
    def _resolve_supplier(
        company: Any,
        user: Any,
        supplier_id: int | None,
        supplier_name: str | None,
    ) -> Supplier | None:
        """
        Return a :class:`~trading.models.Supplier` instance or ``None``.

        * If *supplier_id* is given, look it up (raises
          :exc:`SupplierNotFoundError` on miss).
        * If *supplier_name* is given, get-or-create within the company.
        * If neither is provided, return ``None`` (walk-in / direct
          purchase is valid for this domain).
        """
        if supplier_id:
            try:
                return Supplier.objects.get(id=supplier_id, company=company, is_deleted=False)
            except Supplier.DoesNotExist as exc:  # type: ignore # pylint: disable=no-member
                raise SupplierNotFoundError(
                    f"Supplier with id={supplier_id} not found for this company"
                ) from exc

        if supplier_name:
            supplier_name = supplier_name.strip()
            if supplier_name:
                supplier, _ = Supplier.objects.get_or_create(
                    name=supplier_name,
                    company=company,
                    defaults={"tenant": user},
                )
                return supplier

        return None

    # ------------------------------------------------------------------
    # Core purchase creation
    # ------------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def create_purchase(  # pylint: disable=too-many-arguments,too-many-positional-arguments,too-many-locals
        user: Any,
        company: Any,
        supplier_id: int | None = None,
        supplier_name: str | None = None,
        items: list[dict[str, Any]] | None = None,
        payment_method: str = "cash",
        amount_paid: Decimal | int | float = 0,
        notes: str | None = None,
    ) -> PurchaseResult:
        """
        Create purchase batches for every line-item in *items*.

        All database writes happen inside a single ``SAVEPOINT`` (nested
        atomic block via ``@transaction.atomic``).  If any unrecoverable
        error occurs the whole operation is rolled back.

        Parameters
        ----------
        user:
            Authenticated ``User`` instance (stored as ``tenant`` on
            child records).
        company:
            ``Company`` instance scoping all records.
        supplier_id:
            PK of an existing :class:`~trading.models.Supplier`.
        supplier_name:
            Free-text name – triggers ``get_or_create``.
        items:
            List of dicts with keys ``product_id``, ``qty``,
            ``cost_price``.
        payment_method:
            One of ``'cash'``, ``'upi'``, ``'credit'``.
        amount_paid:
            Amount remitted at the time of purchase.
        notes:
            Free-text purchase notes.

        Returns
        -------
        :class:`PurchaseResult`

        Raises
        ------
        :exc:`PurchaseValidationError`
            When *items* fails basic validation.
        :exc:`SupplierNotFoundError`
            When *supplier_id* resolves to nothing.
        """
        # 1. Normalise payment fields
        if payment_method not in VALID_PAYMENT_METHODS:
            raise PurchaseValidationError(
                [f"payment_method must be one of: {', '.join(sorted(VALID_PAYMENT_METHODS))}"]
            )

        try:
            amount_paid_dec = Decimal(str(amount_paid))
        except (InvalidOperation, ValueError) as exc:
            raise PurchaseValidationError(["amount_paid must be a valid number"]) from exc

        if amount_paid_dec < 0:
            raise PurchaseValidationError(["amount_paid cannot be negative"])

        # 2. Validate line-items
        validation_errors = PurchaseService.validate_purchase_data(items or [])
        if validation_errors:
            raise PurchaseValidationError(validation_errors)

        # 3. Resolve supplier (may raise SupplierNotFoundError)
        supplier = PurchaseService._resolve_supplier(company, user, supplier_id, supplier_name)

        # 4. Create one batch + inventory record per line-item
        created_batches: list[BatchResult] = []
        total_amount = Decimal("0")
        purchase_date = timezone.now().date()

        for item in items:  # type: ignore[union-attr]
            batch_result = PurchaseService._create_single_batch(
                user=user,
                company=company,
                supplier=supplier,
                item=item,
                payment_method=payment_method,
                amount_paid=amount_paid_dec,
                notes=notes,
                purchase_date=purchase_date,
            )
            created_batches.append(batch_result)
            total_amount += batch_result.total_cost

        # 5. Update supplier ledger atomically (inside the same savepoint)
        if supplier is not None:
            PurchaseService._update_supplier_ledger(supplier, total_amount, purchase_date)

        # 6. Calculate pending amount for response
        if payment_method == "cash":
            pending = Decimal("0")
        else:
            pending = max(Decimal("0"), total_amount - amount_paid_dec)

        return PurchaseResult(
            success=True,
            batches=created_batches,
            total_amount=total_amount,
            payment_method=payment_method,
            amount_paid=amount_paid_dec,
            pending_amount=pending,
            errors=[],
        )

    @staticmethod
    def _create_single_batch(  # pylint: disable=too-many-arguments,too-many-positional-arguments,too-many-locals
        user: Any,
        company: Any,
        supplier: Supplier | None,
        item: dict[str, Any],
        payment_method: str,
        amount_paid: Decimal,
        notes: str | None,
        purchase_date: date,
    ) -> BatchResult:
        """
        Create one :class:`~trading.models.PurchaseBatch` and its
        corresponding :class:`~trading.models.Inventory` record.

        Wrapped by ``create_purchase``'s outer ``@transaction.atomic``
        so any exception here rolls back everything.
        """
        # Resolve fish – fail loudly rather than silently skipping
        try:
            fish = Fish.objects.get(id=item["product_id"], company=company, is_deleted=False)
        except Fish.DoesNotExist as exc:  # type: ignore # pylint: disable=no-member
            raise ProductNotFoundError(
                f"Fish product id={item['product_id']} not found for this company"
            ) from exc

        qty = Decimal(str(item["qty"]))
        cost_price = Decimal(str(item["cost_price"]))
        total_cost = qty * cost_price

        trend = PurchaseService.get_price_trend_indicator(fish, cost_price)
        batch_id = PurchaseService.generate_batch_id(company, purchase_date)

        # Determine payment status
        if payment_method == "cash":
            batch_paid = total_cost  # fully settled on creation
            batch_pending = Decimal("0")
            batch_status = "paid"
        elif amount_paid >= total_cost:
            batch_paid = total_cost
            batch_pending = Decimal("0")
            batch_status = "paid"
        elif amount_paid > 0:
            batch_paid = amount_paid
            batch_pending = total_cost - amount_paid
            batch_status = "partial"
        else:
            batch_paid = Decimal("0")
            batch_pending = total_cost
            batch_status = "pending"

        # Compose notes with trend annotation
        composed_notes = f"{notes or ''} [Trend: {trend}]".strip()

        batch = PurchaseBatch(
            batch_number=batch_id,
            purchase_type="kg",
            supplier=supplier,
            fish=fish,
            fish_category=fish.category,
            date=purchase_date,
            tenant=user,
            company=company,
            number_of_packages=1,
            package_weight=qty,
            total_weight=qty,           # will be recalculated by model.save()
            price_per_kg=cost_price,
            fish_cost=total_cost,       # will be recalculated by model.save()
            labour_cost=Decimal("0"),
            ice_cost=Decimal("0"),
            transport_cost=Decimal("0"),
            commission_cost=Decimal("0"),
            other_cost=Decimal("0"),
            total_expense=total_cost,   # will be recalculated by model.save()
            actual_cost_per_kg=cost_price,
            cost_per_package=total_cost,
            amount_paid=batch_paid,
            pending_amount=batch_pending,
            status=batch_status,
            notes=composed_notes,
            estimated_expiry_date=None,
            arrival_time=timezone.now(),
        )
        # model.save() auto-generates purchase_number and recalculates fields
        batch.save()

        # Create inventory record (stock is initialised here, not via update_stock)
        Inventory.objects.create(
            fish=fish,
            purchase_batch=batch,
            initial_packages=1,
            remaining_packages=1,
            initial_weight_kg=qty,
            remaining_weight_kg=qty,
            status="in_stock",
            tenant=user,
            company=company,
        )

        # Write audit trail
        try:
            AuditLog.log_create(
                user=user,
                model_name="PurchaseBatch",
                object_id=batch.pk,  # pylint: disable=no-member
                object_repr=f"Batch {batch.purchase_number}: {fish.name} ({qty} kg @ {cost_price})",
                tenant=company,
                ip_address=None,
            )
        except Exception as audit_exc:  # pylint: disable=broad-exception-caught  # pragma: no cover
            # Audit failure must never block the purchase itself
            logger.exception(
                "AuditLog.log_create failed for PurchaseBatch id=%s: %s",
                batch.pk,
                audit_exc,
            )

        return BatchResult(
            batch_id=batch_id,
            batch_number=str(batch.batch_number or batch.purchase_number),
            fish_name=str(fish.name),
            qty=qty,
            cost_price=cost_price,
            total_cost=total_cost,
            price_trend=trend,
        )

    # ------------------------------------------------------------------
    # Supplier ledger
    # ------------------------------------------------------------------

    @staticmethod
    def _update_supplier_ledger(
        supplier: Supplier,
        purchase_total: Decimal,
        purchase_date: date,
    ) -> None:
        """
        Atomically increment supplier's running totals.

        Uses ``select_for_update()`` to prevent concurrent writes from
        racing under high load.
        """
        locked = Supplier.all_objects.select_for_update().get(pk=supplier.pk)
        locked.total_purchases = (locked.total_purchases or Decimal("0")) + purchase_total
        locked.outstanding_amount = (locked.outstanding_amount or Decimal("0")) + purchase_total
        locked.last_purchase_date = purchase_date
        locked.save(
            update_fields=["total_purchases", "outstanding_amount", "last_purchase_date"]
        )

    # ------------------------------------------------------------------
    # Safe wrapper (returns dict for view-layer convenience)
    # ------------------------------------------------------------------

    @staticmethod
    def create_purchase_safe(
        user: Any,
        company: Any,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """
        Thin wrapper around :meth:`create_purchase` that catches domain
        exceptions and returns the familiar ``{'success': bool, ...}``
        dict instead of raising.

        Use this in views / API serializers; use ``create_purchase``
        directly in tests so you can assert on the specific exception.
        """
        try:
            result = PurchaseService.create_purchase(user=user, company=company, **kwargs)
            return result.to_dict()
        except PurchaseValidationError as exc:
            return {
                "success": False,
                "batches": [],
                "total_amount": 0,
                "payment_status": {},
                "errors": exc.errors,
            }
        except (SupplierNotFoundError, ProductNotFoundError) as exc:
            return {
                "success": False,
                "batches": [],
                "total_amount": 0,
                "payment_status": {},
                "errors": [str(exc)],
            }
        except Exception as exc:  # pylint: disable=broad-exception-caught
            # Intentionally broad: views must never 500 on an unexpected purchase error
            logger.exception("Unexpected error in create_purchase_safe: %s", exc)
            return {
                "success": False,
                "batches": [],
                "total_amount": 0,
                "payment_status": {},
                "errors": [f"An unexpected error occurred: {exc}"],
            }

    # ------------------------------------------------------------------
    # Query helpers
    # ------------------------------------------------------------------

    @staticmethod
    def get_last_purchase_prices(
        company: Any,
        fish_id: int,
        limit: int = 3,
    ) -> list[dict[str, Any]]:
        """
        Return the *limit* most-recent purchase prices for a fish.

        Returns
        -------
        list of ``{'date': str, 'price': float, 'supplier': str}``
        """
        batches = (
            PurchaseBatch.objects.filter(
                fish_id=fish_id,
                company=company,
                is_deleted=False,
            )
            .order_by("-created_at")
            .select_related("supplier")[:limit]
        )

        return [
            {
                "date": b.created_at.date().isoformat(),
                "price": float(b.price_per_kg),
                "supplier": b.supplier.name if b.supplier else "Direct",
            }
            for b in batches
        ]

    @staticmethod
    def get_duplicate_check(
        company: Any,
        fish_id: int,
        tolerance_minutes: int = 30,
    ) -> dict[str, Any] | None:
        """
        Detect a potential duplicate purchase within *tolerance_minutes*.

        Returns a summary dict if a duplicate is found, ``None``
        otherwise.
        """
        now = timezone.now()
        window_start = now - timedelta(minutes=tolerance_minutes)

        duplicate = PurchaseBatch.objects.filter(
            fish_id=fish_id,
            company=company,
            created_at__gte=window_start,
            created_at__lte=now,
            is_deleted=False,
        ).first()

        if duplicate is None:
            return None

        return {
            "batch_id": duplicate.batch_number or duplicate.purchase_number,
            "created_at": duplicate.created_at.isoformat(),
            "qty": float(duplicate.total_weight),
            "price": float(duplicate.price_per_kg),
        }
