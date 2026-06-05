from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError, ObjectDoesNotExist

from .fish import Fish
from services.base import CompanyManager


class Buyer(models.Model):
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
    business_name = models.CharField(max_length=200, blank=True, null=True)
    gst_number = models.CharField(max_length=50, blank=True, null=True)
    preferred_fish_types = models.ManyToManyField(Fish, blank=True, related_name='preferred_by_buyers')
    preferred_delivery_time = models.CharField(max_length=50, blank=True, null=True,
                                               help_text="e.g., Morning, Afternoon, Evening")
    delivery_instructions = models.TextField(blank=True, null=True)
    default_discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                                   help_text="Default discount percentage")
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_credit_allowed = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_credit_repaid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    current_credit_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    risk_score = models.PositiveIntegerField(default=0, help_text="Risk score from 0 to 100")
    overdue_invoices_count = models.PositiveIntegerField(default=0)
    average_payment_delay_days = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    bounced_payments_count = models.PositiveIntegerField(default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=5.00,
                                 help_text="Rating from 0.00 to 5.00")
    referral_source = models.CharField(max_length=20, choices=REFERRAL_SOURCE_CHOICES, blank=True, null=True)
    referred_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='referrals')
    date_of_birth = models.DateField(null=True, blank=True, help_text="For birthday offers")
    anniversary_date = models.DateField(null=True, blank=True, help_text="For anniversary offers")
    total_purchases = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_orders = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_preferred = models.BooleanField(default=False, help_text="Preferred customer status")
    is_verified = models.BooleanField(default=False, help_text="Verified buyer")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    tenant = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='buyers',
                               db_index=True, null=True, blank=True,
                               help_text="DEPRECATED: Tenant/Owner of this buyer record")
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE,
                                related_name='buyer_records', db_index=True,
                                help_text="Company this buyer belongs to")
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='created_buyers', help_text="User who created this record")
    updated_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='updated_buyers', help_text="User who last updated this record")
    is_deleted = models.BooleanField(default=False, help_text="Soft delete flag")

    objects = CompanyManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ['name']
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
        if not getattr(self, 'company_id', None):
            if getattr(self, 'tenant_id', None) and getattr(self.tenant, 'company_id', None):
                self.company_id = self.tenant.company_id
            else:
                raise ValidationError({'company': 'Company is required.'})
        super().save(*args, **kwargs)

    def update_credit_balance(self):
        total_allowed = self.total_credit_allowed or Decimal('0.00')
        total_repaid = self.total_credit_repaid or Decimal('0.00')
        self.current_credit_balance = total_allowed - total_repaid
        self.save(update_fields=['current_credit_balance'])

    def get_total_pending(self):
        from .sale import Sale
        return Sale.objects.filter(
            buyer=self,
            payment_status__in=['pending', 'partial']
        ).aggregate(
            total=models.Sum('pending_amount')
        )['total'] or Decimal("0.00")

    @property
    def risk_category(self):
        if self.risk_score <= 30:
            return 'green'
        elif self.risk_score <= 70:
            return 'yellow'
        return 'red'
