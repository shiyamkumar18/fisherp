from django.db import models
from django.core.exceptions import ValidationError

from .fish_category import FishCategory
from services.base import CompanyManager


class Fish(models.Model):
    UNIT_CHOICES = [
        ('kg', 'Kilogram'),
        ('box', 'Box'),
        ('piece', 'Piece'),
        ('bucket', 'Bucket'),
        ('tonne', 'Tonne'),
    ]
    
    name = models.CharField(max_length=100)
    category = models.ForeignKey(FishCategory, on_delete=models.PROTECT, related_name='fish')
    unit_type = models.CharField(max_length=10, choices=UNIT_CHOICES, default='kg',
                                 help_text="Unit of measurement for this fish")
    box_weight_kg = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True,
                                        help_text="Weight per box in kg (only if unit_type is 'box')")
    tenant = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='fish',
                               db_index=True, help_text="Tenant/Owner of this fish record")
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE,
                                related_name='fish_records', db_index=True,
                                null=True, blank=True,
                                help_text="Company this fish belongs to")
    is_deleted = models.BooleanField(default=False, help_text="Soft delete flag")
    min_price_per_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                                           help_text="Minimum historical price per kg")
    max_price_per_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                                           help_text="Maximum historical price per kg")
    avg_price_per_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                                           help_text="Average historical price per kg")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CompanyManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ['name']
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
        if self.unit_type == 'box' and not self.box_weight_kg:
            raise ValidationError({'box_weight_kg': 'Box weight is required when unit type is box.'})

    def save(self, *args, **kwargs):
        if not self.company_id and self.tenant_id and self.tenant.company_id:
            self.company = self.tenant.company
        if not self.tenant_id and self.company_id and self.company.admin_id:
            self.tenant = self.company.admin
        if self.tenant_id and self.company_id and self.tenant.company_id and self.tenant.company_id != self.company_id:
            raise ValidationError({'company': 'Company must match tenant owner company.'})
        self.full_clean()
        super().save(*args, **kwargs)

    def get_display_weight(self):
        if self.unit_type == 'box' and self.box_weight_kg:
            return self.box_weight_kg
        return None

    def get_unit_display_name(self):
        return self.get_unit_type_display()
