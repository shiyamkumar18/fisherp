from django.db import models
from django.utils import timezone
from .payment import Payment
from services.base import CompanyManager

class JournalEntry(models.Model):
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='journal_entries')
    date = models.DateField(default=timezone.localdate)
    account_debit = models.CharField(max_length=100, help_text="e.g., Cash, Bank, Accounts Payable")
    account_credit = models.CharField(max_length=100, help_text="e.g., Accounts Receivable, Cash, Bank")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference = models.CharField(max_length=100, blank=True, null=True, help_text="Auto-generated reference from Payment")
    
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE, related_name='journal_entries')
    created_at = models.DateTimeField(auto_now_add=True)
    
    objects = CompanyManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['company', 'date']),
        ]

    def __str__(self):
        return f"{self.date} | Dr {self.account_debit} / Cr {self.account_credit} - {self.amount}"
