from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError
from ..base import BaseService
from business.trading.models import Sale, Payment, Inventory
from business.trading.helpers import _user_company

class SaleService(BaseService):
    def __init__(self, user):
        super().__init__(user)
    
    @transaction.atomic
    def create_sale(self, data):
        """Create sale with scoping and atomic guarantees."""
        company = data.get('company')
        if not company:
            from business.trading.helpers import _user_company
            company = _user_company(self.user)
            data['company'] = company
            data['tenant'] = self.user

        # Extract non-model fields if any
        data.pop('inventory_id', None)
        data.pop('qty', None)
        
        sale = Sale(**data)
        sale.full_clean()
        sale.save()
        
        # Trigger explicit stock deduction if applicable
        ACTIVE_STATES = ['approved', 'paid', 'partial', 'overdue']
        if sale.status in ACTIVE_STATES and not getattr(sale, 'is_deleted', False):
            from services.trading.inventory_service import InventoryService
            InventoryService(self.user).deduct_stock_for_sale(sale)
            
        # Recalculate credit metrics
        if sale.buyer and sale.tenant:
            from services.trading.credit_service import CreditService
            CreditService(sale.tenant).calculate_buyer_metrics(sale.buyer)
            
        return sale
    
    @transaction.atomic
    def update_sale(self, instance, data):
        """Atomic update with stock synchronization."""
        old_status = instance.status
        old_is_deleted = getattr(instance, 'is_deleted', False)
        
        for field, value in data.items():
            setattr(instance, field, value)
        instance.full_clean()
        instance.save()
        
        # Determine stock movement needs
        ACTIVE_STATES = ['approved', 'paid', 'partial', 'overdue']
        new_status = instance.status
        new_is_deleted = getattr(instance, 'is_deleted', False)
        
        was_active = old_status in ACTIVE_STATES and not old_is_deleted
        is_active = new_status in ACTIVE_STATES and not new_is_deleted
        
        from services.trading.inventory_service import InventoryService
        inv_service = InventoryService(self.user)
        
        if not was_active and is_active:
            inv_service.deduct_stock_for_sale(instance)
        elif was_active and not is_active:
            movement_type = 'return' if new_status == 'returned' else 'correction'
            inv_service.restore_stock_for_sale(instance, movement_type=movement_type)
            
        # Recalculate credit metrics
        if instance.buyer and instance.tenant:
            from services.trading.credit_service import CreditService
            CreditService(instance.tenant).calculate_buyer_metrics(instance.buyer)
            
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
        
        if not delivered_by:
            delivered_by = "System"
            if self.user:
                try:
                    delivered_by = self.user.get_full_name() or self.user.username
                except AttributeError:
                    pass
        
        sale.delivered_by = delivered_by
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
        from business.trading.models import Sale
        manager = getattr(Sale, 'objects')
        return manager.for_user(self.user)
