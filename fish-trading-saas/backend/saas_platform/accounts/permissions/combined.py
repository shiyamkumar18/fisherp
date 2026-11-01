from rest_framework import permissions
from .base import check_module_permission
from .platform import is_impersonating


class IsTenantAdminOrAbove(permissions.BasePermission):
    """Permission for roles >= Tenant Admin."""
    message = "Tenant Admin or higher access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_platform_user and is_impersonating(request):
            return True
        return request.user.is_tenant_admin or request.user.is_platform_user


class HasAnyRole(permissions.BasePermission):
    """
    Generic OR-combination permission for role flags on the user model.
    Usage: HasAnyRole("is_tenant_admin", "is_accountant")
    """
    message = "You do not have permission for this action."

    def __init__(self, *role_flags, message=None):
        self.role_flags = role_flags
        if message:
            self.message = message

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_platform_user and is_impersonating(request):
            return True
        return any(getattr(request.user, role_flag, False) for role_flag in self.role_flags)


# =====================
# CRUD Permissions
# =====================

class CanCreateSale(permissions.BasePermission):
    message = "Sales creation access required."
    def has_permission(self, request, view):
        return check_module_permission(request.user, 'sales', 'edit')


class CanCreatePurchase(permissions.BasePermission):
    message = "Purchase creation access required."
    def has_permission(self, request, view):
        return check_module_permission(request.user, 'purchases', 'edit')


class CanRecordPayment(permissions.BasePermission):
    message = "Payment recording access required."
    def has_permission(self, request, view):
        return check_module_permission(request.user, 'payments', 'edit')


# =====================
# Time-based Edit Permissions
# =====================

class CanEditSale(permissions.BasePermission):
    message = "You do not have permission to edit this sale."
    def has_permission(self, request, view):
        return check_module_permission(request.user, 'sales', 'edit')

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_tenant_admin:
            return True
        if not check_module_permission(request.user, 'sales', 'edit'):
            return False
            
        from django.utils import timezone
        if request.user.role in ['trader', 'store']:
            if getattr(obj, 'date', None) != timezone.now().date():
                return False
                
        return getattr(obj, 'delivery_status', '') != 'delivered' and getattr(obj, 'status', '') != 'locked'


class CanEditPayment(permissions.BasePermission):
    message = "You do not have permission to edit this payment."
    def has_permission(self, request, view):
        return check_module_permission(request.user, 'payments', 'edit')

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_tenant_admin:
            return True
        return not obj.is_cleared


# =====================
# Dynamic Module Permissions
# =====================

class BaseModulePermission(permissions.BasePermission):
    module_name = None
    
    def has_permission(self, request, view):
        if not self.module_name:
            return True
        action = getattr(self, 'action_type', 'view')
        return check_module_permission(request.user, self.module_name, action)


class CanViewSales(BaseModulePermission):
    module_name = 'sales'
    action_type = 'view'
    
class CanEditSales(BaseModulePermission):
    module_name = 'sales'
    action_type = 'edit'
    
class CanDeleteSales(BaseModulePermission):
    module_name = 'sales'
    action_type = 'delete'
    
class CanViewPurchases(BaseModulePermission):
    module_name = 'purchases'
    action_type = 'view'
    
class CanEditPurchases(BaseModulePermission):
    module_name = 'purchases'
    action_type = 'edit'
    
class CanDeletePurchases(BaseModulePermission):
    module_name = 'purchases'
    action_type = 'delete'

class CanViewInventory(BaseModulePermission):
    module_name = 'inventory'
    action_type = 'view'
    
class CanEditInventory(BaseModulePermission):
    module_name = 'inventory'
    action_type = 'edit'
    
class CanDeleteInventory(BaseModulePermission):
    module_name = 'inventory'
    action_type = 'delete'
    
class CanViewPayments(BaseModulePermission):
    module_name = 'payments'
    action_type = 'view'
    
class CanEditPayments(BaseModulePermission):
    module_name = 'payments'
    action_type = 'edit'
    
class CanDeletePayments(BaseModulePermission):
    module_name = 'payments'
    action_type = 'delete'
    
class CanViewCustomers(BaseModulePermission):
    module_name = 'customers'
    action_type = 'view'
    
class CanEditCustomers(BaseModulePermission):
    module_name = 'customers'
    action_type = 'edit'
    
class CanDeleteCustomers(BaseModulePermission):
    module_name = 'customers'
    action_type = 'delete'
    
class CanViewSuppliers(BaseModulePermission):
    module_name = 'suppliers'
    action_type = 'view'
    
class CanEditSuppliers(BaseModulePermission):
    module_name = 'suppliers'
    action_type = 'edit'
    
class CanDeleteSuppliers(BaseModulePermission):
    module_name = 'suppliers'
    action_type = 'delete'
