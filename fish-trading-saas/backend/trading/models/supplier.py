from decimal import Decimal
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError

from services.base import CompanyManager


class Supplier(models.Model):
    SUPPLIER_TYPE_CHOICES = [
        ('individual', 'Individual Fisherman'),
        ('company', 'Company/Cooperative'),
        ('broker', 'Broker/Agent'),
    ]
    PAYMENT_TERM_CHOICES = [
        ('immediate', 'Immediate'),
        ('7_days', '7 Days'),
        ('15_days', '15 Days'),
        ('30_days', '30 Days'),
        ('45_days', '45 Days'),
        ('60_days', '60 Days'),
        ('90_days', '90 Days'),
    ]

    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    alternate_phone = models.CharField(max_length=15, blank=True, null=True,
                                       help_text="Secondary contact number")
    address = models.TextField(blank=True, null=True)
    place_of_origin = models.CharField(max_length=200, blank=True, null=True,
                                       help_text="Main fishing area/port")
    id_number = models.CharField(max_length=50, blank=True, null=True, unique=True,
                                 help_text="ID card or license number")
    supplier_type = models.CharField(max_length=15, choices=SUPPLIER_TYPE_CHOICES, default='individual')
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    bank_account = models.CharField(max_length=50, blank=True, null=True)
    bank_ifsc = models.CharField(max_length=20, blank=True, null=True)
    emergency_contact_name = models.CharField(max_length=150, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=15, blank=True, null=True)
    contract_start_date = models.DateField(null=True, blank=True)
    contract_end_date = models.DateField(null=True, blank=True)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                          help_text="Commission percentage (e.g., 5.00 for 5%)")
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=5.00,
                                 help_text="Rating from 0.00 to 5.00")
    total_deliveries = models.PositiveIntegerField(default=0)
    on_time_deliveries = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False, help_text="Verified supplier")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    tenant = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='suppliers',
                               db_index=True, null=True, blank=True,
                               help_text="Tenant/Owner of this supplier record")
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE,
                                related_name='supplier_records', db_index=True,
                                null=True, blank=True,
                                help_text="Company this supplier belongs to")
    is_deleted = models.BooleanField(default=False, help_text="Soft delete flag")
    payment_terms = models.CharField(max_length=15, choices=PAYMENT_TERM_CHOICES, default='immediate',
                                     help_text="Payment terms for this supplier")
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0,
                                       help_text="Maximum credit allowed")
    payment_due_date = models.DateField(null=True, blank=True, help_text="Next payment due date")
    total_purchases = models.DecimalField(max_digits=12, decimal_places=2, default=0,
                                          help_text="Total purchase amount")
    total_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0,
                                     help_text="Total amount paid")
    outstanding_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0,
                                             help_text="Current outstanding balance")
    total_credit_given = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_credit_repaid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    current_credit_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    last_purchase_date = models.DateField(null=True, blank=True)
    last_payment_date = models.DateField(null=True, blank=True)

    objects = CompanyManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ['name']
        unique_together = ['name', 'phone', 'tenant']
        indexes = [
            models.Index(fields=['tenant', 'name']),
            models.Index(fields=['tenant', 'is_active']),
            models.Index(fields=['company', 'name']),
            models.Index(fields=['company', 'is_active']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.company_id and self.tenant_id and self.tenant.company_id:
            self.company = self.tenant.company
        if not self.tenant_id and self.company_id and self.company.admin_id:
            self.tenant = self.company.admin
        if self.tenant_id and self.company_id and self.tenant.company_id and self.tenant.company_id != self.company_id:
            raise ValidationError({'company': 'Company must match tenant owner company.'})
        super().save(*args, **kwargs)

    def update_credit_balance(self):
        self.current_credit_balance = self.total_credit_given - self.total_credit_repaid
        self.save(update_fields=['current_credit_balance'])

    def update_outstanding(self):
        from django.db.models import Sum
        from .purchase_batch import PurchaseBatch
        purchases = PurchaseBatch.objects.filter(supplier=self).aggregate(
            total=Sum('total_expense'),
            pending=Sum('pending_amount')
        )
        self.total_purchases = purchases['total'] or Decimal('0.00')
        self.outstanding_amount = purchases['pending'] or Decimal('0.00')
        self.total_paid = self.total_purchases - self.outstanding_amount
        last_purchase = PurchaseBatch.objects.filter(supplier=self).order_by('-date').first()
        if last_purchase:
            self.last_purchase_date = last_purchase.date
        self.save(update_fields=['total_purchases', 'total_paid', 'outstanding_amount', 'last_purchase_date'])

    def get_on_time_percentage(self):
        if self.total_deliveries > 0:
            return (self.on_time_deliveries / self.total_deliveries) * 100
        return 0

    def is_payment_overdue(self):
        if self.payment_due_date and self.outstanding_amount > 0:
            return timezone.now().date() > self.payment_due_date
        return False

    def get_payment_status(self):
        if self.outstanding_amount <= 0:
            return 'paid'
        elif self.total_paid > 0 or self.outstanding_amount > 0:
            return 'partial'
        elif self.is_payment_overdue():
            return 'overdue'
        else:
            return 'pending'