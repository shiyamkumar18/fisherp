from decimal import Decimal
import uuid
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.core.validators import FileExtensionValidator, MinValueValidator

from .fish import Fish
from .fish_category import FishCategory
from .supplier import Supplier
from services.base import CompanyManager



from django.utils.timezone import now
from django.db import transaction

@transaction.atomic
def generate_purchase_number():
    today = now().strftime("%Y%m%d")
    prefix = f"PO-{today}"
    # Lock rows for update to prevent race conditions
    count = PurchaseBatch.objects.select_for_update().filter(
        purchase_number__startswith=prefix
    ).count()
    new_number = count + 1
    return f"{prefix}-{str(new_number).zfill(3)}"


class PurchaseBatch(models.Model):
    purchase_number = models.CharField(max_length=20, unique=True, blank=True, help_text="Auto-generated unique sequential purchase number")
    PURCHASE_TYPE_CHOICES = [
        ("direct", "Direct"),
        ("auction", "Auction"),
        ("package", "Boxes"),
        ("bucket", "Bucket"),
        ("kg", "Kg"),
    ]

    batch_number = models.CharField(max_length=50, unique=True, blank=True, null=True,
                                    help_text="Auto-generated or manual batch reference")  # Legacy, keep for now
    purchase_type = models.CharField(max_length=15, choices=PURCHASE_TYPE_CHOICES)
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, null=True, blank=True, related_name='purchase_batches')
    fisherman_name = models.CharField(max_length=150, blank=True, null=True,
                                      help_text="Used if supplier not registered")
    place_of_buying = models.CharField(max_length=200, blank=True, null=True)
    fish = models.ForeignKey(Fish, on_delete=models.PROTECT, related_name='purchase_batches')
    fish_category = models.ForeignKey(FishCategory, on_delete=models.SET_NULL, null=True, blank=True)
    date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    number_of_packages = models.PositiveIntegerField(help_text="Number of boxes/buckets/packages")
    package_weight = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("37.00"),
                                         help_text="Weight per package in kg",
                                         validators=[MinValueValidator(Decimal("0.01"))])
    total_weight = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    price_per_kg = models.DecimalField(max_digits=10, decimal_places=2, help_text="Buying price per kg",
                                       validators=[MinValueValidator(Decimal("0.01"))])
    fish_cost = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    labour_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Loading/unloading labor",
                                      validators=[MinValueValidator(Decimal("0.00"))])
    ice_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Ice for preservation",
                                   validators=[MinValueValidator(Decimal("0.00"))])
    transport_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Transportation charges",
                                         validators=[MinValueValidator(Decimal("0.00"))])
    commission_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Agent/broker commission",
                                          validators=[MinValueValidator(Decimal("0.00"))])
    other_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Miscellaneous expenses",
                                     validators=[MinValueValidator(Decimal("0.00"))])
    total_expense = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    actual_cost_per_kg = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    cost_per_package = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                                      validators=[MinValueValidator(Decimal("0.00"))])
    pending_amount = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    status = models.CharField(max_length=15, choices=[
        ('pending', 'Pending'),
        ('partial', 'Partially Paid'),
        ('paid', 'Fully Paid'),
        ('cancelled', 'Cancelled'),
    ], default='pending')
    notes = models.TextField(blank=True, null=True)
    quality_grade = models.CharField(max_length=20, blank=True, null=True,
                                     help_text="Quality grade of fish (A, B, C, etc.)")
    inspection_date = models.DateField(null=True, blank=True)
    inspector_name = models.CharField(max_length=150, blank=True, null=True)
    quality_score = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True,
                                        help_text="Quality score out of 10.00")
    freshness_score = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True,
                                          help_text="Freshness score out of 10.00")
    fish_photo = models.ImageField(
        upload_to='purchase_photos/%Y/%m/', blank=True, null=True,
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])]
    )
    quality_certificate = models.FileField(
        upload_to='purchase_documents/%Y/%m/', blank=True, null=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png'])]
    )
    invoice_document = models.FileField(
        upload_to='purchase_documents/%Y/%m/', blank=True, null=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png'])]
    )
    transport_vehicle_number = models.CharField(max_length=50, blank=True, null=True)
    transport_driver_name = models.CharField(max_length=150, blank=True, null=True)
    transport_driver_phone = models.CharField(max_length=15, blank=True, null=True)
    arrival_time = models.DateTimeField(null=True, blank=True)
    estimated_expiry_date = models.DateField(null=True, blank=True)
    tenant = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='purchase_batches',
                               db_index=True, null=True, blank=True,
                               help_text="DEPRECATED: Tenant/Owner of this purchase batch record")
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE,
                                related_name='purchase_batch_records', db_index=True,
                                help_text="Company this purchase batch belongs to")
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='created_purchases', help_text="User who created this record")
    updated_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='updated_purchases', help_text="User who last updated this record")
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = CompanyManager()
    all_objects = models.Manager()

    class Meta:
        pass

    def calculate_fields(self, explicit_pending=None):
        from services.trading.calculation_service import CalculationService
        metrics = CalculationService.calculate_purchase_metrics(
            packages=self.number_of_packages,
            package_weight=self.package_weight,
            price_per_kg=self.price_per_kg,
            labour_cost=self.labour_cost,
            ice_cost=self.ice_cost,
            transport_cost=self.transport_cost,
            commission_cost=self.commission_cost,
            other_cost=self.other_cost,
            amount_paid=self.amount_paid,
            explicit_pending=explicit_pending
        )
        
        self.total_weight = metrics['total_weight']
        self.fish_cost = metrics['fish_cost']
        self.total_expense = metrics['total_expense']
        self.actual_cost_per_kg = metrics['actual_cost_per_kg']
        self.cost_per_package = metrics['cost_per_package']
        self.pending_amount = metrics['pending_amount']
        self.amount_paid = metrics['amount_paid']
        
        # We don't set status here; we let save() handle status logic
        # or we could return it to save(). For now, let's just compute fields.

    def save(self, *args, **kwargs):
        if not self.purchase_number:
            self.purchase_number = generate_purchase_number()
        # Legacy batch_number logic (optional, can be removed if not needed)
        if not self.batch_number:
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S%f')
            self.batch_number = f"BATCH-{timestamp}-{uuid.uuid4().hex[:6]}"
        
        if not getattr(self, 'company_id', None):
            raise ValidationError({'company': 'Company is required.'})

        # Backward compatibility for fisherman_name
        if self.supplier:
            self.fisherman_name = self.supplier.name

        explicit_pending = self.pending_amount
        self.full_clean()
        
        # We pass explicit_pending directly into calculate_fields which defers to CalculationService
        self.calculate_fields(explicit_pending=explicit_pending)

        # Status sync
        if (self.pending_amount or Decimal("0.00")) <= 0 and (self.total_expense or Decimal("0.00")) > 0:
            self.status = 'paid'
        elif (self.amount_paid or Decimal("0.00")) > 0:
            self.status = 'partial'
        else:
            self.status = 'pending'

        super().save(*args, **kwargs)

    def __str__(self):
        supplier_name = self.supplier.name if self.supplier else self.fisherman_name
        return f"Batch #{self.batch_number or self.id} - {supplier_name} - {self.date}"

    def clean(self):
        if self.number_of_packages is not None and self.number_of_packages <= 0:
            raise ValidationError({'number_of_packages': 'Number of packages must be greater than 0.'})
        if self.package_weight is not None and self.package_weight <= 0:
            raise ValidationError({'package_weight': 'Package weight must be greater than 0.'})
        if self.price_per_kg is not None and self.price_per_kg < 0:
            raise ValidationError({'price_per_kg': 'Price per kg cannot be negative.'})
        for field in ['labour_cost', 'ice_cost', 'transport_cost', 'commission_cost', 'other_cost']:
            value = getattr(self, field)
            if value is not None and value < 0:
                raise ValidationError({field: f'{field.replace("_", " ").title()} cannot be negative.'})
        if self.amount_paid is not None and self.amount_paid < 0:
            raise ValidationError({'amount_paid': 'Amount paid cannot be negative.'})
        
        self.calculate_fields()
        
        amount_paid = self.amount_paid or Decimal("0.00")
        total_expense = self.total_expense or Decimal("0.00")
        
        if amount_paid > total_expense:
            raise ValidationError({'amount_paid': 'Amount paid cannot exceed total expense.'})

    def get_remaining_packages(self):
        from django.db.models import Sum
        from .sale import Sale
        sold = Sale.objects.filter(batch=self).aggregate(total=Sum('number_of_packages_sold'))['total'] or 0
        return self.number_of_packages - sold

    def get_sold_packages(self):
        from django.db.models import Sum
        from .sale import Sale
        return Sale.objects.filter(batch=self).aggregate(total=Sum('number_of_packages_sold'))['total'] or 0

    def get_sales_summary(self):
        from django.db.models import Sum
        from .sale import Sale
        return Sale.objects.filter(batch=self).aggregate(
            total_revenue=Sum('total_revenue'),
            total_cost=Sum('total_cost'),
            total_profit=Sum('profit'),
            total_packages=Sum('number_of_packages_sold')
        )

    def get_cost_per_package(self):
        return self.cost_per_package
