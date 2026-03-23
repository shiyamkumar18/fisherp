"""
Custom Admin Sites for Different User Roles
=============================================

This module provides separate admin portals for each user type:
1. Platform Admin Site (/platform-admin/) - For platform operator/support
2. Tenant Admin Site (/tenant-admin/) - For tenant admins
3. Staff Admin Site (/staff-admin/) - Disabled for non-admin tenant staff

Each admin site has its own:
- Login page
- Index page
- Visible models based on role
"""

from django.contrib.admin import AdminSite
from django.template.response import TemplateResponse
from django.contrib.auth import get_user_model

User = get_user_model()


# =====================================================
# 1. PLATFORM ADMIN SITE - For Platform Operators
# =====================================================

class PlatformAdminSite(AdminSite):
    """
    Platform Admin - For managing SaaS tenants and platform settings.
    
    URL: /platform-admin/
    Login: /platform-admin/login/
    
    Access: platform_operator, platform_support
    
    Can Manage:
    - Companies (tenants)
    - Subscription Tiers
    - Subscriptions
    - Users (all users across tenants)
    - Audit Logs
    """
    site_title = 'Platform Administration'
    site_header = 'Fish Trading SaaS - Platform Manager'
    index_title = 'Platform Dashboard'
    
    def has_permission(self, request):
        """Only platform operators can access this admin"""
        return request.user.is_active and request.user.is_authenticated and (
            request.user.role in ['platform_operator', 'platform_support'] or request.user.is_superuser
        )
    
    def index(self, request, extra_context=None):
        """Custom index page showing platform-level stats"""
        from companies.models import Company
        from subscriptions.models import Subscription, SubscriptionTier
        from accounts.models import User
        
        context = {
            'total_tenants': Company.objects.count(),
            'active_subscriptions': Subscription.objects.filter(status='active').count(),
            'subscription_tiers': SubscriptionTier.objects.filter(is_active=True).count(),
            'total_users': User.objects.count(),
            'platform_operators': User.objects.filter(role='platform_operator').count(),
            'platform_support': User.objects.filter(role='platform_support').count(),
        }
        
        extra_context = extra_context or {}
        extra_context.update(context)
        
        return super().index(request, extra_context)


# =====================================================
# 2. TENANT ADMIN SITE - For Tenant Admins
# =====================================================

class TenantAdminSite(AdminSite):
    """
    Tenant Admin - For managing company/tenant business data.
    
    URL: /tenant-admin/
    Login: /tenant-admin/login/
    
    Access: tenant_admin
    
    Can Manage:
    - Users (within their company)
    - Fish Categories, Fish
    - Suppliers, Buyers
    - Purchase Batches, Sales
    - Payments, Inventory
    """
    site_title = 'Company Administration'
    site_header = 'Fish Trading - Company Manager'
    index_title = 'Company Dashboard'
    
    def has_permission(self, request):
        """Only tenant admins can access this admin"""
        return request.user.is_active and request.user.is_authenticated and (
            request.user.role == 'tenant_admin' or 
            request.user.is_superuser
        )
    
    def each_context(self, request):
        """Add company info to context"""
        context = super().each_context(request)
        if request.user.company:
            context['company_name'] = request.user.company.name
        return context
    
    def index(self, request, extra_context=None):
        """Custom index showing company stats"""
        from subscriptions.models import Subscription
        
        company = request.user.company
        
        context = {
            'company_name': company.name if company else 'No Company',
        }
        
        extra_context = extra_context or {}
        extra_context.update(context)
        
        return super().index(request, extra_context)


# =====================================================
# 3. STAFF ADMIN SITE - For Staff Users
# =====================================================

