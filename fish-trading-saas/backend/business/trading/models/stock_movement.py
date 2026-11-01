from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from .fish import Fish
from .purchase_batch import PurchaseBatch
from .inventory import Inventory
from services.base import CompanyManager

class StockMovement(models.Model):
    MOVEMENT_TYPE_CHOICES = [
        ('purchase', 'Purchase Intake'),
        ('sale', 'Sale Outflow'),
        ('return', 'Customer Return'),
        ('damage', 'Stock Damage'),
        ('wastage', 'Wastage Loss'),
        ('correction', 'Inventory Correction'),
    ]

    fish = models.ForeignKey(Fish, on_delete=models.CASCADE, related_name='stock_movements')
    purchase_batch = models.ForeignKey(PurchaseBatch, on_delete=models.CASCADE, related_name='stock_movements')
    inventory = models.ForeignKey(Inventory, on_delete=models.CASCADE, related_name='stock_movements')
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPE_CHOICES)
    quantity_packages = models.IntegerField(help_text="Change in packages (positive for additions, negative for deductions)")
    weight_kg = models.DecimalField(max_digits=10, decimal_places=2, help_text="Change in weight in kg")
    notes = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(default=timezone.now)
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE, related_name='stock_movements')
    tenant = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='stock_movements', null=True, blank=True, help_text="DEPRECATED: Tenant/Owner of this record")
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='created_stock_movements', help_text="User who created this record")
    updated_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='updated_stock_movements', help_text="User who last updated this record")

    objects = CompanyManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['company', 'movement_type']),
            models.Index(fields=['inventory', 'timestamp']),
        ]

    def __str__(self):
        fish_name = "Unknown"
        try:
            if self.fish:
                fish_name = self.fish.name
        except (AttributeError, ObjectDoesNotExist):
            pass
        return f"{self.get_movement_type_display()} - {self.quantity_packages} pkg ({self.weight_kg} kg) of {fish_name} at {self.timestamp}"

    def save(self, *args, **kwargs):
        if not getattr(self, 'company_id', None):
            if getattr(self, 'tenant_id', None) and getattr(self.tenant, 'company_id', None):
                self.company_id = self.tenant.company_id
            else:
                raise ValidationError({'company': 'Company is required.'})
