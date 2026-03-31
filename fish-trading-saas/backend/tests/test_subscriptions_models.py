"""
Tests for subscription models: SubscriptionTier, Subscription status and expiry.
"""
import pytest
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone

from subscriptions.models import SubscriptionTier, Subscription
from tests.factories import (
    CompanyFactory, SubscriptionTierFactory, SubscriptionFactory,
)

pytestmark = pytest.mark.django_db


class TestSubscriptionTierModel:
    """SubscriptionTier creation and feature flags."""

    def test_tier_can_be_created(self):
        tier = SubscriptionTierFactory(name="basic")
        assert tier.pk is not None

    def test_tier_name_stored(self):
        tier = SubscriptionTierFactory(name="premium")
        assert tier.name == "premium"

    def test_tier_pricing_stored(self):
        tier = SubscriptionTierFactory(name="enterprise", price_monthly=Decimal("999.00"))
        assert tier.price_monthly == Decimal("999.00")

    def test_tier_max_users_stored(self):
        tier = SubscriptionTierFactory(name="basic", max_users=3)
        assert tier.max_users == 3

    def test_tier_feature_flag_allow_analytics(self):
        tier = SubscriptionTierFactory(name="premium", allow_analytics=True)
        assert tier.allow_analytics is True

    def test_tier_feature_flag_allow_advanced_reporting(self):
        tier = SubscriptionTierFactory(name="enterprise", allow_advanced_reporting=True)
        assert tier.allow_advanced_reporting is True

    def test_multiple_tiers_can_coexist(self):
        # Use get_or_create pattern via SubscriptionTierFactory unique name
        t1 = SubscriptionTierFactory(name="tier_a")
        t2 = SubscriptionTierFactory(name="tier_b")
        assert t1.pk != t2.pk

    def test_tier_is_active_default_true(self):
        tier = SubscriptionTierFactory(name="basic2")
        assert tier.is_active is True


class TestSubscriptionModel:
    """Subscription creation and status checks."""

    def test_subscription_can_be_created(self):
        company = CompanyFactory()
        sub = SubscriptionFactory(company=company)
        assert sub.pk is not None

    def test_subscription_links_to_company(self):
        company = CompanyFactory()
        sub = SubscriptionFactory(company=company)
        assert sub.company == company

    def test_active_subscription_with_future_expiry(self):
        company = CompanyFactory()
        sub = SubscriptionFactory(
            company=company,
            status="active",
            expiry_date=timezone.now() + timedelta(days=30),
        )
        assert sub.is_active() is True

    def test_expired_status_is_not_active(self):
        company = CompanyFactory()
        sub = SubscriptionFactory(
            company=company,
            status="expired",
            expiry_date=timezone.now() - timedelta(days=1),
        )
        assert sub.is_active() is False

    def test_cancelled_subscription_is_not_active(self):
        company = CompanyFactory()
        sub = SubscriptionFactory(
            company=company,
            status="cancelled",
            expiry_date=timezone.now() + timedelta(days=30),
        )
        assert sub.is_active() is False

    def test_active_but_past_expiry_is_not_active(self):
        company = CompanyFactory()
        sub = SubscriptionFactory(
            company=company,
            status="active",
            expiry_date=timezone.now() - timedelta(days=1),
        )
        assert sub.is_active() is False

    def test_days_remaining_positive_for_active(self):
        company = CompanyFactory()
        sub = SubscriptionFactory(
            company=company,
            status="active",
            expiry_date=timezone.now() + timedelta(days=10),
        )
        remaining = sub.days_remaining()
        assert remaining is not None
        assert remaining > 0

    def test_days_remaining_is_none_without_expiry(self):
        company = CompanyFactory()
        sub = SubscriptionFactory(company=company, expiry_date=None)
        assert sub.days_remaining() is None
