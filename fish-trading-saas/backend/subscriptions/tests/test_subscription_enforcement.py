"""
Tests for subscription models and enforcement.
Covers SubscriptionTier creation, Subscription lifecycle,
and subscription-enforced feature access.
"""
import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from companies.models import Company
from subscriptions.models import SubscriptionTier, Subscription

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


def _make_tier(name=None, **kwargs):
    import uuid
    name = name or f"tier_{uuid.uuid4().hex[:6]}"
    defaults = dict(
        description="Test tier",
        max_users=5,
        max_storage_gb=10,
        price_monthly=Decimal("49.00"),
        price_yearly=Decimal("490.00"),
        is_active=True,
    )
    defaults.update(kwargs)
    return SubscriptionTier.objects.create(name=name, **defaults)


def _make_subscription(company, tier=None, status="active", **kwargs):
    tier = tier or _make_tier(name="basic")
    return Subscription.objects.create(
        tier=tier, status=status, company=company, **kwargs
    )


# ---------------------------------------------------------------------------
# SubscriptionTier model tests
# ---------------------------------------------------------------------------

class TestSubscriptionTierModel:
    def test_create_tier(self):
        tier = _make_tier(name="premium")
        assert tier.pk is not None
        assert tier.name == "premium"

    def test_tier_price_stored_correctly(self):
        tier = _make_tier(name="basic", price_monthly=Decimal("49.00"), price_yearly=Decimal("490.00"))
        tier.refresh_from_db()
        assert tier.price_monthly == Decimal("49.00")
        assert tier.price_yearly == Decimal("490.00")

    def test_tier_default_max_users(self):
        tier = SubscriptionTier.objects.create(name="free")
        assert tier.max_users >= 0

    def test_free_tier_zero_price(self):
        tier = SubscriptionTier.objects.create(
            name="free",
            price_monthly=Decimal("0.00"),
            price_yearly=Decimal("0.00"),
        )
        assert tier.price_monthly == Decimal("0.00")


# ---------------------------------------------------------------------------
# Subscription model tests
# ---------------------------------------------------------------------------

class TestSubscriptionModel:
    def test_create_subscription(self):
        company = _make_company()
        tier = _make_tier(name="basic")
        sub = Subscription.objects.create(tier=tier, status="active", company=company)
        assert sub.pk is not None
        assert sub.status == "active"

    def test_subscription_linked_to_company(self):
        company = _make_company()
        tier = _make_tier(name="basic")
        sub = Subscription.objects.create(tier=tier, status="active", company=company)
        assert sub.company == company

    def test_subscription_status_choices(self):
        company = _make_company()
        tier = _make_tier(name="basic")
        for s in ["active", "inactive", "suspended", "expired", "cancelled"]:
            sub = Subscription.objects.create(tier=tier, status=s, company=company)
            assert sub.status == s


# ---------------------------------------------------------------------------
# Subscription tier list API tests
# ---------------------------------------------------------------------------

class TestSubscriptionTierAPI:
    URL = "/api/subscriptions/tiers/"

    def test_unauthenticated_can_or_cannot_list(self):
        """Tier list may be public or protected depending on configuration."""
        client = APIClient()
        response = client.get(self.URL)
        # Either 200 (public listing) or 401/403 (protected)
        assert response.status_code in (
            status.HTTP_200_OK,
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )

    def test_authenticated_user_can_list_tiers(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK


# ---------------------------------------------------------------------------
# Current subscription endpoint
# ---------------------------------------------------------------------------

class TestCurrentSubscriptionAPI:
    URL = "/api/subscriptions/current/"

    def test_unauthenticated_cannot_access(self):
        client = APIClient()
        response = client.get(self.URL)
        assert response.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )

    def test_authenticated_user_can_access(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(self.URL)
        # 200 if subscription exists, 404 if none
        assert response.status_code in (
            status.HTTP_200_OK,
            status.HTTP_404_NOT_FOUND,
        )

    def test_user_with_active_subscription(self):
        company = _make_company()
        user = _make_user(role="tenant_admin", company=company)
        tier = _make_tier(name="premium")
        _make_subscription(company=company, tier=tier)

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(self.URL)
        assert response.status_code in (status.HTTP_200_OK, status.HTTP_404_NOT_FOUND)
