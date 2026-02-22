from decimal import Decimal
from django.db import models
from django.utils import timezone
from companies.models import Company
from django.core.exceptions import ValidationError


# ===============================
# FISH
# ===============================

class Fish(models.Model):
    name = models.CharField(max_length=100)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)

    class Meta:
        unique_together = ("name", "company")

    def __str__(self):
        return self.name


# ===============================
# BUYER
# ===============================

class Buyer(models.Model):
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, blank=True, null=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)

    class Meta:
        unique_together = ("name", "company")

    def __str__(self):
        return self.name


# ===============================
# PURCHASE BATCH (AUCTION)
# ===============================

class PurchaseBatch(models.Model):

    PURCHASE_TYPE_CHOICES = [
        ("boat", "Boat"),
        ("auction", "Auction"),
        ("bucket", "Bucket"),
    ]

    purchase_type = models.CharField(max_length=10, choices=PURCHASE_TYPE_CHOICES)
    fisherman_name = models.CharField(max_length=150)
    place_of_buying = models.CharField(max_length=200)

    fish = models.ForeignKey(Fish, on_delete=models.PROTECT)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)

    date = models.DateField(default=timezone.now)

    number_of_packages = models.PositiveIntegerField()

    # Buying weight per package (always 37kg)
    package_weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("37.00")
    )

    total_weight = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    price_per_kg = models.DecimalField(max_digits=10, decimal_places=2)

    fish_cost = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    labour_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    ice_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    transport_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commission_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    total_expense = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    actual_cost_per_kg = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    # ✅ NEW — cost per box
    cost_per_package = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    pending_amount = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    def calculate_fields(self):

        # Handle None values for required fields
        number_of_packages = self.number_of_packages if self.number_of_packages is not None else 0
        package_weight = self.package_weight if self.package_weight is not None else Decimal("0.00")
        price_per_kg = self.price_per_kg if self.price_per_kg is not None else Decimal("0.00")
        
        # Handle None values for optional cost fields
        labour_cost = self.labour_cost if self.labour_cost is not None else Decimal("0.00")
        ice_cost = self.ice_cost if self.ice_cost is not None else Decimal("0.00")
        transport_cost = self.transport_cost if self.transport_cost is not None else Decimal("0.00")
        commission_cost = self.commission_cost if self.commission_cost is not None else Decimal("0.00")
        other_cost = self.other_cost if self.other_cost is not None else Decimal("0.00")
        amount_paid = self.amount_paid if self.amount_paid is not None else Decimal("0.00")

        self.total_weight = number_of_packages * package_weight
        self.fish_cost = self.total_weight * price_per_kg

        self.total_expense = (
            self.fish_cost
            + labour_cost
            + ice_cost
            + transport_cost
            + commission_cost
            + other_cost
        )

        if self.total_weight > 0:
            self.actual_cost_per_kg = self.total_expense / self.total_weight
        else:
            self.actual_cost_per_kg = Decimal("0.00")

        # ✅ Cost per box
        self.cost_per_package = self.actual_cost_per_kg * package_weight

        self.pending_amount = self.total_expense - amount_paid

    def save(self, *args, **kwargs):
        self.calculate_fields()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.fisherman_name} - {self.date}"

    def clean(self):
        
        # Validate number_of_packages
        if self.number_of_packages is not None and self.number_of_packages <= 0:
            raise ValidationError({'number_of_packages': 'Number of packages must be greater than 0.'})
        
        # Validate package_weight
        if self.package_weight is not None and self.package_weight <= 0:
            raise ValidationError({'package_weight': 'Package weight must be greater than 0.'})
        
        # Validate price_per_kg
        if self.price_per_kg is not None and self.price_per_kg < 0:
            raise ValidationError({'price_per_kg': 'Price per kg cannot be negative.'})
        
        # Validate all cost fields
        cost_fields = ['labour_cost', 'ice_cost', 'transport_cost', 'commission_cost', 'other_cost']
        for field in cost_fields:
            value = getattr(self, field)
            if value is not None and value < 0:
                raise ValidationError({field: f'{field.replace("_", " ").title()} cannot be negative.'})
        
        # Validate amount_paid
        if self.amount_paid is not None and self.amount_paid < 0:
            raise ValidationError({'amount_paid': 'Amount paid cannot be negative.'})
        
        # Validate amount_paid <= total_expense (after calculating fields)
        self.calculate_fields()
        if self.amount_paid > self.total_expense:
            raise ValidationError({'amount_paid': 'Amount paid cannot exceed total expense.'})

    # ✅ RESOLVED: Changed to instance method for proper access to self in Sale.clean()
    def get_remaining_packages(self):
        """Calculate remaining packages available for sale in this batch."""
        from django.db.models import Sum
        from trading.models import Sale
        
        sold = Sale.objects.filter(batch=self).aggregate(
            total=Sum('number_of_packages_sold')
        )['total'] or 0
        return self.number_of_packages - sold
    
