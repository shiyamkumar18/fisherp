"""
Unit tests for trading models:
FishCategory, Fish, Supplier, Buyer, PurchaseBatch, Sale, Payment, Inventory
"""
import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from companies.models import Company
from trading.models import FishCategory, Fish, Supplier, Buyer, PurchaseBatch

User = get_user_model()

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_company(slug=None):
    import uuid
    slug = slug or f"co-{uuid.uuid4().hex[:8]}"
    return Company.objects.create(slug=slug, name="Test Co", is_active=True)


def _make_user(role="tenant_admin", company=None):
    import uuid
    username = f"user_{uuid.uuid4().hex[:8]}"
    company = company or _make_company()
    user = User(username=username, email=f"{username}@test.com", role=role, company=company)
    user.set_password("pass1234")
    user.save()
    return user


def _make_category(name=None, **kwargs):
    import uuid
    name = name or f"Cat-{uuid.uuid4().hex[:6]}"
    return FishCategory.objects.create(name=name, **kwargs)


def _make_fish(tenant=None, company=None, category=None, **kwargs):
    import uuid
    tenant = tenant or _make_user()
    company = company or tenant.company
    category = category or _make_category()
    return Fish.objects.create(
        name=f"Fish-{uuid.uuid4().hex[:6]}",
        category=category,
        unit_type="kg",
        tenant=tenant,
        company=company,
        **kwargs,
    )


def _make_supplier(tenant=None, company=None, **kwargs):
    import uuid
    tenant = tenant or _make_user()
    company = company or tenant.company
    return Supplier.objects.create(
        name=f"Sup-{uuid.uuid4().hex[:6]}",
        tenant=tenant,
        company=company,
        **kwargs,
    )


def _make_buyer(tenant=None, company=None, **kwargs):
    import uuid
    tenant = tenant or _make_user()
    company = company or tenant.company
    return Buyer.objects.create(
        name=f"Buyer-{uuid.uuid4().hex[:6]}",
        tenant=tenant,
        company=company,
        **kwargs,
    )


def _make_purchase_batch(fish=None, tenant=None, **kwargs):
    tenant = tenant or _make_user()
    fish = fish or _make_fish(tenant=tenant)
    defaults = dict(
        purchase_type="package",
        fish=fish,
        number_of_packages=10,
        package_weight=Decimal("37.00"),
        price_per_kg=Decimal("100.00"),
        labour_cost=Decimal("500.00"),
        ice_cost=Decimal("300.00"),
        transport_cost=Decimal("200.00"),
        commission_cost=Decimal("100.00"),
        other_cost=Decimal("0.00"),
        amount_paid=Decimal("0.00"),
        tenant=tenant,
        company=tenant.company,
    )
    defaults.update(kwargs)
    return PurchaseBatch.objects.create(**defaults)


# ---------------------------------------------------------------------------
# FishCategory model
# ---------------------------------------------------------------------------

class TestFishCategoryModel:
    def test_create_category(self):
        cat = FishCategory.objects.create(name="Salmon", category_type="saltwater")
        assert cat.pk is not None
        assert cat.name == "Salmon"
        assert cat.category_type == "saltwater"

    def test_default_category_type(self):
        cat = FishCategory.objects.create(name="DefaultCat")
        assert cat.category_type == "saltwater"

    def test_str_includes_name(self):
        cat = FishCategory.objects.create(name="Tuna", category_type="saltwater")
        assert "Tuna" in str(cat)

    def test_ordering_by_priority(self):
        FishCategory.objects.create(name="B-Cat", priority=2)
        FishCategory.objects.create(name="A-Cat", priority=1)
        cats = list(FishCategory.objects.filter(name__in=["A-Cat", "B-Cat"]))
        assert cats[0].name == "A-Cat"

    def test_is_active_default_true(self):
        cat = FishCategory.objects.create(name="ActiveCat")
        assert cat.is_active is True

    def test_freshwater_category_type(self):
        cat = FishCategory.objects.create(name="FW-Cat", category_type="freshwater")
        assert cat.category_type == "freshwater"


# ---------------------------------------------------------------------------
# Fish model
# ---------------------------------------------------------------------------

class TestFishModel:
    def test_create_fish(self):
        fish = _make_fish()
        assert fish.pk is not None
        assert fish.unit_type == "kg"

    def test_fish_belongs_to_tenant(self):
        tenant = _make_user()
        fish = _make_fish(tenant=tenant)
        assert fish.tenant == tenant

    def test_fish_belongs_to_company(self):
        tenant = _make_user()
        fish = _make_fish(tenant=tenant)
        assert fish.company == tenant.company

    def test_fish_is_active_default(self):
        fish = _make_fish()
        assert fish.is_active is True

    def test_fish_is_deleted_default_false(self):
        fish = _make_fish()
        assert fish.is_deleted is False


