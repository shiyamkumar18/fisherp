"""
Tests for trading models: FishCategory, Fish, Supplier, Buyer, PurchaseBatch, Inventory.
Focuses on field values, calculated fields, and soft-delete behaviour.
"""
import pytest
from decimal import Decimal

from business.trading.models import Fish
from tests.factories import (
    UserFactory, CompanyFactory, FishCategoryFactory, FishFactory,
    SupplierFactory, BuyerFactory, PurchaseBatchFactory, InventoryFactory,
)

pytestmark = pytest.mark.django_db


class TestFishCategoryModel:
    """FishCategory with different types."""

    def test_saltwater_category_created(self):
        cat = FishCategoryFactory(category_type="saltwater")
        assert cat.category_type == "saltwater"
        assert cat.pk is not None

    def test_freshwater_category_created(self):
        cat = FishCategoryFactory(category_type="freshwater")
        assert cat.category_type == "freshwater"

    def test_category_name_stored(self):
        cat = FishCategoryFactory(name="Tuna")
        assert cat.name == "Tuna"


class TestFishModel:
    """Fish model fields and soft-delete."""

    def test_fish_created_with_company_scope(self):
        tenant = UserFactory(role="tenant_admin")
        fish = FishFactory(tenant=tenant)
        assert fish.company == tenant.company

    def test_fish_soft_delete_sets_is_deleted(self):
        fish = FishFactory()
        fish.is_deleted = True
        fish.save()
        fish.refresh_from_db()
        assert fish.is_deleted is True

    def test_fish_still_exists_after_soft_delete(self):
        fish = FishFactory()
        fish.is_deleted = True
        fish.save()
        assert Fish.all_objects.filter(pk=fish.pk).exists()

    def test_fish_unit_type_stored(self):
        fish = FishFactory()
        assert fish.unit_type in ["kg", "box", "piece", "bucket", "tonne"]


class TestSupplierModel:
    """Supplier model fields."""

    def test_supplier_created_with_company(self):
        tenant = UserFactory(role="tenant_admin")
        supplier = SupplierFactory(tenant=tenant)
        assert supplier.company == tenant.company

    def test_supplier_name_stored(self):
        supplier = SupplierFactory(name="Best Fish Co.")
        assert supplier.name == "Best Fish Co."

    def test_supplier_can_store_contact_info(self):
        supplier = SupplierFactory()
        supplier.phone = "9999988888"
        supplier.save()
        supplier.refresh_from_db()
        assert supplier.phone == "9999988888"


class TestBuyerModel:
    """Buyer model fields."""

    def test_buyer_created_with_company(self):
        tenant = UserFactory(role="tenant_admin")
        buyer = BuyerFactory(tenant=tenant)
        assert buyer.company == tenant.company

    def test_buyer_name_stored(self):
        buyer = BuyerFactory(name="Harbour Market")
        assert buyer.name == "Harbour Market"

    def test_multiple_buyers_in_same_company(self):
        company = CompanyFactory()
        tenant = UserFactory(role="tenant_admin", company=company)
        b1 = BuyerFactory(tenant=tenant, company=company)
        b2 = BuyerFactory(tenant=tenant, company=company)
        assert b1.pk != b2.pk


class TestPurchaseBatchCalculatedFields:
    """PurchaseBatch auto-calculated fields: total_weight, fish_cost, total_expense, pending_amount."""

    def test_total_weight_is_packages_times_weight(self):
        batch = PurchaseBatchFactory(number_of_packages=10, package_weight=Decimal("37.00"))
        assert batch.total_weight == Decimal("370.00")

    def test_fish_cost_is_weight_times_price(self):
        batch = PurchaseBatchFactory(
            number_of_packages=10,
            package_weight=Decimal("37.00"),
            price_per_kg=Decimal("100.00"),
        )
        assert batch.fish_cost == Decimal("37000.00")

    def test_total_expense_includes_overhead_costs(self):
        batch = PurchaseBatchFactory(
            number_of_packages=5,
            package_weight=Decimal("20.00"),
            price_per_kg=Decimal("50.00"),
            labour_cost=Decimal("200.00"),
            ice_cost=Decimal("100.00"),
            transport_cost=Decimal("50.00"),
            commission_cost=Decimal("50.00"),
            other_cost=Decimal("0.00"),
            amount_paid=Decimal("0.00"),
        )
        # fish_cost = 5 * 20 * 50 = 5000
        # overhead = 200 + 100 + 50 + 50 = 400
        assert batch.total_expense == Decimal("5400.00")

    def test_pending_amount_equals_total_expense_when_nothing_paid(self):
        batch = PurchaseBatchFactory(amount_paid=Decimal("0.00"))
        assert batch.pending_amount == batch.total_expense

    def test_pending_amount_reduced_by_payment(self):
        batch = PurchaseBatchFactory(
            number_of_packages=5,
            package_weight=Decimal("20.00"),
            price_per_kg=Decimal("100.00"),
            labour_cost=Decimal("0.00"),
            ice_cost=Decimal("0.00"),
            transport_cost=Decimal("0.00"),
            commission_cost=Decimal("0.00"),
            other_cost=Decimal("0.00"),
            amount_paid=Decimal("500.00"),
        )
        expected_pending = batch.total_expense - Decimal("500.00")
        assert batch.pending_amount == expected_pending


class TestInventoryModel:
    """Inventory initial/remaining packages."""

    def test_inventory_initial_packages_matches_batch(self):
        batch = PurchaseBatchFactory(number_of_packages=15)
        inv = InventoryFactory(purchase_batch=batch)
        assert inv.initial_packages == 15

    def test_inventory_remaining_equals_initial_on_creation(self):
        batch = PurchaseBatchFactory(number_of_packages=8)
        inv = InventoryFactory(purchase_batch=batch)
        assert inv.remaining_packages == inv.initial_packages

    def test_inventory_sold_packages_zero_on_creation(self):
        inv = InventoryFactory()
        assert inv.sold_packages == 0

    def test_inventory_links_to_purchase_batch(self):
        batch = PurchaseBatchFactory()
        inv = InventoryFactory(purchase_batch=batch)
        assert inv.purchase_batch == batch
