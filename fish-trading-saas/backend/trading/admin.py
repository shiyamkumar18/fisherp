from django.contrib import admin
from django.utils.html import format_html
from .models import FishCategory, Fish, Supplier, Buyer, PurchaseBatch, Sale, Payment, Inventory


class TenantIsolationAdminMixin:
    """
    Mixin to provide company-based tenant isolation for admin classes.
    Ensures that non-superusers can only see/manage their own company's data.
    """
    
    def get_queryset(self, request):
        """Filter by company for non-superusers"""
        qs = super().get_queryset(request)
        
        # Superusers can see all
        if request.user.is_superuser:
            return qs
        
        # Platform operators can see all tenant data (for management)
        if request.user.is_platform_operator:
            return qs
        
        # For tenant users, filter by company
        if request.user.company:
            if 'company' in [f.name for f in qs.model._meta.get_fields()]:
                return qs.filter(company=request.user.company)
            return qs.filter(tenant__company=request.user.company)
        
        # Users without company can only see their own tenant records
        return qs.filter(tenant=request.user)
    
    def has_view_permission(self, request, obj=None):
        """Check if user can view objects"""
        if request.user.is_superuser:
            return True
        
        # Platform operators can view all
        if request.user.is_platform_operator:
            return True
        
        if obj is not None:
            # Check if object belongs to user's company
            if hasattr(obj, 'company') and obj.company and request.user.company:
                return obj.company_id == request.user.company_id
            if hasattr(obj, 'tenant') and obj.tenant:
                if obj.tenant.company:
                    return obj.tenant.company == request.user.company
                return obj.tenant == request.user
            return False
        
        # For list view, check if user has any view permission
        return self.has_add_permission(request) or self.has_change_permission(request)
    
    def has_change_permission(self, request, obj=None):
        """Check if user can change objects"""
        if request.user.is_superuser:
            return True
        
        # Platform operators can change all
        if request.user.is_platform_operator:
            return True
        
        if obj is not None:
            # Check if object belongs to user's company
            if hasattr(obj, 'company') and obj.company and request.user.company:
                return obj.company_id == request.user.company_id
            if hasattr(obj, 'tenant') and obj.tenant:
                if obj.tenant.company:
                    return obj.tenant.company == request.user.company
                return obj.tenant == request.user
            return False
        
        return True  # Allow access to changelist
    
    def has_delete_permission(self, request, obj=None):
        """Check if user can delete objects"""
        if request.user.is_superuser:
            return True
        
        # Platform operators can delete all
        if request.user.is_platform_operator:
            return True
        
        if obj is not None:
            # Check if object belongs to user's company
            if hasattr(obj, 'company') and obj.company and request.user.company:
                return obj.company_id == request.user.company_id
            if hasattr(obj, 'tenant') and obj.tenant:
                if obj.tenant.company:
                    return obj.tenant.company == request.user.company
                return obj.tenant == request.user
            return False
        
        return True  # Allow access to changelist
    
    def has_add_permission(self, request):
        """Check if user can add objects"""
        # Platform operators cannot add tenant data
        if request.user.is_platform_operator:
            return False
        return True


@admin.register(FishCategory)
class FishCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'category_type', 'priority', 'is_featured', 'is_active', 'created_at')
    list_filter = ('category_type', 'is_featured', 'is_active')
    search_fields = ('name', 'description')
    ordering = ('priority', 'name')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'category_type', 'description')
        }),
        ('Visual Settings', {
            'fields': ('icon', 'color_code', 'priority', 'is_featured'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_active',),
            'classes': ('collapse',)
        }),
    )


@admin.register(Fish)
class FishAdmin(TenantIsolationAdminMixin, admin.ModelAdmin):
    list_display = ('name', 'category', 'unit_type', 'box_weight_kg', 'tenant', 'is_active', 'created_at')
    list_filter = ('category', 'unit_type', 'is_active', 'created_at')
    search_fields = ('name', 'category__name')
    ordering = ('name',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'category', 'tenant')
        }),
        ('Unit Configuration', {
            'fields': ('unit_type', 'box_weight_kg'),
            'description': 'Configure how this fish is measured and sold'
        }),
        ('Pricing History', {
            'fields': ('min_price_per_kg', 'max_price_per_kg', 'avg_price_per_kg'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_active',),
            'classes': ('collapse',)
        }),
    )


