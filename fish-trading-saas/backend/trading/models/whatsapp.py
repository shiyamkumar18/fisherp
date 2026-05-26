from django.db import models
from services.base import CompanyManager

class WhatsAppConfig(models.Model):
    company = models.OneToOneField('companies.Company', on_delete=models.CASCADE, related_name='whatsapp_config')
    whatsapp_api_key = models.CharField(max_length=255, blank=True)
    sender_number = models.CharField(max_length=20, blank=True)
    templates = models.JSONField(default=dict, blank=True, help_text="Templates configuration as JSON dict")
    is_enabled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CompanyManager()
    all_objects = models.Manager()

    def __str__(self):
        return f"WhatsApp Config for {self.company.name}"


class WhatsAppMessageLog(models.Model):
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
    ]

    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE, related_name='whatsapp_logs')
    recipient = models.CharField(max_length=20)
    message_type = models.CharField(max_length=30, help_text="e.g. invoice, payment_reminder, supplier_reminder, stock_alert")
    message_body = models.TextField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='queued')
    retry_count = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(blank=True, null=True)

    objects = CompanyManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['company', 'recipient']),
        ]

    def __str__(self):
        return f"Message to {self.recipient} ({self.status}) - {self.message_type}"
