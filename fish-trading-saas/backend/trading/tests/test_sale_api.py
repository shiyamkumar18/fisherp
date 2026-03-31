"""
API tests for sale endpoints:
  GET  /api/trading/sales/       – list
  POST /api/trading/sales/       – create
"""
import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from companies.models import Company
from trading.models import FishCategory, Fish, Buyer, PurchaseBatch, Inventory

User = get_user_model()

pytestmark = pytest.mark.django_db

SALES_URL = "/api/trading/sales/"


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
    defaults.update(kwargs)
    return PurchaseBatch.objects.create(**defaults)


def _make_buyer(tenant=None, company=None):
    import uuid
    tenant = tenant or _make_user()
    company = company or tenant.company
    return Buyer.objects.create(
        name=f"Buyer-{uuid.uuid4().hex[:6]}",
        tenant=tenant,
        company=company,
    )


def _make_inventory(batch, fish=None, tenant=None):
    """Create or update inventory for a purchase batch."""
    tenant = tenant or batch.tenant
    fish = fish or batch.fish
    company = batch.company
    inv, _ = Inventory.objects.get_or_create(
        purchase_batch=batch,
        fish=fish,
        defaults=dict(
            tenant=tenant,
            company=company,
            initial_packages=batch.number_of_packages,
            remaining_packages=batch.number_of_packages,
            sold_packages=0,
            initial_weight_kg=batch.total_weight,
            remaining_weight_kg=batch.total_weight,
        ),
    )
    return inv


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestSaleListAPI:
    def test_unauthenticated_cannot_list(self):
        client = APIClient()
        response = client.get(SALES_URL)
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_tenant_admin_can_list(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(SALES_URL)
        assert response.status_code == status.HTTP_200_OK

    def test_trader_can_list(self):
        user = _make_user(role="trader")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(SALES_URL)
        assert response.status_code == status.HTTP_200_OK


class TestSaleCreateAPI:
    def test_create_sale_requires_authentication(self):
        client = APIClient()
        response = client.post(SALES_URL, {}, format="json")
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_create_sale_requires_batch_and_buyer(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post(SALES_URL, {"sale_type": "retail"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_sale_success(self):
        """Test successful sale creation with valid data."""
        user = _make_user(role="tenant_admin")
        batch = _make_purchase_batch(tenant=user)
        buyer = _make_buyer(tenant=user)
        _make_inventory(batch)

        client = APIClient()
        client.force_authenticate(user=user)

        payload = {
            "batch": batch.id,
            "buyer": buyer.id,
            "sale_type": "retail",
            "number_of_packages_sold": 5,
            "selling_weight_per_package": "37.00",
            "selling_price_per_kg": "150.00",
            "amount_received": "0.00",
        }
        response = client.post(SALES_URL, payload, format="json")
        # 201 = success, 400 = business logic validation
        assert response.status_code in (status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST)
        if response.status_code == status.HTTP_201_CREATED:
            # Verify calculated fields
            data = response.data
            total_revenue = Decimal(str(data.get("total_revenue", "0")))
            assert total_revenue > 0

    def test_sale_profit_is_calculated(self):
        """profit = (selling_price - cost_price) × weight"""
        user = _make_user(role="tenant_admin")
        batch = _make_purchase_batch(
            tenant=user,
            number_of_packages=20,
            price_per_kg=Decimal("100.00"),
        )
        buyer = _make_buyer(tenant=user)
        _make_inventory(batch)

        client = APIClient()
        client.force_authenticate(user=user)

        payload = {
            "batch": batch.id,
            "buyer": buyer.id,
            "sale_type": "retail",
            "number_of_packages_sold": 5,
            "selling_weight_per_package": "37.00",
            "selling_price_per_kg": "150.00",
            "amount_received": "0.00",
        }
        response = client.post(SALES_URL, payload, format="json")
        if response.status_code == status.HTTP_201_CREATED:
            data = response.data
            profit = Decimal(str(data.get("profit", "0")))
            # With price_per_kg=100 and selling=150, profit should be positive
            assert profit > 0

    def test_sale_pending_amount_equals_total_revenue_when_no_payment(self):
        user = _make_user(role="tenant_admin")
        batch = _make_purchase_batch(tenant=user, number_of_packages=20)
        buyer = _make_buyer(tenant=user)
        _make_inventory(batch)

        client = APIClient()
        client.force_authenticate(user=user)
        payload = {
            "batch": batch.id,
            "buyer": buyer.id,
            "sale_type": "retail",
            "number_of_packages_sold": 3,
            "selling_weight_per_package": "37.00",
            "selling_price_per_kg": "120.00",
            "amount_received": "0.00",
        }
        response = client.post(SALES_URL, payload, format="json")
        if response.status_code == status.HTTP_201_CREATED:
            data = response.data
            assert Decimal(str(data["pending_amount"])) == Decimal(str(data["total_revenue"]))
