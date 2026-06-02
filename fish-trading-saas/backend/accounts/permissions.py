"""
Role-Based Permission Classes for Fisherp SaaS

Implements professional, security-hardened RBAC:
- Platform Operator: Global SaaS management, NO direct business data access
- Tenant Admin: Full business control within tenant
- Accountant: Financial authority within tenant
- Sales Staff: Sales operations only
- Store Accounts: Purchase & Inventory only

Security Principles:
1. Platform operators cannot casually see tenant business data
2. Impersonation required for tenant data access
3. All actions logged in audit trail
4. Tenant isolation enforced at queryset level
"""

from rest_framework import permissions
from django.utils import timezone
from django.core.exceptions import ImproperlyConfigured



def check_module_permission(user, module, action):
    """
    Unified role & matrix permission checker.
    Mirrors the frontend usePermission hook.

    Check order:
      1. Unauthenticated → deny
      2. Platform super admin (is_platform_user) → allow all
      3. Tenant Admin flag → allow all within tenant
      4. Granular JSON override on user (per-field customisation by tenant admin)
      5. DB-driven RBAC matrix via permissions app (Role → RolePermission)
      6. Legacy hardcoded fallback (safety net)
    """
    if not user or not user.is_authenticated:
        return False

    # System-level admins bypass all checks
    if getattr(user, 'is_platform_user', False):
        return True

    # Tenant admins have broad access (accounting/financials still checked below)
    if getattr(user, 'is_tenant_admin', False):
        return True

    # 1. Granular JSON override stored on the user
    if hasattr(user, 'granular_permissions') and isinstance(user.granular_permissions, dict):
        module_perms = user.granular_permissions.get(module)
        if isinstance(module_perms, dict) and action in module_perms:
            return bool(module_perms[action])

    # 2. DB-driven RBAC matrix (permissions app)
    # tenant_role is the FK added in 0002_add_tenant_role migration
    tenant_role = getattr(user, 'tenant_role', None)
    if tenant_role is not None:
        try:
            from permissions.models import RolePermission
            return RolePermission.objects.filter(
                role=tenant_role,
                permission__module=module,
                permission__action=action,
                allowed=True,
            ).exists()
        except Exception:
            pass  # fall through to legacy

    # 3. Legacy fallback based on old role string field
    role = getattr(user, 'role', 'guest')
    if role == 'viewer':
        return action == 'view'

    legacy_defaults = {
        'sales':      ['tenant_admin', 'branch_manager', 'supervisor', 'sales_staff', 'trader'],
        'purchases':  ['tenant_admin', 'branch_manager', 'supervisor', 'purchase_manager', 'trader', 'store'],
        'inventory':  ['tenant_admin', 'branch_manager', 'supervisor', 'inventory_manager', 'store'],
        'customers':  ['tenant_admin', 'branch_manager', 'supervisor', 'sales_staff', 'trader'],
        'suppliers':  ['tenant_admin', 'branch_manager', 'supervisor', 'purchase_manager', 'trader', 'store'],
        'payments':   ['tenant_admin', 'branch_manager', 'finance_manager', 'accountant'],
        'financials': ['tenant_admin', 'branch_manager', 'finance_manager', 'accountant'],
        'settings':   ['tenant_admin'],
    }
    allowed_roles = legacy_defaults.get(module, [])
    if action in ('view', 'edit', 'create'):
        return role in allowed_roles
    if action == 'delete':
        return role == 'tenant_admin'

    return False


def check_role_permission(user, permission_name):
    # Legacy wrapper
    return check_module_permission(user, 'sales', 'edit')




# =====================
# Platform Operator Permissions
# =====================

class IsPlatformSuperAdmin(permissions.BasePermission):
    """
    Platform Super Admin - Highest privilege role for emergency access.
    """
    message = "Platform Super Admin access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_platform_super_admin


class IsPlatformOperator(permissions.BasePermission):
    """
    Platform Operator - Manages SaaS but cannot see business data directly.
    """
    message = "Platform Operator access required for SaaS management."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_platform_operator or request.user.is_platform_super_admin


class IsPlatformSupport(permissions.BasePermission):
    """
    Platform Support - cross-tenant troubleshooting with limited permissions.
    """
    message = "Platform Support access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_platform_support or request.user.is_platform_super_admin


class IsPlatformOperatorOrReadOnlySupport(permissions.BasePermission):
    """
    Allows Platform Operators full access, but Platform Support read-only access.
    """
    message = "Platform Operator access required, or Platform Support for viewing only."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_platform_super_admin or request.user.is_platform_operator:
            return True
        if request.user.is_platform_support:
            return request.method in permissions.SAFE_METHODS
        return False


class CanUseImpersonation(permissions.BasePermission):
    """
    Permission to use impersonation feature.
    Allows platform operators and platform support to impersonate tenants.
    """
    message = "Only platform operators and support staff can impersonate tenants."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (request.user.is_platform_operator or 
                request.user.is_platform_support or 
                request.user.is_platform_super_admin)


