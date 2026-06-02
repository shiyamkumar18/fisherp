from django.db import transaction
from django.core.exceptions import ValidationError
from trading.models import PurchaseBatch, PurchaseBatchHistory
from services.trading.inventory_service import InventoryService
from services.base import BaseService

class PurchaseBatchService(BaseService):
    
    @transaction.atomic
    def create_purchase_batch(self, validated_data):
        """
        Creates a new PurchaseBatch and initializes inventory.
        Handles atomic transaction.
        """
        # Create the purchase batch instance
        batch = PurchaseBatch(**validated_data)
        
        # Trigger model validation and calculation
        batch.full_clean()
        batch.save()
        
        # Track history
        PurchaseBatchHistory.objects.create(
            batch=batch,
            changed_by=self.user,
            action='created',
            changes={},
            notes="Batch created"
        )
        
        # Now automatically create inventory for this batch
        inventory_service = InventoryService(user=self.user, request=getattr(self, 'request', None))
        inventory_data = {
            'purchase_batch': batch,
            'fish': batch.fish,
            'initial_packages': batch.number_of_packages,
            'remaining_packages': batch.number_of_packages,
            'initial_weight_kg': batch.total_weight,
            'remaining_weight_kg': batch.total_weight,
            'status': 'in_stock',
            'company': batch.company,
            'tenant': batch.tenant,
            'created_by': batch.created_by,
            'updated_by': batch.created_by
        }
        inventory_service.create_inventory(inventory_data)
        
        return batch

    @transaction.atomic
    def update_purchase_batch(self, instance, validated_data):
        """
        Updates an existing PurchaseBatch.
        Updates inventory dynamically if package count changes.
        """
        old_packages = instance.number_of_packages
        old_weight = instance.total_weight
        
        # Keep track of changes
        changes = {}
        for attr, value in validated_data.items():
            old_val = getattr(instance, attr)
            if old_val != value:
                changes[attr] = {'old': str(old_val), 'new': str(value)}
            setattr(instance, attr, value)
            
        instance.full_clean()
        instance.save()
        
        if changes:
            PurchaseBatchHistory.objects.create(
                batch=instance,
                changed_by=self.user,
                action='updated',
                changes=changes,
                notes="Batch updated"
            )
        
        # Sync inventory if necessary
        if instance.number_of_packages != old_packages:
            packages_diff = instance.number_of_packages - old_packages
            weight_diff = instance.total_weight - old_weight
            
            try:
                inventory_service = InventoryService(user=self.user)
                # Ensure the inventory gets correctly adjusted (adding or subtracting difference)
                # Wait, adjust_stock handles delta, so pass the diff.
                from trading.models import Inventory
                inventory = Inventory.objects.get(purchase_batch=instance)
                inventory.adjust_stock(
                    packages_delta=packages_diff,
                    weight_delta=weight_diff,
                    movement_type='correction',
                    notes=f"PurchaseBatch {instance.id} updated packages from {old_packages} to {instance.number_of_packages}"
                )
            except Exception as e:
                # If inventory doesn't exist or other error
                pass

        return instance
