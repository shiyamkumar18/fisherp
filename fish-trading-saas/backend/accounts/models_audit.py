from django.db import models
from django.conf import settings
from companies.models import Company


class ImpersonationLogManager(models.Manager):
    """Manager helpers for creating auditable impersonation sessions."""

    def log_impersonation_start(self, platform_user, tenant, reason, ip_address=None, user_agent="", **kwargs):
        log = self.create(
            platform_user=platform_user,
            tenant=tenant,
            reason=reason,
            ip_address=ip_address,
            user_agent=user_agent,
            **kwargs,
        )
        AuditLog.log_impersonation_start(
            platform_user=platform_user,
            tenant=tenant,
            reason=reason,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return log

class AuditLog(models.Model):
    """
    Global audit log for tracking all user actions.
    
    Records:
    - Create, Update, Delete operations
    - Login/Logout events
    - Impersonation start/end
    - Permission violations
    - Data exports
    """
    
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('view', 'View'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('impersonate_start', 'Impersonation Start'),
        ('impersonate_end', 'Impersonation End'),
        ('export', 'Data Export'),
        ('permission_denied', 'Permission Denied'),
        ('failed_login', 'Failed Login'),
        ('password_change', 'Password Change'),
        ('role_change', 'Role Change'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs',
        help_text="User who performed the action"
    )
    
    tenant = models.ForeignKey(
        'companies.Company',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        help_text="Tenant on which action was performed (for tenant-level actions)"
    )
    
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    
    model_name = models.CharField(
        max_length=100,
        help_text="Name of the model (e.g., 'Sale', 'PurchaseBatch')"
    )
    
    object_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="ID of the affected object"
    )
    
    object_repr = models.CharField(
        max_length=255,
        blank=True,
        help_text="String representation of the object"
    )
    
    changes = models.JSONField(
        default=dict,
        blank=True,
        help_text="Field-level changes (for updates)"
    )
    
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of the user"
    )
    
    user_agent = models.TextField(
        blank=True,
        help_text="Browser/user agent information"
    )
    
    session_key = models.CharField(
        max_length=40,
        blank=True,
        help_text="Django session key"
    )
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # For impersonation tracking
    is_impersonation = models.BooleanField(default=False)
    impersonator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='impersonation_actions',
        help_text="Platform user who is impersonating"
    )
    
    # Additional context
    request_method = models.CharField(max_length=10, blank=True)
    request_path = models.CharField(max_length=255, blank=True)
    status_code = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['tenant', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['model_name', 'object_id']),
        ]
    
    def __str__(self):
        return f"{self.user} - {self.action} on {self.model_name} at {self.timestamp}"
    
    @classmethod
    def log_create(cls, user, model_name, object_id=None, object_repr="", tenant=None, **kwargs):
        """Helper to log create actions"""
        return cls.objects.create(
            user=user,
            tenant=tenant,
            action='create',
            model_name=model_name,
            object_id=object_id,
            object_repr=object_repr,
            **kwargs
        )
    
    @classmethod
    def log_update(cls, user, model_name, object_id=None, object_repr="", changes=None, tenant=None, **kwargs):
        """Helper to log update actions"""
        return cls.objects.create(
            user=user,
            tenant=tenant,
            action='update',
            model_name=model_name,
            object_id=object_id,
            object_repr=object_repr,
            changes=changes or {},
            **kwargs
        )
    
    @classmethod
    def log_delete(cls, user, model_name, object_id=None, object_repr="", tenant=None, **kwargs):
        """Helper to log delete actions"""
        return cls.objects.create(
            user=user,
            tenant=tenant,
            action='delete',
            model_name=model_name,
            object_id=object_id,
            object_repr=object_repr,
            **kwargs
        )
    
    @classmethod
    def log_view(cls, user, model_name, object_id=None, tenant=None, **kwargs):
        """Helper to log view actions"""
        return cls.objects.create(
            user=user,
            tenant=tenant,
            action='view',
            model_name=model_name,
            object_id=object_id,
            **kwargs
        )
    
    @classmethod
    def log_login(cls, user, ip_address=None, user_agent=None, **kwargs):
        """Helper to log login events"""
        return cls.objects.create(
            user=user,
            action='login',
            model_name='User',
            object_id=user.id,
            object_repr=f"User logged in: {user.username}",
            ip_address=ip_address,
            user_agent=user_agent,
            **kwargs
        )
    
    @classmethod
    def log_impersonation_start(cls, platform_user, tenant, reason, ip_address=None, **kwargs):
        """Helper to log impersonation start"""
        return cls.objects.create(
            user=getattr(tenant, 'admin', None),
            tenant=tenant,
            action='impersonate_start',
            model_name='Impersonation',
            is_impersonation=True,
            impersonator=platform_user,
            object_repr=f"Impersonating tenant: {tenant.name}, Reason: {reason}",
            ip_address=ip_address,
            **kwargs
        )
    
    @classmethod
    def log_impersonation_end(cls, platform_user, tenant, **kwargs):
        """Helper to log impersonation end"""
        return cls.objects.create(
            user=getattr(tenant, 'admin', None),
            tenant=tenant,
            action='impersonate_end',
            model_name='Impersonation',
            is_impersonation=True,
            impersonator=platform_user,
            object_repr=f"Ended impersonation for tenant: {tenant.name}",
            **kwargs
        )
    
    @classmethod
    def log_permission_denied(cls, user, model_name, action_attempted, **kwargs):
        """Helper to log permission denied events"""
        return cls.objects.create(
            user=user,
            action='permission_denied',
            model_name=model_name,
            object_repr=f"Attempted: {action_attempted}",
            error_message=f"User {user.username} with role {user.role} was denied {action_attempted} on {model_name}",
            **kwargs
        )


