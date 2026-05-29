from django.db import models
from django.utils import timezone
import math


class SubscriptionTier(models.Model):
    """Subscription tiers for different plan levels"""
    
    TIER_CHOICES = [
        ("free", "Free Trial"),
        ("basic", "Basic"),
        ("premium", "Premium"),
        ("enterprise", "Enterprise"),
    ]
    
    name = models.CharField(max_length=50, choices=TIER_CHOICES, unique=True)
    description = models.TextField(blank=True, null=True, help_text="Plan description")
    
    # User limits
    max_users = models.IntegerField(default=1)
    max_storage_gb = models.IntegerField(default=5)
    
    # Pricing
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Legacy compatibility fields retained for API/test stability.
    allow_analytics = models.BooleanField(default=False)
    allow_advanced_reporting = models.BooleanField(default=False)
    priority_support = models.BooleanField(default=False)
    max_purchases_per_month = models.PositiveIntegerField(
        null=True, blank=True, help_text="Max purchase records per month"
    )
    max_sales_per_month = models.PositiveIntegerField(
        null=True, blank=True, help_text="Max sale records per month"
    )
    max_products = models.PositiveIntegerField(
        null=True, blank=True, help_text="Max number of products/fish types"
    )
    max_suppliers = models.PositiveIntegerField(null=True, blank=True)
    max_buyers = models.PositiveIntegerField(null=True, blank=True)
    
    # =================
    # BASIC PLAN FEATURES (Low price - Max 3 users)
    # Core Trading Features
    # =================
    # Purchase & Sale
    allow_purchase_entry = models.BooleanField(default=False, help_text="Purchase batch entry")
    allow_sale_entry = models.BooleanField(default=False, help_text="Sale entry")
    allow_auto_profit_calculation = models.BooleanField(default=False, help_text="Auto profit calculation")
    allow_batch_based_selling = models.BooleanField(default=False, help_text="Batch-based selling")
    allow_payment_tracking = models.BooleanField(default=False, help_text="Payment tracking (Customer & Supplier)")
    
    # Inventory
    allow_inventory = models.BooleanField(default=False, help_text="Inventory management")
    allow_remaining_stock_update = models.BooleanField(default=False, help_text="Remaining stock auto-update")
    allow_expiry_tracking = models.BooleanField(default=False, help_text="Expiry tracking")
    allow_low_stock_alert = models.BooleanField(default=False, help_text="Low stock alert")
    
    # Dashboard (Simple)
    allow_today_sales = models.BooleanField(default=False, help_text="Today Sales")
    allow_today_profit = models.BooleanField(default=False, help_text="Today Profit")
    allow_outstanding_receivables = models.BooleanField(default=False, help_text="Outstanding Receivables")
    allow_inventory_value = models.BooleanField(default=False, help_text="Inventory Value")
    allow_sales_trend = models.BooleanField(default=False, help_text="Sales Trend (7-30 days)")
    
    # Users & Access
    allow_tenant_admin = models.BooleanField(default=False, help_text="1 Tenant Admin")
    allow_staff_users = models.BooleanField(default=False, help_text="2 Staff users")
    allow_role_based_access = models.BooleanField(default=False, help_text="Role-based access")
    
    # Subscription
    allow_monthly_billing = models.BooleanField(default=False, help_text="Monthly billing")
    allow_free_trial = models.BooleanField(default=False, help_text="Free trial")
    
    # =================
    # PREMIUM PLAN FEATURES (Medium price - Up to 10 users)
    # Advanced Business Features
    # =================
    # Analytics
    allow_advanced_analytics = models.BooleanField(default=False, help_text="20+ dashboard reports")
    allow_profit_by_fish = models.BooleanField(default=False, help_text="Profit by Fish")
    allow_profit_by_supplier = models.BooleanField(default=False, help_text="Profit by Supplier")
    allow_batch_profit_analysis = models.BooleanField(default=False, help_text="Batch profit analysis")
    allow_monthly_comparison = models.BooleanField(default=False, help_text="Monthly comparison charts")
    
    # Credit & Risk
    allow_credit_risk_alert = models.BooleanField(default=False, help_text="Credit risk alert")
    allow_overdue_alert = models.BooleanField(default=False, help_text="Overdue alert system")
    allow_advanced_receivable = models.BooleanField(default=False, help_text="Advanced receivable tracking")
    
    # Quality & Commission
    allow_quality_grading = models.BooleanField(default=False, help_text="Quality grading")
    allow_commission_tracking = models.BooleanField(default=False, help_text="Commission tracking")
    allow_supplier_performance = models.BooleanField(default=False, help_text="Supplier performance rating")
    
    # AI Features (Starter AI)
    allow_ai_alerts = models.BooleanField(default=False, help_text="AI Alerts (Expiry risk, Demand prediction, Profit anomaly)")
    allow_expiry_risk_alert = models.BooleanField(default=False, help_text="Expiry risk alert")
    allow_demand_prediction = models.BooleanField(default=False, help_text="Demand prediction suggestion")
    allow_profit_anomaly_detection = models.BooleanField(default=False, help_text="Profit anomaly detection")
    
    # Reports
    allow_csv_export = models.BooleanField(default=False, help_text="CSV export")
    allow_pdf_reports = models.BooleanField(default=False, help_text="PDF reports")
    
    # =================
    # ENTERPRISE PLAN FEATURES (High price - Unlimited users)
    # Advanced Operations
    # =================
    # Multi-location
    allow_multi_location = models.BooleanField(default=False, help_text="Multiple warehouses")
    allow_stock_transfer = models.BooleanField(default=False, help_text="Stock transfer between locations")
    
    # Advanced Compliance
    allow_advanced_gst = models.BooleanField(default=False, help_text="Advanced GST logic")
    allow_detailed_tax_reporting = models.BooleanField(default=False, help_text="Detailed tax reporting")
    allow_audit_logs = models.BooleanField(default=False, help_text="Full audit logs")
    allow_activity_history = models.BooleanField(default=False, help_text="Activity history tracking")
    
    # Logistics
    allow_driver_tracking = models.BooleanField(default=False, help_text="Driver tracking")
    allow_delivery_tracking = models.BooleanField(default=False, help_text="Delivery tracking")
    allow_transport_management = models.BooleanField(default=False, help_text="Transport management")
    
    # Cold Storage
    allow_temperature_monitoring = models.BooleanField(default=False, help_text="Temperature monitoring")
    allow_storage_alerts = models.BooleanField(default=False, help_text="Storage condition alerts")
    
    # Technical
    allow_api_access = models.BooleanField(default=False, help_text="API access")
    allow_custom_domain = models.BooleanField(default=False, help_text="Custom domain")
    allow_priority_support = models.BooleanField(default=False, help_text="Priority support")
    allow_dedicated_onboarding = models.BooleanField(default=False, help_text="Dedicated onboarding")
    
    # Original feature flags (kept for backward compatibility)
    allow_custom_integrations = models.BooleanField(default=False)
    
    # Display settings
    is_active = models.BooleanField(default=True, help_text="Show this plan to customers")
    display_order = models.PositiveIntegerField(default=0, help_text="Display order in pricing page")
    is_recommended = models.BooleanField(default=False, help_text="Mark as recommended plan")
    trial_days = models.PositiveIntegerField(default=0, help_text="Free trial days for this tier")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['display_order', 'price_monthly']
    
    def __str__(self):
        return self.name.title()
    
    def get_features_list(self):  # noqa: C901
        """Return list of enabled features"""
        features = []
        
        # Basic features
        if self.allow_purchase_entry:
            features.append("Purchase Batch Entry")
        if self.allow_sale_entry:
            features.append("Sale Entry")
        if self.allow_auto_profit_calculation:
            features.append("Auto Profit Calculation")
        if self.allow_batch_based_selling:
            features.append("Batch-based Selling")
        if self.allow_payment_tracking:
            features.append("Payment Tracking")
        if self.allow_inventory:
            features.append("Inventory Management")
        if self.allow_remaining_stock_update:
            features.append("Remaining Stock Auto-update")
        if self.allow_expiry_tracking:
            features.append("Expiry Tracking")
        if self.allow_low_stock_alert:
            features.append("Low Stock Alert")
        
        # Dashboard features
        if self.allow_today_sales:
            features.append("Today Sales")
        if self.allow_today_profit:
            features.append("Today Profit")
        if self.allow_outstanding_receivables:
            features.append("Outstanding Receivables")
        if self.allow_inventory_value:
            features.append("Inventory Value")
        if self.allow_sales_trend:
            features.append("Sales Trend")
        
        # Premium features
        if self.allow_advanced_analytics:
            features.append("Advanced Analytics")
        if self.allow_analytics:
            features.append("Analytics Dashboard")
        if self.allow_profit_by_fish:
            features.append("Profit by Fish")
        if self.allow_profit_by_supplier:
            features.append("Profit by Supplier")
        if self.allow_quality_grading:
            features.append("Quality Grading")
        if self.allow_commission_tracking:
            features.append("Commission Tracking")
        if self.allow_ai_alerts:
            features.append("AI Alerts")
        if self.allow_csv_export:
            features.append("CSV Export")
        if self.allow_pdf_reports:
            features.append("PDF Reports")
        if self.allow_advanced_reporting:
            features.append("Advanced Reporting")

        # Enterprise features
        if self.allow_multi_location:
            features.append("Multi-location")
            features.append("Multi-location Support")
        if self.allow_driver_tracking:
            features.append("Driver Tracking")
        if self.allow_temperature_monitoring:
            features.append("Temperature Monitoring")
        if self.allow_audit_logs:
            features.append("Audit Logs")
        if self.allow_api_access:
            features.append("API Access")
        if self.allow_priority_support:
            features.append("Priority Support")
        if self.priority_support:
            features.append("Priority Support")
        if self.allow_custom_integrations:
            features.append("Custom Integrations")
        
        return sorted(set(features))
    
    def get_tier_level(self):
        """Return tier level name"""
        tier_names = {
            'free': 'Free Trial',
            'basic': 'Basic',
            'premium': 'Premium',
            'enterprise': 'Enterprise'
        }
        return tier_names.get(self.name, 'Unknown')
    
    def is_basic_plan(self):
        """Check if this is a Basic tier"""
        return self.name == 'basic'
    
    def is_premium_plan(self):
        """Check if this is a Premium tier"""
        return self.name == 'premium'
    
    def is_enterprise_plan(self):
        """Check if this is an Enterprise tier"""
        return self.name == 'enterprise'


