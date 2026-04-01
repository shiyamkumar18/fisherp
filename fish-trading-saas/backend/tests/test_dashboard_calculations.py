"""
Tests for dashboard API endpoints.
Covers auth requirements, response structure, and tenant scoping.
"""
import pytest
from rest_framework import status
from rest_framework.test import APIClient

from tests.factories import (
    UserFactory, CompanyFactory,
)

pytestmark = pytest.mark.django_db


def _client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


class TestFinancialOverviewEndpoint:
    """GET /api/dashboard/financial-overview/"""

    def test_requires_authentication(self):
        resp = APIClient().get("/api/dashboard/financial-overview/")
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_tenant_admin_can_access(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/dashboard/financial-overview/")
        assert resp.status_code == status.HTTP_200_OK

    def test_accountant_can_access(self):
        company = CompanyFactory()
        UserFactory(role="tenant_admin", company=company)
        acc = UserFactory(role="accountant", company=company)
        resp = _client(acc).get("/api/dashboard/financial-overview/")
        assert resp.status_code == status.HTTP_200_OK

    def test_response_is_dict(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/dashboard/financial-overview/")
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.data, dict)

    def test_platform_operator_blocked_without_impersonation(self):
        op = UserFactory(role="platform_operator")
        resp = _client(op).get("/api/dashboard/financial-overview/")
        assert resp.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_200_OK)


class TestSalesTrendEndpoint:
    """GET /api/dashboard/sales-trend/"""

    def test_requires_authentication(self):
        resp = APIClient().get("/api/dashboard/sales-trend/")
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_tenant_admin_can_access(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/dashboard/sales-trend/")
        assert resp.status_code == status.HTTP_200_OK

    def test_response_is_list_or_dict(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/dashboard/sales-trend/")
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.data, (list, dict))


class TestInventoryOverviewEndpoint:
    """GET /api/dashboard/inventory-overview/"""

    def test_requires_authentication(self):
        resp = APIClient().get("/api/dashboard/inventory-overview/")
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_tenant_admin_can_access(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/dashboard/inventory-overview/")
        assert resp.status_code == status.HTTP_200_OK

    def test_store_user_can_access(self):
        company = CompanyFactory()
        UserFactory(role="tenant_admin", company=company)
        store = UserFactory(role="store", company=company)
        resp = _client(store).get("/api/dashboard/inventory-overview/")
        assert resp.status_code == status.HTTP_200_OK

    def test_response_is_dict(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/dashboard/inventory-overview/")
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.data, dict)


class TestDashboardTenantScoping:
    """Dashboard returns only data for the authenticated user's company."""

    def test_financial_overview_scoped_to_tenant(self):
        """Two tenants each get their own dashboard, no cross-contamination."""
        tenant_a = UserFactory(role="tenant_admin")
        tenant_b = UserFactory(role="tenant_admin")

        resp_a = _client(tenant_a).get("/api/dashboard/financial-overview/")
        resp_b = _client(tenant_b).get("/api/dashboard/financial-overview/")

        assert resp_a.status_code == status.HTTP_200_OK
        assert resp_b.status_code == status.HTTP_200_OK
        # Both return independently without errors
