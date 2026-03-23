from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

# Canonical role choices for SaaS RBAC
ROLE_CHOICES = [
    ('platform_operator', 'Platform Operator'),
    ('platform_support', 'Platform Support'),
    ('tenant_admin', 'Tenant Admin'),
    ('accountant', 'Accountant'),
    ('trader', 'Trader'),
    ('store', 'Store / Inventory'),
]

# Role hierarchy (higher number = more authority)
ROLE_HIERARCHY = {
    'platform_operator': 6,
    'platform_support': 5,
    'tenant_admin': 4,
    'accountant': 3,
    'trader': 2,
    'store': 1,
}

PLATFORM_ROLES = {'platform_operator', 'platform_support'}
TENANT_ROLES = {'tenant_admin', 'accountant', 'trader', 'store'}

# Backward-compatibility map for older role values still present in data/code paths.
LEGACY_ROLE_MAP = {
    'platform_super_admin': 'platform_operator',
    'sales_staff': 'trader',
    'store_accounts': 'store',
}

# PostgreSQL User model with roles
class User(AbstractUser):
    phone = models.CharField(max_length=20, blank=True)
    # Backward-compatible tenant key used across legacy API responses/tests.
    schema_name = models.CharField(max_length=63, blank=True, null=True)
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='tenant_admin')
    
    # Company/Tenant relationship
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        help_text="Company this user belongs to"
    )
    
    # ====================
    # SECURITY FIELDS
    # ====================
    
    # Two-Factor Authentication
    two_factor_enabled = models.BooleanField(default=False, help_text="Enable 2FA for this user")
    two_factor_secret = models.CharField(max_length=32, blank=True, help_text="2FA secret key")
    backup_codes = models.JSONField(default=list, blank=True, help_text="Backup codes for 2FA")
    
    # IP & Session Tracking
    last_login_ip = models.GenericIPAddressField(null=True, blank=True, help_text="Last login IP address")
    registered_ip = models.GenericIPAddressField(null=True, blank=True, help_text="Registration IP address")
    
    # Account Security
    failed_login_attempts = models.PositiveIntegerField(default=0, help_text="Failed login attempts count")
    locked_until = models.DateTimeField(null=True, blank=True, help_text="Account locked until")
    
    # Required for django-tenants (commented out for SQLite)
    # auto_create_schema = True
    # auto_drop_schema = True

    def __str__(self):
        return self.username
    
    def save(self, *args, **kwargs):
        """
        Normalize role and enforce platform-vs-tenant separation rules.
        """
        self.role = LEGACY_ROLE_MAP.get(self.role, self.role)

        # Superusers are platform-level by definition.
        if self.is_superuser and self.role not in PLATFORM_ROLES:
            self.role = 'platform_operator'

        if self.role in PLATFORM_ROLES:
            # Platform users are global and must not be bound to a tenant.
            self.company = None
            if not self.schema_name:
                self.schema_name = 'public'
        elif self.role in TENANT_ROLES:
            # Tenant users must be linked to a company.
            if not self.company_id:
                # Compatibility bridge: if legacy code provides schema_name, derive company from it.
                if self.schema_name:
                    from companies.models import Company
                    company, _ = Company.objects.get_or_create(
                        slug=self.schema_name,
                        defaults={
                            'name': self.schema_name.replace('-', ' ').title(),
                            'is_active': True,
                        }
                    )
                    self.company = company
                # Enforce strictly for new records without company/schema context.
                elif self._state.adding:
                    from companies.models import Company
                    from django.utils.text import slugify
                    base_slug = slugify(self.username or self.email or "tenant")
                    slug = base_slug
                    counter = 1
                    while Company.objects.filter(slug=slug).exists():
                        slug = f"{base_slug}-{counter}"
                        counter += 1
                    company = Company.objects.create(
                        slug=slug,
                        name=(self.username or self.email or "Tenant").replace('-', ' ').title(),
                        is_active=True,
                    )
                    self.company = company
            elif self.company and self.company.slug:
                self.schema_name = self.company.slug
        else:
            raise ValidationError(f"Unsupported role: {self.role}")

        # Only admin-portal roles should get Django admin access.
        self.is_staff = bool(
            self.is_superuser or self.role in {'platform_operator', 'platform_support', 'tenant_admin'}
        )
        
        super().save(*args, **kwargs)
    
    @property
    def is_platform_super_admin(self):
        """Legacy compatibility alias: superuser implies platform super admin."""
        return self.is_superuser
    
    @property
    def is_platform_operator(self):
        """Platform Operator: SaaS-level management."""
        return self.role == 'platform_operator'

    @property
    def is_platform_support(self):
        """Platform Support: cross-tenant support with limited operational rights."""
        return self.role == 'platform_support'
    
    @property
    def is_platform_maintainer(self):
        """Platform Maintainer: Superuser for platform-wide access"""
        return self.is_superuser
    
    @property
    def is_platform_user(self):
        """Check if user is a platform-level user (not tenant user)"""
        return self.is_superuser or self.role in PLATFORM_ROLES
    
    @property
    def is_tenant_admin(self):
        """Tenant Admin: Full access within own tenant"""
        return self.role == 'tenant_admin'
    
    @property
    def is_accountant(self):
        """Accountant: Financial authority within tenant"""
        return self.role == 'accountant'

    @property
    def is_trader(self):
        """Trader: Sales operations within tenant."""
        return self.role == 'trader'

    @property
    def is_store(self):
        """Store: Inventory/purchase operations within tenant."""
        return self.role == 'store'
        
    @property
    def is_sales_staff(self):
        """Backward compatibility alias for legacy code paths."""
        return self.is_trader
        
    @property
    def is_store_accounts(self):
        """Backward compatibility alias for legacy code paths."""
        return self.is_store
    
    @property
    def is_tenant_user(self):
        """Check if user belongs to a tenant (not platform operator)"""
        return self.role in TENANT_ROLES
    
    @property
    def role_level(self):
        """Get role hierarchy level"""
        return ROLE_HIERARCHY.get(self.role, 0)
    
    def can_access_tenant_data(self, tenant):
        """Check if user can access a specific tenant's data"""
        # Platform operators can only access via impersonation
        if self.is_platform_operator:
            return False
        # Tenant users can only access their own tenant
        if self.is_tenant_user:
            return self.id == tenant.id or (self.company and self.company.id == tenant.company_id)
        return False
    
    def can_view_financials(self):
        """Check if user can view financial data (profit, margins)"""
        return self.is_tenant_admin or self.is_accountant
    
    def can_manage_users(self):
        """Check if user can manage tenant users"""
        return self.is_tenant_admin
    
    def can_delete_records(self):
        """Check if user can delete financial records"""
        return self.is_tenant_admin
