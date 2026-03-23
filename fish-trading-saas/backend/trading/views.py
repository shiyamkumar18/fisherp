from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Count
from django.utils import timezone
from django.db import transaction
from decimal import Decimal

from .models import FishCategory, Fish, Supplier, Buyer, PurchaseBatch, Sale, Payment, Inventory
from .serializers import (
    FishCategorySerializer, FishSerializer, FishListSerializer,
    SupplierSerializer, BuyerSerializer, PurchaseBatchSerializer,
    SaleSerializer, PaymentSerializer, InventorySerializer
)
from backend.services.trading import SaleService, InventoryService
from accounts.permissions import (
    IsPlatformOperator, IsTenantAdmin, IsAccountant, IsSalesStaff, IsStoreAccounts,
    CanViewFinancials, CanCreateSale, CanCreatePurchase, CanRecordPayment,
    CanDeleteRecord, CanEditSale, CanEditPurchase, CanEditPayment, HasAnyRole,
    QuerysetProtectionMixin, TenantObjectPermission, is_impersonating, get_impersonated_tenant
)


def _user_company(user):
    return user.company if getattr(user, 'company_id', None) else None


# Removed _get_scoped_queryset - use CompanyManager.for_user() instead


def _get_create_scope(request):
    """
    Set both company and tenant pointers while creating records.
    """
    if is_impersonating(request):
        company = get_impersonated_tenant(request)
        return {'company': company, 'tenant': company.admin if company else None}
    return {'company': _user_company(request.user), 'tenant': request.user}


class FishCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for FishCategory - shared across all tenants
    
    Permissions:
    - Platform Operator: Read-only (metadata only)
    - All tenant users: Full access
    """
    queryset = FishCategory.objects.all()
    serializer_class = FishCategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category_type', 'is_featured', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['priority', 'name', 'created_at']
    ordering = ['priority', 'name']
    
    def get_queryset(self):
        """FishCategory is shared - platform operators can view"""
        if not self.request.user.is_authenticated:
            return FishCategory.objects.none()
        
        # All authenticated users can view categories
        return FishCategory.objects.all()


class FishViewSet(TenantObjectPermission, QuerysetProtectionMixin, viewsets.ModelViewSet):
    """
    ViewSet for Fish management with tenant isolation.
    
    Security:
    - Platform Operator: NO DIRECT ACCESS (returns empty)
    - Tenant Admin: Full access
    - Accountant: Full access
    - Sales Staff: Read-only
    - Store Accounts: Read-only
    
    Platform operators must use impersonation to access.
    """
    serializer_class = FishSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'unit_type', 'is_active']
    search_fields = ['name', 'category__name']
    ordering_fields = ['name', 'created_at', 'avg_price_per_kg']
    ordering = ['name']
    
    def get_permissions(self):
        """Return permissions based on action"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant')]
        return [IsAuthenticated()]
    
def get_queryset(self):
        """
        Return fish records with QUERYSET PROTECTION.
        
        Platform operators CANNOT see business data directly.
        Must use impersonation to access tenant data.
        """
        return self.queryset.model.objects.for_user(self.request.user)
    
    def get_serializer_class(self):
        """Use different serializers for list vs detail views"""
        if self.action == 'list':
            return FishListSerializer
        return FishSerializer
    
@transaction.atomic
    def perform_create(self, serializer):
        """Automatically set the tenant to the current user"""
        serializer.save(**_get_create_scope(self.request))
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle the active status of a fish"""
        fish = self.get_object()
        fish.is_active = not fish.is_active
        fish.save()
        return Response({
            'status': 'success',
            'is_active': fish.is_active,
            'message': f'Fish {fish.name} is now {"active" if fish.is_active else "inactive"}'
        })
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get fish grouped by category"""
        categories = FishCategory.objects.filter(is_active=True)
        result = []
        for category in categories:
            fish_list = self.get_queryset().filter(category=category, is_active=True)
            result.append({
                'category': FishCategorySerializer(category).data,
                'fish_count': fish_list.count(),
                'fish': FishListSerializer(fish_list, many=True).data
            })
        return Response(result)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get statistics about fish inventory"""
        queryset = self.get_queryset()
        
        stats = {
            'total_fish_types': queryset.count(),
            'active_fish_types': queryset.filter(is_active=True).count(),
            'by_unit_type': dict(queryset.values('unit_type').annotate(
                count=Count('id')
            ).values_list('unit_type', 'count')),
            'by_category': dict(queryset.values('category__name').annotate(
                count=Count('id')
            ).values_list('category__name', 'count')),
        }
        return Response(stats)


class SupplierViewSet(TenantObjectPermission, QuerysetProtectionMixin, viewsets.ModelViewSet):
    """
    ViewSet for Supplier management with tenant isolation.
    
    Security:
    - Platform Operator: NO DIRECT ACCESS
    - Tenant Admin: Full access
    - Accountant: Full access
    - Store Accounts: Full access
    - Sales Staff: Read-only
    """
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['supplier_type', 'is_verified', 'is_active', 'rating', 'payment_terms']
    search_fields = ['name', 'phone', 'email', 'place_of_origin', 'id_number', 'bank_name']
    ordering_fields = ['name', 'rating', 'outstanding_amount', 'created_at']
    ordering = ['name']
    
    def get_permissions(self):
        """Return permissions based on action"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_store_accounts')]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """Queryset with platform operator protection."""
        return self.queryset.model.objects.for_user(self.request.user)
    
    @transaction.atomic
    def perform_create(self, serializer):
        """Automatically set the tenant"""
        serializer.save(**_get_create_scope(self.request))
    
    @action(detail=True, methods=['post'])
    def update_credit(self, request, pk=None):
        """Update supplier credit balance"""
        supplier = self.get_object()
        amount = request.data.get('amount', 0)
        operation = request.data.get('operation', 'add')
        
        try:
            amount = Decimal(str(amount))
            if operation == 'add':
                supplier.total_credit_given += amount
            elif operation == 'subtract':
                supplier.total_credit_repaid += amount
            else:
                return Response({'error': 'Invalid operation. Use "add" or "subtract"'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            supplier.update_credit_balance()
            return Response({
                'status': 'success',
                'current_credit_balance': str(supplier.current_credit_balance),
                'message': f'Credit updated successfully'
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Mark supplier as verified"""
        supplier = self.get_object()
        supplier.is_verified = True
        supplier.save()
        return Response({
            'status': 'success',
            'is_verified': supplier.is_verified,
            'message': f'Supplier {supplier.name} has been verified'
        })
    
    @action(detail=True, methods=['post'])
    def update_outstanding(self, request, pk=None):
        """Recalculate outstanding amount from purchase batches"""
        supplier = self.get_object()
        supplier.update_outstanding()
        return Response({
            'status': 'success',
            'outstanding_amount': str(supplier.outstanding_amount),
            'total_purchases': str(supplier.total_purchases),
            'total_paid': str(supplier.total_paid),
            'payment_status': supplier.get_payment_status(),
            'message': 'Outstanding amount recalculated successfully'
        })
    
    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        """Record a payment to supplier"""
        supplier = self.get_object()
        amount = request.data.get('amount', 0)
        payment_date = request.data.get('payment_date')
        reference = request.data.get('reference', '')
        
        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                return Response({'error': 'Payment amount must be greater than 0'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Create payment record
            payment = Payment.objects.create(
                payment_type='purchase',
                payment_mode=request.data.get('payment_mode', 'bank_transfer'),
                amount=amount,
                date=payment_date or timezone.now().date(),
                supplier=supplier,
                reference_number=reference,
                processed_by=request.user,
                tenant=supplier.tenant,
                company=supplier.company,
                notes=f"Payment to supplier {supplier.name}"
            )
            
            # Update supplier totals
            supplier.total_paid += amount
            supplier.outstanding_amount = supplier.total_purchases - supplier.total_paid
            supplier.last_payment_date = payment.date
            supplier.save()
            
            return Response({
                'status': 'success',
                'payment_id': payment.id,
                'receipt_number': payment.receipt_number,
                'amount_paid': str(amount),
                'outstanding_amount': str(supplier.outstanding_amount),
                'message': f'Payment of {amount} recorded successfully'
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def payment_summary(self, request, pk=None):
        """Get payment summary for supplier"""
        supplier = self.get_object()
        
        recent_payments = Payment.objects.filter(
            supplier=supplier,
            payment_type='purchase'
        ).order_by('-date')[:10]
        
        payment_data = [{
            'id': p.id,
            'receipt_number': p.receipt_number,
            'amount': str(p.amount),
            'date': p.date,
            'payment_mode': p.get_payment_mode_display(),
            'reference_number': p.reference_number,
            'is_cleared': p.is_cleared
        } for p in recent_payments]
        
        return Response({
            'supplier_id': supplier.id,
            'supplier_name': supplier.name,
            'payment_terms': supplier.get_payment_terms_display(),
            'credit_limit': str(supplier.credit_limit),
            'total_purchases': str(supplier.total_purchases),
            'total_paid': str(supplier.total_paid),
            'outstanding_amount': str(supplier.outstanding_amount),
            'payment_status': supplier.get_payment_status(),
            'is_overdue': supplier.is_payment_overdue(),
            'payment_due_date': supplier.payment_due_date,
            'recent_payments': payment_data
        })
    
    @action(detail=False, methods=['get'])
    def with_outstanding(self, request):
        """Get all suppliers with outstanding balance"""
        queryset = self.get_queryset().filter(outstanding_amount__gt=0)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue_payments(self, request):
        """Get suppliers with overdue payments"""
        from django.utils import timezone
        queryset = self.get_queryset().filter(
            outstanding_amount__gt=0,
            payment_due_date__lt=timezone.now().date()
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)



    
    Security:
    - Platform Operator: NO DIRECT ACCESS
    - Tenant Admin: Full access
    - Accountant: Full access
    - Sales Staff: Full access (add buyers, record payments)
    - Store Accounts: Read-only
    """
    queryset = Buyer.objects.all()
    serializer_class = BuyerSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['buyer_type', 'is_preferred', 'is_verified', 'is_active', 'rating']
    search_fields = ['name', 'phone', 'email', 'business_name', 'gst_number']
    ordering_fields = ['name', 'rating', 'total_purchases', 'created_at']
    ordering = ['name']
    
    def get_permissions(self):
        """Return permissions based on action"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_sales_staff')]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """Queryset with platform operator protection."""
        return self.queryset.model.objects.for_user(self.request.user)
    
    def perform_create(self, serializer):
        """Automatically set the tenant"""
        serializer.save(**_get_create_scope(self.request))
    
    @action(detail=True, methods=['post'])
    def update_credit(self, request, pk=None):
        """Update buyer credit balance"""
        buyer = self.get_object()
        amount = request.data.get('amount', 0)
        operation = request.data.get('operation', 'add')
        
        try:
            amount = Decimal(str(amount))
            if operation == 'add':
                buyer.total_credit_allowed += amount
            elif operation == 'subtract':
                buyer.total_credit_repaid += amount
            else:
                return Response({'error': 'Invalid operation'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            buyer.update_credit_balance()
            return Response({
                'status': 'success',
                'current_credit_balance': str(buyer.current_credit_balance)
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def mark_preferred(self, request, pk=None):
        """Toggle preferred customer status"""
        buyer = self.get_object()
        buyer.is_preferred = not buyer.is_preferred
        buyer.save()
        return Response({
            'status': 'success',
            'is_preferred': buyer.is_preferred,
            'message': f'Buyer {buyer.name} is now {"preferred" if buyer.is_preferred else "regular"}'
        })


class PurchaseBatchViewSet(QuerysetProtectionMixin, viewsets.ModelViewSet):
    """
    ViewSet for PurchaseBatch management with tenant isolation.
    
    Security:
    - Platform Operator: NO DIRECT ACCESS
    - Tenant Admin: Full access
    - Accountant: Full access (edit before lock)
    - Store Accounts: Full access (edit before lock)
    - Sales Staff: Read-only
    """
    queryset = PurchaseBatch.objects.all()
    serializer_class = PurchaseBatchSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['purchase_type', 'status', 'fish', 'supplier', 'date']
    search_fields = ['batch_number', 'fisherman_name', 'place_of_buying']
    ordering_fields = ['date', 'created_at', 'total_expense']
    ordering = ['-date']
    
    def get_permissions(self):
        """Return permissions based on action"""
        if self.action in ['create']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_store_accounts')]
        if self.action in ['update', 'partial_update']:
            return [CanEditPurchase()]
        if self.action in ['destroy']:
            return [IsTenantAdmin()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """Queryset with platform operator protection."""
        return self.queryset.model.objects.for_user(self.request.user)
    
    @transaction.atomic
    def perform_create(self, serializer):
        """Automatically set the tenant"""
        serializer.save(**_get_create_scope(self.request))
    
    @action(detail=True, methods=['get'])
    def sales_summary(self, request, pk=None):
        """Get sales summary for this batch"""
        batch = self.get_object()
        summary = batch.get_sales_summary()
        return Response({
            'batch_id': batch.id,
            'batch_number': batch.batch_number,
            'sales_summary': summary
        })
    
    @action(detail=True, methods=['post'])
    def update_quality(self, request, pk=None):
        """Update quality check information"""
        batch = self.get_object()
        batch.quality_grade = request.data.get('quality_grade', batch.quality_grade)
        batch.quality_score = request.data.get('quality_score', batch.quality_score)
        batch.freshness_score = request.data.get('freshness_score', batch.freshness_score)
        batch.inspector_name = request.data.get('inspector_name', batch.inspector_name)
        batch.inspection_date = request.data.get('inspection_date', batch.inspection_date)
        batch.save()
        return Response({
            'status': 'success',
            'message': 'Quality information updated'
        })


class SaleViewSet(QuerysetProtectionMixin, viewsets.ModelViewSet):
    """
    ViewSet for Sale management with tenant isolation.
    
    Security:
    - Platform Operator: NO DIRECT ACCESS
    - Tenant Admin: Full access
    - Accountant: Full access (edit before delivery)
    - Sales Staff: Create only, edit same-day only
    - Store Accounts: Read-only
    """
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['sale_type', 'payment_status', 'delivery_status', 'buyer', 'date']
    search_fields = ['invoice_number', 'buyer__name', 'shipping_tracking_number']
    ordering_fields = ['date', 'total_revenue', 'profit', 'created_at']
    ordering = ['-date']
    
    def get_permissions(self):
        """Return permissions based on action"""
        if self.action in ['create']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_sales_staff')]
        if self.action in ['update', 'partial_update']:
            return [CanEditSale()]
        if self.action in ['destroy']:
            return [IsTenantAdmin()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """Queryset with platform operator protection."""
        return _get_scoped_queryset(Sale, self.request)
    
    def perform_create(self, serializer):
        """Use SaleService for creation"""
        service = SaleService(self.request.user)
        data = serializer.validated_data
        instance = service.create_sale(dict(data))
        serializer = self.get_serializer(instance)
    
    def perform_update(self, serializer):
        """Use SaleService for update"""
        service = SaleService(self.request.user)
        instance = service.update_sale(serializer.instance, serializer.validated_data)
        serializer = self.get_serializer(instance)
    
    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        """Record payment using SaleService"""
        sale = self.get_object()
        service = SaleService(self.request.user)
        payment = service.record_payment(
            sale,
            request.data.get('amount'),
            request.data.get('payment_date'),
            request.data.get('reference', '')
        )
        serializer = PaymentSerializer(payment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_delivered(self, request, pk=None):
        """Mark delivered using SaleService"""
        sale = self.get_object()
        service = SaleService(self.request.user)
        service.mark_delivered(sale, request.data.get('delivered_by', request.user.get_full_name()))
        serializer = SaleSerializer(sale)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def process_return(self, request, pk=None):
        """Process return using SaleService"""
        sale = self.get_object()
        service = SaleService(self.request.user)
        service.process_return(
            sale,
            request.data.get('return_date'),
            request.data.get('return_reason', ''),
            request.data.get('refund_amount', 0)
        )
        serializer = SaleSerializer(sale)
        return Response(serializer.data)


class PaymentViewSet(QuerysetProtectionMixin, viewsets.ModelViewSet):
    """
    ViewSet for Payment management with tenant isolation.
    
    Security:
    - Platform Operator: NO DIRECT ACCESS
    - Tenant Admin: Full access
    - Accountant: Full access (edit before cleared)
    - Sales Staff: Customer payments only (edit before cleared)
    - Store Accounts: Supplier payments only (edit before cleared)
    """
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['payment_type', 'payment_mode', 'is_cleared', 'approval_status', 'date']
    search_fields = ['receipt_number', 'reference_number', 'notes']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date']
    
    def get_permissions(self):
        """Return permissions based on action"""
        if self.action in ['create']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_sales_staff', 'is_store_accounts')]
        if self.action in ['update', 'partial_update']:
            return [CanEditPayment()]
        if self.action in ['destroy']:
            return [IsTenantAdmin()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """Queryset with platform operator protection."""
        return _get_scoped_queryset(Payment, self.request)
    
    def perform_create(self, serializer):
        """Automatically set the tenant"""
        serializer.save(**_get_create_scope(self.request))
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a payment"""
        payment = self.get_object()
        payment.approval_status = 'approved'
        payment.approved_by = request.user
        payment.save()
        return Response({
            'status': 'success',
            'approval_status': payment.approval_status,
            'approved_by': request.user.get_full_name()
        })
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a payment"""
        payment = self.get_object()
        payment.approval_status = 'rejected'
        payment.save()
        return Response({
            'status': 'success',
            'approval_status': payment.approval_status
        })


class InventoryViewSet(QuerysetProtectionMixin, viewsets.ModelViewSet):
    """
    ViewSet for Inventory management with tenant isolation.
    
    Security:
    - Platform Operator: NO DIRECT ACCESS
    - Tenant Admin: Full access
    - Accountant: Full access
    - Store Accounts: Full access (update inventory, mark spoiled)
    - Sales Staff: Read-only
    """
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'fish', 'expiry_date']
    search_fields = ['fish__name', 'storage_location', 'bin_number', 'rack_number']
    ordering_fields = ['created_at', 'remaining_packages', 'expiry_date']
    ordering = ['-created_at']
    
    def get_permissions(self):
        """Return permissions based on action"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_store_accounts')]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """Queryset with platform operator protection."""
        return _get_scoped_queryset(Inventory, self.request)
    
    def perform_create(self, serializer):
        """Use InventoryService for creation"""
        service = InventoryService(self.request.user)
        data = serializer.validated_data
        instance = service.create_inventory(dict(data))
        serializer = self.get_serializer(instance)
    
    def perform_update(self, serializer):
        """Use InventoryService for update"""
        service = InventoryService(self.request.user)
        serializer.save()  # serializer handles fields, service for business logic

    
    @action(detail=True, methods=['post'])
    def update_temperature(self, request, pk=None):
        """Update temperature using InventoryService"""
        inventory = self.get_object()
        service = InventoryService(self.request.user)
        service.update_temperature(inventory, request.data.get('temperature'))
        serializer = self.get_serializer(inventory)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def move_stock(self, request, pk=None):
        """Move stock using InventoryService"""
        inventory = self.get_object()
        service = InventoryService(self.request.user)
        service.move_stock(
            inventory,
            request.data.get('storage_location'),
            request.data.get('bin_num'),
            request.data.get('rack_num')
        )
        serializer = self.get_serializer(inventory)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get all low stock items"""
        low_stock_items = self.get_queryset().filter(status='low_stock')
        serializer = self.get_serializer(low_stock_items, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Get items expiring soon"""
        from datetime import datetime, timedelta
        soon = datetime.now().date() + timedelta(days=3)
        expiring = self.get_queryset().filter(
            expiry_date__lte=soon,
            expiry_date__gte=datetime.now().date()
        )
        serializer = self.get_serializer(expiring, many=True)
        return Response(serializer.data)
