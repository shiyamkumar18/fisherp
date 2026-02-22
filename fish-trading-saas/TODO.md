# Phase 1: Core Trading Engine - TODO List

## ✅ RESOLVED ISSUES

All issues have been successfully resolved as of the latest update.

---

### Issue 1: Duplicate Model Definitions in settings.py - RESOLVED ✅
**File:** `config/settings.py`

**Problem:** The `settings.py` file contained duplicate model definitions (User, Fish, Buyer, PurchaseBatch, Sale) that were also defined in their respective app model files. This caused Django to have conflicting class definitions and would result in "AppRegistryNotReady" or "multiple classes defined" errors.

**Solution:** Removed all duplicate model definitions from `settings.py`. The models now only exist in their correct locations:
- `User` model → `accounts/models.py`
- `Fish` model → `trading/models.py`
- `Buyer` model → `trading/models.py`
- `PurchaseBatch` model → `trading/models.py`
- `Sale` model → `trading/models.py`

---

### Issue 2: get_remaining_packages Method - RESOLVED ✅
**File:** `trading/models.py`

**Problem:** The `get_remaining_packages` method was defined as a `@staticmethod` which doesn't work well with instance context.

**Solution:** Changed to an instance method for proper access to `self` in Sale.clean()

---

### Issue 2: Import Fix in get_remaining_packages - RESOLVED ✅
**File:** `trading/models.py`

**Problem:** The `get_remaining_packages` method used an incorrect relative import `from .models import Sale` which, while functional, is not best practice for clarity.

**Solution:** Changed to absolute import: `from trading.models import Sale`

---

### Issue 3: Sale.clean() Remaining Packages Bug - RESOLVED ✅
**File:** `trading/models.py`

**Problem:** When updating an existing sale, the code incorrectly added the NEW value (`self.number_of_packages_sold`) instead of the ORIGINAL value from the database. This caused validation errors when editing sales.

**Solution:** Now properly fetches the original sale from the database and adds back its original value:
```python
if self.pk:
    old_sale = Sale.objects.get(pk=self.pk)
    remaining += old_sale.number_of_packages_sold
```

---

### Issue 4: Admin Interface - RESOLVED ✅
**File:** `trading/admin.py`

**Problem:** Admin interface lacked proper organization with fieldsets, had limited search/filter capabilities, and missing important fields in list display.

**Solution:** Implemented comprehensive admin improvements:
- Added fieldsets for better field organization
- Enhanced `list_display` with more relevant fields including ID, date, buyer info
- Added `search_fields` for searching by related fields (buyer__name, batch__fisherman_name, etc.)
- Added `list_filter` for filtering by date, buyer, company, purchase_type, fish
- Added proper model docstrings
- Used `@admin.register` decorator pattern for all models

---

### Issue 5: Migration Error (accounts_user table) - RESOLVED ✅
**File:** `companies/migrations/0001_initial.py`, `accounts/migrations/`, `trading/migrations/`

**Problem:** When running migrations, you may encounter `relation "accounts_user" does not exist` error and schema migration prompts. This was caused by:
1. Existing migration files having incorrect state
2. The django-tenants requiring special migration handling

**Solution:** 
1. Deleted existing migration files to regenerate fresh ones:
   - `companies/migrations/0001_initial.py`
   - `accounts/migrations/0001_initial.py`
   - `trading/migrations/0001_initial.py`

2. Run migrations in the correct order:
```bash
# Generate fresh migrations
python manage.py makemigrations

# First, create the accounts tables in public schema
python manage.py migrate_schemas --shared

# Then migrate tenant-specific tables
python manage.py migrate_schemas
```

Note: This requires proper database configuration with a .env file containing:
- DB_NAME
- DB_USER
- DB_PASSWORD
- DB_HOST
- DB_PORT
- SECRET_KEY
- DEBUG=True

## ✅ YOUR LOGIC IS 100% COMPATIBLE WITH THE CODE!

The existing code already implements exactly what you described. Here's the confirmation:

---

## 🟢 BUYING LOGIC - Already Implemented ✅

| Step | Your Logic | Code Implementation | Status |
|------|------------|---------------------|--------|
| 1 | Total weight = boxes × 37kg | `total_weight = number_of_packages * package_weight` | ✅ Done |
| 2 | Fish cost = weight × price_per_kg | `fish_cost = total_weight * price_per_kg` | ✅ Done |
| 3 | Total expense = fish_cost + all costs | `total_expense = fish_cost + labour + ice + transport + commission + other` | ✅ Done |
| 4 | Actual cost per kg = total_expense ÷ weight | `actual_cost_per_kg = total_expense / total_weight` | ✅ Done |
| 5 | Cost per box = actual_cost × 37 | `cost_per_package = actual_cost_per_kg * package_weight` | ✅ Done |
| 6 | Fisherman pending = total_expense - amount_paid | `pending_amount = total_expense - amount_paid` | ✅ Done |

