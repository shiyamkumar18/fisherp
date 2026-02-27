from decimal import Decimal
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError

from .purchase_batch import PurchaseBatch
from .buyer import Buyer


class Sale(models.Model):
    """Sales transaction to buyers"""

    SALE_TYPE_CHOICES = [
        ('retail', 'Retail Sale'),
        ('wholesale', 'Wholesale'),
        ('export', 'Export'),
        ('bulk', 'Bulk Sale'),
    ]
    
    # References
    batch = models.ForeignKey(PurchaseBatch, on_delete=models.PROTECT, related_name='sales')
    buyer = models.ForeignKey(Buyer, on_delete=models.PROTECT, related_name='sales')
    
    # Sale info
    sale_type = models.CharField(max_length=15, choices=SALE_TYPE_CHOICES, default='retail')
    invoice_number = models.CharField(max_length=50, blank=True, null=True, unique=True)
    
    # Dates
    date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Quantity and pricing
    number_of_packages_sold = models.PositiveIntegerField(help_text="Number of packages sold")
    selling_weight_per_package = models.DecimalField(max_digits=5, decimal_places=2, 
                                                      help_text="Weight per package sold (e.g., 27kg)")
    selling_price_per_kg = models.DecimalField(max_digits=10, decimal_places=2, help_text="Selling price per kg")

    # Financial calculations
    total_revenue = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    profit = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    profit_margin_percent = models.DecimalField(max_digits=5, decimal_places=2, editable=False, default=0)

    # Payment tracking
    amount_received = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    pending_amount = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    
    # Payment status
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Payment Pending'),
        ('partial', 'Partially Paid'),
        ('paid', 'Fully Paid'),
        ('overdue', 'Overdue'),
    ]
    payment_status = models.CharField(max_length=15, choices=PAYMENT_STATUS_CHOICES, default='pending')
    due_date = models.DateField(null=True, blank=True, help_text="Payment due date")
    
    # Delivery info
    delivery_address = models.TextField(blank=True, null=True)
    delivery_status = models.CharField(max_length=20, blank=True, null=True, 
                                       choices=[('pending', 'Pending'), ('shipped', 'Shipped'), 
                                               ('delivered', 'Delivered'), ('cancelled', 'Cancelled')])
    
    # Notes
    notes = models.TextField(blank=True, null=True)
    
    # Discount and tax fields
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                                          help_text="Flat discount amount")
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                           help_text="Discount percentage")
    
    # Tax calculation
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                      help_text="Tax percentage (e.g., GST)")
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Shipping and delivery
    shipping_tracking_number = models.CharField(max_length=100, blank=True, null=True)
    shipping_carrier = models.CharField(max_length=100, blank=True, null=True)
    delivery_confirmed_at = models.DateTimeField(null=True, blank=True)
    delivered_by = models.CharField(max_length=150, blank=True, null=True)
    
    # Return/Refund fields
    is_returned = models.BooleanField(default=False)
    return_date = models.DateField(null=True, blank=True)
    return_reason = models.TextField(blank=True, null=True)
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Final calculations
    final_amount = models.DecimalField(max_digits=10, decimal_places=2, editable=False, default=0)
    
    # Tenant isolation - ForeignKey to User (tenant) with index for performance
    tenant = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='sales',
                               db_index=True,
                               null=True, blank=True,
                               help_text="Tenant/Owner of this sale record")

    def clean(self):
        """Validate all fields"""
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
        
        # Validate number_of_packages_sold <= remaining packages in batch
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

    def calculate_fields(self):
        """Calculate all financial fields"""

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

        # Cost (based on batch cost per package)
        self.total_cost = number_of_packages_sold * batch_cost_per_package

        self.profit = self.total_revenue - self.total_cost
        
        # Calculate profit margin percentage
        if self.total_revenue > 0:
            self.profit_margin_percent = (self.profit / self.total_revenue) * 100

        self.pending_amount = self.total_revenue - amount_received
        
        # Calculate final amount with discount and tax
        discounted_amount = self.total_revenue - self.discount_amount - (self.total_revenue * self.discount_percent / 100)
        self.tax_amount = discounted_amount * self.tax_percent / 100
        self.final_amount = discounted_amount + self.tax_amount


    def save(self, *args, **kwargs):
        # Auto-generate invoice number if not provided
        if not self.invoice_number:
            from datetime import datetime
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            self.invoice_number = f"INV-{timestamp}-{self.id or 'NEW'}"
        
        # This ensures clean() validation runs even when saving directly
        self.full_clean()
        self.calculate_fields()
        
        # Update payment status
        if self.pending_amount <= 0 and self.total_revenue > 0:
            self.payment_status = 'paid'
        elif self.amount_received > 0:
            self.payment_status = 'partial'
        else:
            self.payment_status = 'pending'
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Sale #{self.invoice_number or self.id} - {self.buyer.name} - {self.date}"
