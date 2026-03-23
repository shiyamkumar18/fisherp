from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models_audit import AuditLog
from django.contrib.contenttypes.models import ContentType
from companies.models import Company


@receiver(post_save, sender='trading.Sale')
@receiver(post_save, sender='trading.PurchaseBatch')
@receiver(post_save, sender='trading.Payment')
@receiver(post_save, sender='trading.Inventory')
@receiver(post_save, sender='trading.Buyer')
@receiver(post_save, sender='trading.Supplier')
def audit_trading_create_update(sender, instance, created, **kwargs):
    user = getattr(instance, 'processed_by', None) or getattr(instance, 'created_by', None)
    tenant = getattr(instance, 'company', None) or getattr(instance, 'tenant', None)
    model_name = sender._meta.model_name.replace('_', ' ').title()
    
    AuditLog.log_create(
        user=user,
        model_name=model_name,
        object_id=instance.id,
        object_repr=str(instance),
        tenant=tenant,
        ip_address=getattr(user, 'last_login_ip', None) if user else None
    ) if created else AuditLog.log_update(
        user=user,
        model_name=model_name,
        object_id=instance.id,
        object_repr=str(instance),
        tenant=tenant,
        changes={'updated_at': instance.updated_at.isoformat() if instance.updated_at else None}
    )


@receiver(post_delete, sender='trading.Sale')
@receiver(post_delete, sender='trading.PurchaseBatch')
@receiver(post_delete, sender='trading.Payment')
@receiver(post_delete, sender='trading.Inventory')
def audit_trading_delete(sender, instance, **kwargs):
    user = getattr(instance, 'deleted_by', None) or getattr(instance, 'processed_by', None)
    tenant = getattr(instance, 'company', None)
    model_name = sender._meta.model_name.replace('_', ' ').title()
    
    AuditLog.log_delete(
        user=user,
        model_name=model_name,
        object_id=instance.id,
        object_repr=str(instance),
        tenant=tenant
    )


@receiver(post_save, sender='trading.Sale', dispatch_uid='sale_created_event')
def sale_created_event(sender, instance, created, **kwargs):
    if created:
        AuditLog.log_create(
            user=getattr(instance, 'processed_by', None),
            model_name='SALE_CREATED',
            object_repr=f"New sale #{instance.id} - {instance.total_revenue} revenue",
            tenant=instance.company
        )
