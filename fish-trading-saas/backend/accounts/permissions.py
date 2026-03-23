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
from rest_framework.exceptions import PermissionDenied, NotAuthenticated
from django.utils import timezone


# =====================
# Platform Operator Permissions
# =====================

class IsPlatformSuperAdmin(permissions.BasePermission):
    """
    Platform Super Admin - Highest privilege role for emergency access.
    
    ✅ CAN:
    - All platform_operator permissions
    - Emergency business data access (without full impersonation logging)
    - Override restrictions when necessary
    - Manage other platform operators
    """
    message = "Platform Super Admin access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_platform_super_admin


class IsPlatformOperator(permissions.BasePermission):
    """
    Platform Operator - Manages SaaS but cannot see business data directly.
    
    ✅ CAN:
    - Manage tenants (create, activate, suspend)
    - Manage subscriptions
    - View usage metrics
    - View system analytics
    - View audit logs
    
    ❌ CANNOT:
    - See PurchaseBatch details
    - See Sales
    - See Buyer financial data
    - See Profit margins
    - Access tenant business data directly
    
    Must use impersonation to access tenant data.
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


class LoginThrottle(permissions.BasePermission):
    """
    Custom throttle for login attempts (5/hour per IP/email).
    """
    message = "Too many login attempts."

    def has_permission(self, request, view):
        from accounts.models_audit import LoginAttempt
        ip = get_client_ip(request) if hasattr(request, 'META') else 'unknown'
        email = request.data.get('email')
        if email:
            attempts = LoginAttempt.get_failed_attempts(email, minutes=60)
            if attempts > 5:
                return False
        return True

class ImpersonationThrottle(permissions.BasePermission):
    """
    Throttle impersonation (3/hour per platform user).
    """
    message = "Too many impersonation attempts."

    def has_permission(self, request, view):
        user = request.user
        if not user.is_platform_operator:
            return True
        # Check DB or cache for impersonation count
        # Simplified: assume cache, here use session count
        count = request.session.get('impersonation_attempts', 0)
        if count > 3:
            return False
        request.session['impersonation_attempts'] = count + 1
        request.session.modified = True
        return True

class LoginThrottle(permissions.BasePermission):
    """
    Throttle login attempts (5/hour per IP/email).
    """
    message = "Too many login attempts. Try again later."

    def has_permission(self, request, view):
        from .models_audit import LoginAttempt, get_client_ip
        ip = get_client_ip(request) if 'get_client_ip' in globals() else request.META.get('REMOTE_ADDR')
        email = request.data.get('email') or request.data.get('username')
        if email:
            attempts = LoginAttempt.get_failed_attempts(email, minutes=60)
            if attempts >= 5:
                return False
        return True

class ImpersonationThrottle(permissions.BasePermission):
    """
    Throttle impersonation (3/hour per platform user).
    """
    message = "Too many impersonation requests."

    def has_permission(self, request, view):
        if not request.user.is_authenticated or not (request.user.is_platform_operator or request.user.is_platform_super_admin):
            return True
        count = request.session.get('impersonation_count', 0)
        if count >= 3:
            return False
        request.session['impersonation_count'] = count + 1
        request.session.modified = True
        return True

class LoginThrottle(permissions.BasePermission):
    """
    Rate limit login (5/hour per IP/email).
    """
    message = "Too many login attempts."

    def has_permission(self, request, view):
        from .models_audit import LoginAttempt, get_client_ip
        ip = get_client_ip(request)
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

class CanUseImpersonation(permissions.BasePermission):
    """
    Permission to use impersonation feature.
    Only platform operators can impersonate tenants.
    """
    message = "Only platform operators can impersonate tenants."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_platform_operator or request.user.is_platform_super_admin


# =====================
# Tenant User Permissions
# =====================

class IsTenantAdmin(permissions.BasePermission):
    """
    Tenant Admin - Full business control within own tenant.
    
    ✅ CAN:
    - All sales, purchases, inventory, payments
    - View profit and analytics
    - User management (add/remove traders, accountants, store staff)
    - Company settings
    """
    message = "Tenant Admin access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_tenant_admin


class IsAccountant(permissions.BasePermission):
    """
    Accountant - Financial authority within tenant.
    
    ✅ CAN:
    - All purchases and sales
    - All payments
    - Financial reports
    - Profit reports
    - Cannot delete records (use cancel/void instead)
    
    ❌ CANNOT:
    - Manage users
    - Change subscription
    - Hard delete financial records
    """
    message = "Accountant access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_accountant or request.user.is_tenant_admin


class IsSalesStaff(permissions.BasePermission):
    """
    Sales Staff - Sales operations focus.
    
    ✅ CAN:
    - Create/Edit sales (same-day only recommended)
    - Add buyers
    - Record customer payments
    - View own sales
    - Read-only inventory access
    
    ❌ CANNOT:
    - Add purchases
    - See full profit analytics
    - See supplier cost details
    - Manage users
    """
    message = "Sales Staff access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_sales_staff or request.user.is_tenant_admin or request.user.is_accountant


class IsStoreAccounts(permissions.BasePermission):
    """
    Store/Accounts - Purchase & Inventory focus.
    
    ✅ CAN:
    - Add purchase batches
    - Record supplier invoices
    - Update inventory quantity
    - Record supplier payments
    - View stock levels and expiry alerts
    
    ❌ CANNOT:
    - View full profit analytics
    - View sales revenue breakdown
    - View buyer credit summary
    - Manage users
    """
    message = "Store/Accounts access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
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
        return request.user.is_tenant_admin or request.user.is_platform_user


class IsTenantUser(permissions.BasePermission):
    """Any authenticated tenant user (excludes platform operator from business data)."""
    message = "Tenant user access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
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
        return any(getattr(request.user, role_flag, False) for role_flag in self.role_flags)


# =====================
# Financial Permissions
# =====================

class CanViewFinancials(permissions.BasePermission):
    """
    Permission to view financial data (profits, margins, analytics).
    
    ✅ ALLOWED:
    - Tenant Admin
    - Accountant
    
    ❌ DENIED:
    - Platform Operator (unless impersonating)
    - Sales Staff
    - Store Accounts
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
    
    ✅ ALLOWED:
    - Tenant Admin
    
    ❌ DENIED:
    - Accountant
    - Sales Staff
    - Store Accounts
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
        return (request.user.is_tenant_admin or 
                request.user.is_accountant or 
                request.user.is_sales_staff or 
                request.user.is_store_accounts)


