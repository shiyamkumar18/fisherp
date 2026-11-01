import logging
from django.utils import timezone
from saas_platform.subscriptions.models import Subscription, SubscriptionAddOnPurchase
from saas_platform.subscriptions.features import LEGACY_TIER_MAPPING
from saas_platform.accounts.models import User

logger = logging.getLogger(__name__)

class SubscriptionService:
    """
    Centralized entitlement engine for feature gating and quota management.
    """

    @staticmethod
    def get_active_subscription(company):
        """
        Retrieves the currently active subscription for a company.
        If multiple exist, gets the latest.
        """
        if not company:
            return None
        return Subscription.objects.filter(
            company=company,
            status__in=['active', 'pending']  # grace period consideration
        ).order_by('-created_at').first()

    @staticmethod
    def has_feature(company, feature_code, user=None) -> bool:
        """
        Main enforcement check pipeline.
        Resolution Order: Tier -> Addon -> Tenant Settings -> Role
        """
        if not company:
            # If no company, but user is platform super admin, allow.
            if user and user.is_platform_super_admin:
                return True
            return False

        # 1. Base Subscription Validation
        subscription = SubscriptionService.get_active_subscription(company)
        
        if not subscription:
            return False
            
        if subscription.status == 'expired':
            # Expired tenants only get readonly access (can be a specific feature check)
            if feature_code == "readonly_dashboard":
                return True
            return False

        has_access = False

        # 2. Check Subscription Tier (JSON enabled_features or fallback to Legacy Mapping)
        # Check explicit JSON feature flag first
        enabled_features_json = subscription.enabled_features or {}
        if enabled_features_json.get(feature_code) is True:
            has_access = True
        
        # Fallback to Legacy Tier Fields
        if not has_access and feature_code in LEGACY_TIER_MAPPING:
            field_name = LEGACY_TIER_MAPPING[feature_code]
            tier = subscription.tier
            if hasattr(tier, field_name) and getattr(tier, field_name) is True:
                has_access = True

        # 3. Check Add-ons
        if not has_access:
            # Map standard features to addon types if they differ
            addon_mapping = {
                "voice_ai": "voice_entry",
                "analytics": "ai_analytics",
                "advanced_reports": "advanced_reporting",
                "whatsapp": "sms_alerts",
            }
            addon_type_to_check = addon_mapping.get(feature_code, feature_code)
            
            has_access = SubscriptionAddOnPurchase.objects.filter(
                subscription=subscription,
                status='active',
                addon__addon_type=addon_type_to_check
            ).exists()

        if not has_access:
            return False

        # 4. Check Tenant Settings (Tenant might disable a feature for their own company)
        # Example: company.settings.disable_voice_ai
        # For now, if the company model has feature settings, check here.
        # if hasattr(company, 'settings') and getattr(company.settings, f"disable_{feature_code}", False):
        #     return False

        # 5. Role Restriction
        # Handled at the view level or via specific `user` param if passed.
        # If the feature is fundamentally allowed for the tenant, return True here,
        # but let the `@subscription_required` or DRF Permission handle specific role access.

        return True

    @staticmethod
    def get_entitlements(company) -> list:
        """
        Returns a flat list of feature codes enabled for the company.
        Used by the frontend to dynamically hide/show UI elements.
        """
        if not company:
            return []

        subscription = SubscriptionService.get_active_subscription(company)
        if not subscription or subscription.status == 'expired':
            return []

        entitlements = set()

        # Gather from legacy tier fields
        tier = subscription.tier
        for feature_code, field_name in LEGACY_TIER_MAPPING.items():
            if hasattr(tier, field_name) and getattr(tier, field_name) is True:
                entitlements.add(feature_code)

        # Gather from JSON flag overrides
        if subscription.enabled_features:
            for feature_code, is_enabled in subscription.enabled_features.items():
                if is_enabled:
                    entitlements.add(feature_code)
                else:
                    entitlements.discard(feature_code)

        # Gather from Add-ons
        active_addons = SubscriptionAddOnPurchase.objects.filter(
            subscription=subscription, status='active'
        ).select_related('addon')
        
        # Reverse mapping from addon type to feature code
        reverse_addon_mapping = {
            "voice_entry": "voice_ai",
            "ai_analytics": "analytics",
            "advanced_reporting": "advanced_reports",
            "sms_alerts": "whatsapp",
        }
        
        for purchase in active_addons:
            if hasattr(purchase.addon, 'addon_type'):
                addon_type = purchase.addon.addon_type
                feature_code = reverse_addon_mapping.get(addon_type, addon_type)
                entitlements.add(feature_code)

        return sorted(list(entitlements))

    @staticmethod
    def check_quota(company, quota_code, amount=1) -> bool:
        """
        Verifies if the tenant has sufficient quota to perform an action.
        """
        subscription = SubscriptionService.get_active_subscription(company)
        if not subscription or subscription.status == 'expired':
            return False

        tier = subscription.tier

        if quota_code == "max_users":
            current_users = User.objects.filter(company=company, is_active=True).count()
            return (current_users + amount) <= tier.max_users
            
        elif quota_code == "max_storage_gb":
            return (subscription.storage_used_mb / 1024 + amount) <= tier.max_storage_gb
            
        # Additional quota logic can be added here
        return True
