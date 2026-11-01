from django.db import models
from django.contrib.auth import get_user_model
from saas_platform.companies.models import Company
from saas_platform.accounts.models_audit import ImpersonationLog

User = get_user_model()


class SupportTicket(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    STATUS_CHOICES = [
        ('new', 'New'),
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('waiting_for_customer', 'Waiting for Customer'),
        ('waiting_internal', 'Waiting Internal'),
        ('escalated_l1', 'Escalated L1'),
        ('escalated_l2', 'Escalated L2'),
        ('escalated_l3', 'Escalated L3'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]

    tenant = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='support_tickets')
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tickets')
    assignee = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tickets',
        help_text="Platform Support User assigned to the ticket"
    )

    subject = models.CharField(max_length=255)
    description = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='new')

    linked_impersonation = models.ForeignKey(
        ImpersonationLog,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='linked_tickets',
        help_text="Impersonation session tied to investigating this ticket"
    )

    # === NEW ENTERPRISE FIELDS ===
    ticket_number = models.CharField(max_length=50, unique=True, null=True, blank=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    
    SEVERITY_CHOICES = [
        ('low', 'Low Impact'),
        ('medium', 'Medium Impact'),
        ('high', 'High Impact'),
        ('critical', 'Critical (System Down)'),
    ]
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='medium')

    CATEGORY_CHOICES = [
        ('technical', 'Technical Issue'),
        ('billing', 'Billing'),
        ('trading', 'Trading'),
        ('voice', 'Voice Assistant'),
        ('staff', 'Staff & Permissions'),
        ('branch', 'Branch Operations'),
        ('feature', 'Feature Request'),
        ('bug', 'Bug Report'),
        ('security', 'Security Issue'),
    ]
    category = models.CharField(max_length=100, choices=CATEGORY_CHOICES, blank=True, null=True)
    sub_category = models.CharField(max_length=100, blank=True, null=True)

    ISSUE_TYPE_CHOICES = [
        ('bug', 'Bug'),
        ('incident', 'Incident'),
        ('billing', 'Billing'),
        ('feature_request', 'Feature Request'),
        ('performance', 'Performance'),
        ('security', 'Security'),
        ('data_issue', 'Data Issue'),
        ('access_problem', 'Access Problem'),
        ('compliance', 'Compliance'),
    ]
    issue_type = models.CharField(max_length=50, choices=ISSUE_TYPE_CHOICES, blank=True, null=True)
    
    tags = models.JSONField(default=list, blank=True, help_text="List of tag strings")

    # SLAs
    sla_response_at = models.DateTimeField(null=True, blank=True)
    sla_resolution_at = models.DateTimeField(null=True, blank=True)
    first_response_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    # Escalation
    is_escalated = models.BooleanField(default=False)
    escalation_level = models.PositiveIntegerField(default=0)

    # Environment Context
    affected_module = models.CharField(max_length=100, blank=True, null=True)
    tenant_environment = models.JSONField(default=dict, help_text="Browser, OS, Role, Tier auto-captured")
    branch = models.ForeignKey('organization.Branch', on_delete=models.SET_NULL, null=True, blank=True, related_name='support_tickets')
    linked_subscription = models.ForeignKey('subscriptions.Subscription', on_delete=models.SET_NULL, null=True, blank=True, related_name='support_tickets')

    sla_breach_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            super().save(*args, **kwargs)
            self.ticket_number = f"TKT-{self.id}"
            self.save(update_fields=['ticket_number'])
            return
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.id}] {self.subject} ({self.status})"


class TicketMessage(models.Model):
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='messages')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    is_internal = models.BooleanField(default=False, help_text="True if this is an internal platform note")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message by {self.author.username} on Ticket {self.ticket_id}"


class TicketAttachment(models.Model):
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='attachments')
    message = models.ForeignKey(TicketMessage, on_delete=models.SET_NULL, null=True, blank=True, related_name='attachments')
    file = models.FileField(upload_to='support_attachments/')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attachment for Ticket {self.ticket_id}"
