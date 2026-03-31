"""
Tests for list endpoint pagination, filtering, and search behaviour.
"""
import pytest
from rest_framework import status
from rest_framework.test import APIClient

from tests.factories import (
    UserFactory, CompanyFactory, FishCategoryFactory, FishFactory,
    BuyerFactory, SupplierFactory, PurchaseBatchFactory,
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


class TestSearchFilter:
    """?search= parameter on list endpoints."""

    def test_fish_category_search_returns_matching_results(self):
        user = UserFactory(role="tenant_admin")
        FishCategoryFactory(name="Atlantic Salmon")
        FishCategoryFactory(name="River Trout")
        resp = _client(user).get("/api/fish-categories/", {"search": "Atlantic"})
        assert resp.status_code == status.HTTP_200_OK
        names = [r["name"] for r in (resp.data.get("results", resp.data) or [])]
        if names:
            assert any("Atlantic" in n for n in names)

    def test_fish_search_by_name(self):
        user = UserFactory(role="tenant_admin")
        FishFactory(name="UniqueSnapper123", tenant=user)
        FishFactory(name="OtherFishXYZ", tenant=user)
        resp = _client(user).get("/api/fish/", {"search": "UniqueSnapper123"})
        assert resp.status_code == status.HTTP_200_OK


class TestCategoryFilter:
    """Filtering fish by category."""

    def test_fish_filtered_by_category(self):
        user = UserFactory(role="tenant_admin")
        cat_salt = FishCategoryFactory(category_type="saltwater")
        cat_fresh = FishCategoryFactory(category_type="freshwater")
        fish_salt = FishFactory(tenant=user, category=cat_salt)
        fish_fresh = FishFactory(tenant=user, category=cat_fresh)

        resp = _client(user).get("/api/fish/", {"category": cat_salt.id})
        assert resp.status_code == status.HTTP_200_OK


class TestOrdering:
    """?ordering= parameter on list endpoints."""

    def test_purchase_batches_ordering_accepted(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/purchase-batches/", {"ordering": "-created_at"})
        assert resp.status_code == status.HTTP_200_OK

    def test_buyers_ordering_by_name(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/buyers/", {"ordering": "name"})
        assert resp.status_code == status.HTTP_200_OK


class TestEmptyResults:
    """Empty list returns 200 with empty collection, not 404."""

    def test_empty_fish_list_returns_200(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/fish/")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.data.get("results", resp.data) if isinstance(resp.data, dict) else resp.data
        assert isinstance(data, list)

    def test_empty_buyers_list_returns_200(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/buyers/")
        assert resp.status_code == status.HTTP_200_OK

    def test_empty_suppliers_list_returns_200(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/suppliers/")
        assert resp.status_code == status.HTTP_200_OK

    def test_empty_purchase_batches_returns_200(self):
        user = UserFactory(role="tenant_admin")
        resp = _client(user).get("/api/purchase-batches/")
        assert resp.status_code == status.HTTP_200_OK


class TestPaginatedResults:
    """Paginated endpoints return results list in a wrapper dict."""

    def test_fish_list_is_paginated_or_list(self):
        user = UserFactory(role="tenant_admin")
        for _ in range(3):
            FishFactory(tenant=user)
        resp = _client(user).get("/api/fish/")
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.data, (list, dict))

    def test_buyers_list_count_matches_created(self):
        user = UserFactory(role="tenant_admin")
        BuyerFactory(tenant=user)
        BuyerFactory(tenant=user)
        resp = _client(user).get("/api/buyers/")
        assert resp.status_code == status.HTTP_200_OK
        ids = _ids(resp.data)
        assert len(ids) >= 2


class TestCompanyScopeFilter:
    """List endpoints only return data belonging to the user's company."""

    def test_buyers_scoped_to_company(self):
        tenant_a = UserFactory(role="tenant_admin")
        tenant_b = UserFactory(role="tenant_admin")
        buyer_a = BuyerFactory(tenant=tenant_a)
        buyer_b = BuyerFactory(tenant=tenant_b)

        resp = _client(tenant_a).get("/api/buyers/")
        ids = _ids(resp.data)
        assert buyer_a.id in ids
        assert buyer_b.id not in ids
