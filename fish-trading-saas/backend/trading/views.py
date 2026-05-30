# trading/views.py
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Prefetch
from django.utils import timezone
from django.db import transaction
from decimal import Decimal, InvalidOperation

from .models.fish_category import FishCategory
from .models.fish import Fish
from .models.supplier import Supplier
from .models.buyer import Buyer
from .models.purchase_batch import PurchaseBatch
from .models.sale import Sale
from .models.payment import Payment
from .models.inventory import Inventory
from .models.market_price import MarketFishPrice
from .models.stock_movement import StockMovement
from .models.whatsapp import WhatsAppConfig, WhatsAppMessageLog
from .serializers import (
    FishCategorySerializer, FishSerializer, FishListSerializer,
    SupplierSerializer, BuyerSerializer, PurchaseBatchSerializer,
    SaleSerializer, PaymentSerializer, InventorySerializer,
    MarketFishPriceSerializer, StockMovementSerializer,
    WhatsAppConfigSerializer, WhatsAppMessageLogSerializer
)
from services.trading import SaleService, InventoryService
from services.purchase import PurchaseService
from services.analytics import AnalyticsService
from accounts.permissions import (
    IsTenantAdmin, CanEditSale, CanEditPurchase, CanEditPayment, HasAnyRole,
    QuerysetProtectionMixin, TenantObjectPermission, is_impersonating, get_impersonated_tenant
)
from .helpers import _user_company   # <-- new import
from datetime import timedelta, datetime
import re


def _get_create_scope(request):
    """
    Set company, tenant (deprecated), and created_by/updated_by pointers while creating records.
    """
    user = getattr(request, 'user', None)
    if is_impersonating(request):
        company = get_impersonated_tenant(request)
        return {
            'company': company,
            'tenant': company.admin if company else None,
            'created_by': user,
            'updated_by': user,
        }
    return {
        'company': _user_company(user) if user else None,
        'tenant': user,
        'created_by': user,
        'updated_by': user,
    }


