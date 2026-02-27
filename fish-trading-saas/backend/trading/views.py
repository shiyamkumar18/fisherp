from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Count
from django.utils import timezone
from decimal import Decimal

from .models import FishCategory, Fish, Supplier, Buyer, PurchaseBatch, Sale, Payment, Inventory
from .serializers import (
    FishCategorySerializer, FishSerializer, FishListSerializer,
    SupplierSerializer, BuyerSerializer, PurchaseBatchSerializer,
    SaleSerializer, PaymentSerializer, InventorySerializer
)
from accounts.permissions import (
    IsPlatformMaintainer, IsTenantAdmin, IsSalesStaff, IsStoreAccounts,
    CanViewFinancials, CanCreateSale, CanCreatePurchase, CanRecordPayment,
    CanViewOwnSalesOnly
)


class FishCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for FishCategory - shared across all tenants
    
    Permissions:
    - All authenticated users can view
    - TenantAdmin and PlatformMaintainer can create/edit/delete
    """
    queryset = FishCategory.objects.all()
    serializer_class = FishCategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category_type', 'is_featured', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['priority', 'name', 'created_at']
    ordering = ['priority', 'name']


class FishViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Fish management with tenant isolation.
    
    Permissions:
    - TenantAdmin: Full access (create, read, update, delete)
    - SalesStaff: Read-only access
    - StoreAccounts: Read-only access
    
    All fish data is isolated per tenant (User).
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
            # Only TenantAdmin can write
            return [IsTenantAdmin()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """
        Return fish records only for the current tenant (authenticated user).
        Superusers can see all fish records.
        """
        user = self.request.user
        if user.is_superuser:
            return Fish.objects.all()
        return Fish.objects.filter(tenant=user)
    
    def get_serializer_class(self):
        """Use different serializers for list vs detail views"""
        if self.action == 'list':
            return FishListSerializer
        return FishSerializer
    
    def perform_create(self, serializer):
        """Automatically set the tenant to the current user"""
        serializer.save(tenant=self.request.user)
    
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


class SupplierViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Supplier management with tenant isolation.
    
    Permissions:
    - TenantAdmin: Full access (create, read, update, delete)
    - StoreAccounts: Full access (handle purchases and suppliers)
    - SalesStaff: Read-only access
    
    All supplier data is isolated per tenant (User).
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
            # TenantAdmin and StoreAccounts can write
            return [IsTenantAdmin() | IsStoreAccounts()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """
        Return supplier records only for the current tenant (authenticated user).
        Superusers can see all supplier records.
        """
        user = self.request.user
        if user.is_superuser:
            return Supplier.objects.all()
        return Supplier.objects.filter(tenant=user)
    
    def perform_create(self, serializer):
        """Automatically set the tenant to the current user"""
        serializer.save(tenant=self.request.user)
    
    @action(detail=True, methods=['post'])
    def update_credit(self, request, pk=None):
        """Update supplier credit balance"""
        supplier = self.get_object()
        amount = request.data.get('amount', 0)
        operation = request.data.get('operation', 'add')  # 'add' or 'subtract'
        
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
        
        # Get recent payments
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


class BuyerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Buyer management with tenant isolation.
    
    Permissions:
    - TenantAdmin: Full access
    - SalesStaff: Full access (add buyers, record payments)
    - StoreAccounts: Read-only access
    
    All buyer data is isolated per tenant (User).
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
            # TenantAdmin and SalesStaff can write
            return [IsTenantAdmin() | IsSalesStaff()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """
        Return buyer records only for the current tenant (authenticated user).
        Superusers can see all buyer records.
        """
        user = self.request.user
        if user.is_superuser:
            return Buyer.objects.all()
        return Buyer.objects.filter(tenant=user)
    
    def perform_create(self, serializer):
        """Automatically set the tenant to the current user"""
        serializer.save(tenant=self.request.user)
    
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


class PurchaseBatchViewSet(viewsets.ModelViewSet):
    """
    ViewSet for PurchaseBatch management with tenant isolation.
    
    Permissions:
    - TenantAdmin: Full access
    - StoreAccounts: Full access (add purchases)
    - SalesStaff: Read-only access
    
    All purchase batch data is isolated per tenant (User).
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
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # TenantAdmin and StoreAccounts can write
            return [IsTenantAdmin() | IsStoreAccounts()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """
        Return purchase batch records only for the current tenant (authenticated user).
        Superusers can see all purchase batch records.
        """
        user = self.request.user
        if user.is_superuser:
            return PurchaseBatch.objects.all()
        return PurchaseBatch.objects.filter(tenant=user)
    
    def perform_create(self, serializer):
        """Automatically set the tenant to the current user"""
        serializer.save(tenant=self.request.user)
    
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


class SaleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Sale management with tenant isolation.
    
    Permissions:
    - TenantAdmin: Full access
    - SalesStaff: Full access (create sales, record payments)
    - StoreAccounts: Read-only access
    
    All sale data is isolated per tenant (User).
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
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # TenantAdmin and SalesStaff can write
            return [IsTenantAdmin() | IsSalesStaff()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """
        Return sale records only for the current tenant (authenticated user).
        Superusers can see all sale records.
        """
        user = self.request.user
        if user.is_superuser:
            return Sale.objects.all()
        return Sale.objects.filter(tenant=user)
    
    def perform_create(self, serializer):
        """Automatically set the tenant to the current user"""
        serializer.save(tenant=self.request.user)
    
    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        """Record a payment for this sale"""
        sale = self.get_object()
        amount = request.data.get('amount', 0)
        
        try:
            amount = Decimal(str(amount))
            sale.amount_received += amount
            sale.save()
            return Response({
                'status': 'success',
                'amount_received': str(sale.amount_received),
                'pending_amount': str(sale.pending_amount),
                'payment_status': sale.payment_status
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def mark_delivered(self, request, pk=None):
        """Mark sale as delivered"""
        sale = self.get_object()
        sale.delivery_status = 'delivered'
        sale.delivery_confirmed_at = timezone.now()
        sale.delivered_by = request.data.get('delivered_by', request.user.get_full_name())
        sale.save()
        return Response({
            'status': 'success',
            'delivery_status': sale.delivery_status,
            'delivered_at': sale.delivery_confirmed_at
        })
    
    @action(detail=True, methods=['post'])
    def process_return(self, request, pk=None):
        """Process a return for this sale"""
        sale = self.get_object()
        sale.is_returned = True
        sale.return_date = request.data.get('return_date')
        sale.return_reason = request.data.get('return_reason', '')
        sale.refund_amount = request.data.get('refund_amount', 0)
        sale.save()
        return Response({
            'status': 'success',
            'is_returned': sale.is_returned,
            'refund_amount': str(sale.refund_amount)
        })


class PaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Payment management with tenant isolation.
    
    Permissions:
    - TenantAdmin: Full access
    - SalesStaff: Can record customer payments
    - StoreAccounts: Can record supplier payments
    - All: Read-only access
    
    All payment data is isolated per tenant (User).
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
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # All roles can record payments
            return [IsTenantAdmin() | IsSalesStaff() | IsStoreAccounts()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """
        Return payment records only for the current tenant (authenticated user).
        Superusers can see all payment records.
        """
        user = self.request.user
        if user.is_superuser:
            return Payment.objects.all()
        return Payment.objects.filter(tenant=user)
    
    def perform_create(self, serializer):
        """Automatically set the tenant to the current user"""
        serializer.save(tenant=self.request.user)
    
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


class InventoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Inventory management with tenant isolation.
    
    Permissions:
    - TenantAdmin: Full access
    - StoreAccounts: Full access (update inventory, mark spoiled)
    - SalesStaff: Read-only access
    
    All inventory data is isolated per tenant (User).
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
            # TenantAdmin and StoreAccounts can write
            return [IsTenantAdmin() | IsStoreAccounts()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """
        Return inventory records only for the current tenant (authenticated user).
        Superusers can see all inventory records.
        """
        user = self.request.user
        if user.is_superuser:
            return Inventory.objects.all()
        return Inventory.objects.filter(tenant=user)
    
    def perform_create(self, serializer):
        """Automatically set the tenant to the current user"""
        serializer.save(tenant=self.request.user)
    
    @action(detail=True, methods=['post'])
    def update_temperature(self, request, pk=None):
        """Update storage temperature"""
        inventory = self.get_object()
        temperature = request.data.get('temperature')
        
        if temperature is not None:
            inventory.current_temperature = temperature
            inventory.temperature_last_checked = timezone.now()
            inventory.save()
            return Response({
                'status': 'success',
                'current_temperature': str(inventory.current_temperature),
                'last_checked': inventory.temperature_last_checked
            })
        return Response({'error': 'Temperature value required'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def move_stock(self, request, pk=None):
        """Move stock to different location"""
        inventory = self.get_object()
        inventory.storage_location = request.data.get('storage_location', inventory.storage_location)
        inventory.bin_number = request.data.get('bin_number', inventory.bin_number)
        inventory.rack_number = request.data.get('rack_number', inventory.rack_number)
        inventory.last_moved_at = timezone.now()
        inventory.last_moved_by = request.user.get_full_name()
        inventory.save()
        return Response({
            'status': 'success',
            'new_location': inventory.storage_location,
            'bin': inventory.bin_number,
            'rack': inventory.rack_number
        })
    
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
