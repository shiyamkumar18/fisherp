# Fix Plan: TypeError in PurchaseBatch.calculate_fields()

## Problem Analysis
The error `unsupported operand type(s) for *: 'NoneType' and 'decimal.Decimal'` occurs in `PurchaseBatch.calculate_fields()` when:
- `number_of_packages` is `None` 
- `package_weight` is `None`
- `price_per_kg` is `None`

This happens because when Django admin submits the form, it creates a new model instance and calls `save()`. The required fields might not have their values set yet when `calculate_fields()` runs during the save process.

The fix needs to:
1. Add null checks in `PurchaseBatch.calculate_fields()` for required fields
2. Handle edge cases where cost fields might be None

## Files to Edit
- `/workspaces/fisherp/fish-trading-saas/backend/trading/models.py`

## Steps
1. Fix `PurchaseBatch.calculate_fields()` to handle None values for `number_of_packages`, `package_weight`, and `price_per_kg`
2. Fix `Sale.calculate_fields()` to handle None values for batch cost_per_package

