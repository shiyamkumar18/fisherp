# Deferred imports to avoid circular import
def is_impersonating(user_or_request):
    from accounts.permissions import is_impersonating
    # If it's a request, use the original function
    if hasattr(user_or_request, 'user'):
        return is_impersonating(user_or_request)
    # If it's a user, we can't easily know impersonation status without the request/session
    return False


def get_impersonated_tenant(user_or_request):
    from accounts.permissions import get_impersonated_tenant
    if hasattr(user_or_request, 'user'):
        return get_impersonated_tenant(user_or_request)
    return None


from trading.helpers import _user_company  # noqa: E402


def _get_create_scope(user_dict):
    from trading.views import _get_create_scope
    return _get_create_scope(user_dict)


from django.db import models  # noqa: E402
from django.db.models import Q  # noqa: E402


class CompanyManager(models.Manager):
    """Scoped manager for tenant/company isolation."""

    def for_user(self, user):
        if not user or not getattr(user, 'is_authenticated', False):
            return self.get_queryset().none()
        if user.is_superuser:
            return self.get_queryset()
        if getattr(user, 'is_platform_user', False):
            return self.get_queryset().none()
        company = _user_company(user)
        if company is None:
            return self.get_queryset().none()
        return self.get_queryset().filter(company=company)

class BaseService:
    """Base class for services with tenant scoping."""

    def __init__(self, user):
        self.user = user
        self.company = self._get_company()

    def _get_company(self):
        if is_impersonating(self.user):
            return get_impersonated_tenant(self.user)
        return _user_company(self.user)

    def get_scoped_queryset(self, model):
        """Get queryset scoped to user/company."""
        # Assume models have .objects.for_user(user)
        return model.objects.for_user(self.user)

    def get_create_scope(self):
        """Get scope for create ops."""
        return _get_create_scope({'user': self.user})
