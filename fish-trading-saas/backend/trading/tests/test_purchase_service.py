"""
Comprehensive tests for services.purchase.PurchaseService
=========================================================

Coverage goals
--------------
* Happy path  – single item, multiple items, with/without supplier
* Validation  – empty items, bad qty, bad price, bad payment method
* Supplier    – id lookup hit/miss, name get-or-create, no supplier
* Per-batch   – PurchaseBatch & Inventory created correctly
* Supplier ledger – total_purchases / outstanding_amount updated
* Payment status – cash, upi/credit (paid, partial, pending)
* Price trend – increased, decreased, stable
* Duplicate check – within window, outside window
* get_last_purchase_prices
* create_purchase_safe – dict wrapper around exceptions
* Exception types – PurchaseValidationError, SupplierNotFoundError,
  ProductNotFoundError raised with correct payloads
"""

from __future__ import annotations

import pytest
from decimal import Decimal

from django.contrib.auth import get_user_model

from conftest import make_company, make_fish, make_supplier, make_user
from services.purchase import (
    PurchaseService,
    PurchaseValidationError,
    SupplierNotFoundError,
    ProductNotFoundError,
    PurchaseResult,
    BatchResult,
)
from trading.models import Inventory, PurchaseBatch

User = get_user_model()

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def user_and_company(db):
    user = make_user(role="tenant_admin")
    return user, user.company


@pytest.fixture()
def fish_factory(user_and_company):
    user, company = user_and_company

    def _make(**kwargs):
        return make_fish(tenant=user, company=company, **kwargs)

    return _make


@pytest.fixture()
def supplier_fixture(user_and_company):
    user, company = user_and_company
    return make_supplier(tenant=user, company=company)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _simple_items(fish_id, qty=50, cost_price=100):
    return [{"product_id": fish_id, "qty": qty, "cost_price": cost_price}]


# ===========================================================================
# validate_purchase_data
# ===========================================================================


class TestValidatePurchaseData:
    def test_empty_list_returns_error(self):
        errors = PurchaseService.validate_purchase_data([])
        assert errors == ["At least one product must be added"]

    def test_none_items_returns_error(self):
        errors = PurchaseService.validate_purchase_data(None)  # type: ignore
        assert errors == ["At least one product must be added"]

    def test_missing_product_id(self):
        errors = PurchaseService.validate_purchase_data(
            [{"qty": 10, "cost_price": 50}]
        )
        assert any("Product is required" in e for e in errors)

    def test_zero_qty(self):
        errors = PurchaseService.validate_purchase_data(
            [{"product_id": 1, "qty": 0, "cost_price": 50}]
        )
        assert any("Quantity" in e for e in errors)

    def test_negative_qty(self):
        errors = PurchaseService.validate_purchase_data(
            [{"product_id": 1, "qty": -5, "cost_price": 50}]
        )
        assert any("Quantity" in e for e in errors)

    def test_non_numeric_qty(self):
        errors = PurchaseService.validate_purchase_data(
            [{"product_id": 1, "qty": "abc", "cost_price": 50}]
        )
        assert any("Quantity" in e for e in errors)

    def test_zero_cost_price(self):
        errors = PurchaseService.validate_purchase_data(
            [{"product_id": 1, "qty": 10, "cost_price": 0}]
        )
        assert any("Cost price" in e for e in errors)

    def test_non_numeric_cost_price(self):
        errors = PurchaseService.validate_purchase_data(
            [{"product_id": 1, "qty": 10, "cost_price": "free"}]
        )
        assert any("Cost price" in e for e in errors)

    def test_valid_single_item_no_errors(self):
        errors = PurchaseService.validate_purchase_data(
            [{"product_id": 1, "qty": 10, "cost_price": 50}]
        )
        assert errors == []

    def test_multiple_items_collect_all_errors(self):
        items = [
            {"product_id": 1, "qty": 0, "cost_price": 50},
            {"product_id": 2, "qty": 10, "cost_price": -1},
        ]
        errors = PurchaseService.validate_purchase_data(items)
        assert len(errors) >= 2  # one per bad field


# ===========================================================================
# get_price_trend_indicator
# ===========================================================================


