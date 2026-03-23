from django.contrib import admin
from .models import SubscriptionTier, Subscription, SubscriptionAddOn, SubscriptionAddOnPurchase


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
        model_fields = {f.name for f in self.model._meta.get_fields()}
        if request.user.company and 'company' in model_fields:
            return qs.filter(company=request.user.company)
        if 'tenant' in model_fields:
            return qs.filter(tenant=request.user)
        return qs
    
    def has_view_permission(self, request, obj=None):
        """Check if user can view objects"""
        if request.user.is_superuser:
            return True
        if obj is not None:
            if hasattr(obj, 'company') and obj.company and request.user.company:
                return obj.company_id == request.user.company_id
            if hasattr(obj, 'tenant') and obj.tenant:
                return obj.tenant == request.user
            return True
        return True
    
    def has_change_permission(self, request, obj=None):
        """Check if user can change objects"""
        if request.user.is_superuser:
            return True
        if obj is not None:
            if hasattr(obj, 'company') and obj.company and request.user.company:
                return obj.company_id == request.user.company_id
            if hasattr(obj, 'tenant') and obj.tenant:
                return obj.tenant == request.user
            return True
        return True
    
    def has_delete_permission(self, request, obj=None):
        """Check if user can delete objects"""
        if request.user.is_superuser:
            return True
        if obj is not None:
            if hasattr(obj, 'company') and obj.company and request.user.company:
                return obj.company_id == request.user.company_id
            if hasattr(obj, 'tenant') and obj.tenant:
                return obj.tenant == request.user
            return True
        return True
    
    def has_add_permission(self, request):
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
        'allow_advanced_analytics',
        'allow_multi_location',
        'allow_custom_integrations',
        'allow_priority_support'
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
        ('User Limits', {
            'fields': (
                'max_users', 
                'max_storage_gb',
            )
        }),
        ('Basic Plan Features', {
            'fields': (
                # Purchase & Sale
                'allow_purchase_entry',
                'allow_sale_entry',
                'allow_auto_profit_calculation',
                'allow_batch_based_selling',
                'allow_payment_tracking',
                # Inventory
                'allow_inventory',
                'allow_remaining_stock_update',
                'allow_expiry_tracking',
                'allow_low_stock_alert',
                # Dashboard
                'allow_today_sales',
                'allow_today_profit',
                'allow_outstanding_receivables',
                'allow_inventory_value',
                'allow_sales_trend',
                # Users & Access
                'allow_tenant_admin',
                'allow_staff_users',
                'allow_role_based_access',
            )
        }),
        ('Premium Plan Features', {
            'fields': (
                # Analytics
                'allow_advanced_analytics',
                'allow_profit_by_fish',
                'allow_profit_by_supplier',
                'allow_batch_profit_analysis',
                'allow_monthly_comparison',
                # Credit & Risk
                'allow_credit_risk_alert',
                'allow_overdue_alert',
                'allow_advanced_receivable',
                # Quality & Commission
                'allow_quality_grading',
                'allow_commission_tracking',
                'allow_supplier_performance',
                # AI Features
                'allow_ai_alerts',
                'allow_expiry_risk_alert',
                'allow_demand_prediction',
                'allow_profit_anomaly_detection',
                # Reports
                'allow_csv_export',
                'allow_pdf_reports',
            )
        }),
        ('Enterprise Plan Features', {
            'fields': (
                # Multi-location
                'allow_multi_location',
                'allow_stock_transfer',
                # Advanced Compliance
                'allow_advanced_gst',
                'allow_detailed_tax_reporting',
                'allow_audit_logs',
                'allow_activity_history',
                # Logistics
                'allow_driver_tracking',
                'allow_delivery_tracking',
                'allow_transport_management',
                # Cold Storage
                'allow_temperature_monitoring',
                'allow_storage_alerts',
                # Technical
                'allow_api_access',
                'allow_custom_domain',
                'allow_priority_support',
                'allow_dedicated_onboarding',
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


@admin.register(SubscriptionAddOn)
class SubscriptionAddOnAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'addon_type',
        'price_monthly',
        'price_yearly',
        'is_active',
        'display_order'
    )
    list_filter = (
        'is_active',
        'addon_type'
    )
    search_fields = ('name', 'description')
    ordering = ('display_order', 'price_monthly')


@admin.register(SubscriptionAddOnPurchase)
class SubscriptionAddOnPurchaseAdmin(TenantIsolationAdminMixin, admin.ModelAdmin):
    list_display = (
        'subscription',
        'addon',
        'status',
        'start_date',
        'expiry_date',
        'price_paid'
    )
    list_filter = (
        'status',
        'addon'
    )
    search_fields = (
        'subscription__tier__name',
        'addon__name'
    )
    date_hierarchy = 'start_date'