class SubscriptionAddOn(models.Model):
    """Optional paid add-ons for subscription"""
    
    ADDON_TYPE_CHOICES = [
        ("voice_entry", "Voice-to-Entry Module"),
        ("ai_analytics", "AI Analytics Module"),
        ("advanced_reporting", "Advanced Reporting Module"),
        ("sms_alerts", "SMS Alert Module"),
    ]
    
    name = models.CharField(max_length=100)
    addon_type = models.CharField(max_length=30, choices=ADDON_TYPE_CHOICES, unique=True)
    description = models.TextField(blank=True, null=True)
    
    # Pricing
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Features
    features = models.JSONField(default=dict, blank=True, help_text="Add-on features as JSON")
    
    # Display
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['display_order', 'price_monthly']
    
    def __str__(self):
        return self.name


class SubscriptionAddOnPurchase(models.Model):
    """Track purchased add-ons for each subscription"""
    
    subscription = models.ForeignKey('Subscription', on_delete=models.CASCADE, related_name='addon_purchases')
    addon = models.ForeignKey(SubscriptionAddOn, on_delete=models.PROTECT)
    
    # Status
    STATUS_CHOICES = [
        ("active", "Active"),
        ("expired", "Expired"),
        ("cancelled", "Cancelled"),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    
    # Dates
    start_date = models.DateTimeField(auto_now_add=True)
    expiry_date = models.DateTimeField(null=True, blank=True)
    
    # Payment
    price_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.subscription} - {self.addon.name}"