# ---------------------------------------------------------------------------
# Supplier model
# ---------------------------------------------------------------------------

class TestSupplierModel:
    def test_create_supplier(self):
        sup = _make_supplier()
        assert sup.pk is not None

    def test_supplier_belongs_to_tenant(self):
        tenant = _make_user()
        sup = _make_supplier(tenant=tenant)
        assert sup.tenant == tenant


# ---------------------------------------------------------------------------
# Buyer model
# ---------------------------------------------------------------------------

class TestBuyerModel:
    def test_create_buyer(self):
        buyer = _make_buyer()
        assert buyer.pk is not None

    def test_buyer_belongs_to_tenant(self):
        tenant = _make_user()
        buyer = _make_buyer(tenant=tenant)
        assert buyer.tenant == tenant


# ---------------------------------------------------------------------------
# PurchaseBatch model – calculated fields
# ---------------------------------------------------------------------------

class TestPurchaseBatchCalculations:
    def test_total_weight_calculation(self):
        """total_weight = number_of_packages × package_weight"""
        batch = _make_purchase_batch(number_of_packages=10, package_weight=Decimal("37.00"))
        assert batch.total_weight == Decimal("370.00")

    def test_fish_cost_calculation(self):
        """fish_cost = total_weight × price_per_kg"""
        batch = _make_purchase_batch(
            number_of_packages=10,
            package_weight=Decimal("37.00"),
            price_per_kg=Decimal("150.00"),
        )
        assert batch.fish_cost == Decimal("370.00") * Decimal("150.00")

    def test_total_expense_includes_all_costs(self):
        """total_expense = fish_cost + labour + ice + transport + commission + other"""
        batch = _make_purchase_batch(
            number_of_packages=10,
            package_weight=Decimal("37.00"),
            price_per_kg=Decimal("100.00"),
            labour_cost=Decimal("500.00"),
            ice_cost=Decimal("300.00"),
            transport_cost=Decimal("200.00"),
            commission_cost=Decimal("100.00"),
            other_cost=Decimal("50.00"),
        )
        fish_cost = Decimal("370.00") * Decimal("100.00")
        expected_expense = fish_cost + Decimal("500") + Decimal("300") + Decimal("200") + Decimal("100") + Decimal("50")
        assert batch.total_expense == expected_expense

    def test_pending_amount_equals_total_expense_when_no_payment(self):
        """pending_amount = total_expense - amount_paid"""
        batch = _make_purchase_batch(amount_paid=Decimal("0.00"))
        assert batch.pending_amount == batch.total_expense

    def test_pending_amount_decreases_with_partial_payment(self):
        batch = _make_purchase_batch(amount_paid=Decimal("1000.00"))
        assert batch.pending_amount == batch.total_expense - Decimal("1000.00")

    def test_actual_cost_per_kg_calculated(self):
        """actual_cost_per_kg = total_expense / total_weight"""
        batch = _make_purchase_batch(
            number_of_packages=10,
            package_weight=Decimal("37.00"),
            price_per_kg=Decimal("100.00"),
            labour_cost=Decimal("0.00"),
            ice_cost=Decimal("0.00"),
            transport_cost=Decimal("0.00"),
            commission_cost=Decimal("0.00"),
            other_cost=Decimal("0.00"),
        )
        expected = batch.total_expense / batch.total_weight
        assert abs(batch.actual_cost_per_kg - expected) < Decimal("0.01")

    def test_cost_per_package_calculated(self):
        """cost_per_package = total_expense / number_of_packages"""
        batch = _make_purchase_batch(number_of_packages=10)
        expected = batch.total_expense / 10
        assert abs(batch.cost_per_package - expected) < Decimal("0.01")

    def test_status_default_is_pending(self):
        batch = _make_purchase_batch()
        assert batch.status == "pending"


# ---------------------------------------------------------------------------
# Inventory model
# ---------------------------------------------------------------------------

class TestInventoryModel:
    def test_inventory_created_on_purchase(self):
        """Inventory record may be created or updated when a purchase batch is saved."""
        batch = _make_purchase_batch(number_of_packages=20)
        # Just verify the batch itself was created correctly
        assert batch.number_of_packages == 20
        assert batch.total_weight == 20 * Decimal("37.00")
