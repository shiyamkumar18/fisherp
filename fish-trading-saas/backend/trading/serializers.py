from rest_framework import serializers
from .models import (
    FishCategory, Fish, Supplier, Buyer, 
    PurchaseBatch, Sale, Payment, Inventory
)


def _is_in_user_scope(user, owner_user=None, company=None):
    """
    Check if a referenced tenant-owned record belongs to the authenticated user's scope.
    Scope match is allowed by:
    - exact owner user
    - same company
    - same schema_name (legacy fallback)
    """
    if user.is_superuser:
        return True
    if company is not None and user.company_id and company.id == user.company_id:
        return True
    if owner_user is None:
        return False
    if owner_user.id == user.id:
        return True
    if user.company_id and owner_user.company_id and user.company_id == owner_user.company_id:
        return True
    if user.schema_name and owner_user.schema_name and user.schema_name == owner_user.schema_name:
        return True
    return False


class FishCategorySerializer(serializers.ModelSerializer):
    """Serializer for FishCategory"""
    category_type_display = serializers.CharField(source='get_category_type_display', read_only=True)
    
    class Meta:
        model = FishCategory
        fields = [
            'id', 'name', 'category_type', 'category_type_display', 'description',
            'icon', 'color_code', 'priority', 'is_featured', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class FishListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Fish list views"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    unit_type_display = serializers.CharField(source='get_unit_type_display', read_only=True)
    tenant_name = serializers.CharField(source='tenant.username', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = Fish
        fields = [
            'id', 'name', 'category', 'category_name', 
            'unit_type', 'unit_type_display', 'box_weight_kg',
            'tenant', 'tenant_name', 'company', 'company_name', 'is_active', 'created_at'
        ]


class FishSerializer(serializers.ModelSerializer):
    """Full serializer for Fish with role-based field visibility"""
    category_details = FishCategorySerializer(source='category', read_only=True)
    unit_type_display = serializers.CharField(source='get_unit_type_display', read_only=True)
    tenant_name = serializers.CharField(source='tenant.username', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    display_weight = serializers.DecimalField(source='get_display_weight', max_digits=8, decimal_places=2, read_only=True)
    
    class Meta:
        model = Fish
        fields = [
            'id', 'name', 'category', 'category_details',
            'unit_type', 'unit_type_display', 'box_weight_kg', 'display_weight',
            'tenant', 'tenant_name', 'company', 'company_name',
            'min_price_per_kg', 'max_price_per_kg', 'avg_price_per_kg',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['tenant', 'company', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Mask sensitive fields based on user role"""
        data = super().to_representation(instance)
        
        request = self.context.get('request')
        if request and request.user:
            user = request.user
            
            # Sales Staff cannot see pricing details
            if user.is_sales_staff:
                data['min_price_per_kg'] = None
                data['max_price_per_kg'] = None
                data['avg_price_per_kg'] = None
        
        return data
    
    def validate(self, data):
        """Validate that box_weight_kg is provided when unit_type is 'box'"""
        unit_type = data.get('unit_type')
        box_weight_kg = data.get('box_weight_kg')
        
        if unit_type == 'box' and not box_weight_kg:
            raise serializers.ValidationError({
                'box_weight_kg': 'Box weight is required when unit type is box.'
            })
        
        # Validate category belongs to same tenant or is shared
        request = self.context.get('request')
        if request and request.user and not request.user.is_superuser:
            category = data.get('category')
            # FishCategory is shared (no tenant), so we don't validate it
            # But we ensure the fish itself gets the correct tenant
        
        return data


class SupplierSerializer(serializers.ModelSerializer):
    """Serializer for Supplier with role-based field visibility"""
    supplier_type_display = serializers.CharField(source='get_supplier_type_display', read_only=True)
    payment_terms_display = serializers.CharField(source='get_payment_terms_display', read_only=True)
    on_time_percentage = serializers.FloatField(source='get_on_time_percentage', read_only=True)
    payment_status = serializers.CharField(source='get_payment_status', read_only=True)
    is_payment_overdue = serializers.BooleanField(read_only=True)
    tenant_name = serializers.CharField(source='tenant.username', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = Supplier
        fields = [
            'id', 'name', 'phone', 'email', 'alternate_phone', 'address', 'place_of_origin',
            'id_number', 'supplier_type', 'supplier_type_display',
            'bank_name', 'bank_account', 'bank_ifsc',
            'emergency_contact_name', 'emergency_contact_phone',
            'contract_start_date', 'contract_end_date', 'commission_rate',
            'rating', 'total_deliveries', 'on_time_deliveries', 'on_time_percentage',
            'is_active', 'is_verified', 'created_at', 'updated_at',
            # Tenant isolation
            'tenant', 'tenant_name', 'company', 'company_name',
            # Payment tracking
            'payment_terms', 'payment_terms_display', 'credit_limit', 'payment_due_date',
            'total_purchases', 'total_paid', 'outstanding_amount',
            'payment_status', 'is_payment_overdue',
            'last_purchase_date', 'last_payment_date',
            # Credit tracking
            'total_credit_given', 'total_credit_repaid', 'current_credit_balance'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'current_credit_balance',
            'total_purchases', 'total_paid', 'outstanding_amount',
            'last_purchase_date', 'last_payment_date', 'tenant', 'company'
        ]
    
    def to_representation(self, instance):
        """Mask sensitive financial fields based on user role"""
        data = super().to_representation(instance)
        
        request = self.context.get('request')
        if request and request.user:
            user = request.user
            
            # Sales Staff cannot see financial details
            if user.is_sales_staff:
                data['credit_limit'] = None
                data['total_purchases'] = None
                data['total_paid'] = None
                data['outstanding_amount'] = None
                data['payment_status'] = None
                data['is_payment_overdue'] = None
                data['payment_due_date'] = None
                data['total_credit_given'] = None
                data['total_credit_repaid'] = None
                data['current_credit_balance'] = None
                data['on_time_percentage'] = None
                data['on_time_deliveries'] = None
                data['total_deliveries'] = None
                data['commission_rate'] = None
        
        return data


class BuyerSerializer(serializers.ModelSerializer):
    """Serializer for Buyer with role-based field visibility"""
    buyer_type_display = serializers.CharField(source='get_buyer_type_display', read_only=True)
    referral_source_display = serializers.CharField(source='get_referral_source_display', read_only=True)
    preferred_fish_types_details = FishListSerializer(source='preferred_fish_types', many=True, read_only=True)
    total_pending = serializers.DecimalField(source='get_total_pending', max_digits=12, decimal_places=2, read_only=True)
    tenant_name = serializers.CharField(source='tenant.username', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = Buyer
        fields = [
            'id', 'name', 'phone', 'email', 'address',
            'buyer_type', 'buyer_type_display',
            'business_name', 'gst_number',
            'preferred_fish_types', 'preferred_fish_types_details',
            'preferred_delivery_time', 'delivery_instructions',
            'default_discount_percent', 'credit_limit',
            'total_credit_allowed', 'total_credit_repaid', 'current_credit_balance',
            'rating', 'referral_source', 'referral_source_display', 'referred_by',
            'date_of_birth', 'anniversary_date', 'total_purchases', 'total_orders',
            'is_active', 'is_preferred', 'is_verified',
            'created_at', 'updated_at', 'total_pending',
            # Tenant isolation
            'tenant', 'tenant_name', 'company', 'company_name'
        ]
        read_only_fields = ['created_at', 'updated_at', 'current_credit_balance', 'total_pending', 'tenant', 'company']
    
    def to_representation(self, instance):
        """Mask sensitive financial fields based on user role"""
        data = super().to_representation(instance)
        
        request = self.context.get('request')
        if request and request.user:
            user = request.user
            
            # Sales Staff cannot see credit/financial details
            if user.is_sales_staff:
                data['credit_limit'] = None
                data['total_credit_allowed'] = None
                data['total_credit_repaid'] = None
                data['current_credit_balance'] = None
                data['total_purchases'] = None
                data['total_orders'] = None
                data['total_pending'] = None
        
        return data
    
    def validate(self, data):
        """Validate cross-tenant ForeignKeys"""
        request = self.context.get('request')
        if not request or not request.user:
            return data
        
        user = request.user
        # Skip for superusers
        if user.is_superuser:
            return data
        
        # Validate preferred_fish_types belong to same tenant
        preferred_fish_types = data.get('preferred_fish_types')
        if preferred_fish_types:
            for fish in preferred_fish_types:
                if not _is_in_user_scope(user, owner_user=fish.tenant, company=fish.company):
                    raise serializers.ValidationError({
                        'preferred_fish_types': 'Invalid fish selection. All fish must belong to your organization.'
                    })
        
        # Validate referred_by belongs to same tenant
        referred_by = data.get('referred_by')
        if referred_by and not _is_in_user_scope(user, owner_user=referred_by.tenant, company=referred_by.company):
            raise serializers.ValidationError({
                'referred_by': 'Invalid referral. Must belong to your organization.'
            })
        
        return data


class PurchaseBatchSerializer(serializers.ModelSerializer):
    """Serializer for PurchaseBatch with role-based field visibility"""
    purchase_type_display = serializers.CharField(source='get_purchase_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    fish_name = serializers.CharField(source='fish.name', read_only=True)
    remaining_packages = serializers.IntegerField(source='get_remaining_packages', read_only=True)
    sold_packages = serializers.IntegerField(source='get_sold_packages', read_only=True)
    tenant_name = serializers.CharField(source='tenant.username', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = PurchaseBatch
        fields = [
            'id', 'batch_number', 'purchase_type', 'purchase_type_display',
            'supplier', 'supplier_name', 'fisherman_name', 'place_of_buying',
            'fish', 'fish_name', 'fish_category',
            'date', 'number_of_packages', 'package_weight', 'total_weight',
            'price_per_kg', 'fish_cost',
            'labour_cost', 'ice_cost', 'transport_cost', 'commission_cost', 'other_cost',
            'total_expense', 'actual_cost_per_kg', 'cost_per_package',
            'amount_paid', 'pending_amount', 'status', 'status_display',
            'quality_grade', 'inspection_date', 'inspector_name', 
            'quality_score', 'freshness_score',
            'fish_photo', 'quality_certificate', 'invoice_document',
            'transport_vehicle_number', 'transport_driver_name', 
            'transport_driver_phone', 'arrival_time',
            'estimated_expiry_date', 'notes',
            'remaining_packages', 'sold_packages',
            'created_at', 'updated_at',
            # Tenant isolation
            'tenant', 'tenant_name', 'company', 'company_name'
        ]
        read_only_fields = [
            'total_weight', 'fish_cost', 'total_expense', 'actual_cost_per_kg', 
            'cost_per_package', 'pending_amount', 'remaining_packages', 'sold_packages',
            'created_at', 'updated_at', 'tenant', 'company'
        ]
    
    def to_representation(self, instance):
        """Mask sensitive cost fields based on user role"""
        data = super().to_representation(instance)
        
        request = self.context.get('request')
        if request and request.user:
            user = request.user
            
            # Sales Staff cannot see cost details
            if user.is_sales_staff:
                data['price_per_kg'] = None
                data['fish_cost'] = None
                data['labour_cost'] = None
                data['ice_cost'] = None
                data['transport_cost'] = None
                data['commission_cost'] = None
                data['other_cost'] = None
                data['total_expense'] = None
                data['actual_cost_per_kg'] = None
                data['cost_per_package'] = None
                data['amount_paid'] = None
                data['pending_amount'] = None
        
        return data
    
    def validate(self, data):
        """Validate cross-tenant ForeignKeys"""
        request = self.context.get('request')
        if not request or not request.user:
            return data
        
        user = request.user
        # Skip for superusers
        if user.is_superuser:
            return data
        
        # Validate supplier belongs to same tenant
        supplier = data.get('supplier')
        if supplier and not _is_in_user_scope(user, owner_user=supplier.tenant, company=supplier.company):
            raise serializers.ValidationError({
                'supplier': 'Invalid supplier. Must belong to your organization.'
            })
        
        # Validate fish belongs to same tenant
        fish = data.get('fish')
        if fish and not _is_in_user_scope(user, owner_user=fish.tenant, company=fish.company):
            raise serializers.ValidationError({
                'fish': 'Invalid fish. Must belong to your organization.'
            })
        
        return data


class SaleSerializer(serializers.ModelSerializer):
    """Serializer for Sale with role-based field visibility"""
    sale_type_display = serializers.CharField(source='get_sale_type_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    delivery_status_display = serializers.CharField(source='get_delivery_status_display', read_only=True)
    buyer_name = serializers.CharField(source='buyer.name', read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)
    tenant_name = serializers.CharField(source='tenant.username', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = Sale
        fields = [
            'id', 'invoice_number', 'sale_type', 'sale_type_display',
            'batch', 'batch_number', 'buyer', 'buyer_name',
            'date', 'number_of_packages_sold', 'selling_weight_per_package', 'selling_price_per_kg',
            'total_revenue', 'total_cost', 'profit', 'profit_margin_percent',
            'amount_received', 'pending_amount', 'payment_status', 'payment_status_display',
            'due_date', 'delivery_address', 'delivery_status', 'delivery_status_display',
            'shipping_tracking_number', 'shipping_carrier',
            'delivery_confirmed_at', 'delivered_by',
            'discount_amount', 'discount_percent', 'tax_percent', 'tax_amount', 'final_amount',
            'is_returned', 'return_date', 'return_reason', 'refund_amount',
            'notes', 'created_at', 'updated_at',
            # Tenant isolation
            'tenant', 'tenant_name', 'company', 'company_name'
        ]
        read_only_fields = [
            'total_revenue', 'total_cost', 'profit', 'profit_margin_percent',
            'pending_amount', 'tax_amount', 'final_amount',
            'created_at', 'updated_at', 'tenant', 'company'
        ]
    
    def to_representation(self, instance):
        """Mask sensitive cost/profit fields based on user role"""
        data = super().to_representation(instance)
        
        request = self.context.get('request')
        if request and request.user:
            user = request.user
            
            # Sales Staff cannot see cost/profit details
            if user.is_sales_staff:
                data['total_cost'] = None
                data['profit'] = None
                data['profit_margin_percent'] = None
        
        return data
    
    def validate(self, data):
        """Validate cross-tenant ForeignKeys"""
        request = self.context.get('request')
        if not request or not request.user:
            return data
        
        user = request.user
        # Skip for superusers
        if user.is_superuser:
            return data
        
        # Validate buyer belongs to same tenant
        buyer = data.get('buyer')
        if buyer and not _is_in_user_scope(user, owner_user=buyer.tenant, company=buyer.company):
            raise serializers.ValidationError({
                'buyer': 'Invalid buyer. Must belong to your organization.'
            })
        
        # Validate batch belongs to same tenant
        batch = data.get('batch')
        if batch and not _is_in_user_scope(user, owner_user=batch.tenant, company=batch.company):
            raise serializers.ValidationError({
                'batch': 'Invalid purchase batch. Must belong to your organization.'
            })
        
        return data


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for Payment with tenant isolation"""
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    payment_mode_display = serializers.CharField(source='get_payment_mode_display', read_only=True)
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)
    tenant_name = serializers.CharField(source='tenant.username', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'payment_type', 'payment_type_display',
            'payment_mode', 'payment_mode_display',
            'purchase_batch', 'sale', 'supplier', 'buyer',
            'amount', 'date', 'reference_number',
            'bank_name', 'account_number',
            'is_cleared', 'cleared_date',
            'notes', 'receipt_number', 'receipt_image',
            'approval_status', 'approval_status_display',
            'approved_by', 'processed_by',
            'created_at', 'updated_at',
            # Tenant isolation
            'tenant', 'tenant_name', 'company', 'company_name'
        ]
        read_only_fields = ['receipt_number', 'created_at', 'updated_at', 'tenant', 'company']
    
    def validate(self, data):
        """Validate cross-tenant ForeignKeys"""
        request = self.context.get('request')
        if not request or not request.user:
            return data
        
        user = request.user
        # Skip for superusers
        if user.is_superuser:
            return data
        
        # Validate supplier belongs to same tenant
        supplier = data.get('supplier')
        if supplier and not _is_in_user_scope(user, owner_user=supplier.tenant, company=supplier.company):
            raise serializers.ValidationError({
                'supplier': 'Invalid supplier. Must belong to your organization.'
            })
        
        # Validate buyer belongs to same tenant
        buyer = data.get('buyer')
        if buyer and not _is_in_user_scope(user, owner_user=buyer.tenant, company=buyer.company):
            raise serializers.ValidationError({
                'buyer': 'Invalid buyer. Must belong to your organization.'
            })
        
        # Validate purchase_batch belongs to same tenant
        purchase_batch = data.get('purchase_batch')
        if purchase_batch and not _is_in_user_scope(user, owner_user=purchase_batch.tenant, company=purchase_batch.company):
            raise serializers.ValidationError({
                'purchase_batch': 'Invalid purchase batch. Must belong to your organization.'
            })
        
        # Validate sale belongs to same tenant
        sale = data.get('sale')
        if sale and not _is_in_user_scope(user, owner_user=sale.tenant, company=sale.company):
            raise serializers.ValidationError({
                'sale': 'Invalid sale. Must belong to your organization.'
            })
        
        return data


class InventorySerializer(serializers.ModelSerializer):
    """Serializer for Inventory with tenant isolation"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    fish_name = serializers.CharField(source='fish.name', read_only=True)
    batch_number = serializers.CharField(source='purchase_batch.batch_number', read_only=True)
    needs_reorder = serializers.BooleanField(read_only=True)
    expiry_alert = serializers.BooleanField(source='check_expiry_alert', read_only=True)
    tenant_name = serializers.CharField(source='tenant.username', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = Inventory
        fields = [
            'id', 'fish', 'fish_name', 'purchase_batch', 'batch_number',
            'initial_packages', 'remaining_packages', 'sold_packages',
            'initial_weight_kg', 'remaining_weight_kg',
            'status', 'status_display',
            'storage_location', 'bin_number', 'rack_number',
            'expiry_date', 'expiry_alert_threshold_days', 'reorder_level',
            'current_temperature', 'temperature_last_checked',
            'last_moved_at', 'last_moved_by',
            'needs_reorder', 'expiry_alert',
            'created_at', 'updated_at',
            # Tenant isolation
            'tenant', 'tenant_name', 'company', 'company_name'
        ]
        read_only_fields = ['created_at', 'updated_at', 'tenant', 'company']
        extra_kwargs = {
            'initial_weight_kg': {'required': False},
            'remaining_weight_kg': {'required': False},
        }
    
    def validate(self, data):
        """Validate cross-tenant ForeignKeys"""
        request = self.context.get('request')
        if not request or not request.user:
            return data
        
        user = request.user
        # Skip for superusers
        if user.is_superuser:
            return data
        
        # Validate fish belongs to same tenant
        fish = data.get('fish')
        if fish and not _is_in_user_scope(user, owner_user=fish.tenant, company=fish.company):
            raise serializers.ValidationError({
                'fish': 'Invalid fish. Must belong to your organization.'
            })
        
        # Validate purchase_batch belongs to same tenant
        purchase_batch = data.get('purchase_batch')
        if purchase_batch and not _is_in_user_scope(user, owner_user=purchase_batch.tenant, company=purchase_batch.company):
            raise serializers.ValidationError({
                'purchase_batch': 'Invalid purchase batch. Must belong to your organization.'
            })

        # Auto-populate weight fields when omitted.
        initial_packages = data.get('initial_packages')
        if initial_packages is not None and purchase_batch:
            if data.get('initial_weight_kg') is None:
                data['initial_weight_kg'] = initial_packages * purchase_batch.package_weight
            if data.get('remaining_weight_kg') is None:
                remaining_packages = data.get('remaining_packages', initial_packages)
                data['remaining_weight_kg'] = remaining_packages * purchase_batch.package_weight
        
        return data