class Subscription(models.Model):
    """Tracks subscription status per tenant schema"""
    
    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("suspended", "Suspended"),
        ("expired", "Expired"),
        ("cancelled", "Cancelled"),
        ("pending", "Pending Payment"),
    ]
    
    BILLING_CYCLE_CHOICES = [
        ("monthly", "Monthly"),
        ("quarterly", "Quarterly"),
        ("yearly", "Yearly"),
    ]
    
    tier = models.ForeignKey(SubscriptionTier, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    start_date = models.DateTimeField(auto_now_add=True)
    expiry_date = models.DateTimeField(null=True, blank=True)
    last_renewal_date = models.DateTimeField(null=True, blank=True)
    
    # Billing fields  
    billing_email = models.CharField(max_length=200, blank=True, null=True)
    billing_address = models.TextField(blank=True, null=True)
    gstin = models.CharField(max_length=50, blank=True, null=True)
    billing_cycle = models.CharField(max_length=15, choices=BILLING_CYCLE_CHOICES, default="monthly")
    auto_renewal = models.BooleanField(default=True, help_text="Auto-renew subscription")
    
    # Payment tracking
    last_payment_date = models.DateTimeField(null=True, blank=True)
    last_payment_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_paid_till_date = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=50, blank=True, null=True, 
                                      help_text="e.g., Credit Card, Bank Transfer, UPI")
    payment_gateway_reference = models.CharField(max_length=200, blank=True, null=True,
                                                 help_text="Payment gateway transaction ID")
    
    # Usage tracking  
    storage_used_mb = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    signups_this_month = models.PositiveIntegerField(default=0)
    
    # Feature flags (JSON for flexibility)
    enabled_features = models.JSONField(default=dict, blank=True,
                                        help_text="Feature flags enabled for this subscription")
    
    # Usage counters
    purchases_this_month = models.PositiveIntegerField(default=0)
    sales_this_month = models.PositiveIntegerField(default=0)
    api_calls_this_month = models.PositiveIntegerField(default=0)
    
    # Notifications
    renewal_reminder_sent = models.BooleanField(default=False)
    expiry_warning_sent = models.BooleanField(default=False)
    
    # Cancellation
    cancellation_requested_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Tenant isolation - ForeignKey to User (tenant) with index for performance
    tenant = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='subscriptions',
                               db_index=True,
                               null=True, blank=True,
                               help_text="DEPRECATED: Tenant/Owner of this subscription record")
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='subscriptions',
        db_index=True,
        help_text="Company this subscription belongs to",
    )
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='created_subscriptions', help_text="User who created this record")
    updated_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='updated_subscriptions', help_text="User who last updated this record")
    
    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not getattr(self, 'company_id', None):
            raise ValueError("Company is required for Subscription.")
        super().save(*args, **kwargs)
    
    def is_active(self):
        return self.status == "active" and self.expiry_date and timezone.now() < self.expiry_date
    
    def days_remaining(self):
        if not self.expiry_date:
            return None
        seconds = (self.expiry_date - timezone.now()).total_seconds()
        if seconds <= 0:
            return 0
        return math.ceil(seconds / 86400)
    
    def is_expiring_soon(self, days=7):
        """Check if subscription is expiring within given days"""
        remaining = self.days_remaining()
        return remaining is not None and 0 < remaining <= days
    
    def can_use_feature(self, feature_name):
        """Check if a specific feature is enabled"""
        if self.enabled_features.get(feature_name, False):
            return True
        return self.can_use_tier_feature(feature_name)
    
    def can_use_tier_feature(self, feature_name):
        """Check if feature is available in subscription tier"""
        tier = self.tier
        # Check if the tier has this feature attribute
        if hasattr(tier, feature_name):
            return getattr(tier, feature_name, False)
        return False
    
    def has_addon(self, addon_type):
        """Check if subscription has a specific add-on"""
        from django.utils import timezone
        return self.addon_purchases.filter(
            addon__addon_type=addon_type,
            status='active'
        ).filter(
            models.Q(expiry_date__isnull=True)
            | models.Q(expiry_date__gte=timezone.now())
        ).exists()
    
    def get_active_addons(self):
        """Get all active add-ons for this subscription"""
        from django.utils import timezone
        return self.addon_purchases.filter(
            status='active'
        ).filter(
            models.Q(expiry_date__isnull=True)
            | models.Q(expiry_date__gte=timezone.now())
        )
    
    def can_access_feature(self, feature_name):
        """
        Check if user can access a feature through tier or add-ons.
        This is the main method to check feature access.
        """
        # First check tier-level feature
        if self.can_use_tier_feature(feature_name):
            return True
        
        # Then check add-ons
        # Map feature names to add-on types
        feature_to_addon_map = {
            'voice_entry': 'voice_entry',
            'ai_analytics': 'ai_analytics',
            'advanced_reporting_addon': 'advanced_reporting',
            'sms_alerts': 'sms_alerts',
        }
        
        addon_type = feature_to_addon_map.get(feature_name)
        if addon_type and self.has_addon(addon_type):
            return True
        
        return False
    
    def get_tier_features(self):
        """Get all features enabled in the tier"""
        return self.tier.get_features_list()
    
    def get_all_features(self):
        """Get all features including from active add-ons"""
        features = set(self.get_tier_features())
        
        # Add features from active add-ons
        for addon_purchase in self.get_active_addons():
            addon_features = addon_purchase.addon.features or {}
            if isinstance(addon_features, dict):
                features.update(addon_features.get('features', []))
            elif isinstance(addon_features, list):
                features.update(addon_features)
        
        return list(features)
    
    def record_payment(self, amount, payment_method=None, gateway_ref=None):
        """Record a new payment"""
        self.last_payment_date = timezone.now()
        self.last_payment_amount = amount
        self.total_paid_till_date += amount
        if payment_method:
            self.payment_method = payment_method
        if gateway_ref:
            self.payment_gateway_reference = gateway_ref
        self.save(update_fields=['last_payment_date', 'last_payment_amount', 
                                 'total_paid_till_date', 'payment_method', 
                                 'payment_gateway_reference'])
    
    def __str__(self):
        return f"{self.tier.name} - {self.status}"
