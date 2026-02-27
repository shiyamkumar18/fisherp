from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
import os

# Role choices for the multi-tenant SaaS
ROLE_CHOICES = [
    ('platform_maintainer', 'Platform Maintainer'),
    ('tenant_admin', 'Tenant Admin'),
    ('sales_staff', 'Sales Staff'),
    ('store_accounts', 'Store/Accounts'),
]

# Check if we're using SQLite (testing mode without PostgreSQL)
USE_SQLITE = not (os.getenv("DB_NAME") and os.getenv("DB_USER"))

if not USE_SQLITE:
    from django_tenants.models import TenantMixin
    class User(TenantMixin, AbstractUser):
        phone = models.CharField(max_length=20, blank=True)
        role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='tenant_admin')
        
        # Company/Tenant relationship
        company = models.ForeignKey(
            'companies.Company',
            on_delete=models.SET_NULL,
            null=True,
            blank=True,
            related_name='users',
            help_text="Company this user belongs to"
        )
        
        # Required for django-tenants
        auto_create_schema = True
        auto_drop_schema = True
    
        def __str__(self):
            return self.username
        
        @property
        def is_tenant_admin(self):
            return self.role == 'tenant_admin' or self.is_superuser
            
        @property
        def is_sales_staff(self):
            return self.role == 'sales_staff'
            
        @property
        def is_store_accounts(self):
            return self.role == 'store_accounts'
            
        @property
        def is_platform_maintainer(self):
            return self.is_superuser or self.role == 'platform_maintainer'
else:
    # Simplified User model for SQLite/testing
    class User(AbstractUser):
        phone = models.CharField(max_length=20, blank=True)
        role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='tenant_admin')
        schema_name = models.CharField(max_length=63, default='public', null=True, blank=True)
        
        # Company/Tenant relationship
        company = models.ForeignKey(
            'companies.Company',
            on_delete=models.SET_NULL,
            null=True,
            blank=True,
            related_name='users',
            help_text="Company this user belongs to"
        )
    
        def __str__(self):
            return self.username
            
        @property
        def is_tenant_admin(self):
            return self.role == 'tenant_admin' or self.is_superuser
            
        @property
        def is_sales_staff(self):
            return self.role == 'sales_staff'
            
        @property
        def is_store_accounts(self):
            return self.role == 'store_accounts'
            
        @property
        def is_platform_maintainer(self):
            return self.is_superuser or self.role == 'platform_maintainer'
