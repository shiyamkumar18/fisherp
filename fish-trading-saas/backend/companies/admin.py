from django.contrib import admin
from django.utils.html import format_html
from .models import Company, Domain


class TenantIsolationAdminMixin:
    """
    Mixin to provide tenant isolation for admin classes.
    """
    
    def get_queryset(self, request):
        """Filter by tenant for non-superusers"""
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(tenant=request.user)


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
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
class DomainAdmin(admin.ModelAdmin):
    list_display = ('domain', 'tenant', 'is_primary', 'created_at')
    list_filter = ('is_primary',)
    search_fields = ('domain', 'tenant__username')
    ordering = ('-is_primary', '-created_at')
    readonly_fields = ('created_at',)

