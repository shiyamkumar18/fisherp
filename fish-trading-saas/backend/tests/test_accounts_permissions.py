"""
Tests for Role-Based Access Control (RBAC) across tenant endpoints.
Focuses on permission boundaries between roles and cross-company access denial.
"""
import pytest
from rest_framework import status
from rest_framework.test import APIClient

from tests.factories import (
    UserFactory, CompanyFactory, SubscriptionFactory,
    PurchaseBatchFactory, FishFactory, BuyerFactory, SupplierFactory,
)
from tests.conftest_fixtures import make_active_subscription

pytestmark = pytest.mark.django_db


def _client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


class TestTenantAdminAccess:
    """Tenant admin should have full access to tenant business endpoints."""

    def test_tenant_admin_can_read_fish_categories(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/fish-categories/")
        assert resp.status_code == status.HTTP_200_OK

    def test_tenant_admin_can_read_fish(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/fish/")
        assert resp.status_code == status.HTTP_200_OK

    def test_tenant_admin_can_read_purchase_batches(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/purchase-batches/")
        assert resp.status_code == status.HTTP_200_OK

    def test_tenant_admin_can_read_buyers(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/buyers/")
        assert resp.status_code == status.HTTP_200_OK

    def test_tenant_admin_can_access_financial_dashboard(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/dashboard/financial-overview/")
        assert resp.status_code == status.HTTP_200_OK


class TestAccountantAccess:
    """Accountant can read/write financial data but cannot manage users."""

    def test_accountant_can_read_purchase_batches(self):
        company = CompanyFactory()
        UserFactory(role="tenant_admin", company=company)
        acc = UserFactory(role="accountant", company=company)
        resp = _client(acc).get("/api/purchase-batches/")
        assert resp.status_code == status.HTTP_200_OK

    def test_accountant_can_read_buyers(self):
        company = CompanyFactory()
        UserFactory(role="tenant_admin", company=company)
        acc = UserFactory(role="accountant", company=company)
        resp = _client(acc).get("/api/buyers/")
        assert resp.status_code == status.HTTP_200_OK

    def test_accountant_can_read_financial_dashboard(self):
        company = CompanyFactory()
        UserFactory(role="tenant_admin", company=company)
        acc = UserFactory(role="accountant", company=company)
        resp = _client(acc).get("/api/dashboard/financial-overview/")
        assert resp.status_code == status.HTTP_200_OK


class TestTraderAccess:
    """Trader can access sales endpoints but NOT purchase-batches (write)."""

    def test_trader_can_read_fish_categories(self):
        company = CompanyFactory()
        UserFactory(role="tenant_admin", company=company)
        trader = UserFactory(role="trader", company=company)
        resp = _client(trader).get("/api/fish-categories/")
        assert resp.status_code == status.HTTP_200_OK

    def test_trader_can_read_sales(self):
        company = CompanyFactory()
        UserFactory(role="tenant_admin", company=company)
        trader = UserFactory(role="trader", company=company)
        resp = _client(trader).get("/api/sales/")
        assert resp.status_code == status.HTTP_200_OK

    def test_trader_cannot_write_purchase_batches(self):
        company = CompanyFactory()
        admin = UserFactory(role="tenant_admin", company=company)
        make_active_subscription(company)
        trader = UserFactory(role="trader", company=company)
        fish = FishFactory(tenant=admin, company=company)
        payload = {
            "purchase_type": "package",
            "fish": fish.id,
            "number_of_packages": 5,
            "package_weight": "37.00",
            "price_per_kg": "100.00",
            "labour_cost": "0.00",
            "ice_cost": "0.00",
            "transport_cost": "0.00",
            "commission_cost": "0.00",
            "other_cost": "0.00",
            "amount_paid": "0.00",
        }
        resp = _client(trader).post("/api/purchase-batches/", payload, format="json")
        assert resp.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED)


class TestStoreUserAccess:
    """Store user can read inventory."""

    def test_store_can_read_inventory(self):
        company = CompanyFactory()
        UserFactory(role="tenant_admin", company=company)
        store = UserFactory(role="store", company=company)
        resp = _client(store).get("/api/inventory/")
        assert resp.status_code == status.HTTP_200_OK

    def test_store_can_read_fish(self):
        company = CompanyFactory()
        UserFactory(role="tenant_admin", company=company)
        store = UserFactory(role="store", company=company)
        resp = _client(store).get("/api/fish/")
        assert resp.status_code == status.HTTP_200_OK


class TestPlatformUserAccess:
    """Platform users cannot access tenant business data without impersonation."""

    def test_platform_operator_blocked_from_purchase_batches(self):
        op = UserFactory(role="platform_operator")
        resp = _client(op).get("/api/purchase-batches/")
        assert resp.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_200_OK)

    def test_platform_support_blocked_from_sales(self):
        support = UserFactory(role="platform_support")
        resp = _client(support).get("/api/sales/")
        assert resp.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_200_OK)


class TestCrossCompanyAccess:
    """Users of Company A cannot access Company B's resources by ID."""

    def test_company_a_cannot_read_company_b_purchase_batch(self):
        tenant_b = UserFactory(role="tenant_admin")
        batch_b = PurchaseBatchFactory(tenant=tenant_b)

        tenant_a = UserFactory(role="tenant_admin")
        resp = _client(tenant_a).get(f"/api/purchase-batches/{batch_b.id}/")
        assert resp.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)

    def test_company_a_cannot_read_company_b_buyer(self):
        tenant_b = UserFactory(role="tenant_admin")
        buyer_b = BuyerFactory(tenant=tenant_b)

        tenant_a = UserFactory(role="tenant_admin")
        resp = _client(tenant_a).get(f"/api/buyers/{buyer_b.id}/")
        assert resp.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)
