from django.contrib.admin import AdminSite
from django.contrib.auth import get_user_model

User = get_user_model()


class PlatformAdminSite(AdminSite):
    site_title = 'Platform Administration'
    site_header = 'Fish Trading SaaS - Platform Manager'
    index_title = 'Platform Dashboard'

    def has_permission(self, request):
        return request.user.is_active and request.user.is_authenticated and (
            request.user.role in ['platform_operator', 'platform_support'] or request.user.is_superuser
        )

    def index(self, request, extra_context=None):
        from companies.models import Company
        from subscriptions.models import Subscription, SubscriptionTier
        from accounts.models import User

        context = {
            'total_tenants': Company.objects.count(),
            'active_subscriptions': Subscription.objects.filter(status='active').count(),
            'subscription_tiers': SubscriptionTier.objects.filter(is_active=True).count(),
            'total_users': User.objects.count(),
            'platform_operators': User.objects.filter(role='platform_operator').count(),
            'platform_support': User.objects.filter(role='platform_support').count(),
        }

        extra_context = extra_context or {}
        extra_context.update(context)

        return super().index(request, extra_context)


class TenantAdminSite(AdminSite):
    site_title = 'Company Administration'
    site_header = 'Fish Trading - Company Manager'
    index_title = 'Company Dashboard'

    def has_permission(self, request):
        return request.user.is_active and request.user.is_authenticated and (
            request.user.role == 'tenant_admin' or
            request.user.is_superuser
        )

    def each_context(self, request):
        context = super().each_context(request)
        if request.user.company:
            context['company_name'] = request.user.company.name
        return context

    def index(self, request, extra_context=None):
        company = request.user.company

        context = {
            'company_name': company.name if company else 'No Company',
        }

        extra_context = extra_context or {}
        extra_context.update(context)

        return super().index(request, extra_context)


class StaffAdminSite(AdminSite):
    site_title = 'Staff Portal'
    site_header = 'Fish Trading - Staff Portal'
    index_title = 'Staff Dashboard'

    def has_permission(self, request):
        return request.user.is_active and request.user.is_authenticated and (
            request.user.role == 'tenant_admin' or request.user.is_superuser
        )

    def get_role_display(self, request):
        role_names = {
            'accountant': 'Accountant',
            'trader': 'Trader',
            'store': 'Store / Inventory',
        }
        return role_names.get(request.user.role, 'Staff')

    def each_context(self, request):
        context = super().each_context(request)
        context['staff_role'] = self.get_role_display(request)
        if request.user.company:
            context['company_name'] = request.user.company.name
        return context

    def index(self, request, extra_context=None):
        role = request.user.role

        context = {
            'staff_role': self.get_role_display(request),
            'can_view_purchases': role in ['accountant', 'store'],
            'can_view_sales': role in ['accountant', 'trader'],
            'can_view_payments': True,
            'can_view_inventory': role in ['accountant', 'store'],
            'can_view_buyers': role in ['accountant', 'trader'],
            'can_view_suppliers': role in ['accountant', 'store'],
        }

        extra_context = extra_context or {}
        extra_context.update(context)

        return super().index(request, extra_context)


platform_admin_site = PlatformAdminSite(name='platform_admin')
tenant_admin_site = TenantAdminSite(name='tenant_admin')
staff_admin_site = StaffAdminSite(name='staff_admin')


class PlatformAdminMixin:
    def has_view_permission(self, request, obj=None):
        if not request.user.is_authenticated:
            return False
        return request.user.role in ['platform_operator', 'platform_support'] or request.user.is_superuser

    def has_add_permission(self, request):
        if not request.user.is_authenticated:
            return False
        return request.user.role in ['platform_operator', 'platform_support'] or request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        if not request.user.is_authenticated:
            return False
        return request.user.role in ['platform_operator', 'platform_support'] or request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        if not request.user.is_authenticated:
            return False
        return request.user.role in ['platform_operator'] or request.user.is_superuser


class TenantAdminMixin:
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if request.user.role == 'tenant_admin' and request.user.company:
            if 'company' in [f.name for f in qs.model._meta.get_fields()]:
                return qs.filter(company=request.user.company)
            return qs.filter(tenant=request.user)
        return qs.none()

    def has_view_permission(self, request, obj=None):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.role == 'tenant_admin':
            return True
        return False

    def has_add_permission(self, request):
        if not request.user.is_authenticated:
            return False
        return request.user.role == 'tenant_admin' or request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        if not request.user.is_authenticated:
            return False
        return request.user.role == 'tenant_admin' or request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        if not request.user.is_authenticated:
            return False
        return request.user.role == 'tenant_admin' or request.user.is_superuser


class StaffAdminMixin:
    ALLOWED_ROLES = ['tenant_admin']

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if request.user.role not in self.ALLOWED_ROLES:
            return qs.none()
        if request.user.company:
            if 'company' in [f.name for f in qs.model._meta.get_fields()]:
                return qs.filter(company=request.user.company)
            return qs.filter(tenant=request.user)
        return qs.none()

    def has_view_permission(self, request, obj=None):
        if not request.user.is_authenticated:
            return False
        return request.user.role in self.ALLOWED_ROLES or request.user.is_superuser

    def has_add_permission(self, request):
        if not request.user.is_authenticated:
            return False
        return request.user.role in ['accountant', 'tenant_admin'] or request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        if not request.user.is_authenticated:
            return False
        return request.user.role in self.ALLOWED_ROLES or request.user.role == 'tenant_admin' or request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        if not request.user.is_authenticated:
            return False
        return request.user.role == 'tenant_admin' or request.user.is_superuser