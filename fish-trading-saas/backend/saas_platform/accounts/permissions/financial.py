from rest_framework import permissions
from django.core.exceptions import ImproperlyConfigured
from .base import check_role_permission
from .platform import is_impersonating


class CanViewFinancials(permissions.BasePermission):
    """
    Permission to view financial data (profits, margins, analytics).
    """
    message = "Financial data access restricted to Tenant Admin and Accountant."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if getattr(request.user, 'is_platform_user', False) and is_impersonating(request):
            return True
        return request.user.is_tenant_admin or request.user.is_accountant


class CanViewProfit(permissions.BasePermission):
    """Permission to view profit margins and calculations."""
    message = "Profit data access restricted."

    def has_permission(self, request, view):
        return check_role_permission(request.user, 'can_view_profit')


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
            from saas_platform.accounts.permissions import get_impersonated_tenant
            tenant = get_impersonated_tenant(self.request)

            if tenant:
                return self.queryset.filter(
                    company_id=tenant.id
                )

            return self.queryset.none()

        # Tenant users
        return self.queryset.for_user(user)