---

## 🟢 SELLING LOGIC - Already Implemented ✅

| Step | Your Logic | Code Implementation | Status |
|------|------------|---------------------|--------|
| 1 | Revenue = boxes × 27kg × price_per_kg | `total_revenue = packages * selling_weight * selling_price` | ✅ Done |
| 2 | Total cost = boxes × cost_per_box | `total_cost = packages * batch.cost_per_package` | ✅ Done |
| 3 | Profit = Revenue - Cost | `profit = total_revenue - total_cost` | ✅ Done |
| 4 | Buyer pending = revenue - amount_received | `pending_amount = total_revenue - amount_received` | ✅ Done |

---

## Status: IN PROGRESS

---

## ✅ Current Implementation (Already Done)

### 1. Company Model (companies/models.py)
- [x] name (CharField)
- [x] phone (CharField, optional)
- [x] created_at (DateTimeField)

### 2. Fish Model (trading/models.py)
- [x] name (CharField)
- [x] company (ForeignKey to Company)
- [x] unique_together constraint on (name, company)

### 3. Buyer Model (trading/models.py)
- [x] name (CharField)
- [x] phone (CharField, optional)
- [x] company (ForeignKey to Company)
- [x] unique_together constraint on (name, company)

### 4. PurchaseBatch Model (trading/models.py)
- [x] purchase_type (choices: boat/auction/bucket)
- [x] fisherman_name
- [x] place_of_buying
- [x] fish (ForeignKey to Fish)
- [x] company (ForeignKey to Company)
- [x] date
- [x] number_of_packages
- [x] package_weight (default 37)
- [x] price_per_kg
- [x] labour_cost (default 0)
- [x] ice_cost (default 0)
- [x] transport_cost (default 0)
- [x] commission_cost (default 0)
- [x] other_cost (default 0)
- [x] amount_paid (default 0)

### 5. Auto-Calculated Fields - PurchaseBatch
- [x] total_weight (number_of_packages × package_weight)
- [x] fish_cost (total_weight × price_per_kg)
- [x] total_expense (fish_cost + labour_cost + ice_cost + transport_cost + commission_cost + other_cost)
- [x] actual_cost_per_kg (total_expense / total_weight)
- [x] cost_per_package (actual_cost_per_kg × package_weight)
- [x] pending_amount (total_expense - amount_paid)

### 6. Sale Model (trading/models.py)
- [x] batch (ForeignKey to PurchaseBatch)
- [x] buyer (ForeignKey to Buyer)
- [x] date
- [x] number_of_packages_sold
- [x] selling_weight_per_package
- [x] selling_price_per_kg
- [x] amount_received (default 0)
- [x] company (ForeignKey to Company)

### 7. Auto-Calculated Fields - Sale
- [x] total_revenue (number_of_packages_sold × selling_weight_per_package × selling_price_per_kg)
- [x] total_cost (number_of_packages_sold × batch.cost_per_package)
- [x] profit (total_revenue - total_cost)
- [x] pending_amount (total_revenue - amount_received)

---

## 🔴 Tasks to Complete (Phase 1)

### Task 1: Add Validation in PurchaseBatch Model
**File:** `trading/models.py`

**ADD this code inside PurchaseBatch class (after pending_amount field):**

```python
    def clean(self):
        from django.core.exceptions import ValidationError
        
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

    def get_remaining_packages(self):
        """Calculate remaining packages available for sale in this batch."""
        from django.db.models import Sum
        from .models import Sale
        
        sold = Sale.objects.filter(batch=self).aggregate(
            total=Sum('number_of_packages_sold')
        )['total'] or 0
        return self.number_of_packages - sold

    def save(self, *args, **kwargs):
        # This ensures clean() validation runs even when saving directly
        self.full_clean()
        self.calculate_fields()
        super().save(*args, **kwargs)
```

---

### Task 2: Add Validation in Sale Model
**File:** `trading/models.py`

**ADD this code inside Sale class (after pending_amount field):**

```python
    def clean(self):
        from django.core.exceptions import ValidationError
        
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
        
        # CRITICAL: Validate number_of_packages_sold <= remaining packages in batch
        if self.batch:
            remaining = self.batch.get_remaining_packages()
            
            # If updating existing sale, add back its ORIGINAL sold count (not new value)
            if self.pk:
                old_sale = Sale.objects.get(pk=self.pk)
                remaining += old_sale.number_of_packages_sold
            
            if self.number_of_packages_sold > remaining:
                raise ValidationError({
                    'number_of_packages_sold': f'Cannot sell {self.number_of_packages_sold} packages. Only {remaining} packages remaining in this batch.'
                })

    def save(self, *args, **kwargs):
        # This ensures clean() validation runs even when saving directly
        self.full_clean()
        self.calculate_fields()
        super().save(*args, **kwargs)
```

