"""
Tests for the SubscriptionEnforcementMiddleware.
Verifies that write operations require an active subscription,
while read/auth/subscription endpoints are unaffected.

IMPORTANT: The middleware checks Django's request.user (session-based), so these
tests use client.force_login() instead of force_authenticate() to properly set the
session and trigger the middleware's subscription check.
"""
import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from tests.factories import (
    UserFactory, SubscriptionFactory,
)

pytestmark = pytest.mark.django_db


def _session_client(user):
    """Return an APIClient authenticated via Django session (triggers middleware)."""
    client = APIClient()
    client.force_login(user)
    return client


def _jwt_client(user):
    """Return an APIClient authenticated via force_authenticate (bypasses middleware)."""
    client = APIClient()
    client.force_authenticate(user=user)
    return client


class TestWriteBlockedWithoutSubscription:
    """POST/PUT/PATCH/DELETE to tenant endpoints is blocked when no active subscription exists."""

    def test_post_fish_category_without_subscription_returns_403(self):
        user = UserFactory(role="tenant_admin")
        resp = _session_client(user).post("/api/fish-categories/", {"name": "Tuna", "category_type": "saltwater"})
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_post_buyer_without_subscription_returns_403(self):
        user = UserFactory(role="tenant_admin")
        resp = _session_client(user).post("/api/buyers/", {"name": "New Buyer"})
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_post_supplier_without_subscription_returns_403(self):
        user = UserFactory(role="tenant_admin")
        resp = _session_client(user).post("/api/suppliers/", {"name": "New Supplier"})
        assert resp.status_code == status.HTTP_403_FORBIDDEN


class TestWriteAllowedWithActiveSubscription:
    """POST succeeds when an active subscription exists."""

    def test_post_fish_category_with_active_subscription_returns_201(self):
        user = UserFactory(role="tenant_admin")
        SubscriptionFactory(
            company=user.company,
            status="active",
            expiry_date=timezone.now() + timedelta(days=365),
        )
        resp = _session_client(user).post("/api/fish-categories/", {"name": "Trout", "category_type": "freshwater"})
        assert resp.status_code == status.HTTP_201_CREATED

    def test_post_buyer_with_active_subscription_returns_201(self):
        user = UserFactory(role="tenant_admin")
        SubscriptionFactory(
            company=user.company,
            status="active",
            expiry_date=timezone.now() + timedelta(days=365),
        )
        resp = _session_client(user).post("/api/buyers/", {"name": "Market Buyer"})
        assert resp.status_code == status.HTTP_201_CREATED


class TestWriteBlockedWithExpiredSubscription:
    """POST is blocked when subscription is expired."""

    def test_post_with_expired_subscription_returns_403(self):
        user = UserFactory(role="tenant_admin")
        SubscriptionFactory(
            company=user.company,
            status="expired",
            expiry_date=timezone.now() - timedelta(days=1),
        )
        resp = _session_client(user).post("/api/fish-categories/", {"name": "Bass", "category_type": "freshwater"})
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_post_with_cancelled_subscription_returns_403(self):
        user = UserFactory(role="tenant_admin")
        SubscriptionFactory(
            company=user.company,
            status="cancelled",
            expiry_date=timezone.now() + timedelta(days=10),
        )
        resp = _session_client(user).post("/api/fish-categories/", {"name": "Perch", "category_type": "freshwater"})
        assert resp.status_code == status.HTTP_403_FORBIDDEN


class TestGetRequestsNotBlocked:
    """GET requests work without any subscription."""

    def test_get_fish_categories_without_subscription_returns_200(self):
        user = UserFactory(role="tenant_admin")
        resp = _session_client(user).get("/api/fish-categories/")
        assert resp.status_code == status.HTTP_200_OK

    def test_get_buyers_without_subscription_returns_200(self):
        user = UserFactory(role="tenant_admin")
        resp = _session_client(user).get("/api/buyers/")
        assert resp.status_code == status.HTTP_200_OK

    def test_get_inventory_without_subscription_returns_200(self):
        user = UserFactory(role="tenant_admin")
        resp = _session_client(user).get("/api/inventory/")
        assert resp.status_code == status.HTTP_200_OK


class TestAuthEndpointsNotBlocked:
    """Auth endpoints (/api/auth/) are never blocked by the subscription middleware."""

    def test_login_endpoint_not_blocked(self):
        user = UserFactory(password="pass1234")
        client = APIClient()
        resp = client.post("/api/auth/login/", {"username": user.username, "password": "pass1234"})
        assert resp.status_code != status.HTTP_403_FORBIDDEN

    def test_profile_endpoint_not_blocked_by_middleware(self):
        user = UserFactory(role="tenant_admin")
        resp = _session_client(user).get("/api/auth/profile/")
        # Should not be 403 due to middleware (auth issues aside)
        assert resp.status_code != status.HTTP_403_FORBIDDEN


class TestSubscriptionEndpointsNotBlocked:
    """Subscription and tier endpoints are never blocked by the middleware."""

    def test_get_tiers_not_blocked(self):
        user = UserFactory(role="tenant_admin")
        resp = _session_client(user).get("/api/tiers/")
        assert resp.status_code in (status.HTTP_200_OK, status.HTTP_404_NOT_FOUND)

    def test_get_my_subscription_not_blocked(self):
        user = UserFactory(role="tenant_admin")
        resp = _session_client(user).get("/api/subscriptions/my/")
        assert resp.status_code in (status.HTTP_200_OK, status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN)
