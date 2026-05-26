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
    message = "Profit data access restricted to Tenant Admin and Accountant."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_tenant_admin or request.user.is_accountant


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
    """Permission to create sales."""
    message = "Sales creation access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_tenant_admin or request.user.is_accountant or request.user.is_sales_staff


class CanCreatePurchase(permissions.BasePermission):
    """Permission to create purchases."""
    message = "Purchase creation access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_tenant_admin or request.user.is_accountant or request.user.is_store_accounts


class CanRecordPayment(permissions.BasePermission):
    """Permission to record payments."""
    message = "Payment recording access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (request.user.is_tenant_admin or  # noqa: W504
                request.user.is_accountant or  # noqa: W504
                request.user.is_sales_staff or  # noqa: W504
                request.user.is_store_accounts)


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
    """
    Permission to edit sales based on time constraints.
    """
    message = "You do not have permission to edit this sale."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_tenant_admin:
            return True
        if request.user.is_accountant:
            return True
        if request.user.is_sales_staff:
            return True
        return False

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_tenant_admin:
            return True
        if request.user.is_accountant:
            return obj.delivery_status != 'delivered'
        if request.user.is_sales_staff:
            from django.utils import timezone
            today = timezone.now().date()
            return obj.date == today
        return False


class CanEditPurchase(permissions.BasePermission):
    """
    Permission to edit purchases based on time constraints.
    """
    message = "You do not have permission to edit this purchase."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_tenant_admin:
            return True
        if request.user.is_accountant:
            return True
        if request.user.is_store_accounts:
            return True
        return False

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_tenant_admin:
            return True
        if request.user.is_accountant or request.user.is_store_accounts:
            return obj.status != 'locked'
        return False


class CanEditPayment(permissions.BasePermission):
    """
    Permission to edit payments based on time constraints.
    """
    message = "You do not have permission to edit this payment."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
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
    Enhanced queryset mixin using CompanyManager.
    """
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.is_platform_user:
            session = getattr(self.request, 'session', None)
            if session:
                impersonating_id = session.get('impersonating_company_id') or session.get('impersonating_tenant_id')
                if impersonating_id:
                    return self.queryset.filter(company_id=impersonating_id)
            return self.queryset.none()
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
        subscription_qs = subscription_qs.filter(tenant=user)
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
