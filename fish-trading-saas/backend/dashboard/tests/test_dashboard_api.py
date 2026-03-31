"""
API tests for dashboard endpoints.
Covers financial overview, sales trend, inventory overview,
payment cashflow, and risk alerts endpoints.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from companies.models import Company

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


DASHBOARD_ENDPOINTS = [
    "/api/dashboard/financial-overview/",
    "/api/dashboard/sales-trend/",
    "/api/dashboard/inventory-overview/",
    "/api/dashboard/payment-cashflow/",
    "/api/dashboard/risk-alerts/",
]


class TestDashboardAuthentication:
    """All dashboard endpoints require authentication."""

    @pytest.mark.parametrize("url", DASHBOARD_ENDPOINTS)
    def test_unauthenticated_returns_401_or_403(self, url):
        client = APIClient()
        response = client.get(url)
        assert response.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )


class TestFinancialOverviewAPI:
    URL = "/api/dashboard/financial-overview/"

    def test_tenant_admin_can_access(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK

    def test_accountant_can_access(self):
        user = _make_user(role="accountant")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK

    def test_trader_can_access(self):
        user = _make_user(role="trader")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK

    def test_response_is_dict(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, dict)


class TestSalesTrendAPI:
    URL = "/api/dashboard/sales-trend/"

    def test_tenant_admin_can_access(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK

    def test_accepts_date_filter_params(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(self.URL, {"days": "30"})
        assert response.status_code == status.HTTP_200_OK


class TestInventoryOverviewAPI:
    URL = "/api/dashboard/inventory-overview/"

    def test_tenant_admin_can_access(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK

    def test_store_user_can_access(self):
        user = _make_user(role="store")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK


class TestPaymentCashflowAPI:
    URL = "/api/dashboard/payment-cashflow/"

    def test_tenant_admin_can_access(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK


class TestRiskAlertsAPI:
    URL = "/api/dashboard/risk-alerts/"

    def test_tenant_admin_can_access(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK

    def test_response_is_dict_or_list(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, (dict, list))


class TestDashboardOverviewAPI:
    URL = "/api/dashboard/overview/"

    def test_tenant_admin_can_access(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK
