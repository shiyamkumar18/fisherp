import time
from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.db import transaction
from django.db.utils import OperationalError
from django.utils import timezone

from .fish import Fish
from .purchase_batch import PurchaseBatch
from services.base import CompanyManager

MAX_STOCK_UPDATE_RETRIES = 10


class Inventory(models.Model):
    STATUS_CHOICES = [
        ('in_stock', 'In Stock'),
        ('low_stock', 'Low Stock'),
        ('out_of_stock', 'Out of Stock'),
        ('expired', 'Expired'),
    ]

    fish = models.ForeignKey(Fish, on_delete=models.CASCADE, related_name='inventory')
    purchase_batch = models.ForeignKey(PurchaseBatch, on_delete=models.CASCADE, related_name='inventory_items')
    initial_packages = models.PositiveIntegerField()
    remaining_packages = models.PositiveIntegerField()
    sold_packages = models.PositiveIntegerField(default=0)
    initial_weight_kg = models.DecimalField(max_digits=10, decimal_places=2)
    remaining_weight_kg = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='in_stock')
    storage_location = models.CharField(max_length=100, blank=True, null=True)
    expiry_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    current_temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True,
                                              help_text="Current storage temperature in Celsius")
    temperature_last_checked = models.DateTimeField(null=True, blank=True)
    expiry_alert_threshold_days = models.PositiveIntegerField(default=2,
                                                              help_text="Days before expiry to trigger alert")
    reorder_level = models.PositiveIntegerField(default=10,
                                                help_text="Minimum stock level before reorder alert")
    bin_number = models.CharField(max_length=50, blank=True, null=True)
    rack_number = models.CharField(max_length=50, blank=True, null=True)
    last_moved_at = models.DateTimeField(null=True, blank=True)
    last_moved_by = models.CharField(max_length=150, blank=True, null=True)
    tenant = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='inventories',
                               db_index=True, null=True, blank=True,
                               help_text="DEPRECATED: Tenant/Owner of this inventory record")
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE,
                                related_name='inventory_records', db_index=True,
                                help_text="Company this inventory belongs to")
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='created_inventories', help_text="User who created this record")
    updated_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='updated_inventories', help_text="User who last updated this record")
    is_deleted = models.BooleanField(default=False, help_text="Soft delete flag")

    objects = CompanyManager()
    all_objects = models.Manager()

    class Meta:
        verbose_name_plural = "Inventories"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['tenant', 'expiry_date']),
            models.Index(fields=['company', 'status']),
            models.Index(fields=['company', 'expiry_date']),
        ]

    def __str__(self):
        fish_name = "Unknown"
        try:
            if self.fish:
                fish_name = self.fish.name
        except (AttributeError, ObjectDoesNotExist):
            pass
        return f"{fish_name} - {self.remaining_packages} packages remaining"

    def save(self, *args, **kwargs):
        if not getattr(self, 'company_id', None):
            if getattr(self, 'tenant_id', None) and getattr(self.tenant, 'company_id', None):
                self.company_id = self.tenant.company_id
            else:
                raise ValidationError({'company': 'Company is required.'})
        super().save(*args, **kwargs)

    def _apply_stock_delta(self, packages_sold):
        if packages_sold < 0:
            raise ValidationError({'packages_sold': 'Packages sold cannot be negative.'})

        inventory = Inventory.objects.select_for_update().get(pk=self.pk)
        if packages_sold > inventory.remaining_packages:
            raise ValidationError({'packages_sold': 'Cannot sell more packages than remain in stock.'})

        inventory.sold_packages += packages_sold
        inventory.remaining_packages -= packages_sold

        if inventory.initial_packages > 0:
            weight_per_package = inventory.initial_weight_kg / inventory.initial_packages
            inventory.remaining_weight_kg = inventory.remaining_packages * weight_per_package

        if inventory.remaining_packages <= 0:
            inventory.status = 'out_of_stock'
        elif inventory.remaining_packages <= inventory.reorder_level:
            inventory.status = 'low_stock'
        else:
            inventory.status = 'in_stock'

        inventory.save(update_fields=['sold_packages', 'remaining_packages', 'remaining_weight_kg', 'status'])
        return inventory

    def update_stock(self, packages_sold):
        for attempt in range(MAX_STOCK_UPDATE_RETRIES):
            try:
                with transaction.atomic():
                    inventory = self._apply_stock_delta(packages_sold)
                break
            except OperationalError:
                if attempt == MAX_STOCK_UPDATE_RETRIES - 1:
                    raise
                time.sleep(0.01)

        self.sold_packages = inventory.sold_packages
        self.remaining_packages = inventory.remaining_packages
        self.remaining_weight_kg = inventory.remaining_weight_kg
        self.status = inventory.status
        return self

    def adjust_stock(self, packages_delta, weight_delta=None, movement_type='correction'):
        """
        Adjust stock packages and weight atomically (positive or negative).
        """
        from decimal import Decimal
        for attempt in range(MAX_STOCK_UPDATE_RETRIES):
            try:
                with transaction.atomic():
                    inventory = Inventory.objects.select_for_update().get(pk=self.pk)
                    
                    if inventory.remaining_packages + packages_delta < 0:
                        raise ValidationError({'remaining_packages': 'Remaining packages cannot be negative.'})
                    
                    inventory.remaining_packages += packages_delta
                    if packages_delta < 0:
                        inventory.sold_packages += abs(packages_delta)
                    else:
                        if movement_type == 'return':
                            inventory.sold_packages = max(0, inventory.sold_packages - packages_delta)
                    
                    if weight_delta is not None:
                        inventory.remaining_weight_kg = max(Decimal('0.00'), inventory.remaining_weight_kg + Decimal(str(weight_delta)))
                    else:
                        if inventory.initial_packages > 0:
                            weight_per_package = inventory.initial_weight_kg / inventory.initial_packages
                            inventory.remaining_weight_kg = inventory.remaining_packages * weight_per_package
                            
                    if inventory.remaining_packages <= 0:
                        inventory.status = 'out_of_stock'
                    elif inventory.remaining_packages <= inventory.reorder_level:
                        inventory.status = 'low_stock'
                    else:
                        inventory.status = 'in_stock'
                        
                    inventory.save(update_fields=['sold_packages', 'remaining_packages', 'remaining_weight_kg', 'status'])
                break
            except OperationalError:
                if attempt == MAX_STOCK_UPDATE_RETRIES - 1:
                    raise
                time.sleep(0.01)
                
        self.sold_packages = inventory.sold_packages
        self.remaining_packages = inventory.remaining_packages
        self.remaining_weight_kg = inventory.remaining_weight_kg
        self.status = inventory.status
        return self

    def check_expiry_alert(self):
        if self.expiry_date:
            from datetime import timedelta
            alert_date = self.expiry_date - timedelta(days=self.expiry_alert_threshold_days)
            return timezone.localdate() >= alert_date
        return False

    def needs_reorder(self):
        return self.remaining_packages <= self.reorder_level

    def get_stock_value(self):
        price_per_kg = self.purchase_batch.price_per_kg if self.purchase_batch and self.purchase_batch.price_per_kg is not None else Decimal("0.00")
        remaining_weight = self.remaining_weight_kg or Decimal("0.00")
        return remaining_weight * price_per_kg
