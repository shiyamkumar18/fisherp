from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from ..base import BaseService
from trading.models import Inventory


class InventoryService(BaseService):
    def __init__(self, user, request=None):
        super().__init__(user)
        self.request = request   # store request for IP logging, etc.

    def _get_scope_dict(self):
        """
        Return a dictionary with scope fields for creating new inventory.
        For multi‑tenant apps, this usually includes company/tenant and created_by.
        """
        scope = {}
        company = getattr(self.user, 'company', None)
        if company:
            scope['company'] = company
        scope['tenant'] = self.user
        # Optionally set created_by if your model has such a field.
        if hasattr(Inventory, 'created_by'):
            scope['created_by'] = self.user
        return scope

    @transaction.atomic
    def create_inventory(self, data):
        """Create inventory with scoping."""
        scope = self._get_scope_dict()
        data.update(scope)
        purchase_batch = data.get('purchase_batch')
        initial_packages = data.get('initial_packages')
        remaining_packages = data.get('remaining_packages', initial_packages)
        
        if purchase_batch and initial_packages is not None:
            package_weight = getattr(purchase_batch, 'package_weight', None) or Decimal("0.00")
            if data.get('initial_weight_kg') is None:
                data['initial_weight_kg'] = Decimal(str(initial_packages)) * package_weight
            if data.get('remaining_weight_kg') is None and remaining_packages is not None:
                data['remaining_weight_kg'] = Decimal(str(remaining_packages)) * package_weight
        return Inventory.objects.create(**data)

    @transaction.atomic
    def update_stock(self, instance, packages_delta):
        """Update remaining packages atomically."""
        if packages_delta < 0:
            raise ValueError("packages_delta must be non-negative")
        instance.update_stock(packages_delta)
        return instance

    @transaction.atomic
    def deduct_stock_for_sale(self, sale):
        """Deduct inventory stock when a Sale is created or finalized."""
        from trading.models import Inventory, StockMovement
        from trading.tasks import inventory_low_stock_whatsapp_task
        
        try:
            inventory = Inventory.objects.get(purchase_batch=sale.batch)
        except Inventory.DoesNotExist:
            return None

        pkg_sold = sale.number_of_packages_sold
        weight_sold = pkg_sold * sale.selling_weight_per_package
        
        inventory.adjust_stock(-pkg_sold, -weight_sold, movement_type='sale')
        
        if inventory.remaining_packages <= inventory.reorder_level:
            inventory_id = getattr(inventory, 'id', None)
            if inventory_id:
                inventory_low_stock_whatsapp_task.delay(inventory_id)
        
        fish = getattr(sale.batch, 'fish', None)
        StockMovement.objects.create(
            fish=fish,
            purchase_batch=sale.batch,
            inventory=inventory,
            movement_type='sale',
            quantity_packages=-pkg_sold,
            weight_kg=-weight_sold,
            notes=f"Sales invoice {sale.invoice_number}",
            company=sale.company,
            tenant=sale.tenant
        )
        return inventory

    @transaction.atomic
    def restore_stock_for_sale(self, sale, movement_type='return'):
        """Restore inventory stock when a Sale is cancelled, returned, or deleted."""
        from trading.models import Inventory, StockMovement
        
        try:
            inventory = Inventory.objects.get(purchase_batch=sale.batch)
        except Inventory.DoesNotExist:
            return None

        pkg_sold = sale.number_of_packages_sold
        weight_sold = pkg_sold * sale.selling_weight_per_package
        
        inventory.adjust_stock(pkg_sold, weight_sold, movement_type=movement_type)
        
        notes = f"Cancelled/Returned invoice {sale.invoice_number}"
        if movement_type == 'return':
            notes = f"Returned invoice {sale.invoice_number}. Reason: {getattr(sale, 'return_reason', 'None')}"
        elif getattr(sale, 'is_deleted', False):
            notes = f"Soft deleted invoice {sale.invoice_number}"
        elif sale.status == 'cancelled':
            notes = f"Cancelled invoice {sale.invoice_number}"

        fish = getattr(sale.batch, 'fish', None)
        StockMovement.objects.create(
            fish=fish,
            purchase_batch=sale.batch,
            inventory=inventory,
            movement_type=movement_type,
            quantity_packages=pkg_sold,
            weight_kg=weight_sold,
            notes=notes,
            company=sale.company,
            tenant=sale.tenant
        )
        return inventory

    def update_temperature(self, instance, temperature):
        """Update temperature log."""
        instance.current_temperature = temperature
        instance.temperature_last_checked = timezone.now()
        instance.save()

    def move_stock(self, instance, location, bin_num=None, rack_num=None):
        """Move location."""
        instance.storage_location = location
        if bin_num:
            instance.bin_number = bin_num
        if rack_num:
            instance.rack_number = rack_num
        instance.last_moved_at = timezone.now()
        
        moved_by = "System"
        if self.user:
            try:
                moved_by = self.user.get_full_name() or self.user.username
            except AttributeError:
                pass
        instance.last_moved_by = moved_by
        instance.save()

    def get_low_stock(self):
        """Low stock query."""
        manager = getattr(Inventory, 'objects')
        return manager.for_user(self.user).filter(status='low_stock')

    def get_expiring_soon(self, days=3):
        """Expiring items."""
        soon = timezone.now().date() + timedelta(days=days)
        manager = getattr(Inventory, 'objects')
        return manager.for_user(self.user).filter(
            expiry_date__lte=soon,
            expiry_date__gte=timezone.now().date()
        )

    def get_queryset(self):
        manager = getattr(Inventory, 'objects')
        return manager.for_user(self.user)
