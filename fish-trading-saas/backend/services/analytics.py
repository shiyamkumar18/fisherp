"""
Analytics Service for FisherP Reports
Provides deep business analytics for:
- Profit/Loss tracking
- Demand analysis
- Batch performance
- Payment analysis
- Loss tracking
- Price trends
"""

from django.db.models import Sum, Count, F, DecimalField, Value, Case, When
from django.db.models.functions import TruncDate, Coalesce
from django.utils import timezone
from datetime import timedelta
from trading.models import PurchaseBatch, Sale
from trading.models.inventory import Inventory


class AnalyticsService:
    """Business intelligence service for reports"""
    
    def __init__(self, company, user=None):
        self.company = company
        self.user = user
    
    # ========== 1. PROFIT / LOSS / RECEIVABLE ==========
    def get_profit_loss_data(self, start_date=None, end_date=None):
        """
        Returns: [
            {
                "date": "2026-04-03",
                "profit": 5000.00,
                "loss": 1000.00,
                "receivable": 2000.00
            }
        ]
        Purpose: Shows business health (stacked bar chart)
        """
        if not end_date:
            end_date = timezone.now().date()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Get sales with profit/loss
        sales_data = Sale.objects.filter(
            company=self.company,
            date__gte=start_date,
            date__lte=end_date,
            is_deleted=False
        ).annotate(
            date_only=TruncDate('date'),
            profit_value=Coalesce(F('profit'), Value(0), output_field=DecimalField()),
            loss_value=Case(
                When(profit__lt=0, then=F('profit') * -1),
                default=Value(0),
                output_field=DecimalField()
            ),
            receivable_value=Coalesce(F('pending_amount'), Value(0), output_field=DecimalField())
        ).values('date_only').annotate(
            total_profit=Sum(Case(
                When(profit__gt=0, then=F('profit')),
                default=Value(0),
                output_field=DecimalField()
            )),
            total_loss=Sum(Case(
                When(profit__lt=0, then=F('profit') * -1),
                default=Value(0),
                output_field=DecimalField()
            )),
            total_receivable=Sum('receivable_value')
        ).values('date_only', 'total_profit', 'total_loss', 'total_receivable').order_by('date_only')
        
        result = []
        for item in sales_data:
            result.append({
                'date': str(item['date_only']),
                'profit': float(item['total_profit'] or 0),
                'loss': float(item['total_loss'] or 0),
                'receivable': float(item['total_receivable'] or 0)
            })
        
        return result
    
    # ========== 2. SOLD vs REMAINING ANALYSIS ==========
    def get_sold_vs_remaining(self, start_date=None, end_date=None):
        """
        Returns: [
            {
                "product": "Vanjaram",
                "sold_qty": 250,
                "remaining_qty": 50
            }
        ]
        Purpose: Stock efficiency (stacked bar per product)
        """
        if not end_date:
            end_date = timezone.now().date()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Get inventory status by fish
        inventory_data = Inventory.objects.filter(
            company=self.company,
            batch__date__gte=start_date,
            batch__date__lte=end_date,
            is_deleted=False
        ).values('batch__fish__name').annotate(
            total_initial=Sum('initial_weight_kg'),
            total_remaining=Sum('remaining_weight_kg')
        ).order_by('batch__fish__name')
        
        result = []
        for item in inventory_data:
            sold = (item['total_initial'] or 0) - (item['total_remaining'] or 0)
            result.append({
                'product': item['batch__fish__name'],
                'sold_qty': float(sold),
                'remaining_qty': float(item['total_remaining'] or 0)
            })
        
        return result
    
    # ========== 3. DEMAND TREND ==========
    def get_demand_trend(self, start_date=None, end_date=None, product=None):
        """
        Returns: [
            {
                "date": "2026-04-03",
                "product": "Vanjaram",
                "sold_qty": 25
            }
        ]
        Purpose: What to buy tomorrow? (line chart)
        """
        if not end_date:
            end_date = timezone.now().date()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        sales_qs = Sale.objects.filter(
            company=self.company,
            date__gte=start_date,
            date__lte=end_date,
            is_deleted=False
        )
        
        if product:
            sales_qs = sales_qs.filter(batch__fish__name__icontains=product)
        
        sales_data = sales_qs.values(
            'date',
            'batch__fish__name'
        ).annotate(
            total_weight=Sum('selling_weight_per_package')
        ).order_by('date', 'batch__fish__name')
        
        result = []
        for item in sales_data:
            result.append({
                'date': str(item['date']),
                'product': item['batch__fish__name'],
                'sold_qty': float(item['total_weight'] or 0)
            })
        
        return result
    
    # ========== 4. BATCH PERFORMANCE REPORT ==========
    def get_batch_performance(self, start_date=None, end_date=None, limit=20):
        """
        Returns: [
            {
                "batch_id": "B20260403-01",
                "fish": "Vanjaram",
                "qty": 50,
                "cost": 30000,
                "revenue": 37500,
                "profit": 7500
            }
        ]
        Purpose: Which purchases were good or bad?
        """
        if not end_date:
            end_date = timezone.now().date()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        batches = PurchaseBatch.objects.filter(
            company=self.company,
            date__gte=start_date,
            date__lte=end_date,
            is_deleted=False
        ).select_related('fish')
        
        result = []
        for batch in batches[:limit]:
            # Calculate total revenue from sales
            sales = Sale.objects.filter(batch=batch, is_deleted=False)
            total_revenue = sum(float(s.total_revenue or 0) for s in sales)
            total_cost = float(batch.fish_cost or 0) + float(batch.total_expense or 0)
            profit = total_revenue - total_cost
            
            result.append({
                'batch_id': batch.batch_number,
                'fish': batch.fish.name,
                'qty': float(batch.total_weight or 0),
                'cost': float(total_cost),
                'revenue': float(total_revenue),
                'profit': float(profit),
                'status': batch.status
            })
        
        return sorted(result, key=lambda x: x['profit'], reverse=True)
    
    # ========== 5. LOSS ANALYSIS ==========
    def get_loss_analysis(self, start_date=None, end_date=None):
        """
        Returns: [
            {
                "batch_id": "B102",
                "product": "Vanjaram",
                "loss_amount": 1200.00,
                "reason": "Spoilage/Unsold"
            }
        ]
        Purpose: Track waste (bar/pie chart)
        """
        if not end_date:
            end_date = timezone.now().date()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Get loss-making batches
        batches = PurchaseBatch.objects.filter(
            company=self.company,
            date__gte=start_date,
            date__lte=end_date,
            is_deleted=False
        ).select_related('fish')
        
        result = []
        for batch in batches:
            sales = Sale.objects.filter(batch=batch, is_deleted=False)
            total_revenue = sum(float(s.total_revenue or 0) for s in sales)
            total_cost = float(batch.fish_cost or 0) + float(batch.total_expense or 0)
            
            if total_revenue < total_cost:
                loss = total_cost - total_revenue
                # Determine reason
                remaining = Inventory.objects.filter(
                    batch=batch,
                    is_deleted=False
                ).aggregate(total=Sum('remaining_weight_kg'))['total'] or 0
                
                reason = "Spoilage" if remaining > 0 else "Poor pricing"
                
                result.append({
                    'batch_id': batch.batch_number,
                    'product': batch.fish.name,
                    'loss_amount': float(loss),
                    'reason': reason
                })
        
        return sorted(result, key=lambda x: x['loss_amount'], reverse=True)
    
    # ========== 6. PAYMENT ANALYSIS ==========
    def get_payment_analysis(self, start_date=None, end_date=None):
        """
        Returns: {
            "cash": 25000.00,
            "upi": 15000.00,
            "credit": 10000.00
        }
        Purpose: Cash flow clarity (donut chart)
        """
        if not end_date:
            end_date = timezone.now().date()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        sales = Sale.objects.filter(
            company=self.company,
            date__gte=start_date,
            date__lte=end_date,
            is_deleted=False
        ).aggregate(
            cash=Sum(
                Case(
                    When(payment_status='paid', then=F('amount_received')),
                    default=Value(0),
                    output_field=DecimalField()
                )
            ),
            upi=Sum(
                Case(
                    When(payment_status='paid', then=F('amount_received')),
                    default=Value(0),
                    output_field=DecimalField()
                )
            ),
            credit=Sum('pending_amount')
        )
        
        return {
            'cash': float(sales['cash'] or 0),
            'upi': float(sales['upi'] or 0),
            'credit': float(sales['credit'] or 0)
        }
    
    # ========== 7. PRICE TREND ANALYSIS ==========
    def get_price_trend(self, start_date=None, end_date=None, product=None):
        """
        Returns: [
            {
                "date": "2026-04-03",
                "product": "Vanjaram",
                "cost_price": 600.00,
                "avg_selling_price": 750.00
            }
        ]
        Purpose: When to buy (line chart)
        """
        if not end_date:
            end_date = timezone.now().date()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        batches_qs = PurchaseBatch.objects.filter(
            company=self.company,
            date__gte=start_date,
            date__lte=end_date,
            is_deleted=False
        ).select_related('fish')
        
        if product:
            batches_qs = batches_qs.filter(fish__name__icontains=product)
        
        result = []
        for batch in batches_qs.order_by('date'):
            # Get sales for this batch to calculate selling price
            sales = Sale.objects.filter(batch=batch, is_deleted=False)
            avg_selling_price = 0
            if sales.exists():
                avg_selling = sales.aggregate(
                    avg=Coalesce(Sum('total_revenue'), Value(0)) / Coalesce(Count('id'), Value(1))
                )['avg']
                avg_selling_price = float(avg_selling or 0)
            
            result.append({
                'date': str(batch.date),
                'product': batch.fish.name,
                'cost_price': float(batch.price_per_kg or 0),
                'avg_selling_price': avg_selling_price
            })
        
        return result
    
    # ========== 8. PROFIT TREND (TIME-BASED) ==========
    def get_profit_trend(self, period='daily', start_date=None, end_date=None):
        """
        Returns: [
            {
                "period": "2026-04-03",  # or week/month depending on period
                "profit": 5000.00,
                "transactions": 15
            }
        ]
        Purpose: Growth tracking (line chart)
        """
        if not end_date:
            end_date = timezone.now().date()
        if not start_date:
            start_date = end_date - timedelta(days=90)
        
        sales = Sale.objects.filter(
            company=self.company,
            date__gte=start_date,
            date__lte=end_date,
            is_deleted=False
        )
        
        if period == 'daily':
            group_data = sales.annotate(
                period=TruncDate('date')
            ).values('period').annotate(
                total_profit=Sum(Case(
                    When(profit__gt=0, then=F('profit')),
                    default=Value(0),
                    output_field=DecimalField()
                )),
                transaction_count=Count('id')
            ).order_by('period')
        
        elif period == 'weekly':
            group_data = sales.extra(
                select={'week': 'DATE_TRUNC(\'week\', date)'}
            ).values('week').annotate(
                total_profit=Sum(Case(
                    When(profit__gt=0, then=F('profit')),
                    default=Value(0),
                    output_field=DecimalField()
                )),
                transaction_count=Count('id')
            ).order_by('week')
        
        else:  # monthly
            group_data = sales.extra(
                select={'month': 'DATE_TRUNC(\'month\', date)'}
            ).values('month').annotate(
                total_profit=Sum(Case(
                    When(profit__gt=0, then=F('profit')),
                    default=Value(0),
                    output_field=DecimalField()
                )),
                transaction_count=Count('id')
            ).order_by('month')
        
        result = []
        for item in group_data:
            period_key = 'period' if period == 'daily' else ('week' if period == 'weekly' else 'month')
            result.append({
                'period': str(item[period_key]),
                'profit': float(item['total_profit'] or 0),
                'transactions': item['transaction_count']
            })
        
        return result
    
    # ========== 9. SMART INSIGHTS ==========
    def get_smart_insights(self, start_date=None, end_date=None):
        """
        Returns: [
            "Vanjaram sells 30% more on weekends",
            "Prawn causing losses — reduce purchase",
            "Batch B102 was highly profitable"
        ]
        Purpose: AI-ready insights (becomes AI assistant later)
        """
        if not end_date:
            end_date = timezone.now().date()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        insights = []
        
        # Insight 1: Weekend vs weekday trend
        weekend_sales = Sale.objects.filter(
            company=self.company,
            date__gte=start_date,
            date__lte=end_date,
            is_deleted=False,
            date__week_day__in=[1, 7]  # Sunday, Saturday
        ).aggregate(total=Sum('selling_weight_per_package'))['total'] or 0
        
        weekday_sales = Sale.objects.filter(
            company=self.company,
            date__gte=start_date,
            date__lte=end_date,
            is_deleted=False,
            date__week_day__in=[2, 3, 4, 5, 6]
        ).aggregate(total=Sum('selling_weight_per_package'))['total'] or 0
        
        if weekday_sales > 0:
            weekend_pct = (float(weekend_sales) / (float(weekend_sales) + float(weekday_sales))) * 100
            if weekend_pct > 50:
                insights.append(f"📈 Demand peaks on weekends (~{weekend_pct:.0f}% of sales)")
        
        # Insight 2: Loss-making products
        loss_data = self.get_loss_analysis(start_date, end_date)
        if loss_data:
            top_loss = loss_data[0]
            insights.append(f"⚠️ {top_loss['product']} causing losses (₹{top_loss['loss_amount']:.0f}) — review strategy")
        
        # Insight 3: Best performing batch
        perf_data = self.get_batch_performance(start_date, end_date, limit=1)
        if perf_data and perf_data[0]['profit'] > 0:
            best = perf_data[0]
            insights.append(f"💰 Batch {best['batch_id']} highly profitable (₹{best['profit']:.0f} profit)")
        
        # Insight 4: Payment status
        payment_data = self.get_payment_analysis(start_date, end_date)
        if payment_data['credit'] > payment_data['cash']:
            insights.append("💳 High credit sales — monitor cash flow carefully")
        
        # Insight 5: Stock velocity
        sold_remaining = self.get_sold_vs_remaining(start_date, end_date)
        if sold_remaining:
            avg_sold = sum(item['sold_qty'] for item in sold_remaining) / len(sold_remaining)
            slow_movers = [item['product'] for item in sold_remaining if item['sold_qty'] < avg_sold * 0.5]
            if slow_movers:
                insights.append(f"🐌 Slow movers: {', '.join(slow_movers[:2])} — consider reducing orders")
        
        return insights[:5]  # Return top 5 insights
    
    # ========== 10. SUMMARY DASHBOARD ==========
    def get_dashboard_summary(self, start_date=None, end_date=None):
        """
        Returns comprehensive summary for dashboard header
        """
        if not end_date:
            end_date = timezone.now().date()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Total profit
        profit_data = Sale.objects.filter(
            company=self.company,
            date__gte=start_date,
            date__lte=end_date,
            is_deleted=False
        ).aggregate(
            total_profit=Sum(Case(
                When(profit__gt=0, then=F('profit')),
                default=Value(0)
            )),
            total_loss=Sum(Case(
                When(profit__lt=0, then=F('profit') * -1),
                default=Value(0)
            )),
            total_revenue=Sum('total_revenue'),
            transaction_count=Count('id')
        )
        
        net_profit = float(profit_data['total_profit'] or 0) - float(profit_data['total_loss'] or 0)
        
        return {
            'net_profit': net_profit,
            'gross_revenue': float(profit_data['total_revenue'] or 0),
            'total_transactions': profit_data['transaction_count'],
            'period': f"{start_date} to {end_date}"
        }
