import uuid
from datetime import date, datetime
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError

from .purchase_batch import PurchaseBatch
from .sale import Sale
from .supplier import Supplier
from .buyer import Buyer
from services.base import CompanyManager


class Payment(models.Model):
    PAYMENT_TYPE_CHOICES = [
        ('purchase', 'Purchase Payment'),
        ('sale', 'Sale Payment'),
        ('refund', 'Refund'),
        ('advance', 'Advance Payment'),
        ('credit', 'Credit Repayment'),
    ]
    PAYMENT_MODE_CHOICES = [
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('cheque', 'Cheque'),
        ('upi', 'UPI'),
        ('card', 'Card'),
        ('credit', 'Credit'),
    ]

    payment_type = models.CharField(max_length=15, choices=PAYMENT_TYPE_CHOICES)
    payment_mode = models.CharField(max_length=15, choices=PAYMENT_MODE_CHOICES, default='cash')
    purchase_batch = models.ForeignKey(PurchaseBatch, on_delete=models.CASCADE, null=True, blank=True, related_name='payments')
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, null=True, blank=True, related_name='payments')
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, null=True, blank=True, related_name='payments')
    buyer = models.ForeignKey(Buyer, on_delete=models.CASCADE, null=True, blank=True, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField(default=timezone.localdate)
    reference_number = models.CharField(max_length=100, blank=True, null=True, help_text="Cheque/Transaction ID")
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)
    is_cleared = models.BooleanField(default=True, help_text="For cheques - has it cleared?")
    cleared_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    receipt_number = models.CharField(max_length=50, unique=True, blank=True, null=True)
    receipt_image = models.ImageField(upload_to='payment_receipts/%Y/%m/', blank=True, null=True)
    approval_status = models.CharField(max_length=15, choices=[
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ], default='approved')
    approved_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='approved_payments')
    processed_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name='processed_payments')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    tenant = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='payments',
                               db_index=True, null=True, blank=True,
                               help_text="Tenant/Owner of this payment record")
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE,
                                related_name='payment_records', db_index=True,
                                null=True, blank=True,
                                help_text="Company this payment belongs to")
    is_deleted = models.BooleanField(default=False, help_text="Soft delete flag")

    objects = CompanyManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.get_payment_type_display()} - {self.amount} - {self.date}"

    def save(self, *args, **kwargs):
        if not self.receipt_number:
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')
            self.receipt_number = f"RCP-{timestamp}-{uuid.uuid4().hex[:6]}"

        # Validate amount is positive
        if self.amount is not None and self.amount <= 0:
            raise ValidationError({'amount': 'Payment amount must be greater than 0.'})

        if not self.company_id and self.tenant_id and self.tenant.company_id:
            self.company = self.tenant.company
        if not self.tenant_id and self.company_id and self.company.admin_id:
            self.tenant = self.company.admin
        if self.tenant_id and self.company_id and self.tenant.company_id and self.tenant.company_id != self.company_id:
            raise ValidationError({'company': 'Company must match tenant owner company.'})

        if isinstance(self.date, datetime):
            self.date = self.date.date()
        if self.date is None:
            self.date = date.today()
        super().save(*args, **kwargs)
