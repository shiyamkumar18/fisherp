from decimal import Decimal
from django.db.models import Sum
from django.utils import timezone
from business.trading.models import Sale, Payment, Buyer

class CreditService:
    def __init__(self, user):
        self.user = user

    def calculate_buyer_metrics(self, buyer: Buyer):
        """
        Recalculate credit and risk metrics for a Buyer.
        """
        # 1. Total purchases & orders
        sales = Sale.objects.filter(buyer=buyer, is_deleted=False)
        buyer.total_orders = sales.count()
        buyer.total_purchases = sales.aggregate(total=Sum('final_amount'))['total'] or Decimal('0.00')

        # 2. Overdue invoices
        today = timezone.localdate()
        overdue_invoices = sales.filter(
            payment_status__in=['pending', 'partial'],
            due_date__lt=today
        )
        buyer.overdue_invoices_count = overdue_invoices.count()

        # 3. Average payment delay
        cleared_payments = Payment.objects.filter(
            buyer=buyer,
            payment_type='sale',
            is_deleted=False,
            sale__isnull=False
        ).select_related('sale')

        total_delay_days = 0
        payment_count = 0
        for payment in cleared_payments:
            sale = payment.sale
            if not sale:
                continue
                
            sale_date = sale.date
            payment_date = payment.date
            if payment_date > sale_date:
                delay = (payment_date - sale_date).days
                total_delay_days += delay
                payment_count += 1

        if payment_count > 0:
            buyer.average_payment_delay_days = Decimal(total_delay_days) / Decimal(payment_count)
        else:
            buyer.average_payment_delay_days = Decimal('0.00')

        # 4. Current outstanding balance
        buyer.current_credit_balance = buyer.get_total_pending()

        # 5. Risk score calculation (0 to 100)
        risk = 0
        risk += min(45, buyer.overdue_invoices_count * 15)

        credit_limit = buyer.credit_limit or Decimal('0.00')
        current_balance = buyer.current_credit_balance or Decimal('0.00')
        average_delay = buyer.average_payment_delay_days or Decimal('0.00')

        if credit_limit > 0:
            utilization = current_balance / credit_limit
            risk += min(30, int(utilization * 30))
        elif current_balance > 0:
            risk += 15

        risk += min(25, int(average_delay * 2))

        buyer.risk_score = min(100, risk)
        buyer.save()
        return buyer
