from django.db.models.signals import post_save
from django.dispatch import receiver
from business.trading.models import Sale, Payment, Inventory, StockMovement
from services.trading.credit_service import CreditService
from business.trading.tasks import inventory_low_stock_whatsapp_task, invoice_auto_send_task

@receiver(post_save, sender=Sale, dispatch_uid='sale_stock_movement_receiver')
def handle_sale_stock_movement(sender, instance, created, **kwargs):
    """
    Handle inventory changes and stock movement logging when a Sale is created or modified.
    NOTE: This logic has been migrated to SaleService.create_sale and SaleService.update_sale
    to ensure strict atomic boundaries and prevent hidden side effects.
    """
    # Logic extracted to backend/services/trading/sale_service.py -> update_sale & create_sale
    pass



@receiver(post_save, sender=Payment, dispatch_uid='payment_credit_recalc_receiver')
def handle_payment_recalc(sender, instance, created, **kwargs):
    """
    Recalculate customer risk metrics whenever a Payment transaction occurs.
    """
    if instance.buyer and instance.tenant:
        CreditService(instance.tenant).calculate_buyer_metrics(instance.buyer)
