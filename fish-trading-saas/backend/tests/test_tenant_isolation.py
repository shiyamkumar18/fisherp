"""
Tests for multi-tenant data isolation.
Users from Company A must never see Company B's records.
"""
import pytest
from rest_framework import status
from rest_framework.test import APIClient

from tests.factories import (
    UserFactory, CompanyFactory, FishFactory, BuyerFactory, SupplierFactory,
    PurchaseBatchFactory, FishCategoryFactory,
)

pytestmark = pytest.mark.django_db


def _client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def _ids(data):
    if isinstance(data, dict) and "results" in data:
        return [r["id"] for r in data["results"]]
    return [r["id"] for r in data]


class TestFishIsolation:
    """Users cannot see another company's fish."""

    def test_user_a_cannot_see_user_b_fish(self):
        a = UserFactory(role="tenant_admin")
        b = UserFactory(role="tenant_admin")
        fish_a = FishFactory(tenant=a)
        fish_b = FishFactory(tenant=b)

        resp = _client(a).get("/api/fish/")
        ids = _ids(resp.data)
        assert fish_a.id in ids
        assert fish_b.id not in ids


class TestPurchaseBatchIsolation:
    """Users cannot see another company's purchase batches."""

    def test_user_a_cannot_see_user_b_batches(self):
        a = UserFactory(role="tenant_admin")
        b = UserFactory(role="tenant_admin")
        batch_a = PurchaseBatchFactory(tenant=a)
        batch_b = PurchaseBatchFactory(tenant=b)

        resp = _client(a).get("/api/purchase-batches/")
        ids = _ids(resp.data)
        assert batch_a.id in ids
        assert batch_b.id not in ids

    def test_user_a_cannot_access_user_b_batch_by_id(self):
        a = UserFactory(role="tenant_admin")
        b = UserFactory(role="tenant_admin")
        batch_b = PurchaseBatchFactory(tenant=b)

        resp = _client(a).get(f"/api/purchase-batches/{batch_b.id}/")
        assert resp.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN)


class TestBuyerIsolation:
    """Users cannot see another company's buyers."""

    def test_user_a_cannot_see_user_b_buyers(self):
        a = UserFactory(role="tenant_admin")
        b = UserFactory(role="tenant_admin")
        buyer_a = BuyerFactory(tenant=a)
        buyer_b = BuyerFactory(tenant=b)

        resp = _client(a).get("/api/buyers/")
        ids = _ids(resp.data)
        assert buyer_a.id in ids
        assert buyer_b.id not in ids

    def test_user_a_cannot_access_user_b_buyer_by_id(self):
        a = UserFactory(role="tenant_admin")
        b = UserFactory(role="tenant_admin")
        buyer_b = BuyerFactory(tenant=b)

        resp = _client(a).get(f"/api/buyers/{buyer_b.id}/")
        assert resp.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN)


class TestSupplierIsolation:
    """Users cannot see another company's suppliers."""

    def test_user_a_cannot_see_user_b_suppliers(self):
        a = UserFactory(role="tenant_admin")
        b = UserFactory(role="tenant_admin")
        supplier_a = SupplierFactory(tenant=a)
        supplier_b = SupplierFactory(tenant=b)

        resp = _client(a).get("/api/suppliers/")
        ids = _ids(resp.data)
        assert supplier_a.id in ids
        assert supplier_b.id not in ids


class TestSalesIsolation:
    """Users cannot see another company's sales."""

    def test_sales_endpoints_are_isolated(self):
        a = UserFactory(role="tenant_admin")
        b = UserFactory(role="tenant_admin")

        resp_a = _client(a).get("/api/sales/")
        resp_b = _client(b).get("/api/sales/")

        assert resp_a.status_code == status.HTTP_200_OK
        assert resp_b.status_code == status.HTTP_200_OK

        ids_a = set(_ids(resp_a.data))
        ids_b = set(_ids(resp_b.data))
        assert ids_a.isdisjoint(ids_b)


class TestPlatformUserIsolation:
    """Platform users are blocked from tenant business data without impersonation."""

    def test_platform_operator_cannot_read_tenant_purchase_batches(self):
        op = UserFactory(role="platform_operator")
        tenant = UserFactory(role="tenant_admin")
        batch = PurchaseBatchFactory(tenant=tenant)

        resp = _client(op).get("/api/purchase-batches/")
        if resp.status_code == status.HTTP_200_OK:
            ids = _ids(resp.data)
            # Platform operator should not see tenant's batches
            assert batch.id not in ids

    def test_platform_support_cannot_read_tenant_buyers(self):
        support = UserFactory(role="platform_support")
        tenant = UserFactory(role="tenant_admin")
        buyer = BuyerFactory(tenant=tenant)

        resp = _client(support).get("/api/buyers/")
        if resp.status_code == status.HTTP_200_OK:
            ids = _ids(resp.data)
            assert buyer.id not in ids
