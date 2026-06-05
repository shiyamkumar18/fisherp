from django.db import models
from django.core.exceptions import ObjectDoesNotExist
from services.base import CompanyManager

class SalesPermissionConfig(models.Model):
    ROLE_CHOICES = [
        ('tenant_admin', 'Tenant Admin'),
        ('accountant', 'Accountant'),
        ('trader', 'Trader'),
        ('store', 'Store / Inventory'),
    ]

    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE, related_name='sales_permission_configs')
    role = models.CharField(max_length=30, choices=ROLE_CHOICES)
    
    can_create_sale = models.BooleanField(default=True)
    can_edit_sale = models.BooleanField(default=True)
    can_cancel_sale = models.BooleanField(default=True)
    can_approve_sale = models.BooleanField(default=True)
    can_view_profit = models.BooleanField(default=True)
    can_payment_access = models.BooleanField(default=True)
    can_export_invoice = models.BooleanField(default=True)
    can_print_invoice = models.BooleanField(default=True)
    can_report_access = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CompanyManager()
    all_objects = models.Manager()

    class Meta:
        unique_together = ('company', 'role')
        ordering = ['role']

    def __str__(self):
        company_name = "Unknown"
        try:
            if self.company:
                company_name = self.company.name
        except (AttributeError, ObjectDoesNotExist):
            pass
        return f"Permissions for {self.role} in {company_name}"
