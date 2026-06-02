from rest_framework import serializers

from .models import Subscription, SubscriptionTier


class SubscriptionTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionTier
        fields = [
            'id', 'name', 'description', 'max_users', 'max_storage_gb',
            'price_monthly', 'price_yearly', 'allow_analytics',
            'allow_advanced_reporting', 'priority_support', 'is_active',
            'display_order', 'is_recommended', 'trial_days'
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
            'signups_this_month', 'purchases_this_month', 'sales_this_month',
            'api_calls_this_month', 'tenant', 'company', 'enabled_features'
        ]