class TestGetPriceTrendIndicator:
    @pytest.fixture()
    def fish(self, fish_factory):
        return fish_factory()

    def test_no_avg_price_returns_stable(self, fish):
        fish.avg_price_per_kg = 0
        assert PurchaseService.get_price_trend_indicator(fish, Decimal("100")) == "stable"

    def test_price_same_as_avg_returns_stable(self, fish):
        fish.avg_price_per_kg = Decimal("100")
        assert PurchaseService.get_price_trend_indicator(fish, Decimal("100")) == "stable"

    def test_price_within_threshold_returns_stable(self, fish):
        fish.avg_price_per_kg = Decimal("100")
        # 4 % above – below the 5 % threshold
        assert PurchaseService.get_price_trend_indicator(fish, Decimal("104")) == "stable"

    def test_price_above_threshold_returns_increased(self, fish):
        fish.avg_price_per_kg = Decimal("100")
        assert PurchaseService.get_price_trend_indicator(fish, Decimal("106")) == "increased"

    def test_price_below_threshold_returns_decreased(self, fish):
        fish.avg_price_per_kg = Decimal("100")
        assert PurchaseService.get_price_trend_indicator(fish, Decimal("94")) == "decreased"


# ===========================================================================
# generate_batch_id
# ===========================================================================


@pytest.mark.django_db
class TestGenerateBatchId:
    def test_format_starts_with_b(self, user_and_company):
        _, company = user_and_company
        batch_id = PurchaseService.generate_batch_id(company)
        assert batch_id.startswith("B")

    def test_format_contains_date(self, user_and_company):
        from django.utils import timezone

        _, company = user_and_company
        date_str = timezone.now().date().strftime("%Y%m%d")
        batch_id = PurchaseService.generate_batch_id(company)
        assert date_str in batch_id

    def test_counter_increments(self, user_and_company, fish_factory, supplier_fixture):
        user, company = user_and_company
        fish = fish_factory()
        items = _simple_items(fish.id)

        PurchaseService.create_purchase(
            user=user, company=company,
            supplier_id=supplier_fixture.id,
            items=items,
        )
        id1 = PurchaseService.generate_batch_id(company)

        PurchaseService.create_purchase(
            user=user, company=company,
            supplier_id=supplier_fixture.id,
            items=items,
        )
        id2 = PurchaseService.generate_batch_id(company)

        # Counter in the suffix should differ
        assert id1 != id2


# ===========================================================================
# create_purchase – happy paths
# ===========================================================================


@pytest.mark.django_db
class TestCreatePurchaseHappyPath:
    def test_returns_purchase_result_instance(self, user_and_company, fish_factory, supplier_fixture):
        user, company = user_and_company
        fish = fish_factory()

        result = PurchaseService.create_purchase(
            user=user, company=company,
            supplier_id=supplier_fixture.id,
            items=_simple_items(fish.id, qty=50, cost_price=100),
            payment_method="cash",
            amount_paid=5000,
        )

        assert isinstance(result, PurchaseResult)
        assert result.success is True

    def test_batch_created_in_db(self, user_and_company, fish_factory, supplier_fixture):
        user, company = user_and_company
        fish = fish_factory()

        PurchaseService.create_purchase(
            user=user, company=company,
            supplier_id=supplier_fixture.id,
            items=_simple_items(fish.id, qty=20, cost_price=200),
        )

        assert PurchaseBatch.all_objects.filter(fish=fish, company=company).count() == 1

    def test_inventory_created_in_db(self, user_and_company, fish_factory, supplier_fixture):
        user, company = user_and_company
        fish = fish_factory()

        PurchaseService.create_purchase(
            user=user, company=company,
            supplier_id=supplier_fixture.id,
            items=_simple_items(fish.id, qty=30, cost_price=150),
        )

        assert Inventory.all_objects.filter(fish=fish, company=company).count() == 1

    def test_total_amount_correct(self, user_and_company, fish_factory, supplier_fixture):
        user, company = user_and_company
        fish = fish_factory()

        result = PurchaseService.create_purchase(
            user=user, company=company,
            supplier_id=supplier_fixture.id,
            items=_simple_items(fish.id, qty=10, cost_price=200),
        )

        assert result.total_amount == Decimal("2000")

    def test_multiple_items_create_multiple_batches(self, user_and_company, fish_factory, supplier_fixture):
        user, company = user_and_company
        fish1 = fish_factory()
        fish2 = fish_factory()

        items = [
            {"product_id": fish1.id, "qty": 10, "cost_price": 100},
            {"product_id": fish2.id, "qty": 20, "cost_price": 50},
        ]

        result = PurchaseService.create_purchase(
            user=user, company=company,
            supplier_id=supplier_fixture.id,
            items=items,
        )

        assert result.success is True
        assert len(result.batches) == 2
        assert result.total_amount == Decimal("2000")

    def test_no_supplier_allowed(self, user_and_company, fish_factory):
        """Walk-in / direct purchase without any supplier should succeed."""
        user, company = user_and_company
        fish = fish_factory()

        result = PurchaseService.create_purchase(
            user=user, company=company,
            items=_simple_items(fish.id),
        )

        assert result.success is True

    def test_supplier_name_creates_supplier(self, user_and_company, fish_factory):
        user, company = user_and_company
        fish = fish_factory()

        result = PurchaseService.create_purchase(
            user=user, company=company,
            supplier_name="Fresh Ocean Co.",
            items=_simple_items(fish.id),
        )

        assert result.success is True
        from trading.models import Supplier
        assert Supplier.all_objects.filter(name="Fresh Ocean Co.", company=company).exists()

    def test_batch_result_contains_trend(self, user_and_company, fish_factory, supplier_fixture):
        user, company = user_and_company
        fish = fish_factory()
        fish.avg_price_per_kg = Decimal("100")
        fish.save()

        result = PurchaseService.create_purchase(
            user=user, company=company,
            supplier_id=supplier_fixture.id,
            items=_simple_items(fish.id, qty=10, cost_price=200),
        )

        assert result.batches[0].price_trend == "increased"


