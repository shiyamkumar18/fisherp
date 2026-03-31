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
        if hasattr(self.user, 'company') and self.user.company:
            scope['company'] = self.user.company
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
            if data.get('initial_weight_kg') is None:
                data['initial_weight_kg'] = initial_packages * purchase_batch.package_weight
            if data.get('remaining_weight_kg') is None and remaining_packages is not None:
                data['remaining_weight_kg'] = remaining_packages * purchase_batch.package_weight
        return Inventory.objects.create(**data)

    @transaction.atomic
    def update_stock(self, instance, packages_delta):
        """Update remaining packages atomically."""
        if packages_delta < 0:
            raise ValueError("packages_delta must be non-negative")
        instance.update_stock(packages_delta)
        return instance

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
        instance.last_moved_by = self.user.get_full_name()
        instance.save()

    def get_low_stock(self):
        """Low stock query."""
        return Inventory.objects.for_user(self.user).filter(status='low_stock')

    def get_expiring_soon(self, days=3):
        """Expiring items."""
        soon = timezone.now().date() + timedelta(days=days)
        return Inventory.objects.for_user(self.user).filter(
            expiry_date__lte=soon,
            expiry_date__gte=timezone.now().date()
        )

    def get_queryset(self):
        return Inventory.objects.for_user(self.user)