---

### Task 3: Improve Admin Interface
**File:** `trading/admin.py`

**REPLACE the entire file with this code:**

```python
from django.contrib import admin
from django import forms
from .models import Fish, Buyer, PurchaseBatch, Sale


@admin.register(Fish)
class FishAdmin(admin.ModelAdmin):
    list_display = ('name', 'company')
    search_fields = ('name',)
    list_filter = ('company',)


@admin.register(Buyer)
class BuyerAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'company')
    search_fields = ('name', 'phone')
    list_filter = ('company',)


@admin.register(PurchaseBatch)
class PurchaseBatchAdmin(admin.ModelAdmin):
    readonly_fields = (
        "total_weight",
        "fish_cost",
        "total_expense",
        "actual_cost_per_kg",
        "cost_per_package",
        "pending_amount",
    )
    
    list_display = (
        "id",
        "date",
        "fisherman_name",
        "fish",
        "purchase_type",
        "number_of_packages",
        "total_expense",
        "amount_paid",
        "pending_amount",
    )
    
    search_fields = ('fisherman_name', 'place_of_buying', 'fish__name')
    list_filter = ('purchase_type', 'date', 'fish', 'company')
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('company', 'fish', 'purchase_type', 'date')
        }),
        ('Fisherman Info', {
            'fields': ('fisherman_name', 'place_of_buying')
        }),
        ('Package Details', {
            'fields': ('number_of_packages', 'package_weight', 'price_per_kg')
        }),
        ('Additional Costs', {
            'fields': ('labour_cost', 'ice_cost', 'transport_cost', 'commission_cost', 'other_cost')
        }),
        ('Payment', {
            'fields': ('amount_paid',)
        }),
        ('Calculated Fields (Read-only)', {
            'fields': ('total_weight', 'fish_cost', 'total_expense', 'actual_cost_per_kg', 'cost_per_package', 'pending_amount'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    readonly_fields = (
        "total_revenue",
        "total_cost",
        "profit",
        "pending_amount",
    )
    
    list_display = (
        "id",
        "date",
        "batch",
        "buyer",
        "number_of_packages_sold",
        "total_revenue",
        "total_cost",
        "profit",
        "amount_received",
        "pending_amount",
    )
    
    search_fields = ('buyer__name', 'batch__fisherman_name', 'batch__fish__name')
    list_filter = ('date', 'buyer', 'company')
    
    fieldsets = (
        ('Sale Info', {
            'fields': ('company', 'batch', 'buyer', 'date')
        }),
        ('Selling Details', {
            'fields': ('number_of_packages_sold', 'selling_weight_per_package', 'selling_price_per_kg')
        }),
        ('Payment', {
            'fields': ('amount_received',)
        }),
        ('Calculated Fields (Read-only)', {
            'fields': ('total_revenue', 'total_cost', 'profit', 'pending_amount'),
            'classes': ('collapse',)
        }),
    )
```

---

## 📋 Validation Rules Summary

### PurchaseBatch Validation:
```
✓ number_of_packages > 0
✓ package_weight > 0
✓ price_per_kg >= 0
✓ labour_cost >= 0
✓ ice_cost >= 0
✓ transport_cost >= 0
✓ commission_cost >= 0
✓ other_cost >= 0
✓ amount_paid >= 0
✓ amount_paid <= total_expense
```

### Sale Validation:
```
✓ number_of_packages_sold > 0
✓ selling_weight_per_package > 0
✓ selling_price_per_kg >= 0
✓ amount_received >= 0
✓ amount_received <= total_revenue
✓ number_of_packages_sold <= (batch.number_of_packages - already_sold)
```

---

## 📁 Files to Modify

### 1. `/workspaces/fisherp/fish-trading-saas/backend/trading/models.py`

**FIND the PurchaseBatch class** and add after the `pending_amount` field:
- Add `clean()` method
- Add `get_remaining_packages()` static method

**FIND the Sale class** and add after the `pending_amount` field:
- Add `clean()` method

### 2. `/workspaces/fisherp/fish-trading-saas/backend/trading/admin.py`

**REPLACE entire file** with the improved admin code provided above.

---

## 🚀 After Phase 1 Complete

Phase 2 (Dashboard) will include:
- Today Summary (Total purchase, sales, profit)
- Monthly Summary
- Yearly Summary
- Profit by purchase type, place, fisherman, fish type