# ===========================================================================
# create_purchase – payment status
# ===========================================================================


@pytest.mark.django_db
class TestCreatePurchasePaymentStatus:
    def test_cash_payment_fully_paid(self, user_and_company, fish_factory, supplier_fixture):
        user, company = user_and_company
        fish = fish_factory()

        result = PurchaseService.create_purchase(
            user=user, company=company,
            supplier_id=supplier_fixture.id,
            items=_simple_items(fish.id, qty=10, cost_price=100),
            payment_method="cash",
            amount_paid=1000,
        )

        assert result.pending_amount == Decimal("0")
        batch = PurchaseBatch.all_objects.get(fish=fish, company=company)
        assert batch.status == "paid"

    def test_credit_no_payment_pending(self, user_and_company, fish_factory, supplier_fixture):
        user, company = user_and_company
        fish = fish_factory()

        result = PurchaseService.create_purchase(
            user=user, company=company,
            supplier_id=supplier_fixture.id,
            items=_simple_items(fish.id, qty=10, cost_price=100),
            payment_method="credit",
            amount_paid=0,
        )

        assert result.pending_amount == Decimal("1000")
        batch = PurchaseBatch.all_objects.get(fish=fish, company=company)
        assert batch.status == "pending"

    def test_upi_partial_payment(self, user_and_company, fish_factory, supplier_fixture):
        user, company = user_and_company
        fish = fish_factory()

        result = PurchaseService.create_purchase(
            user=user, company=company,
            supplier_id=supplier_fixture.id,
            items=_simple_items(fish.id, qty=10, cost_price=100),
            payment_method="upi",
            amount_paid=500,
        )

        assert result.pending_amount == Decimal("500")
        batch = PurchaseBatch.all_objects.get(fish=fish, company=company)
        assert batch.status == "partial"


# ===========================================================================
# create_purchase – validation failures
# ===========================================================================


@pytest.mark.django_db
class TestCreatePurchaseValidationErrors:
    def test_empty_items_raises(self, user_and_company):
        user, company = user_and_company

        with pytest.raises(PurchaseValidationError) as exc_info:
            PurchaseService.create_purchase(user=user, company=company, items=[])

        assert exc_info.value.errors  # non-empty list

    def test_bad_payment_method_raises(self, user_and_company, fish_factory):
        user, company = user_and_company
        fish = fish_factory()

        with pytest.raises(PurchaseValidationError) as exc_info:
            PurchaseService.create_purchase(
                user=user, company=company,
                items=_simple_items(fish.id),
                payment_method="bitcoin",
            )

        assert any("payment_method" in e for e in exc_info.value.errors)

    def test_negative_amount_paid_raises(self, user_and_company, fish_factory):
        user, company = user_and_company
        fish = fish_factory()

        with pytest.raises(PurchaseValidationError) as exc_info:
            PurchaseService.create_purchase(
                user=user, company=company,
                items=_simple_items(fish.id),
                amount_paid=-100,
            )

        assert any("amount_paid" in e for e in exc_info.value.errors)

    def test_invalid_supplier_id_raises(self, user_and_company, fish_factory):
        user, company = user_and_company
        fish = fish_factory()

        with pytest.raises(SupplierNotFoundError):
            PurchaseService.create_purchase(
                user=user, company=company,
                supplier_id=99999,
                items=_simple_items(fish.id),
            )

    def test_invalid_product_id_raises(self, user_and_company):
        user, company = user_and_company

        with pytest.raises(ProductNotFoundError):
            PurchaseService.create_purchase(
                user=user, company=company,
                items=[{"product_id": 99999, "qty": 10, "cost_price": 100}],
            )


