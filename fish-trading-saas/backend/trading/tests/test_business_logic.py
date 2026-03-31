"""
Business logic tests for core trading calculations.
These tests verify the calculation functions in the PurchaseBatch and Sale models
independently from the API layer.
"""
import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model

from companies.models import Company
from trading.models import FishCategory, Fish, PurchaseBatch

User = get_user_model()

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_company():
    import uuid
    return Company.objects.create(slug=f"co-{uuid.uuid4().hex[:8]}", name="Test Co", is_active=True)


def _make_user():
    import uuid
    company = _make_company()
    user = User(
        username=f"user_{uuid.uuid4().hex[:8]}",
        email=f"u@test.com",
        role="tenant_admin",
        company=company,
    )
    user.set_password("pass")
    user.save()
    return user


def _make_fish(tenant=None):
    import uuid
    tenant = tenant or _make_user()
    cat = FishCategory.objects.create(name=f"Cat-{uuid.uuid4().hex[:6]}")
    return Fish.objects.create(
        name=f"Fish-{uuid.uuid4().hex[:6]}",
        category=cat,
        unit_type="kg",
        tenant=tenant,
        company=tenant.company,
    )


def _build_batch(tenant=None, **kwargs):
    """Build an *unsaved* PurchaseBatch with calculate_fields called."""
    tenant = tenant or _make_user()
    fish = _make_fish(tenant=tenant)
    defaults = dict(
        purchase_type="package",
        fish=fish,
        number_of_packages=10,
        package_weight=Decimal("37.00"),
        price_per_kg=Decimal("100.00"),
        labour_cost=Decimal("0.00"),
        ice_cost=Decimal("0.00"),
        transport_cost=Decimal("0.00"),
        commission_cost=Decimal("0.00"),
        other_cost=Decimal("0.00"),
        amount_paid=Decimal("0.00"),
        tenant=tenant,
        company=tenant.company,
    )
    defaults.update(kwargs)
    batch = PurchaseBatch(**defaults)
    batch.calculate_fields()
    return batch


# ---------------------------------------------------------------------------
# Purchase batch calculation tests
# ---------------------------------------------------------------------------

