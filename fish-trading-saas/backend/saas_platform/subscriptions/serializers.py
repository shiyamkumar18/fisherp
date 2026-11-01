from rest_framework import serializers

from .models import Subscription, SubscriptionTier


class SubscriptionTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionTier
        fields = [
            'id', 'name', 'description', 'max_users', 'max_storage_gb',
            'price_monthly', 'price_yearly', 'allow_analytics',
            'allow_advanced_reporting', 'priority_support', 'is_active',
            'display_order', 'is_recommended', 'trial_days', 'allow_api_access'
        ]
        read_only_fields = ['id']

class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        exclude = ['created_at', 'updated_at']
        read_only_fields = [
            'id', 'status', 'start_date', 'expiry_date', 'last_renewal_date',
            'last_payment_date', 'last_payment_amount', 'total_paid_till_date',
            'payment_method', 'payment_gateway_reference', 'storage_used_mb',
            'api_calls_this_month', 'tenant', 'company', 'enabled_features'
        ]

class PlatformSubscriptionSerializer(serializers.ModelSerializer):
    tier_name = serializers.CharField(source='tier.name', read_only=True)
    tenant_name = serializers.CharField(source='company.name', read_only=True)
    tenant_slug = serializers.CharField(source='company.slug', read_only=True)
    
    class Meta:
        model = Subscription
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'subscription_id', 'company']
