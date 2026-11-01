from django.db import models
from django.contrib.auth import get_user_model
from saas_platform.companies.models import Company
from tenant_apps.organization.models import Branch, ApprovalWorkflow
from saas_platform.support.models import SupportTicket
from saas_platform.accounts.models_audit import ImpersonationLog

User = get_user_model()

ACTION_CHOICES = [
    ('CREATE', 'Create'),
    ('UPDATE', 'Update'),
    ('DELETE', 'Delete'),
    ('SOFT_DELETE', 'Soft Delete'),
    ('RESTORE', 'Restore'),
    ('LOGIN', 'Login'),
    ('LOGOUT', 'Logout'),
    ('FAILED_LOGIN', 'Failed Login'),
    ('PERMISSION_DENIED', 'Permission Denied'),
    ('EXPORT', 'Export Data'),
    ('IMPORT', 'Import Data'),
    ('APPROVE', 'Approve'),
    ('REJECT', 'Reject'),
    ('VOICE_ACTION', 'Voice Action'),
    ('IMPERSONATION_START', 'Impersonation Start'),
    ('IMPERSONATION_STOP', 'Impersonation Stop'),
    ('PAYMENT_APPROVE', 'Payment Approve'),
    ('PAYMENT_REJECT', 'Payment Reject'),
    ('TRANSFER', 'Transfer'),
    ('ASSIGN', 'Assign'),
    ('STATUS_CHANGE', 'Status Change'),
    ('SECURITY_EVENT', 'Security Event'),
]

class AuditLog(models.Model):
    # Context
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='enterprise_audit_logs')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='enterprise_audit_logs')
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='enterprise_audit_logs')
    
    # Target (e.g. 'purchases', 'PurchaseBatch', '123', 'PO-123')
    module = models.CharField(max_length=50)
    entity_type = models.CharField(max_length=50)
    entity_id = models.CharField(max_length=50)
    entity_label = models.CharField(max_length=255)
    
    # What happened
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    before_state = models.JSONField(null=True, blank=True)
    after_state = models.JSONField(null=True, blank=True)
    changed_fields = models.JSONField(default=list, blank=True)
    reason = models.TextField(blank=True)
    
    # Forensic footprint
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    browser = models.CharField(max_length=100, blank=True)
    device = models.CharField(max_length=100, blank=True)
    os = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=100, blank=True)
    
    request_id = models.CharField(max_length=100, blank=True, db_index=True)
    session_id = models.CharField(max_length=100, blank=True)
    
    status = models.CharField(max_length=20, default='success')
    is_sensitive = models.BooleanField(default=False)
    performed_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    # Relational context
    impersonation_log = models.ForeignKey(ImpersonationLog, on_delete=models.SET_NULL, null=True, blank=True)
    approval_workflow = models.ForeignKey(ApprovalWorkflow, on_delete=models.SET_NULL, null=True, blank=True)
    support_ticket = models.ForeignKey(SupportTicket, on_delete=models.SET_NULL, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-performed_at']
        indexes = [
            models.Index(fields=['company', '-performed_at']),
            models.Index(fields=['entity_type', 'entity_id', '-performed_at']),
            models.Index(fields=['module', '-performed_at']),
        ]

    def __str__(self):
        return f"[{self.action}] {self.entity_type} {self.entity_label} by {self.user.username if self.user else 'System'}"
