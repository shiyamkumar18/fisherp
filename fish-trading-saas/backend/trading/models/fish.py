from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError

from .fish_category import FishCategory
from services.base import CompanyManager


class Fish(models.Model):
    """Fish model with tenant isolation"""
    UNIT_CHOICES = [
        ('kg', 'Kilogram'),
        ('box', 'Box'),
        ('piece', 'Piece'),
        ('bucket', 'Bucket'),
        ('tonne', 'Tonne'),
    ]
    
    # Primary fields
    name = models.CharField(max_length=100)
    category = models.ForeignKey(FishCategory, on_delete=models.PROTECT, related_name='fish')
    
    # Unit configuration
    unit_type = models.CharField(max_length=10, choices=UNIT_CHOICES, default='kg',
                                 help_text="Unit of measurement for this fish")
    box_weight_kg = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True,
                                        help_text="Weight per box in kg (only if unit_type is 'box')")
    
    # Tenant isolation - ForeignKey to User (tenant) with index for performance
    tenant = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='fish',
                               db_index=True,
                               help_text="Tenant/Owner of this fish record")
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='fish_records',
        db_index=True,
        null=True,
        blank=True,
        help_text="Company this fish belongs to",
    )
    
    is_deleted = models.BooleanField(default=False, help_text="Soft delete flag")
    
    objects = CompanyManager()
    all_objects = models.Manager()
    
    # Pricing
    min_price_per_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0, 
                                           help_text="Minimum historical price per kg")
    max_price_per_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                                           help_text="Maximum historical price per kg")
    avg_price_per_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                                           help_text="Average historical price per kg")
    
    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        # Ensure unique fish names per tenant
        unique_together = ['name', 'tenant']
        indexes = [
            models.Index(fields=['tenant', 'name']),
            models.Index(fields=['tenant', 'is_active']),
            models.Index(fields=['company', 'name']),
            models.Index(fields=['company', 'is_active']),
        ]

    def __str__(self):
        return self.name
    
    def clean(self):
        """Validate that box_weight_kg is provided when unit_type is 'box'"""
        if self.unit_type == 'box' and not self.box_weight_kg:
            raise ValidationError({'box_weight_kg': 'Box weight is required when unit type is box.'})
    
    def save(self, *args, **kwargs):
        # Keep company and tenant pointers aligned for backward compatibility.
        if not self.company_id and self.tenant_id and self.tenant.company_id:
            self.company = self.tenant.company
        if not self.tenant_id and self.company_id and self.company.admin_id:
            self.tenant = self.company.admin

        if self.tenant_id and self.company_id and self.tenant.company_id and self.tenant.company_id != self.company_id:
            raise ValidationError({'company': 'Company must match tenant owner company.'})
        self.full_clean()
        super().save(*args, **kwargs)
    
    def get_display_weight(self):
        """Get display weight based on unit type"""
        if self.unit_type == 'box' and self.box_weight_kg:
            return self.box_weight_kg
        return None
    
    def get_unit_display_name(self):
        """Get human-readable unit name"""
        return self.get_unit_type_display()