def _scoped_queryset(request, model):
    """
    Return a tenant-scoped queryset and block direct platform access.
    """
    user = request.user
    if getattr(user, 'is_superuser', False) or getattr(user, 'is_platform_user', False):
        if is_impersonating(request):
            company = get_impersonated_tenant(request)
            return model.objects.filter(company=company)
        raise PermissionDenied("Platform users must impersonate a tenant to access business data.")
    
    # Safely get the manager
    manager = getattr(model, 'objects', None)
    if not manager:
        return model.objects.none()
        
    for_user_func = getattr(manager, 'for_user', None)
    if for_user_func and callable(for_user_func):
        return for_user_func(user)
        
    # Fallback if for_user isn't implemented
    company = getattr(user, 'company', None)
    if company:
        return model.objects.filter(company=company)
        
    return model.objects.none()


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
    """
    ViewSet for managing Fish products with tenant isolation and role-based access.
    """
    queryset = Fish.objects.all()
    serializer_class = FishSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'unit_type', 'is_active']
    search_fields = ['name', 'category__name']
    ordering_fields = ['name', 'created_at', 'avg_price_per_kg']
    ordering = ['name']

    def get_permissions(self):
        """
        Custom permissions: Create/Update/Delete restricted to Tenant Admin and Accountant.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant')]
        return [IsAuthenticated()]

    def get_queryset(self):
        """
        Return scoped queryset for the authenticated user.
        """
        return _scoped_queryset(self.request, Fish).select_related('category', 'tenant', 'company')

    def get_serializer_class(self):
        """
        Use ListSerializer for list action, standard Serializer otherwise.
        """
        if self.action == 'list':
            return FishListSerializer
        return FishSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        """
        Apply company/tenant scope during creation.
        """
        serializer.save(**_get_create_scope(self.request))

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """
        Toggle the active status of a fish product.
        """
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
        """
        Return fish products grouped by category.
        """
        tenant_fish_qs = self.get_queryset().filter(is_active=True)
        categories = FishCategory.objects.filter(is_active=True).prefetch_related(
            Prefetch('fish', queryset=tenant_fish_qs, to_attr='tenant_fish')
        )
        result = []
        for category in categories:
            fish_list = getattr(category, 'tenant_fish', [])
            result.append({
                'category': FishCategorySerializer(category).data,
                'fish_count': len(fish_list),
                'fish': FishListSerializer(fish_list, many=True).data
            })
        return Response(result)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Return inventory statistics for fish products.
        """
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
    ViewSet for managing suppliers.
    Provides standard CRUD operations and custom actions for credit management,
    verification, and payment tracking.
    """
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['supplier_type', 'is_verified', 'is_active', 'rating', 'payment_terms']
    search_fields = ['name', 'phone', 'email', 'place_of_origin', 'id_number', 'bank_name']
    ordering_fields = ['name', 'rating', 'outstanding_amount', 'created_at']
    ordering = ['name']

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['list', 'retrieve', 'with_outstanding', 'overdue_payments', 'payment_summary']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_store_accounts')]
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_store_accounts')]
        return [IsAuthenticated()]

    def get_queryset(self):
        """
        Return the list of items for this view.
        """
        return _scoped_queryset(self.request, Supplier).select_related('tenant', 'company')

    @transaction.atomic
    def perform_create(self, serializer):
        """
        Create a new supplier instance.
        """
        serializer.save(**_get_create_scope(self.request))

    @action(detail=True, methods=['post'])
    def update_credit(self, request, pk=None):
        """
        Update the credit balance for a specific supplier.
        """
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
        except (ValueError, TypeError, InvalidOperation) as e:
            return Response({'error': f'Invalid amount format: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """
        Mark a supplier as verified.
        """
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
        """
        Recalculate the outstanding amount for a specific supplier.
        """
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
        """
        Record a payment made to a supplier.
        """
        supplier = self.get_object()
        amount = request.data.get('amount', 0)
        payment_date = request.data.get('payment_date')
        reference = request.data.get('reference', '')
        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                return Response({'error': 'Payment amount must be greater than 0'},
                                status=status.HTTP_400_BAD_REQUEST)
            with transaction.atomic():
                supplier = Supplier.objects.select_for_update().get(pk=supplier.pk)
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
        except (ValueError, TypeError, InvalidOperation) as e:
            return Response({'error': f'Invalid amount format: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def payment_summary(self, request, pk=None):
        """
        Retrieve a summary of recent payments and credit status for a supplier.
        """
        supplier = self.get_object()
        recent_payments = Payment.objects.filter(
            supplier=supplier,
            payment_type='purchase'
        ).select_related('processed_by').order_by('-date')[:10]
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
        """
        Retrieve all suppliers with outstanding balances.
        """
        queryset = self.get_queryset().filter(outstanding_amount__gt=0)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def overdue_payments(self, request):
        """
        Retrieve all suppliers with overdue payments.
        """
        queryset = self.get_queryset().filter(
            outstanding_amount__gt=0,
            payment_due_date__lt=timezone.now().date()
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class BuyerViewSet(TenantObjectPermission, QuerysetProtectionMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing buyers.
    Provides standard CRUD operations and custom actions for credit management
    and preference status.
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
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['list', 'retrieve']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_sales_staff')]
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_sales_staff')]
        return [IsAuthenticated()]

    def get_queryset(self):
        """
        Return the list of items for this view.
        """
        return _scoped_queryset(self.request, Buyer).select_related('tenant', 'company')

    def perform_create(self, serializer):
        """
        Create a new buyer instance.
        """
        serializer.save(**_get_create_scope(self.request))

    @action(detail=True, methods=['post'])
    def update_credit(self, request, pk=None):
        """
        Update the credit balance for a specific buyer.
        """
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
        except (ValueError, TypeError, InvalidOperation) as e:
            return Response({'error': f'Invalid amount format: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def mark_preferred(self, request, pk=None):
        """
        Toggle the preferred status of a buyer.
        """
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
    ViewSet for managing purchase batches.
    Includes operations for quality tracking and sales summaries for specific batches.
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
        """
        Instantiates and returns the list of permissions that this view requires.
        """
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
        """
        Return the list of items for this view.
        """
        return _scoped_queryset(self.request, PurchaseBatch).select_related(
            'supplier', 'fish', 'fish_category', 'tenant', 'company'
        )

    @transaction.atomic
    def perform_create(self, serializer):
        """
        Create a new purchase batch instance.
        """
        serializer.save(**_get_create_scope(self.request))

    @action(detail=True, methods=['get'])
    def sales_summary(self, request, pk=None):
        """
        Get a summary of sales associated with a specific batch.
        """
        batch = self.get_object()
        summary = batch.get_sales_summary()
        return Response({
            'batch_id': batch.id,
            'batch_number': batch.batch_number,
            'sales_summary': summary
        })

    @action(detail=True, methods=['post'])
    def update_quality(self, request, pk=None):
        """
        Update quality and inspection data for a batch.
        """
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
    ViewSet for managing sales.
    Provides standard CRUD operations and custom actions for payment recording,
    delivery tracking, and processing returns.
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
        """
        Instantiates and returns the list of permissions that this view requires.
        """
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
        """
        Return the list of items for this view.
        """
        return _scoped_queryset(self.request, Sale).select_related(
            'batch', 'buyer', 'tenant', 'company'
        )

    def perform_create(self, serializer):
        """
        Create a new sale instance.
        """
        instance = serializer.save(**_get_create_scope(self.request))
        serializer.instance = instance

    def perform_update(self, serializer):
        """
        Update an existing sale instance using SaleService for business logic.
        """
        service = SaleService(self.request.user)
        instance = service.update_sale(serializer.instance, serializer.validated_data)
        serializer.instance = instance

    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        """
        Record a payment for a specific sale.
        """
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
        """
        Mark a sale as delivered.
        """
        sale = self.get_object()
        service = SaleService(self.request.user)
        service.mark_delivered(sale, request.data.get('delivered_by', request.user.get_full_name()))
        serializer = SaleSerializer(sale)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def process_return(self, request, pk=None):
        """
        Process a return for a specific sale.
        """
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
    ViewSet for managing payments.
    Handles standard CRUD operations and approval/rejection workflows for payments.
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
        """
        Instantiates and returns the list of permissions that this view requires.
        """
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
        """
        Return the list of items for this view.
        """
        queryset = _scoped_queryset(self.request, Payment).select_related(
            'purchase_batch', 'sale', 'supplier', 'buyer', 'tenant', 'company'
        )
        return _filter_role_visible_payments(queryset, self.request.user)

    def perform_create(self, serializer):
        """
        Create a new payment instance.
        """
        serializer.save(**_get_create_scope(self.request))

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approve a pending payment.
        """
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
        """
        Reject a pending payment.
        """
        payment = self.get_object()
        payment.approval_status = 'rejected'
        payment.save()
        return Response({
            'status': 'success',
            'approval_status': payment.approval_status
        })