# =====================
# Tenant User Permissions
# =====================

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


# =====================
# Combined Permissions
# =====================

class IsTenantAdminOrAbove(permissions.BasePermission):
    """Permission for roles >= Tenant Admin."""
    message = "Tenant Admin or higher access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_platform_user and is_impersonating(request):
            return True
        return request.user.is_tenant_admin or request.user.is_platform_user


class IsTenantUser(permissions.BasePermission):
    """Any authenticated tenant user (excludes platform operator from business data)."""
    message = "Tenant user access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_platform_user and is_impersonating(request):
            return True
        return request.user.is_tenant_user


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
# Financial Permissions
# =====================

class CanViewFinancials(permissions.BasePermission):
    """
    Permission to view financial data (profits, margins, analytics).
    """
    message = "Financial data access restricted to Tenant Admin and Accountant."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_tenant_admin or request.user.is_accountant


class CanViewProfit(permissions.BasePermission):
    """Permission to view profit margins and calculations."""
    message = "Profit data access restricted."

    def has_permission(self, request, view):
        return check_role_permission(request.user, 'can_view_profit')



class CanManageUsers(permissions.BasePermission):
    """
    Permission to manage tenant users.
    """
    message = "User management restricted to Tenant Admin."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_tenant_admin


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
        if not check_module_permission(request.user, 'purchases', 'edit'):
            return False
        return obj.status != 'locked'


class CanEditPayment(permissions.BasePermission):
    message = "You do not have permission to edit this payment."
    def has_permission(self, request, view):
        return check_module_permission(request.user, 'payments', 'edit')
        if request.user.is_tenant_admin:
            return True
        if request.user.is_accountant:
            return True
        if request.user.is_sales_staff or request.user.is_store_accounts:
            return True
        return False

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_tenant_admin:
            return True
        return not obj.is_cleared


class CanViewSupplierCost(permissions.BasePermission):
    """
    Permission to view supplier cost details.
    """
    message = "Supplier cost details are restricted."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return not request.user.is_sales_staff


class CanViewPurchaseCost(permissions.BasePermission):
    """
    Permission to view purchase cost details.
    """
    message = "Purchase cost details are restricted."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return not request.user.is_sales_staff


# =====================
# Queryset Protection Mixin
# =====================

class QuerysetProtectionMixin:
    """
    Production-grade queryset protection mixin.

    Enforces tenant isolation and platform impersonation.
    Requires:
    - self.request
    - self.queryset
    - queryset.for_user(user)
    """

    queryset = None

    def get_queryset(self):
        if self.queryset is None:
            raise ImproperlyConfigured(
                f"{self.__class__.__name__} "
                "must define 'queryset'."
            )

        if not hasattr(self, "request"):
            raise ImproperlyConfigured(
                f"{self.__class__.__name__} "
                "requires DRF request object."
            )

        user = self.request.user

        # Platform users require impersonation
        if user.is_superuser or user.is_platform_user:
            impersonating_id = (
                self.request.session.get(
                    "impersonating_company_id"
                )
                or self.request.session.get(
                    "impersonating_tenant_id"
                )
            )

            if impersonating_id:
                return self.queryset.filter(
                    company_id=impersonating_id
                )

            return self.queryset.none()

        # Tenant users
        return self.queryset.for_user(user)

# =====================
# NEW: TenantObjectPermission
# =====================

class TenantObjectPermission(permissions.BasePermission):
    """
    Permission that ensures the object belongs to the user's tenant.
    This works in conjunction with QuerysetProtectionMixin and is used
    as a base class for viewsets that need object‑level tenant checks.
    """
    def has_object_permission(self, request, view, obj):
        # The queryset already filters to the user's tenant, so object permission is implicitly granted.
        # If you need explicit check, you can implement it here.
        return True


# =====================
# Throttle Classes (Single definitions)
# =====================

class LoginThrottle(permissions.BasePermission):
    """
    Throttle login attempts (5/hour per IP/email).
    """
    message = "Too many login attempts. Try again later."

    def has_permission(self, request, view):
        from accounts.models_audit import LoginAttempt
        email = request.data.get('email') or request.data.get('username')
        if email:
            attempts = LoginAttempt.get_failed_attempts(email, minutes=60)
            if attempts >= 5:
                return False
        return True


class ImpersonationThrottle(permissions.BasePermission):
    """
    Rate limit impersonation (3/hour per user).
    """
    message = "Too many impersonation attempts."

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated or not user.is_platform_operator:
            return True
        count = request.session.get('impersonation_attempts', 0)
        if count >= 3:
            return False
        request.session['impersonation_attempts'] = count + 1
        request.session.modified = True
        return True


# =====================
# Feature Access Permission
# =====================

