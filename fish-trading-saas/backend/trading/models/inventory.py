import time
import threading
from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.utils import OperationalError

from .fish import Fish
from .purchase_batch import PurchaseBatch
from services.base import CompanyManager

# CONCURRENCY NOTE: Process-local locking mechanism
# This lock prevents race conditions within a single worker process.
# However, it does NOT protect against concurrent access from multiple processes/workers.
# 
# Current Implementation:
# - threading.Lock() provides in-process mutual exclusion
# - select_for_update() provides database row-level locking
# - Combined approach works for single-worker deployments (development, small Gunicorn setup)
#
# PRODUCTION LIMITATION:
# In multi-worker deployments (Gunicorn with multiple workers, Celery workers, containers),
# each worker has its own process-local lock. This means:
# - Worker A and Worker B both acquire their locks simultaneously
# - Both proceed to select_for_update() on the same row
# - Database lock serializes updates, and one succeeds; the other gets OperationalError
# - The failed worker retries (up to 10 times with 0.01s backoff)
#
# This creates potential for:
# - Stock count inconsistencies if retry logic fails
# - Performance degradation under high concurrency
# - Lost updates if both retries exhaust for reasons other than lock contention
#
# RECOMMENDED FIX FOR PRODUCTION:
# Migrate to one of these solutions:
# 1. Use PostgreSQL advisory locks (postgresql-specific)
# 2. Implement Redis-based distributed locking (requires Redis; already in stack for Celery)
# 3. Use database-level constraints (e.g., CHECK inventory.remaining_packages >= 0)
# 4. Implement optimistic locking with version field
#
# For now, this implementation is acceptable for development and single-worker deployments.
# Plan migration to distributed locking before scaling to multi-worker production.

_inventory_update_lock = threading.Lock()


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
                               help_text="Tenant/Owner of this inventory record")
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE,
                                related_name='inventory_records', db_index=True,
                                null=True, blank=True,
                                help_text="Company this inventory belongs to")
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
        if not self.company_id and self.tenant_id and self.tenant.company_id:
            self.company = self.tenant.company
        if not self.tenant_id and self.company_id and self.company.admin_id:
            self.tenant = self.company.admin
        if self.tenant_id and self.company_id and self.tenant.company_id and self.tenant.company_id != self.company_id:
            raise ValidationError({'company': 'Company must match tenant owner company.'})
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
        with _inventory_update_lock:
            for attempt in range(10):
                try:
                    with transaction.atomic():
                        inventory = self._apply_stock_delta(packages_sold)
                    break
                except OperationalError:
                    if attempt == 9:
                        raise
                    time.sleep(0.01)

        self.sold_packages = inventory.sold_packages
        self.remaining_packages = inventory.remaining_packages
        self.remaining_weight_kg = inventory.remaining_weight_kg
        self.status = inventory.status
        return self

    def check_expiry_alert(self):
        if self.expiry_date:
            from datetime import datetime, timedelta
            alert_date = self.expiry_date - timedelta(days=self.expiry_alert_threshold_days)
            return datetime.now().date() >= alert_date
        return False

    def needs_reorder(self):
        return self.remaining_packages <= self.reorder_level

    def get_stock_value(self):
        price_per_kg = self.purchase_batch.price_per_kg if self.purchase_batch else Decimal("0.00")
        return self.remaining_weight_kg * price_per_kg