class InventoryViewSet(QuerysetProtectionMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing inventory items.
    Provides CRUD operations and actions for stock movements, temperature updates,
    and monitoring low or expiring stock.
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
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['list', 'retrieve', 'low_stock', 'expiring_soon']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_sales_staff', 'is_store_accounts')]
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [HasAnyRole('is_tenant_admin', 'is_accountant', 'is_store_accounts')]
        return [IsAuthenticated()]

    def get_queryset(self):
        """
        Return the list of items for this view.
        """
        return _scoped_queryset(self.request, Inventory).select_related(
            'fish', 'purchase_batch', 'tenant', 'company'
        )

    def perform_create(self, serializer):
        """
        Create a new inventory instance.
        """
        instance = serializer.save(**_get_create_scope(self.request))
        serializer.instance = instance

    def perform_update(self, serializer):
        """
        Update an existing inventory instance.
        """
        # InventoryService validates tenant scoping on init
        InventoryService(self.request.user)
        serializer.save()

    @action(detail=True, methods=['post'])
    def update_temperature(self, request, pk=None):
        """
        Update the storage temperature for an inventory item.
        """
        inventory = self.get_object()
        service = InventoryService(self.request.user)
        service.update_temperature(inventory, request.data.get('temperature'))
        serializer = self.get_serializer(inventory)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def move_stock(self, request, pk=None):
        """
        Move inventory stock to a new location.
        """
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
        """
        Retrieve a list of inventory items with low stock.
        """
        low_stock_items = self.get_queryset().filter(status='low_stock')
        serializer = self.get_serializer(low_stock_items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """
        Retrieve a list of inventory items expiring within the next 3 days.
        """
        today = timezone.localdate()
        soon = today + timedelta(days=3)
        expiring = self.get_queryset().filter(
            expiry_date__lte=soon,
            expiry_date__gte=today
        )
        serializer = self.get_serializer(expiring, many=True)
        return Response(serializer.data)


# ========== Purchase Creation API ==========

class CreatePurchaseView(APIView):
    """
    Create purchase with batch generation
    POST /api/purchase/
    """

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        return [IsAuthenticated(), HasAnyRole('is_tenant_admin', 'is_store')]

    def post(self, request):
        """Create new purchase with items"""
        user = request.user
        company = _user_company(user)
        
        if not company:
            return Response(
                {'error': 'No company associated with user'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse request data
        supplier_id = request.data.get('supplier_id')
        supplier_name = request.data.get('supplier_name')
        items = request.data.get('items', [])
        payment_method = request.data.get('payment_method', 'cash')
        amount_paid = Decimal(str(request.data.get('amount_paid', 0)))
        notes = request.data.get('notes', '')
        
        # Validate payment method
        if payment_method not in ['cash', 'upi', 'credit']:
            return Response(
                {'error': 'Invalid payment method'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create purchase
        result_obj = PurchaseService.create_purchase(
            user=user,
            company=company,
            supplier_id=supplier_id,
            supplier_name=supplier_name,
            items=items,
            payment_method=payment_method,
            amount_paid=amount_paid,
            notes=notes
        )
        result = result_obj.to_dict()
        
        if not result['success']:
            return Response(
                {'errors': result['errors']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'success': True,
            'batches': result['batches'],
            'total_amount': float(result['total_amount']),
            'payment_status': {
                'method': result['payment_status']['method'],
                'paid': float(result['payment_status']['paid']),
                'pending': float(result['payment_status']['pending'])
            },
            'message': f'Created {len(result["batches"])} batch(es)'
        }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def get_price_history(request, fish_id):
    """
    Get last 3 purchase prices for a fish product
    GET /api/price-history/{fish_id}/
    """
    user = request.user
    company = _user_company(user)
    
    if not company:
        return Response(
            {'error': 'No company associated with user'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        prices = PurchaseService.get_last_purchase_prices(company, fish_id)
        return Response({
            'fish_id': fish_id,
            'prices': prices,
            'average': sum(p['price'] for p in prices) / len(prices) if prices else 0
        })
    except (ValueError, KeyError, ObjectDoesNotExist) as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def check_duplicate_purchase(request, fish_id):
    """
    Check for recent duplicate purchase
    GET /api/check-duplicate/{fish_id}/
    """
    user = request.user
    company = _user_company(user)
    
    if not company:
        return Response(
            {'error': 'No company associated with user'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    duplicate = PurchaseService.get_duplicate_check(company, fish_id)
    
    return Response({
        'fish_id': fish_id,
        'duplicate_found': duplicate is not None,
        'duplicate': duplicate
    })


@api_view(['GET'])
def get_supplier_suggestions(request):
    """
    Get recent suppliers for quick selection
    GET /api/suppliers-recent/
    """
    user = request.user
    company = _user_company(user)
    
    if not company:
        return Response([])
    
    suppliers = Supplier.objects.filter(
        company=company,
        is_deleted=False
    ).order_by('-created_at')[:10].values('id', 'name', 'phone')
    
    return Response(list(suppliers))


# ========== ANALYTICS / REPORTS ENDPOINTS ==========

@api_view(['GET'])
def get_profit_loss_chart(request):
    """
    GET /api/analytics/profit-loss/
    ?start_date=2026-03-04&end_date=2026-04-03
    
    Returns daily profit/loss/receivable for chart
    """
    user = request.user
    company = _user_company(user)
    
    if not company:
        return Response({'error': 'No company'}, status=400)
    
    try:
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None
        
        analytics = AnalyticsService(company, user)
        data = analytics.get_profit_loss_data(start_date, end_date)
        
        return Response({'success': True, 'data': data})
    except ValueError as e:
        return Response({'error': f'Invalid date format: {str(e)}'}, status=400)


@api_view(['GET'])
def get_sold_vs_remaining_chart(request):
    """
    GET /api/analytics/sold-vs-remaining/
    ?start_date=2026-03-04&end_date=2026-04-03
    
    Returns product-wise sold vs remaining qty
    """
    user = request.user
    company = _user_company(user)
    
    if not company:
        return Response({'error': 'No company'}, status=400)
    
    try:
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None
        
        analytics = AnalyticsService(company, user)
        data = analytics.get_sold_vs_remaining(start_date, end_date)
        
        return Response({'success': True, 'data': data})
    except ValueError as e:
        return Response({'error': f'Invalid date format: {str(e)}'}, status=400)


@api_view(['GET'])
def get_demand_trend_chart(request):
    """
    GET /api/analytics/demand-trend/
    ?start_date=2026-03-04&end_date=2026-04-03&product=vanjaram
    
    Returns daily sales trend (what to buy tomorrow?)
    """
    user = request.user
    company = _user_company(user)
    
    if not company:
        return Response({'error': 'No company'}, status=400)
    
    try:
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        product = request.query_params.get('product')
        
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None
        
        analytics = AnalyticsService(company, user)
        data = analytics.get_demand_trend(start_date, end_date, product)
        
        return Response({'success': True, 'data': data})
    except ValueError as e:
        return Response({'error': f'Invalid date format: {str(e)}'}, status=400)


@api_view(['GET'])
def get_batch_performance_chart(request):
    """
    GET /api/analytics/batch-performance/
    ?start_date=2026-03-04&end_date=2026-04-03&limit=20
    
    Returns batch-wise profit/loss performance
    """
    user = request.user
    company = _user_company(user)
    
    if not company:
        return Response({'error': 'No company'}, status=400)
    
    try:
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        limit = int(request.query_params.get('limit', 20))
        
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None
        
        analytics = AnalyticsService(company, user)
        data = analytics.get_batch_performance(start_date, end_date, limit)
        
        return Response({'success': True, 'data': data})
    except ValueError as e:
        return Response({'error': f'Invalid input format: {str(e)}'}, status=400)


@api_view(['GET'])
def get_loss_analysis_chart(request):
    """
    GET /api/analytics/loss-analysis/
    ?start_date=2026-03-04&end_date=2026-04-03
    
    Returns loss-making batches/products
    """
    user = request.user
    company = _user_company(user)
    
    if not company:
        return Response({'error': 'No company'}, status=400)
    
    try:
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None
        
        analytics = AnalyticsService(company, user)
        data = analytics.get_loss_analysis(start_date, end_date)
        
        return Response({'success': True, 'data': data})
    except ValueError as e:
        return Response({'error': f'Invalid date format: {str(e)}'}, status=400)


@api_view(['GET'])
def get_payment_analysis_chart(request):
    """
    GET /api/analytics/payment-analysis/
    ?start_date=2026-03-04&end_date=2026-04-03
    
    Returns payment method breakdown (donut chart)
    """
    user = request.user
    company = _user_company(user)
    
    if not company:
        return Response({'error': 'No company'}, status=400)
    
    try:
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None
        
        analytics = AnalyticsService(company, user)
        data = analytics.get_payment_analysis(start_date, end_date)
        
        return Response({'success': True, 'data': data})
    except ValueError as e:
        return Response({'error': f'Invalid date format: {str(e)}'}, status=400)


@api_view(['GET'])
def get_price_trend_chart(request):
    """
    GET /api/analytics/price-trend/
    ?start_date=2026-03-04&end_date=2026-04-03&product=vanjaram
    
    Returns cost vs selling price trends
    """
    user = request.user
    company = _user_company(user)
    
    if not company:
        return Response({'error': 'No company'}, status=400)
    
    try:
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        product = request.query_params.get('product')
        
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None
        
        analytics = AnalyticsService(company, user)
        data = analytics.get_price_trend(start_date, end_date, product)
        
        return Response({'success': True, 'data': data})
    except ValueError as e:
        return Response({'error': f'Invalid date format: {str(e)}'}, status=400)


@api_view(['GET'])
def get_profit_trend_chart(request):
    """
    GET /api/analytics/profit-trend/
    ?start_date=2026-03-04&end_date=2026-04-03&period=daily
    
    Returns daily/weekly/monthly profit trend
    """
    user = request.user
    company = _user_company(user)
    
    if not company:
        return Response({'error': 'No company'}, status=400)
    
    try:
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        period = request.query_params.get('period', 'daily')
        
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None
        
        analytics = AnalyticsService(company, user)
        data = analytics.get_profit_trend(period, start_date, end_date)
        
        return Response({'success': True, 'data': data})
    except ValueError as e:
        return Response({'error': f'Invalid date format: {str(e)}'}, status=400)


@api_view(['GET'])
def get_smart_insights(request):
    """
    GET /api/analytics/smart-insights/
    ?start_date=2026-03-04&end_date=2026-04-03
    
    Returns AI-ready business insights
    """
    user = request.user
    company = _user_company(user)
    
    if not company:
        return Response({'error': 'No company'}, status=400)
    
    try:
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None
        
        analytics = AnalyticsService(company, user)
        insights = analytics.get_smart_insights(start_date, end_date)
        
        return Response({'success': True, 'insights': insights})
    except ValueError as e:
        return Response({'error': f'Invalid date format: {str(e)}'}, status=400)


@api_view(['GET'])
def get_dashboard_summary(request):
    """
    GET /api/analytics/dashboard-summary/
    ?start_date=2026-03-04&end_date=2026-04-03
    
    Returns summary KPIs for dashboard header
    """
    user = request.user
    company = _user_company(user)
    
    if not company:
        return Response({'error': 'No company'}, status=400)
    
    try:
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None
        
        analytics = AnalyticsService(company, user)
        summary = analytics.get_dashboard_summary(start_date, end_date)
        
        return Response({'success': True, 'summary': summary})
    except ValueError as e:
        return Response({'error': f'Invalid date format: {str(e)}'}, status=400)


class MarketFishPriceViewSet(TenantObjectPermission, QuerysetProtectionMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing market fish prices.
    Includes operations for bulk uploading price data, and retrieving analytics
    and price suggestions.
    """
    queryset = MarketFishPrice.objects.all()
    serializer_class = MarketFishPriceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['fish', 'city', 'source']
    search_fields = ['fish__name', 'market_name', 'city']
    ordering_fields = ['recorded_at', 'price_per_kg']
    ordering = ['-recorded_at']

    def get_queryset(self):
        """
        Return the list of items for this view.
        """
        user = self.request.user
        company = _user_company(user)
        if company:
            from django.db.models import Q
            return MarketFishPrice.objects.filter(Q(company=company) | Q(company__isnull=True, is_global=True))
        return MarketFishPrice.objects.filter(company__isnull=True, is_global=True)

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        # Block tenant mutations on global objects
        if request.method in ['PUT', 'PATCH', 'DELETE']:
            if obj.is_global and not request.user.is_superuser:
                self.permission_denied(
                    request,
                    message="You do not have permission to modify global market prices."
                )

    def perform_create(self, serializer):
        """
        Apply company scope to the market price entry unless platform admin creates a global one.
        """
        user = self.request.user
        company = _user_company(user)
        # Check if platform user is creating a global record
        if user.is_superuser and self.request.data.get('is_global') is True:
            serializer.save(company=None, is_global=True)
        else:
            serializer.save(company=company, is_global=False)

    @action(detail=False, methods=['post'], url_path='bulk-upload')
    @transaction.atomic
    def bulk_upload(self, request):
        """
        Bulk upload price data entries for various cities and fish types.
        """
        data = request.data
        if not isinstance(data, list):
            return Response({'error': 'Expected a list of price entries'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        company = _user_company(user)
        
        created_count = 0
        for entry in data:
            fish_id = entry.get('fish_id')
            city = entry.get('city')
            market_name = entry.get('market_name', '')
            price_per_kg = entry.get('price_per_kg')
            source = entry.get('source', 'manual')
            recorded_at = entry.get('recorded_at', timezone.now())
            confidence_score = entry.get('confidence_score', 1.00)
            
            try:
                fish = Fish.objects.get(id=fish_id)
                if fish.company != company and not user.is_superuser:
                    continue
                
                is_global = False
                company_to_use = company
                if user.is_superuser and entry.get('is_global') is True:
                    is_global = True
                    company_to_use = None
                    
                MarketFishPrice.objects.create(
                    fish=fish,
                    city=city,
                    market_name=market_name,
                    price_per_kg=Decimal(str(price_per_kg)),
                    source=source,
                    recorded_at=recorded_at,
                    confidence_score=Decimal(str(confidence_score)),
                    company=company_to_use,
                    is_global=is_global
                )
                created_count += 1
            except (Fish.DoesNotExist, ValueError, InvalidOperation):
                # Skip entries with invalid fish, pricing, or formatting
                continue
            except Exception:  # pylint: disable=broad-exception-caught
                # Log unexpected errors but continue bulk processing
                continue
                
        return Response({'success': True, 'message': f'Uploaded {created_count} price entries.'}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='analytics')
    def analytics(self, request):
        """
        Return comprehensive price analytics, including regional comparisons and trends.
        """
        from django.db.models import Avg
        
        today = timezone.localdate()
        seven_days_ago = today - timedelta(days=7)
        thirty_days_ago = today - timedelta(days=30)
        
        base_qs = self.get_queryset()
        
        today_prices = base_qs.filter(recorded_at__date=today).values('fish__name', 'city').annotate(avg_price=Avg('price_per_kg'))
        weekly_trends = base_qs.filter(recorded_at__date__gte=seven_days_ago).values('recorded_at__date', 'fish__name').annotate(avg_price=Avg('price_per_kg')).order_by('recorded_at__date')
        city_comparison = base_qs.filter(recorded_at__date=today).values('fish__name', 'city').annotate(avg_price=Avg('price_per_kg'))
        highest_price_regions = base_qs.filter(recorded_at__date__gte=thirty_days_ago).values('city', 'fish__name').annotate(avg_price=Avg('price_per_kg')).order_by('-avg_price')[:15]
        
        return Response({
            'today_prices': list(today_prices),
            'weekly_trends': list(weekly_trends),
            'city_comparison': list(city_comparison),
            'best_selling_regions': list(highest_price_regions)
        })

    @action(detail=False, methods=['get'], url_path='suggestions')
    def suggestions(self, request):
        """
        Provide AI-driven price suggestions based on market trends and company data.
        """
        user = request.user
        company = _user_company(user)
        if not company:
            return Response({'error': 'Company not associated with user'}, status=status.HTTP_400_BAD_REQUEST)
            
        from services.trading.ai_engine import AISuggestionEngine
        engine = AISuggestionEngine(company, user)
        suggestions = engine.generate_suggestions()
        return Response(suggestions)


class StockMovementViewSet(TenantObjectPermission, QuerysetProtectionMixin, viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing historical stock movements (purchases, sales, movements).
    """
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['fish', 'purchase_batch', 'movement_type']
    search_fields = ['fish__name', 'purchase_batch__batch_number', 'notes']
    ordering_fields = ['timestamp', 'quantity_packages']
    ordering = ['-timestamp']

    def get_queryset(self):
        """
        Return stock movements scoped to the current tenant.
        """
        return _scoped_queryset(self.request, StockMovement).select_related('fish', 'purchase_batch', 'tenant')


class WhatsAppConfigViewSet(TenantObjectPermission, QuerysetProtectionMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing company WhatsApp API configurations and templates.
    """
    queryset = WhatsAppConfig.objects.all()
    serializer_class = WhatsAppConfigSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Return the WhatsApp configuration for the user's company.
        """
        user = self.request.user
        company = _user_company(user)
        return WhatsAppConfig.objects.filter(company=company)

    def perform_create(self, serializer):
        """
        Automatically associate the configuration with the user's company.
        """
        user = self.request.user
        company = _user_company(user)
        serializer.save(company=company)


class WhatsAppMessageLogViewSet(TenantObjectPermission, QuerysetProtectionMixin, viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for auditing sent WhatsApp messages and their delivery status.
    """
    queryset = WhatsAppMessageLog.objects.all()
    serializer_class = WhatsAppMessageLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'message_type']
    search_fields = ['recipient', 'message_body', 'error_message']
    ordering_fields = ['created_at', 'sent_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Return message logs scoped to the user's company.
        """
        user = self.request.user
        company = _user_company(user)
        return WhatsAppMessageLog.objects.filter(company=company)


class VoiceParserAPIView(APIView):
    """
    AI-powered voice-to-trade parser.
    Translates natural language descriptions of fish purchases into structured data.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Process transcribed text and extract trading entities using regex and fuzzy matching.
        """
        text = request.data.get('text', '').strip()
        
        if not text:
            return Response({'error': 'No text provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        normalized = text.lower()

        pkg_pattern = re.compile(r'(\d+)\s*(box|boxes|பெட்டி|மூட்டை|bag|bags|pkg|வடை|பேக்)')
        pkg_match = pkg_pattern.search(normalized)
        packages = int(pkg_match.group(1)) if pkg_match else None

        price_pattern = re.compile(r'(rate|price|விலை|ரூபாய்|ரூவா|rs|rupee|rupees|ruba|ruva|rooba)\s*(\d+)|(\d+)\s*(rate|price|விலை|ரூபாய்|ரூவா|rs|rupee|rupees|ruba|ruva|rooba)')
        price_match = price_pattern.search(normalized)
        price_per_kg = None
        if price_match:
            price_per_kg = float(price_match.group(2) or price_match.group(3))
        else:
            rate_search = re.search(r'(?:rate|price|விலை|ரூபாய்|ரூவா|rs|rupee|rupees|ruba|ruva|rooba)\D*(\d+)', normalized)
            if rate_search:
                price_per_kg = float(rate_search.group(1))

        weight_pattern = re.compile(r'(\d+(?:\.\d+)?)\s*(kilo|kg|கிலோ|கிகி)')
        weight_match = weight_pattern.search(normalized)
        package_weight = float(weight_match.group(1)) if weight_match else 37.00

        ice_pattern = re.search(r'(?:ice|ஐஸ்)\D*(\d+)', normalized)
        ice_cost = float(ice_pattern.group(1)) if ice_pattern else 0.0

        transport_pattern = re.search(r'(?:transport|வண்டி|vandi|வண்டி வாடகை|வாடகை|carriage)\D*(\d+)', normalized)
        transport_cost = float(transport_pattern.group(1)) if transport_pattern else 0.0

        labour_pattern = re.search(r'(?:labour|கூலி|coolie|labor|ஏத்து|labor)\D*(\d+)', normalized)
        labour_cost = float(labour_pattern.group(1)) if labour_pattern else 0.0

        commission_pattern = re.search(r'(?:commission|கமிஷன்|கமிசன்)\D*(\d+)', normalized)
        commission_cost = float(commission_pattern.group(1)) if commission_pattern else 0.0

        other_pattern = re.search(r'(?:other|இதர|செலவு|others)\D*(\d+)', normalized)
        other_cost = float(other_pattern.group(1)) if other_pattern else 0.0

        company = _user_company(request.user)
        fishes = Fish.objects.filter(company=company, is_deleted=False) if company else Fish.objects.none()
        matched_fish = None
        
        for f in fishes:
            fish_name = (f.name or '').lower()
            tamil_map = {
                'vanjaram': ['வஞ்சரம்', 'vanjaram', 'seer'],
                'nethili': ['நெத்திலி', 'nethili', 'anchovy'],
                'sankara': ['சங்கரா', 'sankara', 'red snapper'],
                'kanangeluthi': ['கானாங்கெளுத்தி', 'mackerel', 'kanangeluthi'],
                'mathi': ['மத்தி', 'sardine', 'mathi'],
            }
            aliases = tamil_map.get(fish_name, [fish_name])
            if any(alias in normalized for alias in aliases):
                matched_fish = f
                break

        matched_supplier = None
        matched_buyer = None
        
        suppliers = Supplier.objects.filter(company=company, is_deleted=False) if company else Supplier.objects.none()
        for s in suppliers:
            if s.name.lower() in normalized:
                matched_supplier = s
                break

        buyers = Buyer.objects.filter(company=company, is_deleted=False) if company else Buyer.objects.none()
        for b in buyers:
            if b.name.lower() in normalized:
                matched_buyer = b
                break

        confidence = 1.0
        missing_fields = []
        next_prompt = ""

        if not matched_fish:
            confidence -= 0.3
            missing_fields.append("fish_name")
            next_prompt = "Enna meen (fish name) வாங்கினீங்க?"
        
        if not packages:
            confidence -= 0.2
            missing_fields.append("packages")
            if not next_prompt:
                next_prompt = "Ethana box (quantity) வாங்கினீங்க?"
                
        if not price_per_kg:
            confidence -= 0.2
            missing_fields.append("price")
            if not next_prompt:
                next_prompt = "Rate / price per kg sollunga"

        if confidence < 0.3:
            confidence = 0.3
            
        if not next_prompt and confidence >= 0.8:
            next_prompt = "Save purchase ah?"

        return Response({
            'success': True,
            'text': text,
            'entities': {
                'fish_id': getattr(matched_fish, 'id', None),
                'fish_name': getattr(matched_fish, 'name', None),
                'packages': packages,
                'package_weight': package_weight,
                'price_per_kg': price_per_kg,
                'labour_cost': labour_cost,
                'ice_cost': ice_cost,
                'transport_cost': transport_cost,
                'commission_cost': commission_cost,
                'other_cost': other_cost,
                'supplier_id': getattr(matched_supplier, 'id', None),
                'supplier_name': getattr(matched_supplier, 'name', None),
                'buyer_id': getattr(matched_buyer, 'id', None),
                'buyer_name': getattr(matched_buyer, 'name', None),
            },
            'confidence_score': round(confidence, 2),
            'missing_fields': missing_fields,
            'next_prompt': next_prompt,
        })
