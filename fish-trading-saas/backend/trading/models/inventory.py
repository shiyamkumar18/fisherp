from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError

from .fish import Fish
from .purchase_batch import PurchaseBatch
from services.base import CompanyManager


class Inventory(models.Model):
    """Track current stock/inventory"""
    
    fish = models.ForeignKey(Fish, on_delete=models.CASCADE, related_name='inventory')
    purchase_batch = models.ForeignKey(PurchaseBatch, on_delete=models.CASCADE, related_name='inventory_items')
    
    # Stock quantities
    initial_packages = models.PositiveIntegerField()
    remaining_packages = models.PositiveIntegerField()
    sold_packages = models.PositiveIntegerField(default=0)
    
    # Weight tracking
    initial_weight_kg = models.DecimalField(max_digits=10, decimal_places=2)
    remaining_weight_kg = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Status
    STATUS_CHOICES = [
        ('in_stock', 'In Stock'),
        ('low_stock', 'Low Stock'),
        ('out_of_stock', 'Out of Stock'),
        ('expired', 'Expired'),
    ]
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='in_stock')
    
    # Storage
    storage_location = models.CharField(max_length=100, blank=True, null=True)
    expiry_date = models.DateField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Temperature tracking
    current_temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True,
                                              help_text="Current storage temperature in Celsius")
    temperature_last_checked = models.DateTimeField(null=True, blank=True)
    
    # Expiry and alerts
    expiry_alert_threshold_days = models.PositiveIntegerField(default=2,
                                                              help_text="Days before expiry to trigger alert")
    reorder_level = models.PositiveIntegerField(default=10,
                                                help_text="Minimum stock level before reorder alert")
    
    # Location tracking
    bin_number = models.CharField(max_length=50, blank=True, null=True)
    rack_number = models.CharField(max_length=50, blank=True, null=True)
    
    # Last movement tracking
    last_moved_at = models.DateTimeField(null=True, blank=True)
    last_moved_by = models.CharField(max_length=150, blank=True, null=True)
    
    # Tenant isolation - ForeignKey to User (tenant) with index for performance
    tenant = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='inventories',
                               db_index=True,
                               null=True, blank=True,
                               help_text="Tenant/Owner of this inventory record")
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='inventory_records',
        db_index=True,
        null=True,
        blank=True,
        help_text="Company this inventory belongs to",
    )
    
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
        return f"{self.fish.name} - {self.remaining_packages} packages remaining"

    def save(self, *args, **kwargs):
        # Keep company and tenant pointers aligned for backward compatibility.
        if not self.company_id and self.tenant_id and self.tenant.company_id:
            self.company = self.tenant.company
        if not self.tenant_id and self.company_id and self.company.admin_id:
            self.tenant = self.company.admin
        if self.tenant_id and self.company_id and self.tenant.company_id and self.tenant.company_id != self.company_id:
            raise ValidationError({'company': 'Company must match tenant owner company.'})
        super().save(*args, **kwargs)
    

    from django.db import transaction
    from django.db.models import F
    
    @transaction.atomic
    def update_stock(self, packages_sold):
        """Update stock after sale with atomic updates"""
        inventory = Inventory.objects.select_for_update().get(pk=self.pk)
        inventory.sold_packages = F('sold_packages') + packages_sold
        inventory.remaining_packages = F('initial_packages') - F('sold_packages')
        
        # Update weight proportionally
        if inventory.initial_packages > 0:
            weight_per_package = inventory.initial_weight_kg / inventory.initial_packages
            inventory.remaining_weight_kg = inventory.remaining_packages * weight_per_package
        
        # Update status
        if inventory.remaining_packages <= 0:
            inventory.status = 'out_of_stock'
        elif inventory.remaining_packages <= self.reorder_level:
            inventory.status = 'low_stock'
        
        inventory.save(update_fields=['sold_packages', 'remaining_packages', 'remaining_weight_kg', 'status'])

    
    def check_expiry_alert(self):
        """Check if expiry alert should be triggered"""
        if self.expiry_date:
            from datetime import datetime, timedelta
            alert_date = self.expiry_date - timedelta(days=self.expiry_alert_threshold_days)
            return datetime.now().date() >= alert_date
        return False
    
    def needs_reorder(self):
        """Check if stock needs reordering"""
        return self.remaining_packages <= self.reorder_level

    def get_stock_value(self):
        """Backward-compatible stock valuation helper."""
        price_per_kg = self.purchase_batch.price_per_kg if self.purchase_batch else Decimal("0.00")
        return self.remaining_weight_kg * price_per_kg
