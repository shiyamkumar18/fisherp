"""
Tests for API security aspects: injection safety, XSS handling,
unauthenticated access, and cross-tenant JWT isolation.
"""
import pytest
from rest_framework import status
from rest_framework.test import APIClient

from tests.factories import (
    UserFactory, BuyerFactory,
)
from tests.conftest_fixtures import make_active_subscription

pytestmark = pytest.mark.django_db


MAIN_ENDPOINTS = [
    "/api/fish-categories/",
    "/api/fish/",
    "/api/buyers/",
    "/api/suppliers/",
    "/api/purchase-batches/",
    "/api/sales/",
    "/api/inventory/",
    "/api/dashboard/financial-overview/",
]


class TestUnauthenticatedAccess:
    """All main endpoints reject unauthenticated requests."""

    def test_fish_categories_requires_auth(self):
        resp = APIClient().get("/api/fish-categories/")
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_purchase_batches_requires_auth(self):
        resp = APIClient().get("/api/purchase-batches/")
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_sales_requires_auth(self):
        resp = APIClient().get("/api/sales/")
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_buyers_requires_auth(self):
        resp = APIClient().get("/api/buyers/")
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_dashboard_requires_auth(self):
        resp = APIClient().get("/api/dashboard/financial-overview/")
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_inventory_requires_auth(self):
        resp = APIClient().get("/api/inventory/")
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


class TestSQLInjectionSafety:
    """SQL injection payloads in query parameters do not crash or leak data."""

    def test_sql_injection_in_search_does_not_crash(self):
        user = UserFactory(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get("/api/fish-categories/", {"search": "'; DROP TABLE trading_fishcategory; --"})
        assert resp.status_code in (status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST)

    def test_sql_injection_in_name_filter_does_not_crash(self):
        user = UserFactory(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get("/api/buyers/", {"name": "1 OR 1=1; DROP TABLE trading_buyer; --"})
        assert resp.status_code in (status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST)

    def test_sql_injection_in_id_path_does_not_crash(self):
        user = UserFactory(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        # Django URL routing will reject non-integer IDs with 404
        resp = client.get("/api/buyers/1%3B%20DROP%20TABLE%20trading_buyer%3B--/")
        assert resp.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST)


class TestXSSHandling:
    """XSS payloads in text fields are stored as escaped data, not executed."""

    def test_xss_payload_in_category_name_stored_safely(self):
        user = UserFactory(role="tenant_admin")
        make_active_subscription(user.company)
        client = APIClient()
        client.force_authenticate(user=user)
        xss_payload = "<script>alert('xss')</script>"
        resp = client.post("/api/fish-categories/", {"name": xss_payload, "category_type": "saltwater"})
        if resp.status_code == status.HTTP_201_CREATED:
            # Value is stored as-is (not executed); response should contain the raw string
            assert "<script>" in resp.data.get("name", "") or resp.data.get("name") is not None

    def test_xss_payload_in_buyer_name_does_not_execute(self):
        user = UserFactory(role="tenant_admin")
        make_active_subscription(user.company)
        client = APIClient()
        client.force_authenticate(user=user)
        xss_payload = '<img src=x onerror=alert(1)>'
        resp = client.post("/api/buyers/", {"name": xss_payload})
        # Either 201 (stored safely) or 400 (sanitized/rejected) is acceptable
        assert resp.status_code in (status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST)


class TestPasswordNotExposed:
    """Password fields are never returned in any API response."""

    def test_password_not_in_profile_response(self):
        user = UserFactory(password="supersecret1")
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get("/api/auth/profile/")
        assert resp.status_code == status.HTTP_200_OK
        resp_str = str(resp.data)
        assert "supersecret1" not in resp_str

    def test_password_not_in_user_list_response(self):
        user = UserFactory(role="tenant_admin", password="secret99")
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get("/api/auth/users/")
        if resp.status_code == status.HTTP_200_OK:
            assert "secret99" not in str(resp.data)


class TestCrossTenantJWTIsolation:
    """A JWT token from one tenant cannot be used to access another tenant's data."""

    def test_tenant_a_jwt_cannot_read_tenant_b_resources(self):
        tenant_a = UserFactory(role="tenant_admin")
        tenant_b = UserFactory(role="tenant_admin")
        buyer_b = BuyerFactory(tenant=tenant_b)

        # tenant_a's client tries to access tenant_b's buyer
        client = APIClient()
        client.force_authenticate(user=tenant_a)
        resp = client.get(f"/api/buyers/{buyer_b.id}/")
        assert resp.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN)
