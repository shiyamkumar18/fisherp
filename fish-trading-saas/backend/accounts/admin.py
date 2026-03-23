from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User
from .models_audit import AuditLog, ImpersonationLog


class RoleBasedAdminMixin:
    """
    Mixin to provide role-based admin access control.
    
    Security Rules:
    - Platform Operator: Can access all User management but no business data
    - Tenant Admin: Full access within own tenant
    - Accountant: Limited view access
    - Others: No admin access
    """
    
    def has_view_permission(self, request, obj=None):
        """Check if user can view objects"""
        # Superusers can access everything
        if request.user.is_superuser:
            return True
        
        # Platform team can view users but not tenant business data.
        if request.user.is_platform_user:
            # Can only access user-related models
            if hasattr(self, 'model') and self.model._meta.model_name in ['user', 'auditlog', 'impersonationlog']:
                return True
            return False
        
        # Tenant admins can view within their tenant
        if request.user.is_tenant_admin:
            return True
        
        # Accountants can view (limited)
        if request.user.is_accountant:
            return True
        
        return False
    
    def has_add_permission(self, request):
        """Check if user can add objects"""
        if request.user.is_superuser:
            return True
        if request.user.is_platform_user:
            return False  # Platform operators cannot add tenant data
        if request.user.is_tenant_admin:
            return True
        return False
    
    def has_change_permission(self, request, obj=None):
        """Check if user can change objects"""
        if request.user.is_superuser:
            return True
        if request.user.is_platform_user:
            # Can only change user-related models
            if hasattr(self, 'model') and self.model._meta.model_name in ['user', 'auditlog', 'impersonationlog']:
                return True
            return False
        if request.user.is_tenant_admin:
            return True
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Check if user can delete objects"""
        if request.user.is_superuser:
            return True
        if request.user.is_platform_user:
            return False
        if request.user.is_tenant_admin:
            return True
        return False


@admin.register(User)
class CustomUserAdmin(RoleBasedAdminMixin, UserAdmin):
    # User configuration for the SaaS application
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
        """Filter queryset based on user role"""
        qs = super().get_queryset(request)
        
        # Superusers can see all
        if request.user.is_superuser:
            return qs
        
        # Platform users can see all users but limited info
        if request.user.is_platform_user:
            return qs
        
        # Tenant admins can only see users in their company
        if request.user.is_tenant_user and request.user.company:
            return qs.filter(company=request.user.company)
        
        # Other roles cannot see user list
        return qs.none()
    
    def get_readonly_fields(self, request, obj=None):
        """Make certain fields read-only based on role"""
        readonly = list(super().get_readonly_fields(request, obj))
        
        # Platform users cannot change is_staff or is_superuser
        if request.user.is_platform_user and not request.user.is_superuser:
            readonly.extend(['is_staff', 'is_superuser'])
        
        return readonly
    
    def get_list_display(self, request):
        """Show/hide columns based on role"""
        list_display = list(super().get_list_display(request))
        
        # Platform users don't need to see company
        if request.user.is_platform_user:
            if 'company' in list_display:
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
        """Filter by user permissions"""
        qs = super().get_queryset(request)
        
        # Superusers can see all
        if request.user.is_superuser:
            return qs
        
        # Platform users can see all audit logs
        if request.user.is_platform_user:
            return qs
        
        # Tenant users can only see their tenant's logs
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
        """Only platform users and superusers can view impersonation logs"""
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