class StaffAdminSite(AdminSite):
    """
    Staff Admin - Restricted (tenant non-admin staff should use app UI).
    
    URL: /staff-admin/
    Login: /staff-admin/login/
    
    Access: tenant_admin only (plus superuser)
    
    Can Manage (based on role):
    - Accountant: Purchases, Sales, Payments, Reports
    - Sales Staff: Sales, Buyers, Payments
    - Store Accounts: Purchases, Suppliers, Inventory
    """
    site_title = 'Staff Portal'
    site_header = 'Fish Trading - Staff Portal'
    index_title = 'Staff Dashboard'
    
    def has_permission(self, request):
        """Only staff users can access this admin"""
        return request.user.is_active and request.user.is_authenticated and (
            request.user.role == 'tenant_admin' or request.user.is_superuser
        )
    
    def get_role_display(self, request):
        """Get role display name"""
        role_names = {
            'accountant': 'Accountant',
            'trader': 'Trader',
            'store': 'Store / Inventory',
        }
        return role_names.get(request.user.role, 'Staff')
    
    def each_context(self, request):
        """Add role info to context"""
        context = super().each_context(request)
        context['staff_role'] = self.get_role_display(request)
        if request.user.company:
            context['company_name'] = request.user.company.name
        return context
    
    def index(self, request, extra_context=None):
        """Custom index showing role-specific stats"""
        role = request.user.role
        
        context = {
            'staff_role': self.get_role_display(request),
            'can_view_purchases': role in ['accountant', 'store'],
            'can_view_sales': role in ['accountant', 'trader'],
            'can_view_payments': True,
            'can_view_inventory': role in ['accountant', 'store'],
            'can_view_buyers': role in ['accountant', 'trader'],
            'can_view_suppliers': role in ['accountant', 'store'],
        }
        
        extra_context = extra_context or {}
        extra_context.update(context)
        
        return super().index(request, extra_context)


# =====================================================
# Create instances of custom admin sites
# =====================================================

platform_admin_site = PlatformAdminSite(name='platform_admin')
tenant_admin_site = TenantAdminSite(name='tenant_admin')
staff_admin_site = StaffAdminSite(name='staff_admin')


# =====================================================
# Admin Mixins for Role-Based Access
# =====================================================

class PlatformAdminMixin:
    """Mixin for models in Platform Admin"""
    
    def has_view_permission(self, request, obj=None):
        if not request.user.is_authenticated:
            return False
        return request.user.role in ['platform_operator', 'platform_support'] or request.user.is_superuser
    
    def has_add_permission(self, request):
        if not request.user.is_authenticated:
            return False
        return request.user.role in ['platform_operator', 'platform_support'] or request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        if not request.user.is_authenticated:
            return False
        return request.user.role in ['platform_operator', 'platform_support'] or request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        if not request.user.is_authenticated:
            return False
        return request.user.role in ['platform_operator'] or request.user.is_superuser


class TenantAdminMixin:
    """Mixin for models in Tenant Admin - filters by company"""
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if request.user.role == 'tenant_admin' and request.user.company:
            if 'company' in [f.name for f in qs.model._meta.get_fields()]:
                return qs.filter(company=request.user.company)
            return qs.filter(tenant=request.user)
        return qs.none()
    
    def has_view_permission(self, request, obj=None):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.role == 'tenant_admin':
            return True
        return False
    
    def has_add_permission(self, request):
        if not request.user.is_authenticated:
            return False
        return request.user.role == 'tenant_admin' or request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        if not request.user.is_authenticated:
            return False
        return request.user.role == 'tenant_admin' or request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        if not request.user.is_authenticated:
            return False
        return request.user.role == 'tenant_admin' or request.user.is_superuser


class StaffAdminMixin:
    """Mixin for Staff Admin - filters by role and company"""
    
    # Define which roles can access which models
    ALLOWED_ROLES = ['tenant_admin']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if request.user.role not in self.ALLOWED_ROLES:
            return qs.none()
        if request.user.company:
            if 'company' in [f.name for f in qs.model._meta.get_fields()]:
                return qs.filter(company=request.user.company)
            return qs.filter(tenant=request.user)
        return qs.none()
    
    def has_view_permission(self, request, obj=None):
        if not request.user.is_authenticated:
            return False
        return request.user.role in self.ALLOWED_ROLES or request.user.is_superuser
    
    def has_add_permission(self, request):
        if not request.user.is_authenticated:
            return False
        # Tenant admin has full change rights through admin
        return request.user.role in ['accountant', 'tenant_admin'] or request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        if not request.user.is_authenticated:
            return False
        return request.user.role in self.ALLOWED_ROLES or request.user.role == 'tenant_admin' or request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        if not request.user.is_authenticated:
            return False
        # Only tenant_admin can delete
        return request.user.role == 'tenant_admin' or request.user.is_superuser
