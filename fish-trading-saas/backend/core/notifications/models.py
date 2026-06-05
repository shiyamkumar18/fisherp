from django.db import models
from django.contrib.auth import get_user_model
from saas_platform.companies.models import Company
from tenant_apps.organization.models import Branch

User = get_user_model()

CATEGORY_CHOICES = [
    ('approval', 'Approval Workflow'),
    ('payment', 'Payment Updates'),
    ('support', 'Support Ticket'),
    ('inventory', 'Inventory Alert'),
    ('voice', 'Voice Assistant'),
    ('subscription', 'Subscription Alert'),
    ('security', 'Security Alert'),
    ('branch', 'Branch Transfer'),
    ('system', 'System Message'),
    ('staff', 'Staff Management'),
    ('report', 'Report Generated'),
    ('buyer', 'Buyer Activity'),
    ('supplier', 'Supplier Activity'),
    ('sales', 'Sales Activity'),
    ('purchase', 'Purchase Activity'),
]

PRIORITY_CHOICES = [
    ('critical', 'Critical'),
    ('high', 'High'),
    ('medium', 'Medium'),
    ('low', 'Low'),
    ('info', 'Info'),
]

TYPE_CHOICES = [
    ('in_app', 'In-App Notification'),
    ('email', 'Email Notification'),
    ('sms', 'SMS Notification'),
    ('whatsapp', 'WhatsApp Notification'),
    ('push', 'Push Notification'),
]


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='notifications')
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    
    title = models.CharField(max_length=255)
    message = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='info')
    delivery_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='in_app')
    
    icon = models.CharField(max_length=50, blank=True, null=True, help_text="Lucide icon name")
    action_url = models.CharField(max_length=255, blank=True, null=True, help_text="Relative deep link route")
    metadata = models.JSONField(default=dict, blank=True)
    
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
            models.Index(fields=['company', 'created_at']),
        ]

    def __str__(self):
        return f"[{self.priority.upper()}] {self.title} to {self.user.username}"


class NotificationPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    
    # Global toggles
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=False)
    
    # Category-specific opt-outs for email (storing a list of opted-out categories)
    opt_out_categories = models.JSONField(default=list, blank=True, help_text="Categories the user has unsubscribed from")

    def __str__(self):
        return f"Preferences for {self.user.username}"