@admin.register(Supplier)
class SupplierAdmin(TenantIsolationAdminMixin, admin.ModelAdmin):
    list_display = ('name', 'supplier_type', 'phone', 'outstanding_amount', 'payment_status_display', 'rating', 'is_verified', 'is_active', 'last_purchase_date')
    list_filter = ('supplier_type', 'is_verified', 'is_active', 'rating', 'payment_terms')
    search_fields = ('name', 'phone', 'email', 'place_of_origin', 'id_number', 'bank_name')
    ordering = ('name',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'supplier_type', 'phone', 'email', 'alternate_phone', 'address', 'place_of_origin')
        }),
        ('Tenant', {
            'fields': ('tenant',),
            'classes': ('collapse',)
        }),
        ('Identification', {
            'fields': ('id_number',),
            'classes': ('collapse',)
        }),
        ('Banking Information', {
            'fields': ('bank_name', 'bank_account', 'bank_ifsc'),
            'classes': ('collapse',)
        }),
        ('Emergency Contact', {
            'fields': ('emergency_contact_name', 'emergency_contact_phone'),
            'classes': ('collapse',)
        }),
        ('Contract Information', {
            'fields': ('contract_start_date', 'contract_end_date', 'commission_rate'),
            'classes': ('collapse',)
        }),
        ('Payment Terms & Outstanding', {
            'fields': ('payment_terms', 'credit_limit', 'payment_due_date', 'outstanding_amount', 'total_purchases', 'total_paid'),
            'description': 'Payment tracking and outstanding balance information'
        }),
        ('Performance', {
            'fields': ('rating', 'total_deliveries', 'on_time_deliveries'),
            'classes': ('collapse',)
        }),
        ('Credit Tracking', {
            'fields': ('total_credit_given', 'total_credit_repaid', 'current_credit_balance'),
            'classes': ('collapse',)
        }),
        ('Activity Tracking', {
            'fields': ('last_purchase_date', 'last_payment_date'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_active', 'is_verified'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('outstanding_amount', 'total_purchases', 'total_paid', 'last_purchase_date', 'last_payment_date')
    
    def payment_status_display(self, obj):
        """Display payment status with color indicator"""
        status = obj.get_payment_status()
        colors = {
            'paid': 'green',
            'pending': 'orange',
            'overdue': 'red'
        }
        return format_html(
            '<span style="color: {};">{}</span>',
            colors.get(status, 'black'),
            status.upper()
        )
    payment_status_display.short_description = 'Payment Status'


@admin.register(Buyer)
class BuyerAdmin(TenantIsolationAdminMixin, admin.ModelAdmin):
    list_display = ('name', 'buyer_type', 'phone', 'business_name', 'rating', 'is_preferred', 'is_active', 'tenant')
    list_filter = ('buyer_type', 'is_preferred', 'is_verified', 'is_active', 'rating', 'referral_source')
    search_fields = ('name', 'phone', 'email', 'business_name', 'gst_number')
    ordering = ('name',)
    filter_horizontal = ('preferred_fish_types',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'buyer_type', 'phone', 'email', 'address')
        }),
        ('Business Information', {
            'fields': ('business_name', 'gst_number'),
            'classes': ('collapse',)
        }),
        ('Preferences', {
            'fields': ('preferred_fish_types', 'preferred_delivery_time', 'delivery_instructions'),
            'classes': ('collapse',)
        }),
        ('Pricing & Credit', {
            'fields': ('default_discount_percent', 'credit_limit', 'total_credit_allowed', 'total_credit_repaid', 'current_credit_balance'),
            'classes': ('collapse',)
        }),
        ('CRM Information', {
            'fields': ('rating', 'referral_source', 'referred_by', 'date_of_birth', 'anniversary_date', 'total_purchases', 'total_orders'),
            'classes': ('collapse',)
        }),
        ('Tenant', {
            'fields': ('tenant',),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_active', 'is_preferred', 'is_verified'),
            'classes': ('collapse',)
        }),
    )


