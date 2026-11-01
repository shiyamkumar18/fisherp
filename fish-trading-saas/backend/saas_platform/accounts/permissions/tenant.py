from rest_framework import permissions
from .base import check_module_permission
from .platform import is_impersonating


class IsTenantAdmin(permissions.BasePermission):
    """
    Tenant Admin - Full business control within own tenant.
    """
    message = "Tenant Admin access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_platform_user and is_impersonating(request):
            return True
        return request.user.is_tenant_admin


class IsAccountant(permissions.BasePermission):
    """
    Accountant - Financial authority within tenant.
    """
    message = "Accountant access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_platform_user and is_impersonating(request):
            return True
        return request.user.is_accountant or request.user.is_tenant_admin


class IsSalesStaff(permissions.BasePermission):
    """
    Sales Staff - Sales operations focus.
    """
    message = "Sales Staff access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_platform_user and is_impersonating(request):
            return True
        return request.user.is_sales_staff or request.user.is_tenant_admin or request.user.is_accountant


class IsStoreAccounts(permissions.BasePermission):
    """
    Store/Accounts - Purchase & Inventory focus.
    """
    message = "Store/Accounts access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_platform_user and is_impersonating(request):
            return True
        return request.user.is_store_accounts or request.user.is_tenant_admin or request.user.is_accountant


class IsTenantUser(permissions.BasePermission):
    """Any authenticated tenant user (excludes platform operator from business data)."""
    message = "Tenant user access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_platform_user and is_impersonating(request):
            return True
        return request.user.is_tenant_user


class TenantObjectPermission(permissions.BasePermission):
    """
    Permission that ensures the object belongs to the user's tenant.
    This works in conjunction with QuerysetProtectionMixin and is used
    as a base class for viewsets that need object‑level tenant checks.
    """
    def has_object_permission(self, request, view, obj):
        # The queryset already filters to the user's tenant, so object permission is implicitly granted.
        return True


class CanManageUsers(permissions.BasePermission):
    """
    Permission to manage tenant users.
    """
    message = "User management restricted to Tenant Admin."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_tenant_admin


class CanDeleteRecord(permissions.BasePermission):
    """
    Permission to delete records.
    Only Tenant Admin can hard delete records.
    """
    message = "Delete access restricted to Tenant Admin."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_tenant_admin
