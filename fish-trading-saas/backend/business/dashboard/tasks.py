import logging
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Count, F
from celery import shared_task

from business.trading.models.sale import Sale
from business.trading.models.purchase_batch import PurchaseBatch
from business.trading.models.inventory import Inventory
from saas_platform.companies.models import Company
from business.dashboard.models import DailySalesSummary, DailyPurchaseSummary, DailyInventorySummary

logger = logging.getLogger(__name__)

@shared_task(name='generate_daily_summaries')
def generate_daily_summaries(date_str=None):
    """
    Generate or update daily rollups for Sales, Purchases, and Inventory.
    Defaults to yesterday's date if no date_str is provided.
    date_str format: 'YYYY-MM-DD'
    """
    if date_str:
        from datetime import datetime
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    else:
        # Default to previous day for overnight batch processing
        target_date = timezone.now().date() - timedelta(days=1)
        
    logger.info(f"Generating daily summaries for date: {target_date}")
    
    companies = Company.objects.filter(is_active=True)
    
    for company in companies:
        _generate_sales_summary(company, target_date)
        _generate_purchase_summary(company, target_date)
        _generate_inventory_summary(company, target_date)

def _generate_sales_summary(company, target_date):
    sales = Sale.objects.filter(company=company, date=target_date, is_deleted=False)
    
    agg = sales.aggregate(
        sales_count=Count('id'),
        total_revenue=Sum('total_revenue'),
        total_cost=Sum('total_cost'),
        total_profit=Sum('profit'),
        pending_amount=Sum('pending_amount'),
        total_packages_sold=Sum('number_of_packages_sold'),
        total_weight_sold=Sum(F('number_of_packages_sold') * F('selling_weight_per_package'))
    )
    
    revenue = agg['total_revenue'] or Decimal('0.00')
    profit = agg['total_profit'] or Decimal('0.00')
    margin = (profit / revenue * 100) if revenue > 0 else Decimal('0.00')
    
    DailySalesSummary.objects.update_or_create(
        company=company,
        date=target_date,
        defaults={
            'sales_count': agg['sales_count'] or 0,
            'total_revenue': revenue,
            'total_cost': agg['total_cost'] or Decimal('0.00'),
            'total_profit': profit,
            'pending_amount': agg['pending_amount'] or Decimal('0.00'),
            'avg_margin_percent': margin,
            'total_packages_sold': agg['total_packages_sold'] or 0,
            'total_weight_sold': agg['total_weight_sold'] or Decimal('0.00')
        }
    )

def _generate_purchase_summary(company, target_date):
    purchases = PurchaseBatch.objects.filter(company=company, date=target_date, is_deleted=False)
    
    agg = purchases.aggregate(
        purchase_count=Count('id'),
        total_weight=Sum(F('number_of_packages') * F('package_weight')),
        total_cost=Sum('total_expense'),
        pending_amount=Sum('pending_amount')
    )
    
    DailyPurchaseSummary.objects.update_or_create(
        company=company,
        date=target_date,
        defaults={
            'purchase_count': agg['purchase_count'] or 0,
            'total_weight': agg['total_weight'] or Decimal('0.00'),
            'total_cost': agg['total_cost'] or Decimal('0.00'),
            'pending_amount': agg['pending_amount'] or Decimal('0.00')
        }
    )

def _generate_inventory_summary(company, target_date):
    # Inventory is cumulative, so a daily snapshot reflects the *current* state at runtime.
    # It evaluates all active inventory rows up to this point.
    inventories = Inventory.objects.filter(company=company, remaining_packages__gt=0)
    
    agg = inventories.aggregate(
        stock_value=Sum(F('remaining_packages') * F('purchase_batch__cost_per_package'))
    )
    
    # Low stock count calculation
    low_stock_count = 0
    for inv in inventories:
        if inv.remaining_packages <= inv.reorder_level:
            low_stock_count += 1
            
    DailyInventorySummary.objects.update_or_create(
        company=company,
        date=target_date,
        defaults={
            'stock_value': agg['stock_value'] or Decimal('0.00'),
            'low_stock_count': low_stock_count,
            'spoilage_loss': Decimal('0.00')
        }
    )

@shared_task(name='trigger_incremental_rollup_update')
def trigger_incremental_rollup_update(company_id, entity_type, date_str):
    """
    Hook to synchronously update today's rollup when a transaction occurs to ensure real-time dashboards.
    """
    try:
        company = Company.objects.get(id=company_id)
        from datetime import datetime
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        if entity_type == 'sale':
            _generate_sales_summary(company, target_date)
        elif entity_type == 'purchase':
            _generate_purchase_summary(company, target_date)
        elif entity_type == 'inventory':
            _generate_inventory_summary(company, target_date)
    except Company.DoesNotExist:
        pass
