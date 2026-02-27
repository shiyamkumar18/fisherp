from django.db import models
from django.utils import timezone


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
    max_users = models.IntegerField(default=1)
    max_storage_gb = models.IntegerField(default=5)
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Feature flags
    allow_api_access = models.BooleanField(default=False)
    allow_analytics = models.BooleanField(default=False)
    allow_advanced_reporting = models.BooleanField(default=False)
    allow_multi_location = models.BooleanField(default=False)
    allow_custom_integrations = models.BooleanField(default=False)
    priority_support = models.BooleanField(default=False)
    
    # Usage limits
    max_purchases_per_month = models.PositiveIntegerField(null=True, blank=True, 
                                                          help_text="Max purchase records per month")
    max_sales_per_month = models.PositiveIntegerField(null=True, blank=True,
                                                     help_text="Max sale records per month")
    max_products = models.PositiveIntegerField(null=True, blank=True,
                                               help_text="Max number of products/fish types")
    max_suppliers = models.PositiveIntegerField(null=True, blank=True)
    max_buyers = models.PositiveIntegerField(null=True, blank=True)
    
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
    
    def get_features_list(self):
        """Return list of enabled features"""
        features = []
        if self.allow_api_access:
            features.append("API Access")
        if self.allow_analytics:
            features.append("Analytics Dashboard")
        if self.allow_advanced_reporting:
            features.append("Advanced Reporting")
        if self.allow_multi_location:
            features.append("Multi-location Support")
        if self.allow_custom_integrations:
            features.append("Custom Integrations")
        if self.priority_support:
            features.append("Priority Support")
        return features


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
                               help_text="Tenant/Owner of this subscription record")
    
    class Meta:
        ordering = ['-created_at']
    
    def is_active(self):
        return self.status == "active" and self.expiry_date and timezone.now() < self.expiry_date
    
    def days_remaining(self):
        if not self.expiry_date:
            return None
        from datetime import timedelta
        return (self.expiry_date - timezone.now()).days
    
    def is_expiring_soon(self, days=7):
        """Check if subscription is expiring within given days"""
        remaining = self.days_remaining()
        return remaining is not None and 0 < remaining <= days
    
    def can_use_feature(self, feature_name):
        """Check if a specific feature is enabled"""
        return self.enabled_features.get(feature_name, False)
    
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