# ===========================================================================
# Supplier ledger update
# ===========================================================================


@pytest.mark.django_db
class TestSupplierLedgerUpdate:
    def test_total_purchases_incremented(self, user_and_company, fish_factory, supplier_fixture):
        user, company = user_and_company
        fish = fish_factory()
        initial = supplier_fixture.total_purchases

        PurchaseService.create_purchase(
            user=user, company=company,
            supplier_id=supplier_fixture.id,
            items=_simple_items(fish.id, qty=10, cost_price=200),
        )

        supplier_fixture.refresh_from_db()
        assert supplier_fixture.total_purchases == initial + Decimal("2000")

    def test_outstanding_amount_incremented(self, user_and_company, fish_factory, supplier_fixture):
        user, company = user_and_company
        fish = fish_factory()
        initial = supplier_fixture.outstanding_amount

        PurchaseService.create_purchase(
            user=user, company=company,
            supplier_id=supplier_fixture.id,
            items=_simple_items(fish.id, qty=10, cost_price=100),
            payment_method="credit",
            amount_paid=0,
        )

        supplier_fixture.refresh_from_db()
        assert supplier_fixture.outstanding_amount == initial + Decimal("1000")

    def test_last_purchase_date_set(self, user_and_company, fish_factory, supplier_fixture):
        from django.utils import timezone

        user, company = user_and_company
        fish = fish_factory()

        PurchaseService.create_purchase(
            user=user, company=company,
            supplier_id=supplier_fixture.id,
            items=_simple_items(fish.id),
        )

        supplier_fixture.refresh_from_db()
        assert supplier_fixture.last_purchase_date == timezone.now().date()

    def test_no_supplier_skips_ledger_update(self, user_and_company, fish_factory):
        """No exception should be raised when supplier is None."""
        user, company = user_and_company
        fish = fish_factory()

        result = PurchaseService.create_purchase(
            user=user, company=company,
            items=_simple_items(fish.id),
        )

        assert result.success is True


# ===========================================================================
# create_purchase_safe (dict wrapper)
# ===========================================================================


@pytest.mark.django_db
class TestCreatePurchaseSafe:
    def test_success_returns_dict_with_success_true(self, user_and_company, fish_factory, supplier_fixture):
        user, company = user_and_company
        fish = fish_factory()

        result = PurchaseService.create_purchase_safe(
            user=user, company=company,
            supplier_id=supplier_fixture.id,
            items=_simple_items(fish.id),
        )

        assert isinstance(result, dict)
        assert result["success"] is True
        assert "batches" in result
        assert "payment_status" in result

    def test_validation_error_returns_dict_with_success_false(self, user_and_company):
        user, company = user_and_company

        result = PurchaseService.create_purchase_safe(
            user=user, company=company,
            items=[],
        )

        assert result["success"] is False
        assert result["errors"]

    def test_supplier_not_found_returns_dict_with_error(self, user_and_company, fish_factory):
        user, company = user_and_company
        fish = fish_factory()

        result = PurchaseService.create_purchase_safe(
            user=user, company=company,
            supplier_id=99999,
            items=_simple_items(fish.id),
        )

        assert result["success"] is False
        assert result["errors"]

    def test_to_dict_output_shape(self, user_and_company, fish_factory, supplier_fixture):
        user, company = user_and_company
        fish = fish_factory()

        result = PurchaseService.create_purchase_safe(
            user=user, company=company,
            supplier_id=supplier_fixture.id,
            items=_simple_items(fish.id, qty=5, cost_price=100),
            payment_method="cash",
            amount_paid=500,
        )

        assert result["total_amount"] == 500.0
        batch = result["batches"][0]
        assert batch["qty"] == 5.0
        assert batch["cost_price"] == 100.0
        assert batch["total"] == 500.0
        assert "trend" in batch


