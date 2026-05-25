from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError
from ..base import BaseService
from trading.models import Sale, Payment
from trading.helpers import _user_company

class SaleService(BaseService):
    def __init__(self, user):
        super().__init__(user)
    
    @transaction.atomic
    def create_sale(self, data):
        """Create sale with scoping and update inventory."""
        data.update({
            'tenant': self.user,
            'company': _user_company(self.user),
        })
        sale = Sale.objects.create(**data)

        # BUSINESS INTEGRATION: update inventory stock (decrement)
        from services.trading.inventory_service import InventoryService
        inventory_service = InventoryService(self.user)
        # Assumes 'inventory_id' and 'qty' are in data
        inventory_id = data.get('inventory_id')
        qty = data.get('qty')
        if inventory_id and qty:
            try:
                inventory = Inventory.objects.get(id=inventory_id)
                inventory_service.update_stock(inventory, -Decimal(str(qty)))
            except Inventory.DoesNotExist:
                pass  # Optionally log error

        return sale
    
    @transaction.atomic
    def update_sale(self, instance, data):
        """Atomic update."""
        for field, value in data.items():
            setattr(instance, field, value)
        instance.save()
        return instance
    
    @transaction.atomic
    def record_payment(self, sale, amount, payment_date=None, reference=''):
        """Record payment for sale."""
        amount = Decimal(str(amount))
        if amount <= 0:
            raise ValidationError({'amount': 'Payment amount must be greater than 0.'})

        locked_sale = Sale.objects.select_for_update().get(pk=sale.pk)
        payment = Payment.objects.create(
            payment_type='sale',
            payment_mode='bank_transfer',  # default
            amount=amount,
            date=payment_date or timezone.now().date(),
            sale=locked_sale,
            reference_number=reference,
            processed_by=self.user,
            tenant=locked_sale.tenant,
            company=locked_sale.company,
            buyer=locked_sale.buyer,
            notes=f'Payment for sale {locked_sale.invoice_number}'
        )

        locked_sale.amount_received = (locked_sale.amount_received or Decimal('0.00')) + amount
        locked_sale.save()
        locked_sale.refresh_from_db(fields=['amount_received', 'pending_amount', 'payment_status'])

        sale.amount_received = locked_sale.amount_received
        sale.pending_amount = locked_sale.pending_amount
        sale.payment_status = locked_sale.payment_status
        return payment
    
    def mark_delivered(self, sale, delivered_by=None):
        """Mark as delivered."""
        sale.delivery_status = 'delivered'
        sale.delivery_confirmed_at = timezone.now()
        sale.delivered_by = delivered_by or self.user.get_full_name()
        sale.save()
    
    def process_return(self, sale, return_date, reason, refund_amount=0):
        """Process return."""
        sale.is_returned = True
        sale.return_date = return_date
        sale.return_reason = reason
        sale.refund_amount = Decimal(str(refund_amount))
        sale.save()
    
    def get_queryset(self):
        """Scoped sales for user."""
        from trading.models import Sale
        return Sale.objects.for_user(self.user)
