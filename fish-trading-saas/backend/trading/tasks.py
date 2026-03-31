from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Inventory, Sale, Supplier
from companies.models import Company
from services.base import CompanyManager


@shared_task
def send_low_stock_alert(inventory_id):
    inventory = Inventory.objects.get(id=inventory_id)
    if inventory.company and inventory.company.is_active:
        print(f'Low stock alert [{inventory.company.name}]: {inventory.fish.name}: {inventory.remaining_packages} left')
    else:
        print(f'Skipped inactive company inventory: {inventory.id}')
    return 'Alert processed'


@shared_task
def check_overdue_suppliers(company_id=None):
    if company_id:
        overdue = Supplier.objects.filter(
            company_id=company_id,
            outstanding_amount__gt=0,
            payment_due_date__lt=timezone.now().date(),
            is_deleted=False
        )
        count = overdue.count()
        for supplier in overdue:
            print(f'Overdue [{company_id}]: {supplier.name} - {supplier.outstanding_amount}')
        return count
    else:
        companies = Company.objects.filter(is_active=True)
        total = 0
        for company in companies:
            company_count = check_overdue_suppliers(company.id)
            total += company_count
        return total


@shared_task
def subscription_expiry_reminder(subscription_id, company_id=None):
    print(f'Subscription expiry reminder [{company_id or "ALL"}]: {subscription_id}')
    return 'Reminder sent'
