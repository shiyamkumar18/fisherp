from django.db import transaction
from django.utils import timezone
from datetime import datetime, timedelta
from .base_service import BaseService
from trading.models import Inventory
from trading.serializers import InventorySerializer

class InventoryService(BaseService):
    def __init__(self, user):
        super().__init__(user)
    
    @transaction.atomic
    def create_inventory(self, data):
        \"\"\"Create inventory with scoping.\"\"\"
        data.update(_get_create_scope(self.user.request if hasattr(self.user, 'request') else {}))
        serializer = InventorySerializer(data=data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return instance
    
    @transaction.atomic
    def update_stock(self, instance, packages_delta):
        \"\"\"Update remaining packages atomically.\"\"\"
        instance.remaining_packages += packages_delta
        if instance.remaining_packages <= 0:
            instance.status = 'sold_out'
        instance.save()
        return instance
    
    def update_temperature(self, instance, temperature):
        \"\"\"Update temp log.\"\"\"
        instance.current_temperature = temperature
        instance.temperature_last_checked = timezone.now()
        instance.save()
    
    def move_stock(self, instance, location, bin_num=None, rack_num=None):
        \"\"\"Move location.\"\"\"
        instance.storage_location = location
        if bin_num:
            instance.bin_number = bin_num
        if rack_num:
            instance.rack_number = rack_num
        instance.last_moved_at = timezone.now()
        instance.last_moved_by = self.user.get_full_name()
        instance.save()
    
    def get_low_stock(self):
        \"\"\"Low stock query.\"\"\"
        from trading.models import Inventory
        return Inventory.objects.for_user(self.user).filter(status='low_stock')
    
    def get_expiring_soon(self, days=3):
        \"\"\"Expiring items.\"\"\"
        soon = datetime.now().date() + timedelta(days=days)
        from trading.models import Inventory
        return Inventory.objects.for_user(self.user).filter(
            expiry_date__lte=soon,
            expiry_date__gte=datetime.now().date()
        )
    
    def get_queryset(self):
        from trading.models import Inventory
        return Inventory.objects.for_user(self.user)

