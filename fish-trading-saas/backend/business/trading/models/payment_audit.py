from django.db import models
from django.utils import timezone
from .payment import Payment
from services.base import CompanyManager

class PaymentAuditLog(models.Model):
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=50, help_text="e.g., 'created', 'edited', 'status_changed', 'reconciled'")
    changed_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)
    changes = models.JSONField(default=dict, blank=True, help_text="Stores before/after values: {'amount': {'old': 100, 'new': 200}}")
    reason = models.TextField(blank=True, null=True)

    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE, related_name='payment_audit_logs')
    
    objects = CompanyManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['payment', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.payment.id} - {self.action} at {self.timestamp}"
