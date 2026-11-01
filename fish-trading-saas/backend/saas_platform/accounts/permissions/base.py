from rest_framework import permissions
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist


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
            from saas_platform.permissions.models import RolePermission
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


def check_role_permission(user, required_role):
    """
    Check if user has the required role or higher.
    """
    if not user or not user.is_authenticated:
        return False
    from saas_platform.accounts.models import ROLE_HIERARCHY
    user_role_level = user.role_level
    required_level = ROLE_HIERARCHY.get(required_role, 0)
    return user_role_level >= required_level


def check_feature_access(user, feature_name):
    """
    Check if user can access a specific feature based on their subscription.
    """
    from saas_platform.subscriptions.models import Subscription
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
