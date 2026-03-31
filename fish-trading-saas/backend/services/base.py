# Deferred imports to avoid circular import
def is_impersonating(user):
    from accounts.permissions import is_impersonating
    return is_impersonating(user)


def get_impersonated_tenant(user):
    from accounts.permissions import get_impersonated_tenant
    return get_impersonated_tenant(user)


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
            return self.get_queryset().filter(tenant=user)
        return self.get_queryset().filter(Q(company=company) | Q(tenant=user))

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