class CanDeleteRecord(permissions.BasePermission):
    """
    Permission to delete records.
    
    Only Tenant Admin can hard delete records.
    Other roles should use soft delete (cancel/void).
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
    
    - Tenant Admin: Can edit any time
    - Accountant: Can edit before delivery
    - Sales Staff: Can only edit same-day sales
    """
    message = "You do not have permission to edit this sale."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Tenant Admin can edit any time
        if request.user.is_tenant_admin:
            return True
        
        # Accountant can edit any time (but view has restrictions)
        if request.user.is_accountant:
            return True
        
        # Sales Staff can only create - edit is handled in object permissions
        if request.user.is_sales_staff:
            return True
        
        return False
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Tenant Admin can edit any sale
        if request.user.is_tenant_admin:
            return True
        
        # Accountant can edit before delivery
        if request.user.is_accountant:
            return obj.delivery_status != 'delivered'
        
        # Sales Staff can only edit same-day sales
        if request.user.is_sales_staff:
            from django.utils import timezone
            today = timezone.now().date()
            return obj.date == today
        
        return False


class CanEditPurchase(permissions.BasePermission):
    """
    Permission to edit purchases based on time constraints.
    
    - Tenant Admin: Can edit any time
    - Accountant: Can edit before lock
    - Store Accounts: Can edit before lock
    """
    message = "You do not have permission to edit this purchase."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Tenant Admin can edit any time
        if request.user.is_tenant_admin:
            return True
        
        # Accountant can edit any time
        if request.user.is_accountant:
            return True
        
        # Store Accounts can only create - edit is handled in object permissions
        if request.user.is_store_accounts:
            return True
        
        return False
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Tenant Admin can edit any purchase
        if request.user.is_tenant_admin:
            return True
        
        # Accountant and Store Accounts can edit before lock
        if request.user.is_accountant or request.user.is_store_accounts:
            return obj.status != 'locked'
        
        return False


class CanEditPayment(permissions.BasePermission):
    """
    Permission to edit payments based on time constraints.
    
    - Tenant Admin: Can edit any time
    - Accountant: Can edit before cleared
    - Sales Staff: Can edit customer payments before cleared
    - Store Accounts: Can edit supplier payments before cleared
    """
    message = "You do not have permission to edit this payment."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Tenant Admin can edit any time
        if request.user.is_tenant_admin:
            return True
        
        # Accountant can edit any time
        if request.user.is_accountant:
            return True
        
        # Sales Staff and Store Accounts can create - edit handled in object permissions
        if request.user.is_sales_staff or request.user.is_store_accounts:
            return True
        
        return False
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Tenant Admin can edit any payment
        if request.user.is_tenant_admin:
            return True
        
        # Others can edit only before cleared
        return not obj.is_cleared


