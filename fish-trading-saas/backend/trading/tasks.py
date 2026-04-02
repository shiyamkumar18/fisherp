import logging

from celery import shared_task
from celery.exceptions import Retry
from django.utils import timezone
from .models import Inventory, Supplier
from companies.models import Company

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_low_stock_alert(self, inventory_id):
    try:
        inventory = Inventory.objects.select_related('company', 'fish').get(id=inventory_id)
    except Inventory.DoesNotExist:
        logger.error('Low stock alert failed: Inventory %s not found', inventory_id)
        return 'Inventory not found'

    try:
        if inventory.company and inventory.company.is_active:
            logger.warning(
                'Low stock alert [%s]: %s – %d packages remaining',
                inventory.company.name,
                inventory.fish.name,
                inventory.remaining_packages,
            )
        else:
            logger.info('Skipped inactive company inventory: %s', inventory.id)
        return 'Alert processed'
    except Exception as exc:
        logger.exception('Low stock alert task failed for inventory %s', inventory_id)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=120)
def check_overdue_suppliers(self, company_id=None):
    try:
        if company_id:
            overdue = Supplier.objects.filter(
                company_id=company_id,
                outstanding_amount__gt=0,
                payment_due_date__lt=timezone.now().date(),
                is_deleted=False,
            )
            count = overdue.count()
            for supplier in overdue:
                logger.warning(
                    'Overdue [company=%s]: %s – %s',
                    company_id, supplier.name, supplier.outstanding_amount,
                )
            return count
        else:
            company_ids = list(
                Company.objects.filter(is_active=True).values_list('id', flat=True)
            )
            total = 0
            for cid in company_ids:
                try:
                    total += check_overdue_suppliers(cid)
                except Retry:
                    raise
                except Exception:
                    logger.exception('Overdue check failed for company %s', cid)
            return total
    except Exception as exc:
        logger.exception('check_overdue_suppliers failed (company_id=%s)', company_id)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def subscription_expiry_reminder(self, subscription_id, company_id=None):
    try:
        logger.info(
            'Subscription expiry reminder [%s]: subscription_id=%s',
            company_id or 'ALL', subscription_id,
        )
        return 'Reminder sent'
    except Exception as exc:
        logger.exception('subscription_expiry_reminder failed')
        raise self.retry(exc=exc)
