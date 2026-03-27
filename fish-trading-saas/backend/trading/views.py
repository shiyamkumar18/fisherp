# trading/views.py
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Count
from django.utils import timezone
from django.db import transaction
from decimal import Decimal

from .models.fish_category import FishCategory
from .models.fish import Fish
from .models.supplier import Supplier
from .models.buyer import Buyer
from .models.purchase_batch import PurchaseBatch
from .models.sale import Sale
from .models.payment import Payment
from .models.inventory import Inventory
from .serializers import (
    FishCategorySerializer, FishSerializer, FishListSerializer,
    SupplierSerializer, BuyerSerializer, PurchaseBatchSerializer,
    SaleSerializer, PaymentSerializer, InventorySerializer
)
from services.trading import SaleService, InventoryService
from accounts.permissions import (
    IsPlatformOperator, IsTenantAdmin, IsAccountant, IsSalesStaff, IsStoreAccounts,
    CanViewFinancials, CanCreateSale, CanCreatePurchase, CanRecordPayment,
    CanDeleteRecord, CanEditSale, CanEditPurchase, CanEditPayment, HasAnyRole,
    QuerysetProtectionMixin, TenantObjectPermission, is_impersonating, get_impersonated_tenant
)
from .helpers import _user_company   # <-- new import


def _get_create_scope(request):
    """
    Set both company and tenant pointers while creating records.
    """
    if is_impersonating(request):
        company = get_impersonated_tenant(request)
        return {'company': company, 'tenant': company.admin if company else None}
    return {'company': _user_company(request.user), 'tenant': request.user}


def _scoped_queryset(request, model):
    """
    Return a tenant-scoped queryset and block direct platform access.
    """
    user = request.user
    if user.is_superuser:
        return model.objects.all()
    if user.is_platform_user:
        if is_impersonating(request):
            company = get_impersonated_tenant(request)
            return model.objects.filter(company=company)
        raise PermissionDenied("Platform users must impersonate a tenant to access business data.")
    return model.objects.for_user(user)


def _filter_role_visible_payments(queryset, user):
    """
    Limit payment visibility by role.
    Sales staff only see customer-side collections.
    Store users only see supplier-side payments.
    Finance/admin roles can see everything in tenant scope.
    """
    if user.is_tenant_admin or user.is_accountant:
        return queryset
    if user.is_sales_staff:
        return queryset.filter(payment_type__in=['sale', 'credit', 'refund'])
    if user.is_store_accounts:
        return queryset.filter(payment_type__in=['purchase', 'advance'])
    return queryset.none()


# ========== Viewsets ==========

class FishCategoryViewSet(TenantObjectPermission, QuerysetProtectionMixin, viewsets.ModelViewSet):
    """FishCategory ViewSet with tenant isolation."""
    queryset = FishCategory.objects.all()
    serializer_class = FishCategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category_type', 'is_featured', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['priority', 'name', 'created_at']
    ordering = ['priority', 'name']

    def get_queryset(self):
        return FishCategory.objects.all()


class FishViewSet(TenantObjectPermission, QuerysetProtectionMixin, viewsets.ModelViewSet):
    queryset = Fish.objects.all()
    serializer_class = FishSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'unit_type', 'is_active']
    search_fields = ['name', 'category__name']
    ordering_fields = ['name', 'created_at', 'avg_price_per_kg']
    ordering = ['name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant')]
        return [IsAuthenticated()]

    def get_queryset(self):
        return _scoped_queryset(self.request, Fish)

    def get_serializer_class(self):
        if self.action == 'list':
            return FishListSerializer
        return FishSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save(**_get_create_scope(self.request))

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
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
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['supplier_type', 'is_verified', 'is_active', 'rating', 'payment_terms']
    search_fields = ['name', 'phone', 'email', 'place_of_origin', 'id_number', 'bank_name']
    ordering_fields = ['name', 'rating', 'outstanding_amount', 'created_at']
    ordering = ['name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'with_outstanding', 'overdue_payments', 'payment_summary']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_store_accounts')]
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_store_accounts')]
        return [IsAuthenticated()]

    def get_queryset(self):
        return _scoped_queryset(self.request, Supplier)

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save(**_get_create_scope(self.request))

    @action(detail=True, methods=['post'])
    def update_credit(self, request, pk=None):
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
                'message': 'Credit updated successfully'
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
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
        supplier = self.get_object()
        amount = request.data.get('amount', 0)
        payment_date = request.data.get('payment_date')
        reference = request.data.get('reference', '')
        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                return Response({'error': 'Payment amount must be greater than 0'},
                                status=status.HTTP_400_BAD_REQUEST)
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
        queryset = self.get_queryset().filter(outstanding_amount__gt=0)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def overdue_payments(self, request):
        queryset = self.get_queryset().filter(
            outstanding_amount__gt=0,
            payment_due_date__lt=timezone.now().date()
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class BuyerViewSet(TenantObjectPermission, QuerysetProtectionMixin, viewsets.ModelViewSet):
    queryset = Buyer.objects.all()
    serializer_class = BuyerSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['buyer_type', 'is_preferred', 'is_verified', 'is_active', 'rating']
    search_fields = ['name', 'phone', 'email', 'business_name', 'gst_number']
    ordering_fields = ['name', 'rating', 'total_purchases', 'created_at']
    ordering = ['name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_sales_staff')]
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_sales_staff')]
        return [IsAuthenticated()]

    def get_queryset(self):
        return _scoped_queryset(self.request, Buyer)

    def perform_create(self, serializer):
        serializer.save(**_get_create_scope(self.request))

    @action(detail=True, methods=['post'])
    def update_credit(self, request, pk=None):
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
        buyer = self.get_object()
        buyer.is_preferred = not buyer.is_preferred
        buyer.save()
        return Response({
            'status': 'success',
            'is_preferred': buyer.is_preferred,
            'message': f'Buyer {buyer.name} is now {"preferred" if buyer.is_preferred else "regular"}'
        })