class TestPurchaseBatchCalculations:
    def test_total_weight_basic(self):
        batch = _build_batch(number_of_packages=10, package_weight=Decimal("37.00"))
        assert batch.total_weight == Decimal("370.00")

    def test_total_weight_with_custom_weight(self):
        batch = _build_batch(number_of_packages=5, package_weight=Decimal("27.00"))
        assert batch.total_weight == Decimal("135.00")

    def test_fish_cost_calculation(self):
        """fish_cost = total_weight × price_per_kg"""
        batch = _build_batch(
            number_of_packages=10,
            package_weight=Decimal("37.00"),
            price_per_kg=Decimal("200.00"),
        )
        # total_weight = 10 * 37 = 370; fish_cost = 370 * 200 = 74000
        assert batch.fish_cost == Decimal("370.00") * Decimal("200.00")

    def test_total_expense_no_extra_costs(self):
        """total_expense = fish_cost when all other costs are 0"""
        batch = _build_batch(
            number_of_packages=10,
            package_weight=Decimal("37.00"),
            price_per_kg=Decimal("100.00"),
            labour_cost=Decimal("0.00"),
            ice_cost=Decimal("0.00"),
            transport_cost=Decimal("0.00"),
            commission_cost=Decimal("0.00"),
            other_cost=Decimal("0.00"),
        )
        assert batch.total_expense == batch.fish_cost

    def test_total_expense_with_all_costs(self):
        """total_expense = fish_cost + labour + ice + transport + commission + other"""
        batch = _build_batch(
            number_of_packages=10,
            package_weight=Decimal("37.00"),
            price_per_kg=Decimal("100.00"),
            labour_cost=Decimal("500.00"),
            ice_cost=Decimal("300.00"),
            transport_cost=Decimal("200.00"),
            commission_cost=Decimal("100.00"),
            other_cost=Decimal("50.00"),
        )
        expected = (
            Decimal("370.00") * Decimal("100.00")
            + Decimal("500.00")
            + Decimal("300.00")
            + Decimal("200.00")
            + Decimal("100.00")
            + Decimal("50.00")
        )
        assert batch.total_expense == expected

    def test_pending_amount_equals_total_expense_when_unpaid(self):
        batch = _build_batch(amount_paid=Decimal("0.00"))
        assert batch.pending_amount == batch.total_expense

    def test_pending_amount_zero_when_fully_paid(self):
        """Build batch and then set amount_paid = total_expense, recalculate."""
        batch = _build_batch(amount_paid=Decimal("0.00"))
        batch.amount_paid = batch.total_expense
        batch.calculate_fields()
        assert batch.pending_amount == Decimal("0.00")

    def test_partial_payment_reduces_pending(self):
        batch = _build_batch(amount_paid=Decimal("1000.00"))
        assert batch.pending_amount == batch.total_expense - Decimal("1000.00")

    def test_actual_cost_per_kg(self):
        """actual_cost_per_kg = total_expense / total_weight"""
        batch = _build_batch(
            number_of_packages=10,
            package_weight=Decimal("37.00"),
            price_per_kg=Decimal("100.00"),
            labour_cost=Decimal("0.00"),
            ice_cost=Decimal("0.00"),
            transport_cost=Decimal("0.00"),
            commission_cost=Decimal("0.00"),
            other_cost=Decimal("0.00"),
        )
        # fish_cost = 3700, total_weight = 370, so actual_cost_per_kg = 100
        assert abs(batch.actual_cost_per_kg - Decimal("100.00")) < Decimal("0.01")

    def test_actual_cost_per_kg_with_overhead(self):
        """Cost per kg rises when overhead is added."""
        batch_no_overhead = _build_batch(
            price_per_kg=Decimal("100.00"),
            labour_cost=Decimal("0.00"),
        )
        batch_with_overhead = _build_batch(
            price_per_kg=Decimal("100.00"),
            labour_cost=Decimal("1000.00"),
        )
        assert batch_with_overhead.actual_cost_per_kg > batch_no_overhead.actual_cost_per_kg

    def test_cost_per_package(self):
        """cost_per_package = total_expense / number_of_packages"""
        batch = _build_batch(
            number_of_packages=10,
            price_per_kg=Decimal("100.00"),
            labour_cost=Decimal("0.00"),
            ice_cost=Decimal("0.00"),
            transport_cost=Decimal("0.00"),
            commission_cost=Decimal("0.00"),
            other_cost=Decimal("0.00"),
        )
        expected = batch.total_expense / 10
        assert abs(batch.cost_per_package - expected) < Decimal("0.01")

    def test_zero_packages_handled(self):
        """Edge case: zero packages should not crash."""
        tenant = _make_user()
        fish = _make_fish(tenant=tenant)
        batch = PurchaseBatch(
            purchase_type="package",
            fish=fish,
            number_of_packages=0,
            package_weight=Decimal("37.00"),
            price_per_kg=Decimal("100.00"),
            labour_cost=Decimal("0.00"),
            ice_cost=Decimal("0.00"),
            transport_cost=Decimal("0.00"),
            commission_cost=Decimal("0.00"),
            other_cost=Decimal("0.00"),
            amount_paid=Decimal("0.00"),
            tenant=tenant,
            company=tenant.company,
        )
        # Should not raise
        batch.calculate_fields()
        assert batch.total_weight == Decimal("0.00")


# ---------------------------------------------------------------------------
# Sale profit calculation verification
# ---------------------------------------------------------------------------

class TestSaleProfitCalculation:
    def test_profit_increases_with_higher_selling_price(self):
        """Higher selling price → higher profit."""
        from trading.models import Sale

        tenant = _make_user()
        fish = _make_fish(tenant=tenant)
        # Use objects.create to let save() call calculate_fields() properly
        batch = PurchaseBatch.objects.create(
            purchase_type="package",
            fish=fish,
            number_of_packages=20,
            package_weight=Decimal("37.00"),
            price_per_kg=Decimal("100.00"),
            labour_cost=Decimal("0.00"),
            ice_cost=Decimal("0.00"),
            transport_cost=Decimal("0.00"),
            commission_cost=Decimal("0.00"),
            other_cost=Decimal("0.00"),
            amount_paid=Decimal("0.00"),
            tenant=tenant,
            company=tenant.company,
        )

        from trading.models import Buyer
        buyer = Buyer.objects.create(
            name=f"B-{tenant.id}", tenant=tenant, company=tenant.company
        )

        # Selling at 150 per kg
        sale = Sale(
            batch=batch,
            buyer=buyer,
            sale_type="retail",
            number_of_packages_sold=5,
            selling_weight_per_package=Decimal("37.00"),
            selling_price_per_kg=Decimal("150.00"),
            amount_received=Decimal("0.00"),
            tenant=tenant,
            company=tenant.company,
        )
        sale.calculate_fields()

        # profit should be positive (selling_price=150 > cost_price=100)
        assert sale.profit > 0
        assert sale.total_revenue > 0
        # pending = final_amount - amount_received (0), so pending == final_amount
        assert sale.pending_amount == sale.final_amount
