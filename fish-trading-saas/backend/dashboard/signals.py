from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
import logging

from trading.models import Sale, PurchaseBatch, Payment, Inventory
from dashboard.tasks import trigger_incremental_rollup_update

logger = logging.getLogger(__name__)

def _invalidate_dashboard_cache(company_id):
    if company_id:
        cache_key = f"dashboard_tenant_admin_{company_id}"
        # We can't easily clear all keys starting with a prefix in standard memcached without tracking them.
        # But for exact match (default without filters), we clear it:
        cache.delete(cache_key)
        # Note: If redis is used, we could use `cache.delete_pattern` or similar, 
        # but for safety across backends, we just clear the main one or rely on TTL.

@receiver([post_save, post_delete], sender=Sale)
def handle_sale_change(sender, instance, **kwargs):
    company_id = getattr(instance, 'company_id', None)
    if company_id:
        _invalidate_dashboard_cache(company_id)
        # Trigger incremental rollup
        date_str = instance.date.strftime('%Y-%m-%d')
        trigger_incremental_rollup_update.delay(company_id, 'sale', date_str)

@receiver([post_save, post_delete], sender=PurchaseBatch)
def handle_purchase_change(sender, instance, **kwargs):
    company_id = getattr(instance, 'company_id', None)
    if company_id:
        _invalidate_dashboard_cache(company_id)
        # Trigger incremental rollup
        date_str = instance.date.strftime('%Y-%m-%d')
        trigger_incremental_rollup_update.delay(company_id, 'purchase', date_str)

@receiver([post_save, post_delete], sender=Payment)
def handle_payment_change(sender, instance, **kwargs):
    company_id = getattr(instance, 'company_id', None)
    if company_id:
        _invalidate_dashboard_cache(company_id)

@receiver([post_save, post_delete], sender=Inventory)
def handle_inventory_change(sender, instance, **kwargs):
    company_id = getattr(instance, 'company_id', None)
    if company_id:
        _invalidate_dashboard_cache(company_id)
        # Trigger incremental rollup using today's date
        from django.utils import timezone
        date_str = timezone.now().date().strftime('%Y-%m-%d')
        trigger_incremental_rollup_update.delay(company_id, 'inventory', date_str)
