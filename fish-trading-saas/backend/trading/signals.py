from django.db.models.signals import post_save
from django.dispatch import receiver
from trading.models import Sale, Payment, Inventory, StockMovement
from services.trading.credit_service import CreditService

@receiver(post_save, sender=Sale, dispatch_uid='sale_stock_movement_receiver')
def handle_sale_stock_movement(sender, instance, created, **kwargs):
    """
    Handle inventory changes and stock movement logging when a Sale is created or modified.
    """
    if created:
        try:
            # 1. Locate inventory for the purchase batch
            inventory = Inventory.objects.get(purchase_batch=instance.batch)
            
            # 2. Deduct inventory packages and weight
            pkg_sold = instance.number_of_packages_sold
            weight_sold = pkg_sold * instance.selling_weight_per_package
            
            inventory.adjust_stock(-pkg_sold, -weight_sold, movement_type='sale')
            
            # Check for low stock alert
            if inventory.remaining_packages <= inventory.reorder_level:
                from trading.tasks import inventory_low_stock_whatsapp_task
                inventory_low_stock_whatsapp_task.delay(inventory.id)
            
            # 3. Create StockMovement entry
            StockMovement.objects.create(
                fish=instance.batch.fish,
                purchase_batch=instance.batch,
                inventory=inventory,
                movement_type='sale',
                quantity_packages=-pkg_sold,
                weight_kg=-weight_sold,
                notes=f"Sales invoice {instance.invoice_number}",
                company=instance.company,
                tenant=instance.tenant
            )
        except Inventory.DoesNotExist:
            pass

        # 4. Trigger Customer credit score recalculation and auto WhatsApp invoice send
        if instance.buyer:
            CreditService(instance.tenant).calculate_buyer_metrics(instance.buyer)
            from trading.tasks import invoice_auto_send_task
            invoice_auto_send_task.delay(instance.id)

    else:
        # Handle returns or modifications
        if instance.is_returned:
            # Check if return movement already logged
            ret_exists = StockMovement.objects.filter(
                purchase_batch=instance.batch,
                movement_type='return',
                notes__icontains=instance.invoice_number
            ).exists()
            
            if not ret_exists:
                try:
                    inventory = Inventory.objects.get(purchase_batch=instance.batch)
                    pkg_sold = instance.number_of_packages_sold
                    weight_sold = pkg_sold * instance.selling_weight_per_package
                    
                    # Add back to stock
                    inventory.adjust_stock(pkg_sold, weight_sold, movement_type='return')
                    
                    StockMovement.objects.create(
                        fish=instance.batch.fish,
                        purchase_batch=instance.batch,
                        inventory=inventory,
                        movement_type='return',
                        quantity_packages=pkg_sold,
                        weight_kg=weight_sold,
                        notes=f"Returned invoice {instance.invoice_number}. Reason: {instance.return_reason}",
                        company=instance.company,
                        tenant=instance.tenant
                    )
                except Inventory.DoesNotExist:
                    pass

        if instance.buyer:
            CreditService(instance.tenant).calculate_buyer_metrics(instance.buyer)


@receiver(post_save, sender=Payment, dispatch_uid='payment_credit_recalc_receiver')
def handle_payment_recalc(sender, instance, created, **kwargs):
    """
    Recalculate customer risk metrics whenever a Payment transaction occurs.
    """
    if instance.buyer:
        CreditService(instance.tenant).calculate_buyer_metrics(instance.buyer)
