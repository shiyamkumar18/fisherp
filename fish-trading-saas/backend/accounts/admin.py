from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User
from .models_audit import AuditLog, ImpersonationLog


class RoleBasedAdminMixin:
    def has_view_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        if request.user.is_platform_user:
            if hasattr(self, 'model') and self.model._meta.model_name in ['user', 'auditlog', 'impersonationlog']:
                return True
            return False
        if request.user.is_tenant_admin:
            return True
        if request.user.is_accountant:
            return True
        return False

    def has_add_permission(self, request):
        if request.user.is_superuser:
            return True
        if request.user.is_platform_user:
            return False
        if request.user.is_tenant_admin:
            return True
        return False

    def has_change_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        if request.user.is_platform_user:
            if hasattr(self, 'model') and self.model._meta.model_name in ['user', 'auditlog', 'impersonationlog']:
                return True
            return False
        if request.user.is_tenant_admin:
            return True
        return False

    def has_delete_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        if request.user.is_platform_user:
            return False
        if request.user.is_tenant_admin:
            return True
        return False


@admin.register(User)
class CustomUserAdmin(RoleBasedAdminMixin, UserAdmin):
    list_display = ('username', 'email', 'phone', 'role', 'company', 'is_active', 'is_staff', 'date_joined')
    list_filter = ('is_active', 'is_staff', 'role', 'company', 'date_joined')
    search_fields = ('username', 'email', 'phone')

    fieldsets = UserAdmin.fieldsets + (
        ('User Info', {'fields': ('phone', 'role', 'company')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('User Info', {'fields': ('phone', 'role', 'company')}),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if request.user.is_platform_user:
            return qs
        if request.user.is_tenant_user and request.user.company:
            return qs.filter(company=request.user.company)
        return qs.none()

    def get_readonly_fields(self, request, obj=None):
        readonly = list(super().get_readonly_fields(request, obj))
        if request.user.is_platform_user and not request.user.is_superuser:
            readonly.extend(['is_staff', 'is_superuser'])
        return readonly

    def get_list_display(self, request):
        list_display = list(super().get_list_display(request))
        if request.user.is_platform_user and 'company' in list_display:
            list_display.remove('company')
        return list_display


@admin.register(AuditLog)
class AuditLogAdmin(RoleBasedAdminMixin, admin.ModelAdmin):
    list_display = ('user', 'action', 'model_name', 'object_id', 'ip_address', 'timestamp', 'is_impersonation')
    list_filter = ('action', 'is_impersonation', 'timestamp')
    search_fields = ('user__username', 'model_name', 'object_repr', 'ip_address')
    readonly_fields = ('timestamp',)
    date_hierarchy = 'timestamp'
    ordering = ('-timestamp',)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if request.user.is_platform_user:
            return qs
        if request.user.is_tenant_user:
            return qs.filter(user__company=request.user.company)
        return qs.none()


@admin.register(ImpersonationLog)
class ImpersonationLogAdmin(RoleBasedAdminMixin, admin.ModelAdmin):
    list_display = ('platform_user', 'tenant', 'reason', 'start_time', 'end_time', 'is_active', 'is_approved')
    list_filter = ('is_active', 'is_approved', 'start_time')
    search_fields = ('platform_user__username', 'tenant__name', 'reason')
    readonly_fields = ('start_time', 'duration')
    date_hierarchy = 'start_time'
    ordering = ('-start_time',)

    def has_view_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        if request.user.is_platform_user:
            return True
        return False

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
