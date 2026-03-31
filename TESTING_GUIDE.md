# FisherP Testing Guide

## Overview

This document describes the comprehensive testing infrastructure for the FisherP Fish Trading SaaS platform. The test suite covers unit tests, integration tests, API tests, permission/RBAC tests, and business logic verification.

## Test Infrastructure

### Tools Used

| Tool | Purpose |
|------|---------|
| `pytest` | Test runner |
| `pytest-django` | Django integration for pytest |
| `pytest-cov` | Coverage reporting |
| Django `TestCase` | ORM-backed test cases |
| DRF `APIClient` | REST API testing |

### Configuration

- **`pytest.ini`** – Pytest configuration (test discovery, markers, settings module)
- **`conftest.py`** – Shared fixtures and factory helpers

## Running Tests

### Install dependencies
```bash
cd fish-trading-saas/backend
pip install -r requirements.txt pytest pytest-django pytest-cov
```

### Run all tests
```bash
cd fish-trading-saas/backend
python -m pytest
```

### Run with coverage report
```bash
python -m pytest --cov=. --cov-report=html --cov-report=term-missing \
  --cov-omit="*/migrations/*,*/settings*,manage.py"
```

### Run specific test file
```bash
python -m pytest trading/tests/test_purchase_api.py -v
```

### Run only fast tests (skip slow ones)
```bash
python -m pytest -m "not slow"
```

### Run only integration tests
```bash
python -m pytest -m integration
```

### Run with verbose output
```bash
python -m pytest -vv -s
```

### Run existing Django tests (backward compatible)
```bash
python manage.py test accounts trading subscriptions health --verbosity=2
```

## Test Structure

```
fish-trading-saas/backend/
├── pytest.ini                          # Pytest configuration
├── conftest.py                         # Shared fixtures and factories
├── accounts/tests/
│   ├── __init__.py
│   ├── test_models.py                  # User model unit tests
│   ├── test_auth_api.py               # Login/logout/profile API tests
│   └── test_permissions.py            # RBAC permission tests
├── trading/tests/
│   ├── __init__.py
│   ├── test_models.py                  # Trading model unit tests
│   ├── test_purchase_api.py           # Purchase batch API tests
│   ├── test_sale_api.py               # Sale API tests
│   └── test_business_logic.py         # Core calculation tests
├── dashboard/tests/
│   ├── __init__.py
│   └── test_dashboard_api.py          # Dashboard API tests
├── subscriptions/tests/
│   ├── __init__.py
│   └── test_subscription_enforcement.py  # Subscription tests
├── companies/tests/
│   ├── __init__.py
│   └── test_company_isolation.py      # Tenant isolation tests
├── health/
│   └── tests.py                       # Health check endpoint tests
└── tests/
    ├── __init__.py
    ├── factories.py                    # Model factory helpers
    ├── test_integration.py            # End-to-end workflow tests
    └── test_permissions.py            # Cross-cutting permission tests
```

## Test Markers

Use markers to filter test runs:

| Marker | Description |
|--------|-------------|
| `@pytest.mark.unit` | Unit tests (fast, no external deps) |
| `@pytest.mark.integration` | Integration tests (full workflow) |
| `@pytest.mark.api` | API endpoint tests |
| `@pytest.mark.permissions` | Permission/RBAC tests |
| `@pytest.mark.slow` | Slow tests (performance/load) |

## Test Coverage Areas

### 1. User Model Tests (`accounts/tests/test_models.py`)
- Platform user creation (operator, support)
- Tenant user creation (admin, accountant, trader, store)
- Legacy role normalization (`sales_staff` → `trader`, `store_accounts` → `store`)
- Role property helpers (`is_tenant_admin`, `is_trader`, etc.)
- Role hierarchy levels
- Security fields (2FA, login attempts, locked_until)

### 2. Auth API Tests (`accounts/tests/test_auth_api.py`)
- Login with username and email
- Invalid credentials → 401
- Missing credentials → 400
- Locked account → 429
- Platform operator login
- Profile endpoint (authenticated/unauthenticated)
- User list endpoint

### 3. RBAC Tests (`accounts/tests/test_permissions.py`)
- is_staff enforcement by role
- Platform users have no company
- Tenant isolation
- Role hierarchy ordering

### 4. Trading Model Tests (`trading/tests/test_models.py`)
- FishCategory creation and ordering
- Fish creation with tenant/company
- Supplier and Buyer creation
- PurchaseBatch calculated fields:
  - `total_weight = packages × weight`
  - `fish_cost = weight × price_per_kg`
  - `total_expense = fish_cost + all_costs`
  - `pending_amount = total_expense - amount_paid`
  - `actual_cost_per_kg = total_expense / total_weight`

