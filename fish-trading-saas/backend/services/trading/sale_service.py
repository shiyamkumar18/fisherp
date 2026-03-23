from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from rest_framework import serializers
from .base_service import BaseService
from trading.models import Sale, Payment
from trading.serializers import SaleSerializer
from accounts.permissions import _user_company, _get_create_scope

class SaleService(BaseService):
    def __init__(self, user):
        super().__init__(user)
    
    @transaction.atomic
    def create_sale(self, data):
        \"\"\"Create sale with scoping.\"\"\"
        data.update(_get_create_scope(self.user.request if hasattr(self.user, 'request') else {}))
        serializer = SaleSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        return serializer.save()
    
    @transaction.atomic
    def update_sale(self, instance, data):
        \"\"\"Atomic update.\"\"\"
        serializer = SaleSerializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return instance
    
    def record_payment(self, sale, amount, payment_date=None, reference=''):
        \"\"\"Record payment for sale.\"\"\"
        amount = Decimal(str(amount))
        payment = Payment.objects.create(
            payment_type='sale',
            payment_mode='bank_transfer',  # default
            amount=amount,
            date=payment_date or timezone.now().date(),
            sale=sale,  # assuming FK
            reference_number=reference,
            processed_by=self.user,
            tenant=sale.tenant,
            company=sale.company,
            notes=f'Payment for sale {sale.invoice_number}'
        )
        sale.amount_received += amount
        sale.save()
        return payment
    
    def mark_delivered(self, sale, delivered_by=None):
        \"\"\"Mark as delivered.\"\"\"
        sale.delivery_status = 'delivered'
        sale.delivery_confirmed_at = timezone.now()
        sale.delivered_by = delivered_by or self.user.get_full_name()
        sale.save()
    
    def process_return(self, sale, return_date, reason, refund_amount=0):
        \"\"\"Process return.\"\"\"
        sale.is_returned = True
        sale.return_date = return_date
        sale.return_reason = reason
        sale.refund_amount = Decimal(str(refund_amount))
        sale.save()
    
    def get_queryset(self):
        \"\"\"Scoped sales for user.\"\"\"
        from trading.models import Sale
        return Sale.objects.for_user(self.user)

