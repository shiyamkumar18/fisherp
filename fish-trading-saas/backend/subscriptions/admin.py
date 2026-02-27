from django.contrib import admin
from .models import SubscriptionTier, Subscription


class TenantIsolationAdminMixin:
    """
    Mixin to provide tenant isolation for admin classes.
    Ensures that non-superusers can only see/manage their own tenant's data.
    """
    
    def get_queryset(self, request):
        """Filter by tenant for non-superusers"""
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        # Filter by tenant if the model has tenant field
        if hasattr(self.model, '_meta') and 'tenant' in [f.name for f in self.model._meta.get_fields()]:
            return qs.filter(tenant=request.user)
        return qs
    
    def has_view_permission(self, request, obj=None):
        """Check if user can view objects"""
        if request.user.is_superuser:
            return True
        if obj is not None:
            # Check if object has tenant and belongs to user's tenant
            if hasattr(obj, 'tenant') and obj.tenant:
                return obj.tenant == request.user
            return True
        return True
    
    def has_change_permission(self, request, obj=None):
        """Check if user can change objects"""
        if request.user.is_superuser:
            return True
        if obj is not None:
            if hasattr(obj, 'tenant') and obj.tenant:
                return obj.tenant == request.user
            return True
        return True
    
    def has_delete_permission(self, request, obj=None):
        """Check if user can delete objects"""
        if request.user.is_superuser:
            return True
        if obj is not None:
            if hasattr(obj, 'tenant') and obj.tenant:
                return obj.tenant == request.user
            return True
        return True
    
    def has_add_permission(self, request):
        """Check if user can add objects"""
        return True


@admin.register(SubscriptionTier)
class SubscriptionTierAdmin(admin.ModelAdmin):
    list_display = (
        'name', 
        'display_order',
        'max_users', 
        'max_storage_gb', 
        'price_monthly', 
        'price_yearly',
        'is_active',
        'is_recommended',
        'trial_days'
    )
    list_filter = (
        'is_active', 
        'is_recommended',
        'allow_api_access', 
        'allow_analytics',
        'allow_advanced_reporting',
        'allow_multi_location',
        'allow_custom_integrations',
        'priority_support'
    )
    search_fields = ('name', 'description')
    ordering = ('display_order', 'price_monthly')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'is_active', 'is_recommended', 'display_order')
        }),
        ('Pricing', {
            'fields': ('price_monthly', 'price_yearly', 'trial_days')
        }),
        ('Usage Limits', {
            'fields': (
                'max_users', 
                'max_storage_gb',
                'max_purchases_per_month',
                'max_sales_per_month',
                'max_products',
                'max_suppliers',
                'max_buyers'
            )
        }),
        ('Feature Flags', {
            'fields': (
                'allow_api_access',
                'allow_analytics',
                'allow_advanced_reporting',
                'allow_multi_location',
                'allow_custom_integrations',
                'priority_support'
            )
        }),
    )


@admin.register(Subscription)
class SubscriptionAdmin(TenantIsolationAdminMixin, admin.ModelAdmin):
    list_display = (
        'tier', 
        'status', 
        'billing_cycle',
        'start_date', 
        'expiry_date', 
        'is_active', 
        'days_remaining',
        'auto_renewal',
        'last_payment_date'
    )
    list_filter = (
        'status', 
        'tier', 
        'billing_cycle',
        'auto_renewal',
        'start_date',
        'last_payment_date'
    )
    search_fields = (
        'billing_email', 
        'gstin',
        'payment_gateway_reference'
    )
    date_hierarchy = 'start_date'
    
    fieldsets = (
        ('Subscription Info', {
            'fields': (
                'tier', 
                'status', 
                'start_date', 
                'expiry_date',
                'last_renewal_date',
                'auto_renewal'
            )
        }),
        ('Billing Information', {
            'fields': (
                'billing_email', 
                'billing_address', 
                'gstin',
                'billing_cycle'
            )
        }),
        ('Payment Tracking', {
            'fields': (
                'last_payment_date',
                'last_payment_amount',
                'total_paid_till_date',
                'payment_method',
                'payment_gateway_reference'
            )
        }),
        ('Usage Tracking', {
            'fields': (
                'storage_used_mb', 
                'signups_this_month',
                'purchases_this_month',
                'sales_this_month',
                'api_calls_this_month'
            )
        }),
        ('Feature Flags', {
            'fields': ('enabled_features',),
            'classes': ('collapse',)
        }),
        ('Notifications', {
            'fields': (
                'renewal_reminder_sent',
                'expiry_warning_sent'
            )
        }),
        ('Cancellation', {
            'fields': (
                'cancellation_requested_at',
                'cancellation_reason'
            )
        }),
    )
    
    readonly_fields = (
        'start_date',
        'created_at',
        'updated_at',
        'days_remaining'
    )
