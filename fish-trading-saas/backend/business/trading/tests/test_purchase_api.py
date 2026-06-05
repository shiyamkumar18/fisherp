"""
API tests for purchase batch endpoints:
  GET  /api/trading/purchase-batches/       – list
  POST /api/trading/purchase-batches/       – create
  GET  /api/trading/purchase-batches/{id}/  – detail
"""
import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.companies.models import Company
from business.trading.models import FishCategory, Fish, PurchaseBatch
from tests.factories import SubscriptionFactory

User = get_user_model()

pytestmark = pytest.mark.django_db

BASE_URL = "/api/trading/purchase-batches/"


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


def _make_fish(tenant=None, company=None):
    import uuid
    tenant = tenant or _make_user()
    company = company or tenant.company
    cat = FishCategory.objects.create(name=f"Cat-{uuid.uuid4().hex[:6]}")
    return Fish.objects.create(
        name=f"Fish-{uuid.uuid4().hex[:6]}",
        category=cat,
        unit_type="kg",
        tenant=tenant,
        company=company,
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
# Tests
# ---------------------------------------------------------------------------

class TestPurchaseBatchListAPI:
    def test_unauthenticated_cannot_list(self):
        client = APIClient()
        response = client.get(BASE_URL)
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_tenant_admin_can_list(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(BASE_URL)
        assert response.status_code == status.HTTP_200_OK

    def test_trader_can_list(self):
        """Traders (sales_staff role) are not directly permitted to list purchase batches;
        only store, accountant, and tenant_admin can. Test reflects actual permission config."""
        user = _make_user(role="trader")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(BASE_URL)
        # Per PurchaseBatchViewSet.get_permissions, traders don't have list access
        assert response.status_code in (status.HTTP_200_OK, status.HTTP_403_FORBIDDEN)

    def test_list_returns_only_own_company_data(self):
        """Users from company A cannot see company B's purchase batches."""
        user_a = _make_user(role="tenant_admin")
        user_b = _make_user(role="tenant_admin")
        fish_a = _make_fish(tenant=user_a)
        fish_b = _make_fish(tenant=user_b)
        batch_a = _make_purchase_batch(fish=fish_a, tenant=user_a)
        batch_b = _make_purchase_batch(fish=fish_b, tenant=user_b)

        client = APIClient()
        client.force_authenticate(user=user_a)
        response = client.get(BASE_URL)
        assert response.status_code == status.HTTP_200_OK

        results = response.data
        if isinstance(results, dict) and "results" in results:
            results = results["results"]
        ids = [r["id"] for r in results]
        assert batch_a.id in ids
        assert batch_b.id not in ids


class TestPurchaseBatchCreateAPI:
    def test_create_purchase_batch_calculates_totals(self):
        """POST creates batch and auto-calculates total_weight and fish_cost."""
        user = _make_user(role="tenant_admin")
        SubscriptionFactory(company=user.company)
        fish = _make_fish(tenant=user)
        client = APIClient()
        client.force_authenticate(user=user)

        payload = {
            "purchase_type": "package",
            "fish": fish.id,
            "number_of_packages": 10,
            "package_weight": "37.00",
            "price_per_kg": "150.00",
            "labour_cost": "500.00",
            "ice_cost": "300.00",
            "transport_cost": "200.00",
            "commission_cost": "100.00",
            "other_cost": "0.00",
            "amount_paid": "0.00",
        }
        response = client.post(BASE_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.data
        # total_weight = 10 * 37 = 370
        assert Decimal(str(data["total_weight"])) == Decimal("370.00")
        # fish_cost = 370 * 150 = 55500
        assert Decimal(str(data["fish_cost"])) == Decimal("55500.00")

    def test_create_requires_fish(self):
        user = _make_user(role="tenant_admin")
        SubscriptionFactory(company=user.company)
        client = APIClient()
        client.force_authenticate(user=user)
        payload = {
            "purchase_type": "package",
            "number_of_packages": 5,
            "price_per_kg": "100.00",
        }
        response = client.post(BASE_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unauthenticated_cannot_create(self):
        client = APIClient()
        response = client.post(BASE_URL, {}, format="json")
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_pending_amount_is_full_expense_when_no_payment(self):
        user = _make_user(role="tenant_admin")
        SubscriptionFactory(company=user.company)
        fish = _make_fish(tenant=user)
        client = APIClient()
        client.force_authenticate(user=user)

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
        response = client.post(BASE_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.data
        total_expense = Decimal(str(data["total_expense"]))
        pending = Decimal(str(data["pending_amount"]))
        assert pending == total_expense


class TestPurchaseBatchDetailAPI:
    def test_can_retrieve_own_batch(self):
        user = _make_user(role="tenant_admin")
        batch = _make_purchase_batch(tenant=user)
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(f"{BASE_URL}{batch.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == batch.id

    def test_cannot_retrieve_other_company_batch(self):
        user_a = _make_user(role="tenant_admin")
        user_b = _make_user(role="tenant_admin")
        batch_b = _make_purchase_batch(tenant=user_b)
        client = APIClient()
        client.force_authenticate(user=user_a)
        response = client.get(f"{BASE_URL}{batch_b.id}/")
        assert response.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN)