class ImpersonationLog(models.Model):
    """
    Tracks platform operator impersonation of tenant users.
    
    When platform operators need to access tenant data for support,
    they must:
    1. Provide a reason
    2. Start impersonation (logged)
    3. Access is then granted to tenant data
    4. End impersonation when done (logged)
    """
    
    platform_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='impersonation_logs',
        help_text="Platform operator who is impersonating"
    )
    
    tenant = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='impersonation_logs',
        help_text="Tenant being impersonated"
    )

    impersonated_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='impersonated_sessions',
        help_text="Specific tenant user being impersonated"
    )
    
    reason = models.TextField(
        help_text="Reason for impersonation (required)"
    )
    
    start_time = models.DateTimeField(auto_now_add=True)
    
    end_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When impersonation was ended"
    )
    
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address at start of impersonation"
    )
    
    user_agent = models.TextField(
        blank=True,
        help_text="Browser/user agent at start"
    )

    session_id = models.CharField(
        max_length=64,
        blank=True,
        default="",
        db_index=True,
        help_text="Session identifier used for this impersonation audit trail"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether impersonation is currently active"
    )
    
    actions_performed = models.JSONField(
        default=list,
        blank=True,
        help_text="List of actions performed during impersonation"
    )
    
    # Approval workflow
    is_approved = models.BooleanField(
        default=False,
        help_text="Whether this impersonation was pre-approved"
    )
    
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_impersonations',
        help_text="Who approved this impersonation (if required)"
    )
    
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this impersonation was approved"
    )

    objects = ImpersonationLogManager()
    
    class Meta:
        ordering = ['-start_time']
        verbose_name = 'Impersonation Log'
        verbose_name_plural = 'Impersonation Logs'
        indexes = [
            models.Index(fields=['platform_user', '-start_time']),
            models.Index(fields=['tenant', '-start_time']),
            models.Index(fields=['is_active', '-start_time']),
        ]
    
    def __str__(self):
        status = "ACTIVE" if self.is_active else "ENDED"
        return f"{self.platform_user} -> {self.tenant.name} ({status})"
    
    def end_impersonation(self):
        """End the impersonation session"""
        from django.utils import timezone
        self.end_time = timezone.now()
        self.is_active = False
        self.save()
        return self
    
    @property
    def duration(self):
        """Get duration of impersonation"""
        if self.end_time:
            return self.end_time - self.start_time
        from django.utils import timezone
        return timezone.now() - self.start_time
    
    @property
    def duration_display(self):
        """Get human-readable duration"""
        duration = self.duration
        if duration.days > 0:
            return f"{duration.days}d {duration.seconds // 3600}h"
        hours = duration.seconds // 3600
        minutes = (duration.seconds % 3600) // 60
        if hours > 0:
            return f"{hours}h {minutes}m"
        return f"{minutes}m"


def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


class LoginAttempt(models.Model):
    """
    Track login attempts for security and brute force prevention.
    
    Features:
    - Records successful and failed attempts
    - Tracks IP addresses
    - Persists across server restarts
    - Works with multiple servers/load balancers
    """
    
    email = models.EmailField(db_index=True)
    ip_address = models.GenericIPAddressField()
    
    # Status of attempt
    ATTEMPT_STATUS = [
        ('success', 'Successful Login'),
        ('failed', 'Failed Login'),
        ('locked', 'Account Locked'),
    ]
    status = models.CharField(max_length=20, choices=ATTEMPT_STATUS, default='failed')
    
    attempted_at = models.DateTimeField(auto_now_add=True, db_index=True)
    user_agent = models.TextField(blank=True, help_text="Browser/Client user agent")
    
    class Meta:
        ordering = ['-attempted_at']
        indexes = [
            models.Index(fields=['email', '-attempted_at']),
            models.Index(fields=['ip_address', '-attempted_at']),
        ]
    
    def __str__(self):
        return f"{self.email} - {self.status} - {self.attempted_at}"
    
    @classmethod
    def get_failed_attempts(cls, email, minutes=15):
        """Get number of failed login attempts in last N minutes"""
        from django.utils import timezone
        from datetime import timedelta
        
        cutoff = timezone.now() - timedelta(minutes=minutes)
        return cls.objects.filter(
            email=email,
            status='failed',
            attempted_at__gte=cutoff
        ).count()
    
    @classmethod
    def is_locked(cls, email):
        """Check if email is currently locked"""
        return cls.objects.filter(
            email=email,
            status='locked'
        ).exists()
    
    @classmethod
    def record_attempt(cls, email, ip_address, status='failed', user_agent=''):
        """Record a login attempt"""
        return cls.objects.create(
            email=email,
            ip_address=ip_address,
            status=status,
            user_agent=user_agent[:500]
        )
