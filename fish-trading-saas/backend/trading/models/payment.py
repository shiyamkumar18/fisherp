from decimal import Decimal
from django.db import models
from django.utils import timezone

from .purchase_batch import PurchaseBatch
from .sale import Sale
from .supplier import Supplier
from .buyer import Buyer


class Payment(models.Model):
    """Track payments made or received"""
    
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
    
    # References (nullable - can be standalone payment)
    purchase_batch = models.ForeignKey(PurchaseBatch, on_delete=models.CASCADE, null=True, blank=True, related_name='payments')
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, null=True, blank=True, related_name='payments')
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, null=True, blank=True, related_name='payments')
    buyer = models.ForeignKey(Buyer, on_delete=models.CASCADE, null=True, blank=True, related_name='payments')
    
    # Payment details
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField(default=timezone.now)
    reference_number = models.CharField(max_length=100, blank=True, null=True, help_text="Cheque/Transaction ID")
    
    # Bank details
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)
    
    # Status
    is_cleared = models.BooleanField(default=True, help_text="For cheques - has it cleared?")
    cleared_date = models.DateField(null=True, blank=True)
    
    # Notes
    notes = models.TextField(blank=True, null=True)
    
    # Receipt and approval
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
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Tenant isolation - ForeignKey to User (tenant) with index for performance
    tenant = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='payments',
                               db_index=True,
                               null=True, blank=True,
                               help_text="Tenant/Owner of this payment record")

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.get_payment_type_display()} - {self.amount} - {self.date}"
    
    def save(self, *args, **kwargs):
        # Auto-generate receipt number if not provided
        if not self.receipt_number:
            from datetime import datetime
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            self.receipt_number = f"RCP-{timestamp}-{self.id or 'NEW'}"
        super().save(*args, **kwargs)