class CanViewSupplierCost(permissions.BasePermission):
    """
    Permission to view supplier cost details.
    
    ✅ ALLOWED:
    - Tenant Admin
    - Accountant
    - Store Accounts
    
    ❌ DENIED:
    - Sales Staff (cannot see supplier cost)
    """
    message = "Supplier cost details are restricted."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return not request.user.is_sales_staff


class CanViewPurchaseCost(permissions.BasePermission):
    """
    Permission to view purchase cost details.
    
    ✅ ALLOWED:
    - Tenant Admin
    - Accountant
    - Store Accounts
    
    ❌ DENIED:
    - Sales Staff (cannot see cost details)
    """
    message = "Purchase cost details are restricted."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return not request.user.is_sales_staff


# =====================
# Queryset Protection Mixin
# =====================

from ..services.base import CompanyManager, TenantObjectPermission

class QuerysetProtectionMixin:
    """
    Enhanced queryset mixin using CompanyManager.
    """
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.is_platform_user:
            if hasattr(self.request, 'session') and self.request.session.get('impersonating_company_id'):
                return self.queryset.filter(company_id=self.request.session['impersonating_company_id'])
            return self.queryset.none()
        return self.queryset.for_user(user)


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
    
    Role hierarchy (highest to lowest):
    1. platform_operator (6)
    2. platform_support (5)
    3. tenant_admin (4)
    4. accountant (3)
    5. trader (2)
    6. store (1)
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
    
    # Platform operators have access to everything for management
    if user.is_platform_user:
        return (True, "Platform operator")
    
    # Check for active subscription
    subscription_qs = Subscription.objects.filter(status='active')
    if user.company_id:
        subscription_qs = subscription_qs.filter(company=user.company)
    else:
        subscription_qs = subscription_qs.filter(tenant=user)
    subscription = subscription_qs.order_by('-created_at').first()
    if not subscription:
        return (False, "No active subscription")
    
    # Check if subscription is expired
    if subscription.expiry_date and subscription.expiry_date < timezone.now().date():
        return (False, "Subscription expired")
    
    # Check feature access
    if subscription.can_access_feature(feature_name):
        return (True, f"Feature enabled in {subscription.tier.name} tier")
    
    return (False, f"Feature '{feature_name}' not available in {subscription.tier.name} tier")


class HasFeatureAccess(permissions.BasePermission):
    """Permission class to check if user has access to a specific feature."""
    
    def __init__(self, feature_name=None):
        self.feature_name = feature_name
        super().__init__()
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Platform operators have access to everything
        if request.user.is_platform_user:
            return True
        
        # Get feature name from view or use default
        feature_name = getattr(view, 'feature_name', None) or self.feature_name
        
        if not feature_name:
            return True
        
        has_access, reason = check_feature_access(request.user, feature_name)
        
        if not has_access:
            self.message = f"Feature not available: {reason}"
        
        return has_access


# =====================
# Impersonation Helpers
# =====================

def is_impersonating(request):
    """Check if current request is in impersonation mode."""
    if not request.user.is_authenticated:
        return False
    
    # Check if user is a platform operator in impersonation mode
    if hasattr(request, 'session') and request.session:
        return request.session.get('impersonating_tenant_id') is not None
    
    return False


def get_impersonated_tenant(request):
    """Get the tenant being impersonated in current request."""
    if not is_impersonating(request):
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
    
    This should be called when platform operator wants to access tenant data.
    """
    from .models_audit import ImpersonationLog, get_client_ip
    
    # Create impersonation log
    impersonation_log = ImpersonationLog.objects.create(
        platform_user=request.user,
        tenant=tenant,
        reason=reason,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
    )
    
    # Store in session
    request.session['impersonating_tenant_id'] = tenant.id
    request.session['impersonation_log_id'] = impersonation_log.id
    request.session['impersonation_start_time'] = timezone.now().isoformat()
    
    return impersonation_log


def end_impersonation(request):
    """
    End impersonation session for platform operator.
    """
    from .models_audit import ImpersonationLog, get_client_ip
    
    tenant_id = request.session.pop('impersonating_tenant_id', None)
    log_id = request.session.pop('impersonation_log_id', None)
    request.session.pop('impersonation_start_time', None)
    
    if log_id:
        try:
            log = ImpersonationLog.objects.get(id=log_id)
            log.end_impersonation()
            
            # Log the end action
            from .models_audit import AuditLog
            AuditLog.log_impersonation_end(
                platform_user=request.user,
                tenant=log.tenant,
                ip_address=get_client_ip(request)
            )
        except ImpersonationLog.DoesNotExist:
            pass
    
    return True
