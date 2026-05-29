from decimal import Decimal
import uuid
from datetime import datetime
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.core.validators import FileExtensionValidator

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
    receipt_image = models.FileField(
        upload_to='payment_receipts/%Y/%m/', blank=True, null=True,
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp', 'pdf'])]
    )
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
                               help_text="DEPRECATED: Tenant/Owner of this payment record")
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE,
                                related_name='payment_records', db_index=True,
                                help_text="Company this payment belongs to")
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='created_payments', help_text="User who created this record")
    updated_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='updated_payments', help_text="User who last updated this record")
    is_deleted = models.BooleanField(default=False, help_text="Soft delete flag")

    objects = CompanyManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['company', 'date', 'payment_type']),
        ]

    def __str__(self):
        return f"{self.get_payment_type_display()} - {self.amount} - {self.date}"

    def save(self, *args, **kwargs):
        if not self.receipt_number:
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S%f')
            self.receipt_number = f"RCP-{timestamp}-{uuid.uuid4().hex[:6]}"

        # Validate amount is positive
        amount = self.amount or Decimal("0.00")
        if amount <= 0:
            raise ValidationError({'amount': 'Payment amount must be greater than 0.'})

        if not getattr(self, 'company_id', None):
            raise ValidationError({'company': 'Company is required.'})

        if isinstance(self.date, datetime):
            self.date = self.date.date()
        if self.date is None:
            self.date = timezone.localdate()
        super().save(*args, **kwargs)