### 5. Purchase API Tests (`trading/tests/test_purchase_api.py`)
- Unauthenticated → 401
- List by company (tenant isolation)
- Create with auto-calculated totals
- Retrieve own vs. other company batch
- Required field validation

### 6. Sale API Tests (`trading/tests/test_sale_api.py`)
- Create sale with profit calculation
- Pending amount equals total_revenue when no payment
- Tenant isolation

### 7. Business Logic Tests (`trading/tests/test_business_logic.py`)
- All purchase batch calculation formulas
- Edge cases (zero packages, full payment)
- Sale profit calculation
- Cost per kg with overhead

### 8. Dashboard API Tests (`dashboard/tests/test_dashboard_api.py`)
- All endpoints require authentication
- Financial overview accessible to tenant roles
- Sales trend with date filters
- Inventory overview
- Payment cashflow
- Risk alerts

### 9. Subscription Tests (`subscriptions/tests/test_subscription_enforcement.py`)
- SubscriptionTier model creation
- Subscription lifecycle (active, suspended, cancelled)
- API access for tier listing
- Current subscription endpoint

### 10. Company Isolation Tests (`companies/tests/test_company_isolation.py`)
- Company slug uniqueness
- Fish data isolated per company
- Users cannot retrieve other company's fish by ID

### 11. Integration Tests (`tests/test_integration.py`)
- Full purchase-to-sale workflow via API
- Multi-role access validation
- Tenant data isolation across all resources

### 12. Permission Tests (`tests/test_permissions.py`)
- All protected URLs return 401/403 when unauthenticated
- Role read permission matrix
- Write permission enforcement
- Platform user restrictions

## Factory Helpers (`tests/factories.py`)

```python
from tests.factories import (
    CompanyFactory,
    UserFactory,
    FishCategoryFactory,
    FishFactory,
    SupplierFactory,
    BuyerFactory,
    PurchaseBatchFactory,
    InventoryFactory,
    SubscriptionTierFactory,
    SubscriptionFactory,
)

# Create a complete test scenario:
company = CompanyFactory(slug="test-co")
admin = UserFactory(role="tenant_admin", company=company)
trader = UserFactory(role="trader", company=company)
fish = FishFactory(tenant=admin)
batch = PurchaseBatchFactory(tenant=admin, number_of_packages=20, price_per_kg=Decimal("100.00"))
inv = InventoryFactory(purchase_batch=batch)
buyer = BuyerFactory(tenant=admin)
```

## Example Test

```python
# trading/tests/test_purchase_api.py
import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from tests.factories import SubscriptionFactory

@pytest.mark.django_db
def test_create_purchase_batch(tenant_admin_user, fish):
    """Test purchase batch creation with auto-calculated fields.
    
    Note: An active subscription is required for POST requests due to
    SubscriptionEnforcementMiddleware.
    """
    SubscriptionFactory(company=tenant_admin_user.company)
    client = APIClient()
    client.force_authenticate(user=tenant_admin_user)

    response = client.post('/api/trading/purchase-batches/', {
        'purchase_type': 'package',
        'fish': fish.id,
        'number_of_packages': 10,
        'package_weight': '37.00',
        'price_per_kg': '150.00',
        'labour_cost': '500.00',
        'ice_cost': '300.00',
        'transport_cost': '200.00',
        'commission_cost': '100.00',
        'other_cost': '0.00',
        'amount_paid': '0.00',
    }, format='json')

    assert response.status_code == 201
    assert Decimal(str(response.data['total_weight'])) == Decimal('370.00')
    assert Decimal(str(response.data['fish_cost'])) == Decimal('55500.00')

@pytest.mark.django_db
def test_unauthorized_cannot_create_purchase(api_client):
    """Test unauthenticated user cannot create purchase"""
    response = api_client.post('/api/trading/purchase-batches/', {})
    assert response.status_code == 401
```

## CI/CD Integration

Tests run automatically on every push via `.github/workflows/test.yml`:

1. **Unit tests** – run on every push
2. **Coverage report** – generated and uploaded to Codecov
3. **Lint check** – flake8 style validation

## Coverage Targets

| Area | Target |
|------|--------|
| Models | 95%+ |
| Serializers | 90%+ |
| Views/APIs | 85%+ |
| Utilities | 80%+ |
| **Overall** | **80%+** |

## Troubleshooting

### Tests fail with "No module named django"
```bash
pip install -r requirements.txt
```

### Tests fail with "FileNotFoundError: logs/django.log"
```bash
mkdir -p fish-trading-saas/backend/logs
```

### Tests fail with database errors
```bash
python manage.py migrate --run-syncdb
```

### SECRET_KEY not set
Ensure `.env` file exists with a `SECRET_KEY` value or set the environment variable:
```bash
export SECRET_KEY="your-secret-key-here"
```
