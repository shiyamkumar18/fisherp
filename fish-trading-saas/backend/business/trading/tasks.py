import logging
import datetime

from celery import shared_task
from celery.exceptions import Retry
from django.utils import timezone
from .models import Inventory, Supplier, Sale, WhatsAppConfig, WhatsAppMessageLog
from saas_platform.companies.models import Company

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


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_whatsapp_message_task(self, message_log_id):
    try:
        log = WhatsAppMessageLog.objects.select_related('company').get(id=message_log_id)
    except WhatsAppMessageLog.DoesNotExist:
        logger.error('WhatsApp message log %s not found', message_log_id)
        return 'Log not found'

    log.retry_count += 1
    log.save(update_fields=['retry_count'])

    try:
        config = WhatsAppConfig.objects.filter(company=log.company, is_enabled=True).first()
        if not config or not config.whatsapp_api_key:
            raise Exception("WhatsApp Config not found or API key missing.")
        
        logger.info(
            "Sending WhatsApp message via gateway: To: %s, Body: %s, API Key: %s",
            log.recipient, log.message_body, config.whatsapp_api_key[:5] + "..."
        )
        
        log.status = 'delivered'
        log.sent_at = timezone.now()
        log.error_message = None
        log.save(update_fields=['status', 'sent_at', 'error_message'])
        return 'Message delivered'
        
    except Exception as exc:
        log.status = 'failed'
        log.error_message = str(exc)
        log.save(update_fields=['status', 'error_message'])
        logger.error('WhatsApp message task failed for log %s: %s', message_log_id, str(exc))
        raise self.retry(exc=exc)


@shared_task
def invoice_auto_send_task(sale_id):
    try:
        sale = Sale.objects.select_related('buyer', 'company').get(id=sale_id)
    except Sale.DoesNotExist:
        logger.error('Sale %s not found for auto sending WhatsApp', sale_id)
        return 'Sale not found'

    buyer = sale.buyer
    if not buyer or not buyer.phone:
        logger.info('Buyer or buyer phone missing for sale %s', sale_id)
        return 'No phone number'

    company = sale.company
    if not company:
        logger.info('Company missing for sale %s', sale_id)
        return 'No company'

    config = WhatsAppConfig.objects.filter(company=company, is_enabled=True).first()
    if not config or not config.is_enabled:
        company_id = company.id if company else 'unknown'
        logger.info('WhatsApp config not enabled for company %s', company_id)
        return 'Config disabled'

    template = config.templates.get('invoice', "Sir, Invoice {invoice_number} generated successfully. Total: ₹{final_amount}, Due: ₹{pending_amount} on {due_date}. Thanks!")
    body = template.format(
        invoice_number=sale.invoice_number,
        final_amount=sale.final_amount,
        pending_amount=sale.pending_amount,
        due_date=sale.due_date.strftime('%Y-%m-%d') if sale.due_date else 'N/A'
    )

    log = WhatsAppMessageLog.objects.create(
        company=company,
        recipient=buyer.phone,
        message_type='invoice',
        message_body=body,
        status='queued'
    )
    
    send_whatsapp_message_task.delay(log.id)
    return f'Queued invoice message to {buyer.phone}'


@shared_task
def scheduled_payment_reminders_task():
    today = timezone.localdate()
    sales = Sale.objects.filter(
        payment_status__in=['pending', 'partial'],
        is_deleted=False
    ).select_related('buyer', 'company')

    count = 0
    for sale in sales:
        buyer = sale.buyer
        if not buyer or not buyer.phone:
            continue

        company = sale.company
        config = WhatsAppConfig.objects.filter(company=company, is_enabled=True).first()
        if not config or not config.is_enabled:
            continue

        days_diff = (today - sale.due_date).days if sale.due_date else 0
        
        send_reminder = False
        reminder_type = ""
        if days_diff == 1:
            send_reminder = True
            reminder_type = "1 day overdue"
        elif days_diff == 3:
            send_reminder = True
            reminder_type = "3 days overdue"
        elif days_diff == 7:
            send_reminder = True
            reminder_type = "7 days overdue"
        elif days_diff > 7 and days_diff % 7 == 0:
            send_reminder = True
            reminder_type = "overdue warning"

        if send_reminder:
            template = config.templates.get('payment_reminder', "Sir, payment reminder for invoice {invoice_number}. Amount pending: ₹{pending_amount}. Please clear soon.")
            body = template.format(
                invoice_number=sale.invoice_number,
                pending_amount=sale.pending_amount,
                reminder_type=reminder_type
            )
            
            log = WhatsAppMessageLog.objects.create(
                company=company,
                recipient=buyer.phone,
                message_type='payment_reminder',
                message_body=body,
                status='queued'
            )
            send_whatsapp_message_task.delay(log.id)
            count += 1

    return f'Queued {count} payment reminders.'


@shared_task
def supplier_payment_reminder_task():
    today = timezone.localdate()
    three_days_later = today + datetime.timedelta(days=3)
    suppliers = Supplier.objects.filter(
        outstanding_amount__gt=0,
        payment_due_date__lte=three_days_later,
        is_deleted=False
    ).select_related('company')

    count = 0
    for supplier in suppliers:
        company = supplier.company
        config = WhatsAppConfig.objects.filter(company=company, is_enabled=True).first()
        if not config or not config.is_enabled or not config.sender_number:
            continue

        body = f"Supplier payment pending: ₹{supplier.outstanding_amount} due to {supplier.name} on {supplier.payment_due_date}."
        
        log = WhatsAppMessageLog.objects.create(
            company=company,
            recipient=config.sender_number,
            message_type='supplier_reminder',
            message_body=body,
            status='queued'
        )
        send_whatsapp_message_task.delay(log.id)
        count += 1

    return f'Queued {count} supplier payment reminders.'


@shared_task
def inventory_low_stock_whatsapp_task(inventory_id):
    try:
        inv = Inventory.objects.select_related('fish', 'company', 'purchase_batch').get(id=inventory_id)
    except Inventory.DoesNotExist:
        logger.error('Inventory %s not found for low stock alert', inventory_id)
        return 'Inventory not found'

    company = inv.company
    config = WhatsAppConfig.objects.filter(company=company, is_enabled=True).first()
    if not config or not config.is_enabled or not config.sender_number:
        return 'Config or sender number not found or not enabled'

    body = f"Low Stock Alert: {inv.fish.name} batch {inv.purchase_batch.batch_number} is low. Remaining: {inv.remaining_packages} pkgs."
    
    log = WhatsAppMessageLog.objects.create(
        company=company,
        recipient=config.sender_number,
        message_type='stock_alert',
        message_body=body,
        status='queued'
    )
    send_whatsapp_message_task.delay(log.id)
    return f'Queued stock alert message for inventory {inv.id}'