@admin.register(PurchaseBatch)
class PurchaseBatchAdmin(TenantIsolationAdminMixin, admin.ModelAdmin):
    list_display = ('batch_number', 'purchase_type', 'supplier', 'fish', 'date', 'number_of_packages', 'total_expense', 'status', 'tenant')
    list_filter = ('purchase_type', 'status', 'date', 'fish', 'fish_category')
    search_fields = ('batch_number', 'fisherman_name', 'place_of_buying', 'supplier__name')
    ordering = ('-date', '-created_at')
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Reference Information', {
            'fields': ('batch_number', 'purchase_type')
        }),
        ('Supplier Information', {
            'fields': ('supplier', 'fisherman_name', 'place_of_buying')
        }),
        ('Fish Details', {
            'fields': ('fish', 'fish_category')
        }),
        ('Quantity & Weight', {
            'fields': ('number_of_packages', 'package_weight', 'total_weight')
        }),
        ('Pricing', {
            'fields': ('price_per_kg', 'fish_cost')
        }),
        ('Additional Costs', {
            'fields': ('labour_cost', 'ice_cost', 'transport_cost', 'commission_cost', 'other_cost'),
            'classes': ('collapse',)
        }),
        ('Cost Calculations', {
            'fields': ('total_expense', 'actual_cost_per_kg', 'cost_per_package'),
            'classes': ('collapse',)
        }),
        ('Payment', {
            'fields': ('amount_paid', 'pending_amount', 'status')
        }),
        ('Quality Check', {
            'fields': ('quality_grade', 'inspection_date', 'inspector_name', 'quality_score', 'freshness_score'),
            'classes': ('collapse',)
        }),
        ('Documents', {
            'fields': ('fish_photo', 'quality_certificate', 'invoice_document'),
            'classes': ('collapse',)
        }),
        ('Transport', {
            'fields': ('transport_vehicle_number', 'transport_driver_name', 'transport_driver_phone', 'arrival_time'),
            'classes': ('collapse',)
        }),
        ('Tenant', {
            'fields': ('tenant',),
            'classes': ('collapse',)
        }),
        ('Notes', {
            'fields': ('notes', 'estimated_expiry_date'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('total_weight', 'fish_cost', 'total_expense', 'actual_cost_per_kg', 'cost_per_package', 'pending_amount')
    


@admin.register(Sale)
class SaleAdmin(TenantIsolationAdminMixin, admin.ModelAdmin):
    list_display = ('invoice_number', 'sale_type', 'batch', 'buyer', 'date', 'number_of_packages_sold', 'total_revenue', 'profit', 'payment_status', 'tenant')
    list_filter = ('sale_type', 'payment_status', 'delivery_status', 'date', 'is_returned')
    search_fields = ('invoice_number', 'buyer__name', 'batch__batch_number', 'shipping_tracking_number')
    ordering = ('-date', '-created_at')
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Sale Information', {
            'fields': ('invoice_number', 'sale_type', 'batch', 'buyer')
        }),
        ('Quantity & Pricing', {
            'fields': ('number_of_packages_sold', 'selling_weight_per_package', 'selling_price_per_kg')
        }),
        ('Financial Calculations', {
            'fields': ('total_revenue', 'total_cost', 'profit', 'profit_margin_percent'),
            'classes': ('collapse',)
        }),
        ('Discount & Tax', {
            'fields': ('discount_amount', 'discount_percent', 'tax_percent', 'tax_amount', 'final_amount'),
            'classes': ('collapse',)
        }),
        ('Payment', {
            'fields': ('amount_received', 'pending_amount', 'payment_status', 'due_date')
        }),
        ('Delivery', {
            'fields': ('delivery_address', 'delivery_status', 'shipping_tracking_number', 'shipping_carrier', 'delivery_confirmed_at', 'delivered_by'),
            'classes': ('collapse',)
        }),
        ('Return/Refund', {
            'fields': ('is_returned', 'return_date', 'return_reason', 'refund_amount'),
            'classes': ('collapse',)
        }),
        ('Tenant', {
            'fields': ('tenant',),
            'classes': ('collapse',)
        }),
        ('Notes', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('total_revenue', 'total_cost', 'profit', 'profit_margin_percent', 'pending_amount', 'tax_amount', 'final_amount')
    


@admin.register(Payment)
class PaymentAdmin(TenantIsolationAdminMixin, admin.ModelAdmin):
    list_display = ('receipt_number', 'payment_type', 'payment_mode', 'amount', 'date', 'is_cleared', 'approval_status', 'created_at', 'tenant')
    list_filter = ('payment_type', 'payment_mode', 'is_cleared', 'approval_status', 'date')
    search_fields = ('receipt_number', 'reference_number', 'supplier__name', 'buyer__name', 'notes')
    ordering = ('-date', '-created_at')
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Payment Information', {
            'fields': ('payment_type', 'payment_mode', 'amount', 'date')
        }),
        ('References', {
            'fields': ('purchase_batch', 'sale', 'supplier', 'buyer'),
            'classes': ('collapse',)
        }),
        ('Transaction Details', {
            'fields': ('reference_number', 'bank_name', 'account_number'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_cleared', 'cleared_date'),
            'classes': ('collapse',)
        }),
        ('Receipt & Approval', {
            'fields': ('receipt_number', 'receipt_image', 'approval_status', 'approved_by', 'processed_by'),
            'classes': ('collapse',)
        }),
        ('Tenant', {
            'fields': ('tenant',),
            'classes': ('collapse',)
        }),
        ('Notes', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('receipt_number', 'created_at', 'updated_at')
    


@admin.register(Inventory)
class InventoryAdmin(TenantIsolationAdminMixin, admin.ModelAdmin):
    list_display = ('fish', 'purchase_batch', 'remaining_packages', 'status', 'storage_location', 'expiry_date', 'current_temperature', 'tenant')
    list_filter = ('status', 'expiry_date', 'created_at')
    search_fields = ('fish__name', 'purchase_batch__batch_number', 'storage_location', 'bin_number', 'rack_number')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Stock Information', {
            'fields': ('fish', 'purchase_batch', 'initial_packages', 'remaining_packages', 'sold_packages')
        }),
        ('Weight Tracking', {
            'fields': ('initial_weight_kg', 'remaining_weight_kg'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('status', 'expiry_date')
        }),
        ('Storage', {
            'fields': ('storage_location', 'bin_number', 'rack_number'),
            'classes': ('collapse',)
        }),
        ('Temperature', {
            'fields': ('current_temperature', 'temperature_last_checked'),
            'classes': ('collapse',)
        }),
        ('Alerts', {
            'fields': ('expiry_alert_threshold_days', 'reorder_level'),
            'classes': ('collapse',)
        }),
        ('Movement', {
            'fields': ('last_moved_at', 'last_moved_by'),
            'classes': ('collapse',)
        }),
        ('Tenant', {
            'fields': ('tenant',),
            'classes': ('collapse',)
        }),
    )
