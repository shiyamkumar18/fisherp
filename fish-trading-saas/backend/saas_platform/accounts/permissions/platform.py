from rest_framework import permissions
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist


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
# Impersonation Helpers
# =====================

def is_impersonating(request, user=None):
    """Check if current request is in impersonation mode."""
    if user is None:
        if not hasattr(request, 'user') or request.user is None or not request.user.is_authenticated:
            return False
        user = request.user
    
    if not user.is_authenticated:
        return False

    if request.META.get('HTTP_X_IMPERSONATE_TENANT'):
        return True
    if hasattr(request, 'session') and request.session:
        return request.session.get('impersonating_tenant_id') is not None
    return False


def get_impersonated_tenant(request, user=None):
    """Get the tenant being impersonated in current request."""
    if not is_impersonating(request, user=user):
        return None
        
    from saas_platform.companies.models import Company
    
    tenant_slug = request.META.get('HTTP_X_IMPERSONATE_TENANT')
    if tenant_slug:
        try:
            return Company.objects.get(slug=tenant_slug)
        except Company.DoesNotExist:
            pass
            
    if hasattr(request, 'session') and request.session:
        tenant_id = request.session.get('impersonating_tenant_id')
        if tenant_id:
            try:
                return Company.objects.get(id=tenant_id)
            except Company.DoesNotExist:
                return None
    return None


def start_impersonation(request, tenant, reason):
    """
    Start impersonation session for platform operator.
    """
    from saas_platform.accounts.models_audit import ImpersonationLog, get_client_ip
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
    from saas_platform.accounts.models_audit import ImpersonationLog, get_client_ip
    request.session.pop('impersonating_tenant_id', None)
    log_id = request.session.pop('impersonation_log_id', None)
    request.session.pop('impersonating_user_id', None)
    request.session.pop('impersonation_start_time', None)
    if log_id:
        try:
            log = ImpersonationLog.objects.get(id=log_id)
            log.end_impersonation()
            from saas_platform.accounts.models_audit import AuditLog
            AuditLog.log_impersonation_end(
                platform_user=request.user,
                tenant=log.tenant,
                ip_address=get_client_ip(request)
            )
        except ImpersonationLog.DoesNotExist:
            pass
    return True
