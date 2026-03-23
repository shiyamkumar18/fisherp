from django.contrib import admin
from django.utils.html import format_html
from .models import Company, Domain


class PlatformOperatorOnlyMixin:
    """
    Mixin to restrict admin access to platform operators only.
    
    Only platform operators and superusers can manage:
    - Companies
    - Domains
    
    Tenant admins cannot access these models.
    """
    
    def has_view_permission(self, request, obj=None):
        """Only platform operators and superusers can view"""
        if request.user.is_superuser:
            return True
        if request.user.is_platform_operator:
            return True
        return False
    
    def has_add_permission(self, request):
        """Only platform operators and superusers can add"""
        if request.user.is_superuser:
            return True
        if request.user.is_platform_operator:
            return True
        return False
    
    def has_change_permission(self, request, obj=None):
        """Only platform operators and superusers can change"""
        if request.user.is_superuser:
            return True
        if request.user.is_platform_operator:
            return True
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Only platform operators and superusers can delete"""
        if request.user.is_superuser:
            return True
        if request.user.is_platform_operator:
            return True
        return False
    
    def get_queryset(self, request):
        """Platform operators see all, others see none"""
        qs = super().get_queryset(request)
        if request.user.is_superuser or request.user.is_platform_operator:
            return qs
        return qs.none()


@admin.register(Company)
class CompanyAdmin(PlatformOperatorOnlyMixin, admin.ModelAdmin):
    list_display = ('name', 'business_type', 'industry_type', 'is_active', 'is_verified', 'created_at')
    list_filter = ('business_type', 'industry_type', 'is_active', 'is_verified', 'country', 'state')
    search_fields = ('name', 'email', 'phone', 'business_registration_number', 'gst_number', 'pan_number')
    ordering = ('-created_at', 'name')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'phone', 'email')
        }),
        ('Business Information', {
            'fields': ('business_registration_number', 'gst_number', 'pan_number', 'tan_number')
        }),
        ('Branding', {
            'fields': ('logo', 'website'),
            'classes': ('collapse',)
        }),
        ('Address', {
            'fields': ('address_line1', 'address_line2', 'city', 'state', 'country', 'postal_code')
        }),
        ('Business Type & Industry', {
            'fields': ('business_type', 'industry_type')
        }),
        ('Company Size', {
            'fields': ('employee_count', 'annual_turnover'),
            'classes': ('collapse',)
        }),
        ('Settings', {
            'fields': ('settings',),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_active', 'is_verified', 'verification_date'),
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'verification_date')


@admin.register(Domain)
class DomainAdmin(PlatformOperatorOnlyMixin, admin.ModelAdmin):
    list_display = ('domain', 'company', 'is_primary', 'created_at')
    list_filter = ('is_primary',)
    search_fields = ('domain', 'company__name')
    ordering = ('-is_primary', '-created_at')
    readonly_fields = ('created_at',)

