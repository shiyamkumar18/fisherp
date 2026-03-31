"""
Tests for consistent error responses across the API.
Covers 400, 404, 403, 405 scenarios.
"""
import pytest
from rest_framework import status
from rest_framework.test import APIClient

from tests.factories import (
    UserFactory, CompanyFactory, BuyerFactory, FishCategoryFactory,
    PurchaseBatchFactory,
)
from tests.conftest_fixtures import make_active_subscription

pytestmark = pytest.mark.django_db


def _client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


class TestMissingRequiredFields:
    """POST with missing required fields returns 400."""

    def test_post_purchase_batch_missing_fish_returns_400(self):
        user = UserFactory(role="tenant_admin")
        make_active_subscription(user.company)
        payload = {
            "purchase_type": "package",
            "number_of_packages": 5,
            "package_weight": "37.00",
            "price_per_kg": "100.00",
            # 'fish' is missing
        }
        resp = _client(user).post("/api/purchase-batches/", payload, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_post_fish_category_missing_name_returns_400(self):
        user = UserFactory(role="tenant_admin")
        make_active_subscription(user.company)
        resp = _client(user).post("/api/fish-categories/", {"category_type": "saltwater"})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


class TestInvalidDataTypes:
    """POST with invalid data types returns 400."""

    def test_non_integer_packages_returns_400(self):
        user = UserFactory(role="tenant_admin")
        make_active_subscription(user.company)
        from tests.factories import FishCategoryFactory, FishFactory
        fish = FishFactory(tenant=user)
        payload = {
            "purchase_type": "package",
            "fish": fish.id,
            "number_of_packages": "not-a-number",
            "package_weight": "37.00",
            "price_per_kg": "100.00",
            "labour_cost": "0.00",
            "ice_cost": "0.00",
            "transport_cost": "0.00",
            "commission_cost": "0.00",
            "other_cost": "0.00",
            "amount_paid": "0.00",
        }
        resp = _client(user).post("/api/purchase-batches/", payload, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_decimal_price_returns_400(self):
        user = UserFactory(role="tenant_admin")
        make_active_subscription(user.company)
        from tests.factories import FishFactory
        fish = FishFactory(tenant=user)
        payload = {
            "purchase_type": "package",
            "fish": fish.id,
            "number_of_packages": 5,
            "package_weight": "37.00",
            "price_per_kg": "not-a-price",
            "labour_cost": "0.00",
            "ice_cost": "0.00",
            "transport_cost": "0.00",
            "commission_cost": "0.00",
            "other_cost": "0.00",
            "amount_paid": "0.00",
        }
        resp = _client(user).post("/api/purchase-batches/", payload, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


class TestNotFoundResponses:
    """Accessing non-existent resources returns 404."""

    def test_get_nonexistent_buyer_returns_404(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/buyers/99999999/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_get_nonexistent_fish_category_returns_404(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/fish-categories/99999999/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_get_nonexistent_purchase_batch_returns_404(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/purchase-batches/99999999/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND


class TestForbiddenResponses:
    """Accessing another tenant's resource returns 403 or 404."""

    def test_accessing_other_tenant_buyer_returns_403_or_404(self):
        tenant_a = UserFactory(role="tenant_admin")
        tenant_b = UserFactory(role="tenant_admin")
        buyer_b = BuyerFactory(tenant=tenant_b)

        resp = _client(tenant_a).get(f"/api/buyers/{buyer_b.id}/")
        assert resp.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)

    def test_accessing_other_tenant_batch_returns_403_or_404(self):
        tenant_a = UserFactory(role="tenant_admin")
        tenant_b = UserFactory(role="tenant_admin")
        batch_b = PurchaseBatchFactory(tenant=tenant_b)

        resp = _client(tenant_a).get(f"/api/purchase-batches/{batch_b.id}/")
        assert resp.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)


class TestMethodNotAllowed:
    """Invalid HTTP methods return 405."""

    def test_delete_on_list_endpoint_returns_405(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).delete("/api/fish-categories/")
        assert resp.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_put_on_list_endpoint_returns_405(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).put("/api/fish-categories/", {})
        assert resp.status_code == status.HTTP_405_METHOD_NOT_ALLOWED


class TestErrorResponseFormat:
    """Error responses should be consistent dicts, not empty."""

    def test_400_response_has_error_body(self):
        user = UserFactory(role="tenant_admin")
        make_active_subscription(user.company)
        resp = _client(user).post("/api/fish-categories/", {})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert resp.data is not None
        assert isinstance(resp.data, dict)
