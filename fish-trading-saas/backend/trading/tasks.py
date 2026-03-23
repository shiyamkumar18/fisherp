from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Inventory, Sale, Supplier

@shared_task
def send_low_stock_alert(inventory_id):
    \"\"\"Alert for low stock.\"\"\"
    inventory = Inventory.objects.get(id=inventory_id)
    # Send email/Slack
    print(f'Low stock alert for {inventory.fish.name}: {inventory.remaining_packages} left')
    return 'Alert sent'

@shared_task
def check_overdue_suppliers():
    \"\"\"Check overdue payments.\"\"\"
    overdue = Supplier.objects.filter(outstanding_amount__gt=0, payment_due_date__lt=timezone.now().date())
    for supplier in overdue:
        print(f'Overdue supplier: {supplier.name}, amount: {supplier.outstanding_amount}')
    return len(overdue)

@shared_task
def subscription_expiry_reminder(subscription_id):
    \"\"\"Reminder 3 days before expiry.\"\"\"
    print('Subscription expiry reminder sent')

