import pytest
from decimal import Decimal
from django.utils import timezone
from saas_platform.subscriptions.models import Subscription, SubscriptionTier, SubscriptionAddOn, SubscriptionAddOnPurchase
from saas_platform.companies.models import Company
from saas_platform.accounts.models import User
from services.subscriptions.entitlement_service import SubscriptionService
from saas_platform.subscriptions.features import FEATURE_ANALYTICS, FEATURE_VOICE_AI, FEATURE_PURCHASE

@pytest.mark.django_db
class TestSubscriptionEntitlementService:
    @pytest.fixture
    def setup_data(self):
        self.company = Company.objects.create(name="Test Company")
        self.user = User.objects.create(username="testuser", email="test@example.com", company=self.company)
        
        self.tier_basic = SubscriptionTier.objects.create(
            name="basic", 
            allow_purchase_entry=True,
            allow_advanced_analytics=False
        )
        self.tier_premium = SubscriptionTier.objects.create(
            name="premium", 
            allow_purchase_entry=True,
            allow_advanced_analytics=True,
            max_users=5
        )
        
        self.voice_addon = SubscriptionAddOn.objects.create(
            name="Voice AI",
            addon_type="voice_entry",
            price_monthly=Decimal("10.00")
        )
        
        self.subscription = Subscription.objects.create(
            company=self.company,
            tier=self.tier_basic,
            status="active"
        )
    
    def test_legacy_tier_mapping(self, setup_data):
        # Basic tier has allow_purchase_entry=True
        assert SubscriptionService.has_feature(self.company, FEATURE_PURCHASE) is True
        # Basic tier has allow_advanced_analytics=False
        assert SubscriptionService.has_feature(self.company, FEATURE_ANALYTICS) is False

    def test_json_feature_override(self, setup_data):
        # Even if tier doesn't have analytics, we can override it in JSON
        self.subscription.enabled_features = {"analytics": True}
        self.subscription.save()
        
        assert SubscriptionService.has_feature(self.company, FEATURE_ANALYTICS) is True

    def test_addon_entitlement(self, setup_data):
        assert SubscriptionService.has_feature(self.company, FEATURE_VOICE_AI) is False
        
        # Add the active purchase
        SubscriptionAddOnPurchase.objects.create(
            subscription=self.subscription,
            addon=self.voice_addon,
            status="active"
        )
        
        assert SubscriptionService.has_feature(self.company, FEATURE_VOICE_AI) is True

    def test_expired_subscription_denies_all(self, setup_data):
        self.subscription.status = "expired"
        self.subscription.save()
        
        # Everything should be denied
        assert SubscriptionService.has_feature(self.company, FEATURE_PURCHASE) is False
        
        # Except read-only explicitly if requested
        assert SubscriptionService.has_feature(self.company, "readonly_dashboard") is True

    def test_get_entitlements(self, setup_data):
        SubscriptionAddOnPurchase.objects.create(
            subscription=self.subscription,
            addon=self.voice_addon,
            status="active"
        )
        
        entitlements = SubscriptionService.get_entitlements(self.company)
        assert FEATURE_PURCHASE in entitlements
        assert FEATURE_VOICE_AI in entitlements
        assert FEATURE_ANALYTICS not in entitlements

    def test_quota_system(self, setup_data):
        self.subscription.tier = self.tier_premium
        self.subscription.save()
        
        # Tier premium max_users is 5, we have 1 user
        assert SubscriptionService.check_quota(self.company, "max_users", amount=1) is True
        
        # Try to add 5 users (1 + 5 = 6 > 5) -> False
        assert SubscriptionService.check_quota(self.company, "max_users", amount=5) is False
