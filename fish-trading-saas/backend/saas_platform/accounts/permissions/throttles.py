from rest_framework import permissions
from .base import check_feature_access


class LoginThrottle(permissions.BasePermission):
    """
    Throttle login attempts (5/hour per IP/email).
    """
    message = "Too many login attempts. Try again later."

    def has_permission(self, request, view):
        from saas_platform.accounts.models_audit import LoginAttempt
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
