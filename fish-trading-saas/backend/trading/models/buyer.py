from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError

from .fish import Fish
from services.base import CompanyManager


class Buyer(models.Model):
    """Buyer/Customer model with tenant isolation"""
    BUYER_TYPE_CHOICES = [
        ('retail', 'Retail Customer'),
        ('wholesale', 'Wholesale Buyer'),
        ('export', 'Export'),
        ('restaurant', 'Restaurant/Hotel'),
        ('hotel', 'Hotel'),
    ]
    
    REFERRAL_SOURCE_CHOICES = [
        ('walk_in', 'Walk-in'),
        ('referral', 'Customer Referral'),
        ('online', 'Online/Website'),
        ('social_media', 'Social Media'),
        ('advertisement', 'Advertisement'),
        ('broker', 'Broker/Agent'),
        ('other', 'Other'),
    ]
    
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    
    buyer_type = models.CharField(max_length=20, choices=BUYER_TYPE_CHOICES, default='retail')
    
    # Business info for wholesale/export buyers
    business_name = models.CharField(max_length=200, blank=True, null=True)
    gst_number = models.CharField(max_length=50, blank=True, null=True)
    
    # Preferred fish types
    preferred_fish_types = models.ManyToManyField(Fish, blank=True, related_name='preferred_by_buyers')
    
    # Delivery preferences
    preferred_delivery_time = models.CharField(max_length=50, blank=True, null=True,
                                               help_text="e.g., Morning, Afternoon, Evening")
    delivery_instructions = models.TextField(blank=True, null=True)
    
    # Pricing and discounts
    default_discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                                   help_text="Default discount percentage")
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_credit_allowed = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_credit_repaid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    current_credit_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Rating and CRM
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=5.00,
                                 help_text="Rating from 0.00 to 5.00")
    referral_source = models.CharField(max_length=20, choices=REFERRAL_SOURCE_CHOICES, blank=True, null=True)
    referred_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, 
                                    related_name='referrals')
    date_of_birth = models.DateField(null=True, blank=True, help_text="For birthday offers")
    anniversary_date = models.DateField(null=True, blank=True, help_text="For anniversary offers")
    total_purchases = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_orders = models.PositiveIntegerField(default=0)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_preferred = models.BooleanField(default=False, help_text="Preferred customer status")
    is_verified = models.BooleanField(default=False, help_text="Verified buyer")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Tenant isolation - ForeignKey to User (tenant) with index for performance
    tenant = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='buyers',
                               db_index=True,
                               null=True, blank=True,
                               help_text="Tenant/Owner of this buyer record")
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='buyer_records',
        db_index=True,
        null=True,
        blank=True,
        help_text="Company this buyer belongs to",
    )
    
    is_deleted = models.BooleanField(default=False, help_text="Soft delete flag")
    
    objects = CompanyManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ['name']
        # Unique per tenant
        unique_together = ['name', 'phone', 'tenant']
        indexes = [
            models.Index(fields=['tenant', 'name']),
            models.Index(fields=['tenant', 'is_active']),
            models.Index(fields=['tenant', 'is_preferred']),
            models.Index(fields=['company', 'name']),
            models.Index(fields=['company', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_buyer_type_display()})"

    def save(self, *args, **kwargs):
        # Keep company and tenant pointers aligned for backward compatibility.
        if not self.company_id and self.tenant_id and self.tenant.company_id:
            self.company = self.tenant.company
        if not self.tenant_id and self.company_id and self.company.admin_id:
            self.tenant = self.company.admin
        if self.tenant_id and self.company_id and self.tenant.company_id and self.tenant.company_id != self.company_id:
            raise ValidationError({'company': 'Company must match tenant owner company.'})
        super().save(*args, **kwargs)
    
    def update_credit_balance(self):
        """Recalculate current credit balance"""
        self.current_credit_balance = self.total_credit_allowed - self.total_credit_repaid
        self.save(update_fields=['current_credit_balance'])
    
    def get_total_pending(self):
        """Get total pending amount from all sales"""
        return self.sales.filter(payment_status__in=['pending', 'partial']).aggregate(
            total=models.Sum('pending_amount')
        )['total'] or Decimal("0.00")
