from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Sum
from decimal import Decimal
from datetime import timedelta

from .models import DashboardManager
from trading.models import Sale, Inventory, Fish, Buyer, Supplier, PurchaseBatch
from accounts.permissions import (
    IsPlatformOperator, CanViewFinancials, IsTenantUser, HasAnyRole
)


def _tenant_scope_kwargs(user):
    if user.is_superuser:
        return {}
    if user.is_platform_user:
        return {'pk__isnull': True}
    if user.company_id:
        return {'company': user.company}
    return {'tenant': user}


class RoleRestrictedAPIView(APIView):
    """APIView helper for role-flag based access checks."""
    role_flags = ()

    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasAnyRole(*self.role_flags)]


class FinancialOverviewView(APIView):
    """
    Get complete financial overview - all KPI cards
    Used for Main Dashboard (Owner View)
    
    Permissions:
    - TenantAdmin: Full financial overview
    - PlatformMaintainer: Can view tenant financials
    - SalesStaff/StoreAccounts: Not allowed
    """
    permission_classes = [permissions.IsAuthenticated, IsTenantUser]
    
    def get(self, request):
        user = request.user
        if user.is_platform_user:
            return Response(
                {'error': 'Platform users cannot access tenant business dashboards directly.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Trader sees a sales-focused company view.
        if user.is_sales_staff:
            data = DashboardManager.get_today_summary(user)
            return Response({
                'role': 'trader',
                'today_sales': data.get('total_sales_amount', 0),
                'sale_count': data.get('sale_count', 0),
                'pending_sales_amount': data.get('pending_sales_amount', 0),
                'message': 'Sales-focused dashboard view'
            })

        # Store sees a purchase and stock-focused company view.
        if user.is_store_accounts:
            summary = DashboardManager.get_today_summary(user)
            inventory = DashboardManager.get_inventory_overview(user)
            return Response({
                'role': 'store',
                'today_purchases': summary.get('total_purchase_amount', 0),
                'purchase_count': summary.get('purchase_count', 0),
                'total_packages': inventory.get('total_packages', 0),
                'low_stock_items': inventory.get('low_stock_items', []),
                'message': 'Inventory-focused dashboard view'
            })

        if user.is_tenant_admin or user.is_accountant:
            data = DashboardManager.get_financial_overview(request.user)
            return Response(data)

        return Response(
            {'error': 'Access denied'},
            status=status.HTTP_403_FORBIDDEN
        )


class SalesTrendView(RoleRestrictedAPIView):
    """Get sales trend for last N days with optional filters"""
    role_flags = ('is_tenant_admin', 'is_accountant', 'is_sales_staff')
    
    def get(self, request):
        days = int(request.query_params.get('days', 7))
        if days > 90:
            days = 90  # Limit to 90 days max
        
        # Extract filter parameters
        filters = {
            'date_from': request.query_params.get('date_from'),
            'date_to': request.query_params.get('date_to'),
            'fish_type': request.query_params.get('fish_type'),
            'buyer': request.query_params.get('buyer'),
            'supplier': request.query_params.get('supplier'),
            'batch_id': request.query_params.get('batch_id'),
            'payment_status': request.query_params.get('payment_status'),
        }
        
        data = DashboardManager.get_sales_trend(request.user, days, filters)
        return Response(data)


class MonthlyRevenueComparisonView(APIView):
    """Compare revenue across last N months"""
    permission_classes = [permissions.IsAuthenticated, CanViewFinancials]
    
    def get(self, request):
        months = int(request.query_params.get('months', 6))
        if months > 12:
            months = 12
        data = DashboardManager.get_monthly_revenue_comparison(request.user, months)
        return Response(data)


class ProfitMarginTrendView(APIView):
    """Get profit margin trend for last N days"""
    permission_classes = [permissions.IsAuthenticated, CanViewFinancials]
    
    def get(self, request):
        days = int(request.query_params.get('days', 30))
        data = DashboardManager.get_profit_margin_trend(request.user, days)
        return Response(data)


class TopBuyersView(RoleRestrictedAPIView):
    """Get top N buyers by revenue"""
    role_flags = ('is_tenant_admin', 'is_accountant', 'is_sales_staff')
    
    def get(self, request):
        limit = int(request.query_params.get('limit', 5))
        data = DashboardManager.get_top_buyers(request.user, limit)
        return Response(data)


class TopFishView(RoleRestrictedAPIView):
    """Get top N fish by sales volume"""
    role_flags = ('is_tenant_admin', 'is_accountant', 'is_sales_staff')
    
    def get(self, request):
        limit = int(request.query_params.get('limit', 5))
        data = DashboardManager.get_top_fish_by_sales(request.user, limit)
        return Response(data)


class SalesByPaymentMethodView(APIView):
    """Get sales breakdown by payment method"""
    permission_classes = [permissions.IsAuthenticated, CanViewFinancials]
    
    def get(self, request):
        data = DashboardManager.get_sales_by_payment_method(request.user)
        return Response(data)


class InventoryOverviewView(RoleRestrictedAPIView):
    """Get complete inventory overview"""
    role_flags = ('is_tenant_admin', 'is_accountant', 'is_sales_staff', 'is_store_accounts')
    
    def get(self, request):
        data = DashboardManager.get_inventory_overview(request.user)
        return Response(data)


class InventoryByCategoryView(RoleRestrictedAPIView):
    """Get inventory breakdown by fish category"""
    role_flags = ('is_tenant_admin', 'is_accountant', 'is_sales_staff', 'is_store_accounts')
    
    def get(self, request):
        data = DashboardManager.get_inventory_by_category(request.user)
        return Response(data)


class BatchProfitMarginView(APIView):
    """Get profit margin by batch"""
    permission_classes = [permissions.IsAuthenticated, CanViewFinancials]
    
    def get(self, request):
        data = DashboardManager.get_batch_profit_margin(request.user)
        return Response(data)


class PaymentCashflowView(APIView):
    """Get cash flow data for last N days"""
    permission_classes = [permissions.IsAuthenticated, CanViewFinancials]
    
    def get(self, request):
        days = int(request.query_params.get('days', 30))
        data = DashboardManager.get_payment_cashflow(request.user, days)
        return Response(data)


class PaymentSummaryView(APIView):
    """Get payment summary"""
    permission_classes = [permissions.IsAuthenticated, CanViewFinancials]
    
    def get(self, request):
        data = DashboardManager.get_payment_summary(request.user)
        return Response(data)


class CreditCustomersView(APIView):
    """Get credit customers with pending payments"""
    permission_classes = [permissions.IsAuthenticated, CanViewFinancials]
    
    def get(self, request):
        limit = int(request.query_params.get('limit', 10))
        data = DashboardManager.get_credit_customers(request.user, limit)
        return Response(data)


class OperationalDashboardView(APIView):
    """Get daily operational data"""
    permission_classes = [permissions.IsAuthenticated, IsTenantUser]
    
    def get(self, request):
        data = DashboardManager.get_operational_dashboard(request.user)
        return Response(data)


class RiskAlertsView(APIView):
    """Get all risk alerts for the tenant"""
    permission_classes = [permissions.IsAuthenticated, IsTenantUser]
    
    def get(self, request):
        data = DashboardManager.get_risk_alerts(request.user)
        return Response(data)


class AdminDashboardView(APIView):
    """Get platform-wide admin dashboard (platform operator only)
    
    Permissions:
    - Platform Operator only
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def get(self, request):
        # Platform operators can access this
        if not request.user.is_platform_operator:
            return Response(
                {'error': 'Access denied. Platform operator only.'},
                status=status.HTTP_403_FORBIDDEN
            )
        data = DashboardManager.get_admin_dashboard(request.user)
        return Response(data)


# Legacy Views (for backward compatibility)
class TodaySummaryView(APIView):
    """Get today's summary - total purchase, sales, profit"""
    permission_classes = [permissions.IsAuthenticated, IsTenantUser]
    
    def get(self, request):
        summary = DashboardManager.get_today_summary(request.user)
        return Response(summary)


class MonthlySummaryView(RoleRestrictedAPIView):
    """Get monthly summary for a specific year/month"""
    role_flags = ('is_tenant_admin', 'is_accountant', 'is_sales_staff', 'is_store_accounts')
    
    def get(self, request):
        year = request.query_params.get('year', timezone.now().year)
        month = request.query_params.get('month', timezone.now().month)
        
        try:
            year = int(year)
            month = int(month)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid year or month'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        summary = DashboardManager.get_monthly_summary(year, month, request.user)
        return Response(summary)


class YearlySummaryView(RoleRestrictedAPIView):
    """Get yearly summary with monthly breakdown"""
    role_flags = ('is_tenant_admin', 'is_accountant', 'is_sales_staff', 'is_store_accounts')
    
    def get(self, request):
        year = request.query_params.get('year', timezone.now().year)
        
        try:
            year = int(year)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid year'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        summary = DashboardManager.get_yearly_summary(year, request.user)
        return Response(summary)


class ProfitByPurchaseTypeView(APIView):
    """Get profit breakdown by purchase type (boat, auction, bucket)"""
    permission_classes = [permissions.IsAuthenticated, CanViewFinancials]
    
    def get(self, request):
        data = DashboardManager.get_profit_by_purchase_type(request.user)
        return Response(data)


class ProfitByPlaceView(APIView):
    """Get profit breakdown by place of buying"""
    permission_classes = [permissions.IsAuthenticated, CanViewFinancials]
    
    def get(self, request):
        data = DashboardManager.get_profit_by_place(request.user)
        return Response(data)


class ProfitByFishermanView(APIView):
    """Get profit breakdown by fisherman"""
    permission_classes = [permissions.IsAuthenticated, CanViewFinancials]
    
    def get(self, request):
        data = DashboardManager.get_profit_by_fisherman(request.user)
        return Response(data)


class ProfitByFishTypeView(APIView):
    """Get profit breakdown by fish type"""
    permission_classes = [permissions.IsAuthenticated, CanViewFinancials]
    
    def get(self, request):
        data = DashboardManager.get_profit_by_fish_type(request.user)
        return Response(data)


class PendingPaymentsView(APIView):
    """Get pending payments summary"""
    permission_classes = [permissions.IsAuthenticated, CanViewFinancials]
    
    def get(self, request):
        data = DashboardManager.get_pending_payments(request.user)
        return Response(data)


class DashboardOverviewView(APIView):
    """Get complete dashboard overview - combines all key metrics"""
    permission_classes = [permissions.IsAuthenticated, CanViewFinancials]
    
    def get(self, request):
        user = request.user
        today = DashboardManager.get_today_summary(user)
        pending = DashboardManager.get_pending_payments(user)
        
        # Get current month and year summaries
        current_month = DashboardManager.get_monthly_summary(None, None, user)
        current_year = DashboardManager.get_yearly_summary(None, user)
        
        # Get top performers
        top_fish = DashboardManager.get_profit_by_fish_type(user)[:5]
        top_fishermen = DashboardManager.get_profit_by_fisherman(user)[:5]
        top_places = DashboardManager.get_profit_by_place(user)[:5]
        
        return Response({
            'today': today,
            'current_month': current_month,
            'current_year': {
                'year': current_year['year'],
                'total_purchase_amount': current_year['total_purchase_amount'],
                'total_sales_amount': current_year['total_sales_amount'],
                'total_profit': current_year['total_profit'],
                'purchase_count': current_year['purchase_count'],
                'sale_count': current_year['sale_count'],
            },
            'pending_payments': pending,
            'top_performers': {
                'fish_types': top_fish,
                'fishermen': top_fishermen,
                'places': top_places,
            }
        })


# ============================================================
# NEW DASHBOARD APIs - Role-based Visual Dashboard
# ============================================================

class TenantAdminDashboardView(APIView):
    """
    Get consolidated dashboard data for Tenant Admin.
    Returns all 5 visual components as specified:
    - Pie Chart: Sales by Fish Type
    - Donut Chart: Payment Status
    - Line Graph: Sales Trend (last 7 days)
    - Bar Graph: Purchase vs Sales
    - KPI Cards: Today Sales, Today Profit, Receivables, Inventory Value
    """
    permission_classes = [permissions.IsAuthenticated, CanViewFinancials]
    
    def get(self, request):
        user = request.user
        scope = _tenant_scope_kwargs(user)
        
        # Extract filter parameters
        filters = {
            'date_from': request.query_params.get('date_from'),
            'date_to': request.query_params.get('date_to'),
            'fish_type': request.query_params.get('fish_type'),
            'buyer': request.query_params.get('buyer'),
            'supplier': request.query_params.get('supplier'),
            'batch_id': request.query_params.get('batch_id'),
            'payment_status': request.query_params.get('payment_status'),
        }
        
        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None}
        
        # Get all required data
        today = timezone.now().date()
        
        # KPI Cards
        today_sales = Sale.objects.filter(date=today, **scope)
        today_sales_amount = today_sales.aggregate(total=Sum('total_revenue'))['total'] or Decimal('0.00')
        today_profit = today_sales.aggregate(total=Sum('profit'))['total'] or Decimal('0.00')
        
        # Receivables (pending payments)
        receivables = Sale.objects.filter(
            **scope,
            pending_amount__gt=0
        ).aggregate(total=Sum('pending_amount'))['total'] or Decimal('0.00')
        
        # Inventory Value
        inventory_value = Decimal('0.00')
        inventories = Inventory.objects.filter(remaining_packages__gt=0, **scope)
        for inv in inventories:
            if inv.purchase_batch:
                cost = inv.purchase_batch.cost_per_package or Decimal('0.00')
                inventory_value += inv.remaining_packages * cost
        
        # Pie Chart: Sales by Fish Type
        top_fish = DashboardManager.get_top_fish_by_sales(user, 10)
        
        # Donut Chart: Payment Status
        payment_status = DashboardManager.get_sales_by_payment_method(user)
        
        # Line Graph: Sales Trend (last 7 days)
        sales_trend = DashboardManager.get_sales_trend(user, 7, filters)
        
        # Bar Graph: Purchase vs Sales (last 6 months)
        monthly_data = DashboardManager.get_monthly_revenue_comparison(user, 6)
        
        # Risk Alerts: Expiring Batches
        expiry_threshold = today + timedelta(days=3)
        expiring_batches = Inventory.objects.filter(
            **scope,
            expiry_date__isnull=False,
            expiry_date__lte=expiry_threshold,
            expiry_date__gte=today,
            remaining_packages__gt=0
        ).values('fish__name', 'purchase_batch__batch_number', 'expiry_date', 'remaining_packages')[:5]
        
        return Response({
            'role': 'tenant_admin',
            'kpi': {
                'today_sales': today_sales_amount,
                'today_profit': today_profit,
                'receivables': receivables,
                'inventory_value': inventory_value,
            },
            'pie_chart': {
                'title': 'Sales by Fish Type',
                'data': top_fish,
            },
            'donut_chart': {
                'title': 'Payment Status',
                'data': payment_status,
            },
            'line_chart': {
                'title': 'Sales Trend (Last 7 Days)',
                'data': sales_trend,
            },
            'bar_chart': {
                'title': 'Purchase vs Sales (Monthly)',
                'data': monthly_data,
            },
            'alerts': {
                'expiring_batches': list(expiring_batches),
                'expiring_count': len(list(expiring_batches)),
            },
            'applied_filters': filters,
        })


class BatchSpecificDashboardView(APIView):
    """
    Get dashboard data filtered by a specific purchase batch.
    Returns:
    - Sales from that batch
    - Profit from that batch
    - Remaining stock
    - Expiry status
    """
    permission_classes = [permissions.IsAuthenticated, CanViewFinancials]
    
    def get(self, request):
        batch_id = request.query_params.get('batch_id')
        
        if not batch_id:
            return Response(
                {'error': 'batch_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            batch_id = int(batch_id)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid batch_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from trading.models import PurchaseBatch
        
        # Get batch (with tenant check)
        user = request.user
        scope = _tenant_scope_kwargs(user)
        try:
            batch = PurchaseBatch.objects.get(id=batch_id, **scope)
        except PurchaseBatch.DoesNotExist:
            return Response(
                {'error': 'Batch not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Sales from this batch
        sales = Sale.objects.filter(batch=batch)
        total_revenue = sales.aggregate(total=Sum('total_revenue'))['total'] or Decimal('0.00')
        total_profit = sales.aggregate(total=Sum('profit'))['total'] or Decimal('0.00')
        total_packages_sold = sales.aggregate(total=Sum('number_of_packages_sold'))['total'] or 0
        sale_count = sales.count()
        
        # Remaining stock
        remaining_packages = batch.get_remaining_packages()
        
        # Expiry status
        today = timezone.now().date()
        expiry_status = 'active'
        days_until_expiry = None
        
        expiry_date = batch.estimated_expiry_date
        if expiry_date:
            if expiry_date < today:
                expiry_status = 'expired'
            elif expiry_date <= today + timedelta(days=3):
                expiry_status = 'expiring_soon'
                days_until_expiry = (expiry_date - today).days
        
        return Response({
            'batch': {
                'id': batch.id,
                'batch_number': batch.batch_number,
                'fish_name': batch.fish.name if batch.fish else None,
                'purchase_date': batch.date,
                'expiry_date': expiry_date,
            },
            'sales': {
                'total_revenue': total_revenue,
                'total_profit': total_profit,
                'packages_sold': total_packages_sold,
                'sale_count': sale_count,
            },
            'stock': {
                'remaining_packages': remaining_packages,
                'total_packages': batch.number_of_packages,
                'sold_percentage': ((batch.number_of_packages - remaining_packages) / batch.number_of_packages * 100) if batch.number_of_packages > 0 else 0,
            },
            'expiry': {
                'status': expiry_status,
                'days_until_expiry': days_until_expiry,
            },
        })


class FilterOptionsView(APIView):
    """
    Get available filter options for the dashboard.
    Returns lists of fish types, buyers, suppliers, and batches.
    """
    permission_classes = [permissions.IsAuthenticated, IsTenantUser]
    
    def get(self, request):
        user = request.user
        scope = _tenant_scope_kwargs(user)
        
        # Fish types
        fish_types = Fish.objects.filter(is_active=True, **scope).values('id', 'name')[:50]
        
        # Buyers
        buyers = Buyer.objects.filter(is_active=True, **scope).values('id', 'name')[:50]
        
        # Suppliers
        suppliers = Supplier.objects.filter(is_active=True, **scope).values('id', 'name')[:50]
        
        # Purchase Batches (open ones)
        batches = PurchaseBatch.objects.filter(**scope).values(
            'id', 'batch_number', 'fish__name', 'date', 'number_of_packages'
        ).order_by('-date')[:50]
        
        return Response({
            'fish_types': list(fish_types),
            'buyers': list(buyers),
            'suppliers': list(suppliers),
            'batches': list(batches),
        })
