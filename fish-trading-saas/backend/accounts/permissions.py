"""
Role-Based Permission Classes for Fisherp SaaS

Implements secure, role-based access control:
- Platform Maintainer: Global SaaS owner
- Tenant Admin: Company owner with full business access
- Sales Staff: Sales operations only
- Store/Accounts: Purchase & Inventory only
"""

from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied


class IsPlatformMaintainer(permissions.BasePermission):
    """
    Platform Maintainer (SaaS Owner) - Global role outside tenant boundary.
    
    Permissions:
    - Tenant management (create, activate, suspend, delete)
    - Subscription tier management
    - System health monitoring
    - Global audit log access
    - Domain mapping
    """
    message = "Platform Maintainer access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_platform_maintainer


class IsTenantAdmin(permissions.BasePermission):
    """
    Tenant Admin (Company Owner) - Full business control within tenant.
    
    Permissions:
    - All sales, purchases, inventory, payments
    - View profit and analytics
    - User management (add/remove users)
    - Company settings
    """
    message = "Tenant Admin access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_tenant_admin


class IsSalesStaff(permissions.BasePermission):
    """
    Sales Staff - Focused on revenue side.
    
    Permissions:
    - Create/Edit sales (same-day only)
    - Add buyers
    - Record customer payments
    - View own sales
    - Read-only inventory access
    
    Restrictions:
    - Cannot add purchases
    - Cannot see full profit analytics
    - Cannot manage users
    """
    message = "Sales Staff access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_sales_staff or request.user.is_tenant_admin


class IsStoreAccounts(permissions.BasePermission):
    """
    Store/Accounts - Focused on supply & stock.
    
    Permissions:
    - Add purchase batches
    - Record supplier invoices
    - Update inventory quantity
    - Record supplier payments
    - View stock levels and expiry alerts
    
    Restrictions:
    - Cannot view full profit analytics
    - Cannot access sales analytics
    - Cannot manage users
    """
    message = "Store/Accounts access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_store_accounts or request.user.is_tenant_admin


class IsTenantAdminOrAbove(permissions.BasePermission):
    """
    Permission for roles >= Tenant Admin.
    Includes Platform Maintainer and Tenant Admin.
    """
    message = "Tenant Admin or Platform Maintainer access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_tenant_admin or request.user.is_platform_maintainer


class CanViewFinancials(permissions.BasePermission):
    """
    Permission to view financial data (profits, margins, analytics).
    
    Allowed:
    - Platform Maintainer (global view)
    - Tenant Admin (tenant view)
    
    Denied:
    - Sales Staff
    - Store/Accounts
    """
    message = "Financial data access restricted to Tenant Admin."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_tenant_admin or request.user.is_platform_maintainer


class CanManageUsers(permissions.BasePermission):
    """
    Permission to manage tenant users.
    
    Allowed:
    - Tenant Admin
    
    Denied:
    - Sales Staff
    - Store/Accounts
    """
    message = "User management restricted to Tenant Admin."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_tenant_admin


class CanCreateSale(permissions.BasePermission):
    """
    Permission to create sales.
    
    Allowed:
    - Tenant Admin
    - Sales Staff
    """
    message = "Sales creation access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_tenant_admin or request.user.is_sales_staff


class CanCreatePurchase(permissions.BasePermission):
    """
    Permission to create purchases.
    
    Allowed:
    - Tenant Admin
    - Store/Accounts
    """
    message = "Purchase creation access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_tenant_admin or request.user.is_store_accounts


class CanViewOwnSalesOnly(permissions.BasePermission):
    """
    Restricts Sales Staff to view only their own sales.
    
    This is an object-level permission that should be applied
    in get_queryset() method.
    """
    message = "You can only view your own sales."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Tenant admins can see all
        if request.user.is_tenant_admin or request.user.is_platform_maintainer:
            return True
        # Sales staff are restricted to own sales (implemented in queryset)
        return request.user.is_sales_staff


class CanRecordPayment(permissions.BasePermission):
    """
    Permission to record payments.
    
    Allowed:
    - Tenant Admin
    - Sales Staff (customer payments)
    - Store/Accounts (supplier payments)
    """
    message = "Payment recording access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (request.user.is_tenant_admin or 
                request.user.is_sales_staff or 
                request.user.is_store_accounts)


# =====================
# Helper Functions
# =====================

def get_role_display_name(role):
    """Get human-readable role name."""
    role_names = {
        'platform_maintainer': 'Platform Maintainer',
        'tenant_admin': 'Tenant Admin',
        'sales_staff': 'Sales Staff',
        'store_accounts': 'Store/Accounts',
    }
    return role_names.get(role, 'Unknown')


def check_role_permission(user, required_role):
    """
    Check if user has the required role or higher.
    
    Role hierarchy (highest to lowest):
    1. platform_maintainer
    2. tenant_admin
    3. sales_staff
    4. store_accounts
    """
    if not user or not user.is_authenticated:
        return False
    
    role_hierarchy = {
        'platform_maintainer': 4,
        'tenant_admin': 3,
        'sales_staff': 2,
        'store_accounts': 1,
    }
    
    user_role_level = role_hierarchy.get(user.role, 0)
    required_level = role_hierarchy.get(required_role, 0)
    
    # Superusers bypass role check
    if user.is_superuser:
        return True
    
    return user_role_level >= required_level

