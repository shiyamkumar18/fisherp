from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from accounts.models_audit import AuditLog

# Connect trading signals to accounts AuditLog
# Already connected in accounts/signals.py
# This file for trading-specific events (e.g., SALE_CREATED)

# Trading-specific events
@receiver(post_save, sender='trading.Sale', dispatch_uid='sale_created_event')
def sale_created_event(sender, instance, created, **kwargs):
    if created:
        # Emit SALE_CREATED event (already in accounts.signals)
        pass  # Handled there
