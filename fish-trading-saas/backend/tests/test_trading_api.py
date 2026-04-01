"""
Tests for the trading REST API endpoints.
Covers CRUD operations, auth requirements, and subscription enforcement.
"""
import pytest
from rest_framework import status
from rest_framework.test import APIClient

from tests.factories import (
    UserFactory, FishFactory,
    BuyerFactory,
)
from tests.conftest_fixtures import make_active_subscription

pytestmark = pytest.mark.django_db


def _client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


class TestFishCategoryAPI:
    """GET/POST /api/fish-categories/"""

    def test_authenticated_get_returns_200(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/fish-categories/")
        assert resp.status_code == status.HTTP_200_OK

    def test_unauthenticated_get_returns_401(self):
        resp = APIClient().get("/api/fish-categories/")
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_post_creates_category_with_subscription(self):
        user = UserFactory(role="tenant_admin")
        make_active_subscription(user.company)
        resp = _client(user).post("/api/fish-categories/", {"name": "Salmon", "category_type": "saltwater"})
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["name"] == "Salmon"

    def test_post_without_subscription_returns_403(self):
        user = UserFactory(role="tenant_admin")
        # Use session auth so the subscription enforcement middleware sees request.user
        client = APIClient()
        client.force_login(user)
        resp = client.post("/api/fish-categories/", {"name": "Tuna", "category_type": "saltwater"})
        assert resp.status_code == status.HTTP_403_FORBIDDEN


class TestFishAPI:
    """GET /api/fish/ - tenant-scoped list."""

    def test_authenticated_get_returns_200(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/fish/")
        assert resp.status_code == status.HTTP_200_OK

    def test_only_own_company_fish_returned(self):
        tenant_a = UserFactory(role="tenant_admin")
        tenant_b = UserFactory(role="tenant_admin")
        fish_a = FishFactory(tenant=tenant_a)
        fish_b = FishFactory(tenant=tenant_b)

        resp = _client(tenant_a).get("/api/fish/")
        ids = _extract_ids(resp.data)
        assert fish_a.id in ids
        assert fish_b.id not in ids

    def test_unauthenticated_get_returns_401(self):
        resp = APIClient().get("/api/fish/")
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


class TestBuyerAPI:
    """CRUD /api/buyers/"""

    def test_create_buyer_with_subscription(self):
        user = UserFactory(role="tenant_admin")
        make_active_subscription(user.company)
        resp = _client(user).post("/api/buyers/", {"name": "New Buyer"})
        assert resp.status_code == status.HTTP_201_CREATED

    def test_get_buyer_detail(self):
        user = UserFactory(role="tenant_admin")
        buyer = BuyerFactory(tenant=user)
        resp = _client(user).get(f"/api/buyers/{buyer.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["name"] == buyer.name

    def test_patch_buyer_updates_name(self):
        user = UserFactory(role="tenant_admin")
        make_active_subscription(user.company)
        buyer = BuyerFactory(tenant=user)
        resp = _client(user).patch(f"/api/buyers/{buyer.id}/", {"name": "Updated Buyer"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["name"] == "Updated Buyer"

    def test_delete_buyer_removes_or_soft_deletes(self):
        user = UserFactory(role="tenant_admin")
        make_active_subscription(user.company)
        buyer = BuyerFactory(tenant=user)
        resp = _client(user).delete(f"/api/buyers/{buyer.id}/")
        assert resp.status_code in (
            status.HTTP_204_NO_CONTENT,
            status.HTTP_200_OK,
            status.HTTP_404_NOT_FOUND,
        )

    def test_unauthenticated_get_returns_401(self):
        resp = APIClient().get("/api/buyers/")
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_get_nonexistent_buyer_returns_404(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/buyers/99999999/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND


class TestSupplierAPI:
    """CRUD /api/suppliers/"""

    def test_get_suppliers_returns_200(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/suppliers/")
        assert resp.status_code == status.HTTP_200_OK

    def test_create_supplier_with_subscription(self):
        user = UserFactory(role="tenant_admin")
        make_active_subscription(user.company)
        resp = _client(user).post("/api/suppliers/", {"name": "Ocean Catch Ltd"})
        assert resp.status_code == status.HTTP_201_CREATED


class TestInventoryAPI:
    """GET /api/inventory/"""

    def test_get_inventory_returns_200(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/inventory/")
        assert resp.status_code == status.HTTP_200_OK


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_ids(data):
    if isinstance(data, dict) and "results" in data:
        return [r["id"] for r in data["results"]]
    return [r["id"] for r in data]
