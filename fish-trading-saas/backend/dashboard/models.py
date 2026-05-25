from django.db.models import Sum, Count, F, Q, Min, Case, When, Value, DecimalField
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

from trading.models.purchase_batch import PurchaseBatch
from trading.models.sale import Sale
from trading.models.fish import Fish
from trading.models.inventory import Inventory
from trading.models.buyer import Buyer
from trading.models.supplier import Supplier
from trading.models.payment import Payment
from subscriptions.models import Subscription, SubscriptionTier
from accounts.models import User


class DashboardManager:
    """
    Manager class for dashboard analytics and summaries.
    Provides aggregated data for today, monthly, and yearly views.
    Supports tenant isolation - filters data by current user.
    
    Implements complete dashboard for Fisherp (Fish Trading SaaS):
    - Financial Overview (KPIs)
    - Sales Analytics
    - Inventory Overview
    - Payment & Cash Flow
    - Risk Alerts
    - Operational Dashboard
    - Admin/Superuser Dashboard
    """
    
    @staticmethod
    def _get_tenant_filter(user):
        """Get tenant filter based on user - returns Q object"""
        if user.is_superuser:
            return Q()
        if user.is_platform_user:
            return Q(pk__isnull=True)
        if user.company_id:
            return Q(company=user.company)
        return Q(tenant=user)
    
    @staticmethod
    def _build_filters(filters_dict):
        """
        Build Q object from filter dictionary.
        Supports: date_from, date_to, fish_type, buyer, supplier, batch_id, payment_status
        """
        from datetime import datetime
        
        q = Q()
        
        # Date range filters
        if filters_dict.get('date_from'):
            try:
                if isinstance(filters_dict['date_from'], str):
                    date_from = datetime.strptime(filters_dict['date_from'], '%Y-%m-%d').date()
                else:
                    date_from = filters_dict['date_from']
                q &= Q(date__gte=date_from)
            except (ValueError, TypeError):
                pass
        
        if filters_dict.get('date_to'):
            try:
                if isinstance(filters_dict['date_to'], str):
                    date_to = datetime.strptime(filters_dict['date_to'], '%Y-%m-%d').date()
                else:
                    date_to = filters_dict['date_to']
                q &= Q(date__lte=date_to)
            except (ValueError, TypeError):
                pass
        
        # Fish type filter
        if filters_dict.get('fish_type'):
            q &= Q(batch__fish__id=filters_dict['fish_type'])
        
        # Buyer filter
        if filters_dict.get('buyer'):
            q &= Q(buyer__id=filters_dict['buyer'])
        
        # Supplier filter
        if filters_dict.get('supplier'):
            q &= Q(batch__supplier__id=filters_dict['supplier'])
        
        # Batch filter (critical for purchase batch dashboard)
        if filters_dict.get('batch_id'):
            q &= Q(batch__id=filters_dict['batch_id'])
        
        # Payment status filter
        if filters_dict.get('payment_status'):
            q &= Q(payment_status=filters_dict['payment_status'])
        
        return q
    
    # ============================================================
    # PHASE 1: MVP DASHBOARD - ENHANCED FINANCIAL KPIS
    # ============================================================
    
    @staticmethod
    def get_financial_overview(user=None):
        """
        Get complete financial overview - all KPI cards
        Used for Main Dashboard (Owner View)
        """
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        today = timezone.now().date()
        
        # Today's Sales
        today_sales = Sale.objects.filter(tenant_filter, date=today)
        today_sales_amount = today_sales.aggregate(total=Sum('total_revenue'))['total'] or Decimal('0.00')
        
        # Today's Purchases
        today_purchases = PurchaseBatch.objects.filter(tenant_filter, date=today)
        today_purchase_amount = today_purchases.aggregate(total=Sum('total_expense'))['total'] or Decimal('0.00')
        
        # Today's Profit
        today_profit = today_sales.aggregate(total=Sum('profit'))['total'] or Decimal('0.00')
        
        # Outstanding Receivables (all pending sales)
        outstanding_receivables = Sale.objects.filter(
            tenant_filter, 
            pending_amount__gt=0
        ).aggregate(total=Sum('pending_amount'))['total'] or Decimal('0.00')
        
        # Outstanding Payables (all pending purchases)
        outstanding_payables = PurchaseBatch.objects.filter(
            tenant_filter,
            pending_amount__gt=0
        ).aggregate(total=Sum('pending_amount'))['total'] or Decimal('0.00')
        
        # Net Cash Position (payments received - payments made)
        payments_received = Payment.objects.filter(
            tenant_filter, 
            payment_type__in=['sale', 'credit'],
            date=today
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        payments_made = Payment.objects.filter(
            tenant_filter,
            payment_type__in=['purchase', 'advance'],
            date=today
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        net_cash_position = payments_received - payments_made
        
        # Inventory Value (remaining packages * cost per package) — single DB query
        inventory_value = Inventory.objects.filter(
            tenant_filter,
            purchase_batch__isnull=False,
            remaining_packages__gt=0,
        ).aggregate(
            total=Sum(F('remaining_packages') * F('purchase_batch__cost_per_package'))
        )['total'] or Decimal('0.00')
        
        # Active Buyers Count
        active_buyers_count = Buyer.objects.filter(tenant_filter, is_active=True).count()
        
        # Active Suppliers Count
        active_suppliers_count = Supplier.objects.filter(tenant_filter, is_active=True).count()
        
        return {
            'today_sales': today_sales_amount,
            'today_purchases': today_purchase_amount,
            'today_profit': today_profit,
            'outstanding_receivables': outstanding_receivables,
            'outstanding_payables': outstanding_payables,
            'net_cash_position': net_cash_position,
            'inventory_value': inventory_value,
            'active_buyers_count': active_buyers_count,
            'active_suppliers_count': active_suppliers_count,
            'date': today,
        }
    
    # ============================================================
    # SALES ANALYTICS
    # ============================================================
    
    @staticmethod
    def get_sales_trend(user=None, days=7, filters=None):
        """Get sales trend for last N days with optional filters"""
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days - 1)
        
        # Apply additional filters if provided
        additional_filters = DashboardManager._build_filters(filters or {})
        
        # Single query using TruncDay instead of per-day loop
        rows = (
            Sale.objects.filter(
                tenant_filter,
                additional_filters,
                date__gte=start_date,
                date__lte=end_date,
            )
            .annotate(day=TruncDay('date'))
            .values('day')
            .annotate(
                revenue=Sum('total_revenue'),
                profit=Sum('profit'),
                count=Count('id'),
            )
            .order_by('day')
        )

        # Build a dict for O(1) lookup, then fill gaps with zeros
        row_map = {r['day'] if isinstance(r['day'], date) else r['day'].date(): r for r in rows}
        daily_sales = []
        current_date = start_date
        while current_date <= end_date:
            r = row_map.get(current_date)
            daily_sales.append({
                'date': current_date,
                'revenue': (r['revenue'] or Decimal('0.00')) if r else Decimal('0.00'),
                'profit': (r['profit'] or Decimal('0.00')) if r else Decimal('0.00'),
                'count': (r['count'] or 0) if r else 0,
            })
            current_date += timedelta(days=1)

        return daily_sales
    
    @staticmethod
    def get_monthly_revenue_comparison(user=None, months=6):
        """Compare revenue across last N months"""
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        
        monthly_data = []
        current_date = timezone.now()
        
        for i in range(months - 1, -1, -1):
            # Calculate month
            target_date = current_date - timedelta(days=30 * i)
            year = target_date.year
            month = target_date.month
            
            sales = Sale.objects.filter(
                tenant_filter,
                date__year=year,
                date__month=month
            ).aggregate(
                revenue=Sum('total_revenue'),
                profit=Sum('profit'),
                count=Count('id')
            )
            
            monthly_data.append({
                'year': year,
                'month': month,
                'month_name': target_date.strftime('%b'),
                'revenue': sales['revenue'] or Decimal('0.00'),
                'profit': sales['profit'] or Decimal('0.00'),
                'count': sales['count'] or 0,
            })
        
        return monthly_data
    
    @staticmethod
    def get_profit_margin_trend(user=None, days=30):
        """Get profit margin trend for last N days"""
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days - 1)
        
        # Single query using TruncDay instead of per-day loop
        rows = (
            Sale.objects.filter(tenant_filter, date__gte=start_date, date__lte=end_date)
            .annotate(day=TruncDay('date'))
            .values('day')
            .annotate(revenue=Sum('total_revenue'), profit=Sum('profit'))
            .order_by('day')
        )

        row_map = {r['day'].date() if r['day'] else None: r for r in rows}
        daily_margins = []
        current_date = start_date
        while current_date <= end_date:
            r = row_map.get(current_date)
            revenue = (r['revenue'] or Decimal('0.00')) if r else Decimal('0.00')
            profit = (r['profit'] or Decimal('0.00')) if r else Decimal('0.00')
            margin_percent = (profit / revenue * 100) if revenue > 0 else Decimal('0.00')
            daily_margins.append({
                'date': current_date,
                'margin_percent': margin_percent,
                'revenue': revenue,
                'profit': profit,
            })
            current_date += timedelta(days=1)

        return daily_margins
    
    @staticmethod
    def get_top_buyers(user=None, limit=5):
        """Get top N buyers by revenue"""
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        
        buyers = Sale.objects.filter(tenant_filter).values(
            'buyer__id', 'buyer__name'
        ).annotate(
            total_revenue=Sum('total_revenue'),
            total_profit=Sum('profit'),
            order_count=Count('id'),
            pending_amount=Sum('pending_amount')
        ).order_by('-total_revenue')[:limit]
        
        return list(buyers)
    
    @staticmethod
    def get_top_fish_by_sales(user=None, limit=5):
        """Get top N fish by sales volume"""
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        
        fish_sales = Sale.objects.filter(tenant_filter).values(
            'batch__fish__id', 'batch__fish__name'
        ).annotate(
            total_revenue=Sum('total_revenue'),
            total_profit=Sum('profit'),
            packages_sold=Sum('number_of_packages_sold'),
            weight_sold=Sum(F('selling_weight_per_package') * F('number_of_packages_sold')),
            order_count=Count('id')
        ).order_by('-total_revenue')[:limit]
        
        return list(fish_sales)
    
    @staticmethod
    def get_sales_by_payment_method(user=None):
        """Get sales breakdown by actual payment mode (cash, upi, credit, etc.)"""
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()

        result = []
        for mode, label in Payment.PAYMENT_MODE_CHOICES:
            payments = Payment.objects.filter(
                tenant_filter,
                payment_mode=mode,
                payment_type__in=['sale', 'credit'],
            ).aggregate(
                total=Sum('amount'),
                count=Count('id'),
            )

            result.append({
                'payment_mode': mode,
                'label': label,
                'total': payments['total'] or Decimal('0.00'),
                'count': payments['count'] or 0,
            })

        return result
    
    # ============================================================
    # CHART SYSTEM — NEW MVP ENDPOINTS
    # ============================================================

    @staticmethod
    def get_profit_loss_receivable(user=None, days=30, period='day'):
        """
        Profit / Loss / Receivable per time bucket.
        period: 'day', 'week', or 'month'
        Returns [{label, profit, loss, receivable}]
        """
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days - 1)

        trunc_map = {
            'day': TruncDay('date'),
            'week': TruncWeek('date'),
            'month': TruncMonth('date'),
        }
        trunc_fn = trunc_map.get(period, TruncDay('date'))

        buckets = (
            Sale.objects.filter(tenant_filter, date__gte=start_date, date__lte=end_date)
            .annotate(bucket=trunc_fn)
            .values('bucket')
            .annotate(
                total_profit=Sum(Case(
                    When(profit__gt=0, then=F('profit')),
                    default=Value(Decimal('0.00')),
                    output_field=DecimalField(),
                )),
                total_loss=Sum(Case(
                    When(profit__lt=0, then=F('profit')),
                    default=Value(Decimal('0.00')),
                    output_field=DecimalField(),
                )),
                total_receivable=Sum(Case(
                    When(payment_status__in=['pending', 'partial', 'overdue'],
                         then=F('pending_amount')),
                    default=Value(Decimal('0.00')),
                    output_field=DecimalField(),
                )),
            )
            .order_by('bucket')
        )

        result = []
        for row in buckets:
            label = row['bucket'].strftime('%Y-%m-%d') if row['bucket'] else ''
            result.append({
                'label': label,
                'profit': row['total_profit'] or Decimal('0.00'),
                'loss': abs(row['total_loss'] or Decimal('0.00')),
                'receivable': row['total_receivable'] or Decimal('0.00'),
            })
        return result

    @staticmethod
    def get_sold_vs_remaining(user=None):
        """
        Per-fish sold vs remaining packages (active inventory only).
        Returns [{product, sold, remaining}]
        """
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()

        data = (
            Inventory.objects.filter(
                tenant_filter,
                remaining_packages__gte=0,
            )
            .exclude(status='expired')
            .values('fish__name')
            .annotate(
                sold=Sum(F('initial_packages') - F('remaining_packages')),
                remaining=Sum('remaining_packages'),
            )
            .order_by('-sold')
        )

        return [
            {
                'product': row['fish__name'] or 'Unknown',
                'sold': row['sold'] or 0,
                'remaining': row['remaining'] or 0,
            }
            for row in data
        ]

    @staticmethod
    def get_fish_demand_trend(user=None, days=14, limit=5):
        """
        Per-fish daily sales quantity over the last N days.
        Returns [{date, product, sold_qty}]
        """
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days - 1)

        # Find top N fish by total packages sold in the period
        top_fish = (
            Sale.objects.filter(tenant_filter, date__gte=start_date, date__lte=end_date)
            .values('batch__fish__name')
            .annotate(total=Sum('number_of_packages_sold'))
            .order_by('-total')[:limit]
        )
        top_fish_names = [f['batch__fish__name'] for f in top_fish if f['batch__fish__name']]

        if not top_fish_names:
            return []

        # Get daily breakdown for those fish
        rows = (
            Sale.objects.filter(
                tenant_filter,
                date__gte=start_date,
                date__lte=end_date,
                batch__fish__name__in=top_fish_names,
            )
            .values('date', 'batch__fish__name')
            .annotate(sold_qty=Sum('number_of_packages_sold'))
            .order_by('date', 'batch__fish__name')
        )

        return [
            {
                'date': row['date'],
                'product': row['batch__fish__name'],
                'sold_qty': row['sold_qty'] or 0,
            }
            for row in rows
        ]

    # ============================================================
    # INVENTORY OVERVIEW
    # ============================================================
    
    @staticmethod
    def get_inventory_overview(user=None):
        """Get complete inventory overview"""
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        
        # Total stock quantity
        total_packages = Inventory.objects.filter(tenant_filter).aggregate(
            total=Sum('remaining_packages')
        )['total'] or 0
        
        total_weight = Inventory.objects.filter(tenant_filter).aggregate(
            total=Sum('remaining_weight_kg')
        )['total'] or Decimal('0.00')
        
        # Low stock items
        low_stock_items = Inventory.objects.filter(
            tenant_filter,
            status='low_stock'
        ).values('fish__name', 'remaining_packages', 'reorder_level')
        
        # Expiring batches (next 3 days)
        today = timezone.now().date()
        expiry_threshold = today + timedelta(days=3)
        
        expiring_batches = Inventory.objects.filter(
            tenant_filter,
            expiry_date__isnull=False,
            expiry_date__lte=expiry_threshold,
            expiry_date__gte=today,
            remaining_packages__gt=0
        ).values(
            'fish__name',
            'purchase_batch__batch_number',
            'expiry_date',
            'remaining_packages'
        ).order_by('expiry_date')
        
        # Dead stock (no movement in 7 days)
        seven_days_ago = today - timedelta(days=7)
        dead_stock = Inventory.objects.filter(
            tenant_filter,
            remaining_packages__gt=0,
            last_moved_at__lt=seven_days_ago
        ).values('fish__name', 'remaining_packages', 'last_moved_at')
        
        # Inventory value — single DB aggregation instead of Python loop
        inventory_value = Inventory.objects.filter(
            tenant_filter,
            remaining_packages__gt=0,
            purchase_batch__isnull=False,
        ).aggregate(
            total=Sum(F('remaining_packages') * F('purchase_batch__cost_per_package'))
        )['total'] or Decimal('0.00')
        
        return {
            'total_packages': total_packages,
            'total_weight_kg': total_weight,
            'inventory_value': inventory_value,
            'low_stock_items': list(low_stock_items),
            'expiring_batches': list(expiring_batches),
            'dead_stock': list(dead_stock),
        }
    
    @staticmethod
    def get_inventory_by_category(user=None):
        """Get inventory breakdown by fish category — single query"""
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()

        rows = (
            Inventory.objects.filter(tenant_filter, remaining_packages__gt=0)
            .values('fish__category__id', 'fish__category__name')
            .annotate(
                total_packages=Sum('remaining_packages'),
                total_weight=Sum('remaining_weight_kg'),
                item_count=Count('id'),
            )
            .order_by('fish__category__name')
        )

        return [
            {
                'category_id': r['fish__category__id'],
                'category_name': r['fish__category__name'] or 'Uncategorized',
                'total_packages': r['total_packages'] or 0,
                'total_weight': r['total_weight'] or Decimal('0.00'),
                'item_count': r['item_count'] or 0,
            }
            for r in rows
        ]
    
    @staticmethod
    def get_batch_profit_margin(user=None):
        """Get profit margin by batch"""
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        
        batches = PurchaseBatch.objects.filter(
            tenant_filter,
            status__in=['partial', 'paid']
        ).values(
            'batch_number',
            'fish__name',
            'total_expense',
            'date'
        ).annotate(
            revenue=Sum('sales__total_revenue'),
            profit=Sum('sales__profit'),
            packages_sold=Sum('sales__number_of_packages_sold')
        ).order_by('-date')[:20]
        
        result = []
        for batch in batches:
            expense = batch['total_expense'] or Decimal('0.00')
            revenue = batch['revenue'] or Decimal('0.00')
            profit = batch['profit'] or Decimal('0.00')
            margin = (profit / revenue * 100) if revenue > 0 else Decimal('0.00')
            
            result.append({
                'batch_number': batch['batch_number'],
                'fish_name': batch['fish__name'],
                'expense': expense,
                'revenue': revenue,
                'profit': profit,
                'margin_percent': margin,
                'packages_sold': batch['packages_sold'] or 0,
                'date': batch['date'],
            })
        
        return result
    
    # ============================================================
    # PAYMENT & CASH FLOW
    # ============================================================
    
    @staticmethod
    def get_payment_cashflow(user=None, days=30):
        """Get cash flow data for last N days"""
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days - 1)
        
        daily_flow = []
        current_date = start_date
        
        while current_date <= end_date:
            # Payments received (from sales)
            payments_in = Payment.objects.filter(
                tenant_filter,
                payment_type__in=['sale', 'credit'],
                date=current_date
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Payments made (for purchases)
            payments_out = Payment.objects.filter(
                tenant_filter,
                payment_type__in=['purchase', 'advance'],
                date=current_date
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            daily_flow.append({
                'date': current_date,
                'payments_in': payments_in,
                'payments_out': payments_out,
                'net_flow': payments_in - payments_out,
            })
            
            current_date += timedelta(days=1)
        
        return daily_flow
    
    @staticmethod
    def get_payment_summary(user=None):
        """Get payment summary"""
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        today = timezone.now().date()
        
        # Payments received today
        payments_received_today = Payment.objects.filter(
            tenant_filter,
            payment_type__in=['sale', 'credit'],
            date=today
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Pending payments (from sales with pending status)
        pending_sales = Sale.objects.filter(
            tenant_filter,
            payment_status__in=['pending', 'partial', 'overdue']
        ).aggregate(total=Sum('pending_amount'))['total'] or Decimal('0.00')
        
        # Overdue payments
        overdue_payments = Sale.objects.filter(
            tenant_filter,
            payment_status='overdue'
        ).aggregate(
            total=Sum('pending_amount'),
            count=Count('id')
        )
        
        # Supplier payment dues
        supplier_dues = PurchaseBatch.objects.filter(
            tenant_filter,
            pending_amount__gt=0
        ).aggregate(
            total=Sum('pending_amount'),
            count=Count('id')
        )
        
        return {
            'payments_received_today': payments_received_today,
            'pending_sales_amount': pending_sales,
            'overdue_amount': overdue_payments['total'] or Decimal('0.00'),
            'overdue_count': overdue_payments['count'] or 0,
            'supplier_dues_amount': supplier_dues['total'] or Decimal('0.00'),
            'supplier_dues_count': supplier_dues['count'] or 0,
        }
    
    @staticmethod
    def get_credit_customers(user=None, limit=10):
        """Get credit customers with pending payments"""
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        
        customers = Sale.objects.filter(
            tenant_filter,
            pending_amount__gt=0
        ).values(
            'buyer__id',
            'buyer__name',
            'buyer__phone',
            'buyer__credit_limit'
        ).annotate(
            total_pending=Sum('pending_amount'),
            order_count=Count('id'),
            oldest_pending_date=Min('date')
        ).order_by('-total_pending')[:limit]
        
        result = []
        for customer in customers:
            credit_limit = customer['buyer__credit_limit'] or Decimal('0.00')
            pending = customer['total_pending'] or Decimal('0.00')
            
            result.append({
                'buyer_id': customer['buyer__id'],
                'buyer_name': customer['buyer__name'],
                'buyer_phone': customer['buyer__phone'],
                'credit_limit': credit_limit,
                'credit_used': pending,
                'credit_available': credit_limit - pending if credit_limit > 0 else Decimal('0.00'),
                'order_count': customer['order_count'],
                'oldest_pending_date': customer['oldest_pending_date'],
            })
        
        return result
    
    # ============================================================
    # OPERATIONAL DASHBOARD
    # ============================================================
    
    @staticmethod
    def get_operational_dashboard(user=None):
        """Get daily operational data"""
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        today = timezone.now().date()
        
        # Orders to deliver today (sales with pending delivery)
        orders_to_deliver = Sale.objects.filter(
            tenant_filter,
            delivery_status='pending'
        ).exclude(date=today).count()
        
        # Pending purchases (not yet completed)
        pending_purchases = PurchaseBatch.objects.filter(
            tenant_filter,
            status__in=['pending', 'partial']
        ).count()
        
        # Open purchase batches (unsold inventory)
        open_batches = PurchaseBatch.objects.filter(
            tenant_filter
        ).annotate(
            remaining=Sum('number_of_packages') - Sum('sales__number_of_packages_sold')
        ).filter(remaining__gt=0).count()
        
        # Sales waiting for payment
        sales_waiting_payment = Sale.objects.filter(
            tenant_filter,
            payment_status__in=['pending', 'partial', 'overdue']
        ).count()
        
        # Recently added buyers (last 7 days)
        week_ago = today - timedelta(days=7)
        recent_buyers = Buyer.objects.filter(
            tenant_filter,
            created_at__gte=week_ago
        ).count()
        
        # Recently added suppliers (last 7 days)
        recent_suppliers = Supplier.objects.filter(
            tenant_filter,
            created_at__gte=week_ago
        ).count()
        
        return {
            'orders_to_deliver': orders_to_deliver,
            'pending_purchases': pending_purchases,
            'open_purchase_batches': open_batches,
            'sales_waiting_payment': sales_waiting_payment,
            'recent_buyers': recent_buyers,
            'recent_suppliers': recent_suppliers,
        }
    
    # ============================================================
    # RISK ALERTS
    # ============================================================
    
    @staticmethod
    def get_risk_alerts(user=None):
        """Get all risk alerts for the tenant"""
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        today = timezone.now().date()
        
        alerts = []
        
        # 1. Expired inventory
        expired_inventory = Inventory.objects.filter(
            tenant_filter,
            expiry_date__lt=today,
            remaining_packages__gt=0
        ).values('fish__name', 'remaining_packages', 'expiry_date')
        
        if expired_inventory:
            alerts.append({
                'type': 'expired_inventory',
                'severity': 'high',
                'title': 'Expired Inventory',
                'message': f'{expired_inventory.count()} items have expired',
                'items': list(expired_inventory),
            })
        
        # 2. Negative profit sales
        negative_profit_sales = Sale.objects.filter(
            tenant_filter,
            profit__lt=0
        ).values(
            'invoice_number',
            'buyer__name',
            'profit',
            'date'
        ).order_by('date')[:10]
        
        if negative_profit_sales:
            alerts.append({
                'type': 'negative_profit',
                'severity': 'high',
                'title': 'Negative Profit Sales',
                'message': f'{negative_profit_sales.count()} sales have negative profit',
                'items': list(negative_profit_sales),
            })
        
        # 3. Expiring soon inventory (next 3 days)
        expiry_threshold = today + timedelta(days=3)
        expiring_soon = Inventory.objects.filter(
            tenant_filter,
            expiry_date__isnull=False,
            expiry_date__gte=today,
            expiry_date__lte=expiry_threshold,
            remaining_packages__gt=0
        ).values('fish__name', 'expiry_date', 'remaining_packages')
        
        if expiring_soon:
            alerts.append({
                'type': 'expiring_soon',
                'severity': 'medium',
                'title': 'Expiring Soon',
                'message': f'{expiring_soon.count()} batches expiring in 3 days',
                'items': list(expiring_soon),
            })
        
        # 4. Buyer credit limit exceeded
        buyers_over_limit = []
        buyers = Buyer.objects.filter(tenant_filter, credit_limit__gt=0)
        for buyer in buyers:
            pending = buyer.get_total_pending()
            if pending > buyer.credit_limit:
                buyers_over_limit.append({
                    'buyer_name': buyer.name,
                    'credit_limit': buyer.credit_limit,
                    'pending_amount': pending,
                })
        
        if buyers_over_limit:
            alerts.append({
                'type': 'credit_limit_exceeded',
                'severity': 'high',
                'title': 'Credit Limit Exceeded',
                'message': f'{len(buyers_over_limit)} buyers exceeded credit limit',
                'items': buyers_over_limit,
            })
        
        # 5. Supplier unpaid > X days (default 30 days)
        thirty_days_ago = today - timedelta(days=30)
        overdue_suppliers = PurchaseBatch.objects.filter(
            tenant_filter,
            pending_amount__gt=0,
            date__lt=thirty_days_ago
        ).values(
            'supplier__name',
            'pending_amount',
            'date'
        ).order_by('-pending_amount')[:10]
        
        if overdue_suppliers:
            alerts.append({
                'type': 'supplier_overdue',
                'severity': 'medium',
                'title': 'Supplier Payments Overdue',
                'message': f'{overdue_suppliers.count()} payments overdue > 30 days',
                'items': list(overdue_suppliers),
            })
        
        # 6. Low stock alerts
        low_stock = Inventory.objects.filter(
            tenant_filter,
            status='low_stock'
        ).values('fish__name', 'remaining_packages', 'reorder_level')
        
        if low_stock:
            alerts.append({
                'type': 'low_stock',
                'severity': 'medium',
                'title': 'Low Stock Alert',
                'message': f'{low_stock.count()} items are low on stock',
                'items': list(low_stock),
            })
        
        # 7. Overdue sales payments
        overdue_sales = Sale.objects.filter(
            tenant_filter,
            payment_status='overdue'
        ).values(
            'buyer__name',
            'pending_amount',
            'due_date'
        ).order_by('-pending_amount')[:10]
        
        if overdue_sales:
            alerts.append({
                'type': 'overdue_payments',
                'severity': 'high',
                'title': 'Overdue Payments',
                'message': f'{overdue_sales.count()} payments are overdue',
                'items': list(overdue_sales),
            })
        
        return alerts
    
    # ============================================================
    # ADMIN / SUPERUSER DASHBOARD
    # ============================================================
    
    @staticmethod
    def get_admin_dashboard(superuser):
        """Get platform-wide admin dashboard (superuser only)"""
        if not superuser.is_superuser:
            return {'error': 'Access denied. Admin only.'}
        
        today = timezone.now().date()
        month_start = today.replace(day=1)
        
        # Total tenants (users with tenant relationship)
        total_tenants = User.objects.filter(is_superuser=False).count()
        
        # Active subscriptions
        active_subscriptions = Subscription.objects.filter(
            status='active',
            expiry_date__gte=today
        ).count()
        
        # Subscriptions by tier
        tier_breakdown = []
        for tier in SubscriptionTier.objects.all():
            count = Subscription.objects.filter(
                tier=tier,
                status='active',
                expiry_date__gte=today
            ).count()
            
            revenue = Subscription.objects.filter(
                tier=tier,
                status='active'
            ).aggregate(
                total=Sum('total_paid_till_date')
            )['total'] or Decimal('0.00')
            
            tier_breakdown.append({
                'tier_name': tier.name,
                'active_count': count,
                'total_revenue': revenue,
            })
        
        # New registrations this month
        new_registrations = User.objects.filter(
            is_superuser=False,
            date_joined__gte=month_start
        ).count()
        
        # Expired subscriptions
        expired_subscriptions = Subscription.objects.filter(
            expiry_date__lt=today,
            status='active'
        ).count()
        
        # Expiring soon (within 7 days)
        expiry_warning = today + timedelta(days=7)
        expiring_soon = Subscription.objects.filter(
            status='active',
            expiry_date__gte=today,
            expiry_date__lte=expiry_warning
        ).values(
            'tenant__username',
            'tier__name',
            'expiry_date'
        )
        
        # Storage usage (simplified - based on uploads)
        # This would need actual storage tracking in production
        storage_data = []
        subscriptions = Subscription.objects.filter(
            status='active'
        ).select_related('tenant')[:10]
        
        for sub in subscriptions:
            storage_data.append({
                'tenant': sub.tenant.username if sub.tenant else 'Unknown',
                'storage_used_mb': sub.storage_used_mb or Decimal('0.00'),
                'storage_limit_gb': sub.tier.max_storage_gb,
            })
        
        return {
            'total_tenants': total_tenants,
            'active_subscriptions': active_subscriptions,
            'tier_breakdown': tier_breakdown,
            'new_registrations_this_month': new_registrations,
            'expired_subscriptions': expired_subscriptions,
            'expiring_soon': list(expiring_soon),
            'storage_usage': storage_data,
            'date': today,
        }
    
    # ============================================================
    # LEGACY METHODS (For backward compatibility)
    # ============================================================
    
    @staticmethod
    def get_today_summary(user=None):
        """Get summary for today"""
        today = timezone.now().date()
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        
        # Today's purchases
        today_purchases = PurchaseBatch.objects.filter(tenant_filter, date=today)
        total_purchase_amount = today_purchases.aggregate(
            total=Sum('total_expense')
        )['total'] or Decimal('0.00')
        
        total_packages_bought = today_purchases.aggregate(
            total=Sum('number_of_packages')
        )['total'] or 0
        
        # Today's sales
        today_sales = Sale.objects.filter(tenant_filter, date=today)
        total_sales_amount = today_sales.aggregate(
            total=Sum('total_revenue')
        )['total'] or Decimal('0.00')
        
        total_packages_sold = today_sales.aggregate(
            total=Sum('number_of_packages_sold')
        )['total'] or 0
        
        total_profit = today_sales.aggregate(
            total=Sum('profit')
        )['total'] or Decimal('0.00')
        
        # Pending amounts
        pending_purchase = today_purchases.aggregate(
            total=Sum('pending_amount')
        )['total'] or Decimal('0.00')
        
        pending_sales = today_sales.aggregate(
            total=Sum('pending_amount')
        )['total'] or Decimal('0.00')
        
        return {
            'date': today,
            'total_purchase_amount': total_purchase_amount,
            'total_packages_bought': total_packages_bought,
            'total_sales_amount': total_sales_amount,
            'total_packages_sold': total_packages_sold,
            'total_profit': total_profit,
            'pending_purchase_amount': pending_purchase,
            'pending_sales_amount': pending_sales,
            'purchase_count': today_purchases.count(),
            'sale_count': today_sales.count(),
        }
    
    @staticmethod
    def get_monthly_summary(year=None, month=None, user=None):
        """Get summary for a specific month"""
        if year is None:
            year = timezone.now().year
        if month is None:
            month = timezone.now().month
            
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
            
        # Filter by month
        purchases = PurchaseBatch.objects.filter(
            tenant_filter,
            date__year=year,
            date__month=month
        )
        
        sales = Sale.objects.filter(
            tenant_filter,
            date__year=year,
            date__month=month
        )
        
        total_purchase = purchases.aggregate(
            total=Sum('total_expense')
        )['total'] or Decimal('0.00')
        
        total_sales = sales.aggregate(
            total=Sum('total_revenue')
        )['total'] or Decimal('0.00')
        
        total_profit = sales.aggregate(
            total=Sum('profit')
        )['total'] or Decimal('0.00')
        
        return {
            'year': year,
            'month': month,
            'total_purchase_amount': total_purchase,
            'total_sales_amount': total_sales,
            'total_profit': total_profit,
            'purchase_count': purchases.count(),
            'sale_count': sales.count(),
        }
    
    @staticmethod
    def get_yearly_summary(year=None, user=None):
        """Get summary for a specific year"""
        if year is None:
            year = timezone.now().year
            
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
            
        purchases = PurchaseBatch.objects.filter(tenant_filter, date__year=year)
        sales = Sale.objects.filter(tenant_filter, date__year=year)
        
        total_purchase = purchases.aggregate(
            total=Sum('total_expense')
        )['total'] or Decimal('0.00')
        
        total_sales = sales.aggregate(
            total=Sum('total_revenue')
        )['total'] or Decimal('0.00')
        
        total_profit = sales.aggregate(
            total=Sum('profit')
        )['total'] or Decimal('0.00')
        
        # Monthly breakdown
        monthly_data = []
        for month in range(1, 13):
            month_purchases = purchases.filter(date__month=month)
            month_sales = sales.filter(date__month=month)
            
            month_purchase = month_purchases.aggregate(
                total=Sum('total_expense')
            )['total'] or Decimal('0.00')
            
            month_sales_amount = month_sales.aggregate(
                total=Sum('total_revenue')
            )['total'] or Decimal('0.00')
            
            month_profit = month_sales.aggregate(
                total=Sum('profit')
            )['total'] or Decimal('0.00')
            
            monthly_data.append({
                'month': month,
                'purchase_amount': month_purchase,
                'sales_amount': month_sales_amount,
                'profit': month_profit,
            })
        
        return {
            'year': year,
            'total_purchase_amount': total_purchase,
            'total_sales_amount': total_sales,
            'total_profit': total_profit,
            'purchase_count': purchases.count(),
            'sale_count': sales.count(),
            'monthly_breakdown': monthly_data,
        }
    
    @staticmethod
    def get_profit_by_purchase_type(user=None):
        """Get profit breakdown by purchase type (boat, auction, bucket)"""
        from django.db.models import Sum
        
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        
        result = []
        for ptype, label in PurchaseBatch.PURCHASE_TYPE_CHOICES:
            # Get sales linked to batches of this purchase type
            sales = Sale.objects.filter(tenant_filter, batch__purchase_type=ptype)
            
            total_revenue = sales.aggregate(
                total=Sum('total_revenue')
            )['total'] or Decimal('0.00')
            
            total_cost = sales.aggregate(
                total=Sum('total_cost')
            )['total'] or Decimal('0.00')
            
            profit = sales.aggregate(
                total=Sum('profit')
            )['total'] or Decimal('0.00')
            
            result.append({
                'purchase_type': ptype,
                'label': label,
                'total_revenue': total_revenue,
                'total_cost': total_cost,
                'profit': profit,
                'sale_count': sales.count(),
            })
        
        return result
    
    @staticmethod
    def get_profit_by_place(user=None):
        """Get profit breakdown by place of buying"""
        from django.db.models import Sum
        
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        
        places = PurchaseBatch.objects.filter(tenant_filter).exclude(
            place_of_buying__isnull=True
        ).exclude(place_of_buying='').values('place_of_buying').distinct()
        
        result = []
        for place_data in places:
            place = place_data['place_of_buying']
            sales = Sale.objects.filter(tenant_filter, batch__place_of_buying=place)
            
            total_revenue = sales.aggregate(
                total=Sum('total_revenue')
            )['total'] or Decimal('0.00')
            
            profit = sales.aggregate(
                total=Sum('profit')
            )['total'] or Decimal('0.00')
            
            result.append({
                'place': place,
                'total_revenue': total_revenue,
                'profit': profit,
                'sale_count': sales.count(),
            })
        
        # Sort by profit descending
        result.sort(key=lambda x: x['profit'], reverse=True)
        return result
    
    @staticmethod
    def get_profit_by_fisherman(user=None):
        """Get profit breakdown by fisherman"""
        from django.db.models import Sum
        
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        
        fishermen = PurchaseBatch.objects.filter(tenant_filter).exclude(
            fisherman_name__isnull=True
        ).exclude(fisherman_name='').values('fisherman_name').distinct()
        
        result = []
        for fisher_data in fishermen:
            name = fisher_data['fisherman_name']
            sales = Sale.objects.filter(tenant_filter, batch__fisherman_name=name)
            
            total_revenue = sales.aggregate(
                total=Sum('total_revenue')
            )['total'] or Decimal('0.00')
            
            profit = sales.aggregate(
                total=Sum('profit')
            )['total'] or Decimal('0.00')
            
            result.append({
                'fisherman_name': name,
                'total_revenue': total_revenue,
                'profit': profit,
                'sale_count': sales.count(),
            })
        
        # Sort by profit descending
        result.sort(key=lambda x: x['profit'], reverse=True)
        return result
    
    @staticmethod
    def get_profit_by_fish_type(user=None):
        """Get profit breakdown by fish type"""
        from django.db.models import Sum
        
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        
        # Get fish that belong to the tenant
        fish_query = Fish.objects.all()
        if user and not user.is_superuser and not user.is_platform_user:
            if user.company_id:
                fish_query = fish_query.filter(company=user.company)
            else:
                fish_query = fish_query.filter(tenant=user)
        
        result = []
        for fish in fish_query:
            sales = Sale.objects.filter(tenant_filter, batch__fish=fish)
            
            total_revenue = sales.aggregate(
                total=Sum('total_revenue')
            )['total'] or Decimal('0.00')
            
            profit = sales.aggregate(
                total=Sum('profit')
            )['total'] or Decimal('0.00')
            
            result.append({
                'fish_name': fish.name,
                'total_revenue': total_revenue,
                'profit': profit,
                'sale_count': sales.count(),
            })
        
        # Sort by profit descending
        result.sort(key=lambda x: x['profit'], reverse=True)
        return result
    
    @staticmethod
    def get_pending_payments(user=None):
        """Get all pending payments summary"""
        tenant_filter = DashboardManager._get_tenant_filter(user) if user else Q()
        
        # Pending to fishermen (purchase)
        purchase_pending = PurchaseBatch.objects.filter(
            tenant_filter,
            pending_amount__gt=0
        ).aggregate(total=Sum('pending_amount'))['total'] or Decimal('0.00')
        
        # Pending from buyers (sales)
        sales_pending = Sale.objects.filter(
            tenant_filter,
            pending_amount__gt=0
        ).aggregate(total=Sum('pending_amount'))['total'] or Decimal('0.00')
        
        return {
            'pending_to_fishermen': purchase_pending,
            'pending_from_buyers': sales_pending,
            'net_pending': sales_pending - purchase_pending,
        }