# ===========================================================================
# get_last_purchase_prices
# ===========================================================================


@pytest.mark.django_db
class TestGetLastPurchasePrices:
    def test_returns_empty_list_for_no_purchases(self, user_and_company, fish_factory):
        _, company = user_and_company
        fish = fish_factory()

        result = PurchaseService.get_last_purchase_prices(company, fish.id)
        assert result == []

    def test_returns_correct_count(self, user_and_company, fish_factory, supplier_fixture):
        user, company = user_and_company
        fish = fish_factory()

        for price in (100, 110, 120, 130):
            PurchaseService.create_purchase(
                user=user, company=company,
                supplier_id=supplier_fixture.id,
                items=_simple_items(fish.id, qty=10, cost_price=price),
            )

        result = PurchaseService.get_last_purchase_prices(company, fish.id, limit=3)
        assert len(result) == 3

    def test_result_dict_shape(self, user_and_company, fish_factory, supplier_fixture):
        user, company = user_and_company
        fish = fish_factory()

        PurchaseService.create_purchase(
            user=user, company=company,
            supplier_id=supplier_fixture.id,
            items=_simple_items(fish.id, qty=10, cost_price=200),
        )

        result = PurchaseService.get_last_purchase_prices(company, fish.id)
        assert len(result) == 1
        assert set(result[0].keys()) == {"date", "price", "supplier"}
        assert result[0]["price"] == 200.0
        assert result[0]["supplier"] == supplier_fixture.name


# ===========================================================================
# get_duplicate_check
# ===========================================================================


@pytest.mark.django_db
class TestGetDuplicateCheck:
    def test_no_recent_purchase_returns_none(self, user_and_company, fish_factory):
        _, company = user_and_company
        fish = fish_factory()

        result = PurchaseService.get_duplicate_check(company, fish.id)
        assert result is None

    def test_recent_purchase_returns_dict(self, user_and_company, fish_factory, supplier_fixture):
        user, company = user_and_company
        fish = fish_factory()

        PurchaseService.create_purchase(
            user=user, company=company,
            supplier_id=supplier_fixture.id,
            items=_simple_items(fish.id, qty=10, cost_price=100),
        )

        result = PurchaseService.get_duplicate_check(company, fish.id)
        assert result is not None
        assert set(result.keys()) == {"batch_id", "created_at", "qty", "price"}
        assert result["qty"] == 10.0
        assert result["price"] == 100.0

    def test_old_purchase_outside_window_returns_none(self, user_and_company, fish_factory, supplier_fixture):
        """Manually create a batch older than the tolerance window."""
        from datetime import timedelta
        from django.utils import timezone

        user, company = user_and_company
        fish = fish_factory()

        PurchaseService.create_purchase(
            user=user, company=company,
            supplier_id=supplier_fixture.id,
            items=_simple_items(fish.id, qty=10, cost_price=100),
        )

        # Force the created_at to be outside the 30-minute window
        PurchaseBatch.all_objects.filter(fish=fish, company=company).update(
            created_at=timezone.now() - timedelta(hours=2)
        )

        result = PurchaseService.get_duplicate_check(company, fish.id, tolerance_minutes=30)
        assert result is None


# ===========================================================================
# Atomicity – rollback on partial failure
# ===========================================================================


@pytest.mark.django_db
class TestAtomicRollback:
    def test_invalid_product_rollback_entire_purchase(self, user_and_company, fish_factory, supplier_fixture):
        """
        If one item has an invalid product_id the whole transaction
        should roll back – no batches or inventory should be committed.
        """
        user, company = user_and_company
        fish = fish_factory()

        items = [
            {"product_id": fish.id, "qty": 10, "cost_price": 100},
            {"product_id": 99999, "qty": 5, "cost_price": 50},  # bad
        ]

        with pytest.raises(ProductNotFoundError):
            PurchaseService.create_purchase(
                user=user, company=company,
                supplier_id=supplier_fixture.id,
                items=items,
            )

        # Nothing should be persisted
        assert PurchaseBatch.all_objects.filter(company=company).count() == 0
        assert Inventory.all_objects.filter(company=company).count() == 0