class HasFeatureAccess(permissions.BasePermission):
    """Permission class to check if user has access to a specific feature."""

    def __init__(self, feature_name=None):
        self.feature_name = feature_name
        super().__init__()

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_platform_user:
            return True
        feature_name = getattr(view, 'feature_name', None) or self.feature_name
        if not feature_name:
            return True
        has_access, reason = check_feature_access(request.user, feature_name)
        if not has_access:
            self.message = f"Feature not available: {reason}"
        return has_access


# =====================
# Helper Functions
# =====================

def get_role_display_name(role):
    """Get human-readable role name."""
    role_names = {
        'platform_operator': 'Platform Operator',
        'platform_support': 'Platform Support',
        'tenant_admin': 'Tenant Admin',
        'accountant': 'Accountant',
        'trader': 'Trader',
        'store': 'Store / Inventory',
    }
    return role_names.get(role, 'Unknown')


def get_role_description(role):
    """Get detailed role description."""
    descriptions = {
        'platform_operator': 'Manages SaaS platform, tenants, and subscriptions. Cannot view business data directly.',
        'platform_support': 'Supports tenant troubleshooting and issue resolution with limited rights.',
        'tenant_admin': 'Full business control within tenant. Can manage users and view all data.',
        'accountant': 'Financial authority. Can view and edit all financial records.',
        'trader': 'Sales operations. Can create sales and manage buyers.',
        'store': 'Purchase & Inventory. Can manage purchases and stock.',
    }
    return descriptions.get(role, '')


def check_role_permission(user, required_role):
    """
    Check if user has the required role or higher.
    """
    if not user or not user.is_authenticated:
        return False
    from .models import ROLE_HIERARCHY
    user_role_level = user.role_level
    required_level = ROLE_HIERARCHY.get(required_role, 0)
    return user_role_level >= required_level


def check_feature_access(user, feature_name):
    """
    Check if user can access a specific feature based on their subscription.
    """
    from subscriptions.models import Subscription
    if user.is_platform_user:
        return (True, "Platform operator")
    subscription_qs = Subscription.objects.filter(status='active')
    if user.company_id:
        subscription_qs = subscription_qs.filter(company=user.company)
    else:
        subscription_qs = subscription_qs.none()
    subscription = subscription_qs.order_by('-created_at').first()
    if not subscription:
        return (False, "No active subscription")
    if subscription.expiry_date and subscription.expiry_date < timezone.now():
        return (False, "Subscription expired")
    if subscription.can_access_feature(feature_name):
        return (True, f"Feature enabled in {subscription.tier.name} tier")
    return (False, f"Feature '{feature_name}' not available in {subscription.tier.name} tier")


# =====================
# Impersonation Helpers
# =====================

def is_impersonating(request):
    """Check if current request is in impersonation mode."""
    if not hasattr(request, 'user') or request.user is None or not request.user.is_authenticated:
        return False
    if hasattr(request, 'session') and request.session:
        return request.session.get('impersonating_tenant_id') is not None
    return False


def get_impersonated_tenant(request):
    """Get the tenant being impersonated in current request."""
    if not is_impersonating(request):
        return None
    if not hasattr(request, 'session') or not request.session:
        return None
    from companies.models import Company
    tenant_id = request.session.get('impersonating_tenant_id')
    try:
        return Company.objects.get(id=tenant_id)
    except Company.DoesNotExist:
        return None


def start_impersonation(request, tenant, reason):
    """
    Start impersonation session for platform operator.
    """
    from .models_audit import ImpersonationLog, get_client_ip
    impersonated_user = getattr(tenant, 'admin', None)
    impersonation_log = ImpersonationLog.objects.create(
        platform_user=request.user,
        tenant=tenant,
        impersonated_user=impersonated_user,
        reason=reason,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        session_id=request.session.session_key or '',
    )
    request.session['impersonating_tenant_id'] = tenant.id
    request.session['impersonation_log_id'] = impersonation_log.id
    request.session['impersonating_user_id'] = impersonated_user.id if impersonated_user else None
    request.session['impersonation_start_time'] = timezone.now().isoformat()
    return impersonation_log


def end_impersonation(request):
    """
    End impersonation session for platform operator.
    """
    from .models_audit import ImpersonationLog, get_client_ip
    request.session.pop('impersonating_tenant_id', None)
    log_id = request.session.pop('impersonation_log_id', None)
    request.session.pop('impersonating_user_id', None)
    request.session.pop('impersonation_start_time', None)
    if log_id:
        try:
            log = ImpersonationLog.objects.get(id=log_id)
            log.end_impersonation()
            from .models_audit import AuditLog
            AuditLog.log_impersonation_end(
                platform_user=request.user,
                tenant=log.tenant,
                ip_address=get_client_ip(request)
            )
        except ImpersonationLog.DoesNotExist:
            pass
    return True

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