# ===============================
# SALE
# ===============================

class Sale(models.Model):

    batch = models.ForeignKey(PurchaseBatch, on_delete=models.PROTECT)
    buyer = models.ForeignKey(Buyer, on_delete=models.PROTECT)

    date = models.DateField(default=timezone.now)

    # Selling by box count
    number_of_packages_sold = models.PositiveIntegerField()

    # Selling weight per box (like 27kg)
    selling_weight_per_package = models.DecimalField(max_digits=5, decimal_places=2)

    selling_price_per_kg = models.DecimalField(max_digits=10, decimal_places=2)

    total_revenue = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    profit = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    amount_received = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    pending_amount = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    def clean(self):
        
        # Validate number_of_packages_sold
        if self.number_of_packages_sold is not None and self.number_of_packages_sold <= 0:
            raise ValidationError({'number_of_packages_sold': 'Number of packages sold must be greater than 0.'})
        
        # Validate selling_weight_per_package
        if self.selling_weight_per_package is not None and self.selling_weight_per_package <= 0:
            raise ValidationError({'selling_weight_per_package': 'Selling weight per package must be greater than 0.'})
        
        # Validate selling_price_per_kg
        if self.selling_price_per_kg is not None and self.selling_price_per_kg < 0:
            raise ValidationError({'selling_price_per_kg': 'Selling price per kg cannot be negative.'})
        
        # Validate amount_received
        if self.amount_received is not None and self.amount_received < 0:
            raise ValidationError({'amount_received': 'Amount received cannot be negative.'})
        
        # Calculate fields first
        self.calculate_fields()
        
        # Validate amount_received <= total_revenue
        if self.amount_received > self.total_revenue:
            raise ValidationError({'amount_received': 'Amount received cannot exceed total revenue.'})
        
        # ✅ RESOLVED: Validate number_of_packages_sold <= remaining packages in batch
        # FIX: When updating existing sale, get ORIGINAL value from database, not new value
        if self.batch:
            remaining = self.batch.get_remaining_packages()
            # If updating existing sale, add back its ORIGINAL sold count from DB
            if self.pk:
                old_sale = Sale.objects.get(pk=self.pk)
                remaining += old_sale.number_of_packages_sold
            
            if self.number_of_packages_sold > remaining:
                raise ValidationError({
                    'number_of_packages_sold': f'Cannot sell {self.number_of_packages_sold} packages. Only {remaining} packages remaining in this batch.'
                })

    company = models.ForeignKey(Company, on_delete=models.CASCADE)

    def calculate_fields(self):

        # Handle None values for required fields
        number_of_packages_sold = self.number_of_packages_sold if self.number_of_packages_sold is not None else 0
        selling_weight_per_package = self.selling_weight_per_package if self.selling_weight_per_package is not None else Decimal("0.00")
        selling_price_per_kg = self.selling_price_per_kg if self.selling_price_per_kg is not None else Decimal("0.00")
        batch_cost_per_package = self.batch.cost_per_package if self.batch and self.batch.cost_per_package is not None else Decimal("0.00")
        amount_received = self.amount_received if self.amount_received is not None else Decimal("0.00")

        # Revenue
        self.total_revenue = (
            number_of_packages_sold
            * selling_weight_per_package
            * selling_price_per_kg
        )

        # Cost (based on 37kg cost per box)
        self.total_cost = number_of_packages_sold * batch_cost_per_package

        self.profit = self.total_revenue - self.total_cost

        self.pending_amount = self.total_revenue - amount_received

    def save(self, *args, **kwargs):
        self.calculate_fields()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Sale - {self.batch}"