class PurchaseBatchViewSet(QuerysetProtectionMixin, viewsets.ModelViewSet):
    queryset = PurchaseBatch.objects.all()
    serializer_class = PurchaseBatchSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['purchase_type', 'status', 'fish', 'supplier', 'date']
    search_fields = ['batch_number', 'fisherman_name', 'place_of_buying']
    ordering_fields = ['date', 'created_at', 'total_expense']
    ordering = ['-date']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'sales_summary']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_store_accounts')]
        if self.action in ['create']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_store_accounts')]
        if self.action in ['update', 'partial_update']:
            return [CanEditPurchase()]
        if self.action in ['destroy']:
            return [IsTenantAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return _scoped_queryset(self.request, PurchaseBatch)

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save(**_get_create_scope(self.request))

    @action(detail=True, methods=['get'])
    def sales_summary(self, request, pk=None):
        batch = self.get_object()
        summary = batch.get_sales_summary()
        return Response({
            'batch_id': batch.id,
            'batch_number': batch.batch_number,
            'sales_summary': summary
        })

    @action(detail=True, methods=['post'])
    def update_quality(self, request, pk=None):
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
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['sale_type', 'payment_status', 'delivery_status', 'buyer', 'date']
    search_fields = ['invoice_number', 'buyer__name', 'shipping_tracking_number']
    ordering_fields = ['date', 'total_revenue', 'profit', 'created_at']
    ordering = ['-date']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'record_payment', 'mark_delivered', 'process_return']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_sales_staff')]
        if self.action in ['create']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_sales_staff')]
        if self.action in ['update', 'partial_update']:
            return [CanEditSale()]
        if self.action in ['destroy']:
            return [IsTenantAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return _scoped_queryset(self.request, Sale)

    def perform_create(self, serializer):
        instance = serializer.save(**_get_create_scope(self.request))
        serializer.instance = instance

    def perform_update(self, serializer):
        service = SaleService(self.request.user)
        instance = service.update_sale(serializer.instance, serializer.validated_data)
        serializer.instance = instance

    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        sale = self.get_object()
        service = SaleService(self.request.user)
        try:
            payment = service.record_payment(
                sale,
                request.data.get('amount'),
                request.data.get('payment_date'),
                request.data.get('reference', '')
            )
        except ValidationError as exc:
            return Response(getattr(exc, 'message_dict', {'error': exc.messages}), status=status.HTTP_400_BAD_REQUEST)
        serializer = PaymentSerializer(payment)
        data = serializer.data
        data['pending_amount'] = str(sale.pending_amount)
        data['amount_received'] = str(sale.amount_received)
        data['payment_status'] = sale.payment_status
        return Response(data)

    @action(detail=True, methods=['post'])
    def mark_delivered(self, request, pk=None):
        sale = self.get_object()
        service = SaleService(self.request.user)
        service.mark_delivered(sale, request.data.get('delivered_by', request.user.get_full_name()))
        serializer = SaleSerializer(sale)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def process_return(self, request, pk=None):
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
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['payment_type', 'payment_mode', 'is_cleared', 'approval_status', 'date']
    search_fields = ['receipt_number', 'reference_number', 'notes']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_sales_staff', 'is_store_accounts')]
        if self.action in ['create']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_sales_staff', 'is_store_accounts')]
        if self.action in ['update', 'partial_update']:
            return [CanEditPayment()]
        if self.action in ['destroy']:
            return [IsTenantAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = _scoped_queryset(self.request, Payment)
        return _filter_role_visible_payments(queryset, self.request.user)

    def perform_create(self, serializer):
        serializer.save(**_get_create_scope(self.request))

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
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
        payment = self.get_object()
        payment.approval_status = 'rejected'
        payment.save()
        return Response({
            'status': 'success',
            'approval_status': payment.approval_status
        })


class InventoryViewSet(QuerysetProtectionMixin, viewsets.ModelViewSet):
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'fish', 'expiry_date']
    search_fields = ['fish__name', 'storage_location', 'bin_number', 'rack_number']
    ordering_fields = ['created_at', 'remaining_packages', 'expiry_date']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'low_stock', 'expiring_soon']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_sales_staff', 'is_store_accounts')]
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_store_accounts')]
        return [IsAuthenticated()]

    def get_queryset(self):
        return _scoped_queryset(self.request, Inventory)

    def perform_create(self, serializer):
        instance = serializer.save(**_get_create_scope(self.request))
        serializer.instance = instance

    def perform_update(self, serializer):
        service = InventoryService(self.request.user)
        serializer.save()

    @action(detail=True, methods=['post'])
    def update_temperature(self, request, pk=None):
        inventory = self.get_object()
        service = InventoryService(self.request.user)
        service.update_temperature(inventory, request.data.get('temperature'))
        serializer = self.get_serializer(inventory)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def move_stock(self, request, pk=None):
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
        low_stock_items = self.get_queryset().filter(status='low_stock')
        serializer = self.get_serializer(low_stock_items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        from datetime import datetime, timedelta
        soon = datetime.now().date() + timedelta(days=3)
        expiring = self.get_queryset().filter(
            expiry_date__lte=soon,
            expiry_date__gte=datetime.now().date()
        )
        serializer = self.get_serializer(expiring, many=True)
        return Response(serializer.data)
