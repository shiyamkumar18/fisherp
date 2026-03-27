# ROLE ACCESS TODO

## Status
- [x] Document current user roles
- [x] Document login URLs
- [x] Document API URLs
- [x] Document default seeded credentials
- [x] Document what each role can and cannot see

## Source Of Truth
- Roles: [backend/accounts/models.py](/workspaces/fisherp/fish-trading-saas/backend/accounts/models.py)
- Main URLs: [backend/config/urls.py](/workspaces/fisherp/fish-trading-saas/backend/config/urls.py)
- Auth API URLs: [backend/accounts/urls.py](/workspaces/fisherp/fish-trading-saas/backend/accounts/urls.py)
- Trading API URLs: [backend/trading/urls.py](/workspaces/fisherp/fish-trading-saas/backend/trading/urls.py)
- Dashboard API URLs: [backend/dashboard/urls.py](/workspaces/fisherp/fish-trading-saas/backend/dashboard/urls.py)
- Default users command: [backend/accounts/management/commands/create_default_users.py](/workspaces/fisherp/fish-trading-saas/backend/accounts/management/commands/create_default_users.py)

## Important Note About Credentials
- The credentials below are the default seeded/demo credentials defined in `create_default_users`.
- They only exist if this command has been run:

```bash
cd backend
python manage.py create_default_users
```

- These credentials are for local/dev use and should be changed in production.

## Shared URL Map

### Frontend / HTML Login Pages
- Tenant users: `/login/`
- Tenant-specific login page: `/<tenant_slug>/login/`
- Platform users: `/platform/login/`

### API Login Endpoints
- Tenant unified login API: `/api/auth/login/`
- Platform login API: `/api/platform/login/`
- Tenant-specific login API: `/api/login/<tenant_slug>/`

### Common User APIs
- Current profile: `/api/auth/profile/`
- Shared user directory: `/api/auth/users/`
- Tenant user management: `/api/auth/tenant-users/`
- Impersonation: `/api/impersonate/`

### Trading APIs
- Fish categories: `/api/trading/fish-categories/`
- Fish: `/api/trading/fish/`
- Suppliers: `/api/trading/suppliers/`
- Buyers: `/api/trading/buyers/`
- Purchase batches: `/api/trading/purchase-batches/`
- Sales: `/api/trading/sales/`
- Payments: `/api/trading/payments/`
- Inventory: `/api/trading/inventory/`

### Dashboard APIs
- Financial overview: `/api/dashboard/financial-overview/`
- Sales trend: `/api/dashboard/sales-trend/`
- Monthly revenue: `/api/dashboard/monthly-revenue/`
- Profit margin trend: `/api/dashboard/profit-margin-trend/`
- Top buyers: `/api/dashboard/top-buyers/`
- Top fish: `/api/dashboard/top-fish/`
- Sales by payment: `/api/dashboard/sales-by-payment/`
- Inventory overview: `/api/dashboard/inventory-overview/`
- Inventory by category: `/api/dashboard/inventory-by-category/`
- Batch profit margin: `/api/dashboard/batch-profit-margin/`
- Payment cashflow: `/api/dashboard/payment-cashflow/`
- Payment summary: `/api/dashboard/payment-summary/`
- Credit customers: `/api/dashboard/credit-customers/`
- Operational dashboard: `/api/dashboard/operational/`
- Risk alerts: `/api/dashboard/risk-alerts/`
- Today summary: `/api/dashboard/today/`
- Monthly summary: `/api/dashboard/monthly/`
- Yearly summary: `/api/dashboard/yearly/`
- Dashboard overview: `/api/dashboard/overview/`
- Tenant admin visual dashboard: `/api/dashboard/tenant/`
- Batch-specific dashboard: `/api/dashboard/batch/?batch_id=<id>`
- Filter options: `/api/dashboard/filters/`
- Platform admin dashboard: `/api/dashboard/admin/`

### Health URLs
- Live: `/health/`
- Ready: `/health/ready/`
- Live alias: `/health/live/`

## Role Details

### 1. Platform Operator
- Seeded credential:
  - Username: `platform_operator`
  - Password: `platform123`
  - Email: `platform.operator@fishapp.com`
- Login URLs:
  - Page: `/platform/login/`
  - API: `/api/platform/login/`
- Main purpose:
  - SaaS/platform management
  - Must impersonate a tenant to access tenant business data
- Can see:
  - Platform-level admin dashboard: `/api/dashboard/admin/`
  - Platform user directory only: `/api/auth/users/`
  - Platform APIs: `/api/platform/...`
  - Impersonation flow: `/api/impersonate/`
- Cannot directly see:
  - Tenant trading data under `/api/trading/...`
  - Tenant dashboard business data like `/api/dashboard/financial-overview/`
  - Tenant filter options: `/api/dashboard/filters/`
- User directory behavior:
  - Sees only platform users

### 2. Platform Support
- Seeded credential:
  - Username: `platform_support`
  - Password: `support123`
  - Email: `support@fishapp.com`
- Login URLs:
  - Page: `/platform/login/`
  - API: `/api/platform/login/`
- Main purpose:
  - Limited platform troubleshooting
- Can see:
  - Own profile: `/api/auth/profile/`
  - Platform user directory only: `/api/auth/users/`
- Cannot directly see:
  - Tenant trading data
  - Tenant financial dashboards
  - Platform operator admin dashboard at `/api/dashboard/admin/`
- User directory behavior:
  - Sees only platform users

### 3. Tenant Admin
- Seeded credential:
  - Username: `admin`
  - Password: `admin123`
  - Email: `admin@fishapp.com`
  - Default seeded company slug: `tenant1`
- Login URLs:
  - Page: `/login/`
  - Tenant page: `/tenant1/login/`
  - API: `/api/auth/login/`
  - Tenant API: `/api/login/tenant1/`
- Main purpose:
  - Full access within own company
- Can see:
  - Own profile: `/api/auth/profile/`
  - Same-company users only: `/api/auth/users/`
  - Full tenant user management: `/api/auth/tenant-users/`
  - All own-company trading data:
    - fish, categories, suppliers, buyers, purchase batches, sales, payments, inventory
  - All own-company dashboards:
    - financial, payment, inventory, overview, tenant dashboard, batch dashboard, filters
- Cannot see:
  - Other tenant/company data
  - Platform-wide business data
- User directory behavior:
  - Sees only users in the same company

### 4. Accountant
- Seeded credential:
  - Username: `accountant`
  - Password: `accountant123`
  - Email: `accountant@fishapp.com`
  - Default seeded company slug: `tenant1`
- Login URLs:
  - Page: `/login/`
  - Tenant page: `/tenant1/login/`
  - API: `/api/auth/login/`
  - Tenant API: `/api/login/tenant1/`
- Main purpose:
  - Financial authority within own company
- Can see:
  - Own profile: `/api/auth/profile/`
  - All own-company trading data:
    - suppliers, buyers, purchase batches, sales, payments, inventory, fish, categories
  - Financial dashboards:
    - `/api/dashboard/financial-overview/`
    - `/api/dashboard/payment-summary/`
    - `/api/dashboard/payment-cashflow/`
    - `/api/dashboard/monthly-revenue/`
    - `/api/dashboard/profit-margin-trend/`
    - `/api/dashboard/credit-customers/`
    - `/api/dashboard/overview/`
    - `/api/dashboard/tenant/`
    - `/api/dashboard/batch/`
  - Non-financial tenant dashboards allowed for tenant roles
- Cannot see/manage:
  - `/api/auth/users/`
  - `/api/auth/tenant-users/`
  - Other tenant/company data

### 5. Trader
- Seeded credential:
  - Username: `trader`
  - Password: `trader123`
  - Email: `trader@fishapp.com`
  - Default seeded company slug: `tenant1`
- Login URLs:
  - Page: `/login/`
  - Tenant page: `/tenant1/login/`
  - API: `/api/auth/login/`
  - Tenant API: `/api/login/tenant1/`
- Main purpose:
  - Sales-side operations within own company
- Can see:
  - Own profile: `/api/auth/profile/`
  - Fish and categories
  - Buyers
  - Sales
  - Inventory
  - Payments limited to sales-side records only:
    - `sale`
    - `credit`
    - `refund`
  - Limited dashboards:
    - `/api/dashboard/financial-overview/` returns trader summary only
    - `/api/dashboard/sales-trend/`
    - `/api/dashboard/top-buyers/`
    - `/api/dashboard/top-fish/`
    - `/api/dashboard/inventory-overview/`
    - `/api/dashboard/inventory-by-category/`
    - `/api/dashboard/today/`
    - `/api/dashboard/monthly/`
    - `/api/dashboard/yearly/`
    - `/api/dashboard/filters/`
- Cannot see:
  - Suppliers
  - Purchase batches
  - Full finance-only dashboards like payment summary and cashflow
  - Tenant user directory
  - Tenant user management
  - Batch financial dashboard

### 6. Store
- Seeded credential:
  - Username: `store`
  - Password: `store123`
  - Email: `store@fishapp.com`
  - Default seeded company slug: `tenant1`
- Login URLs:
  - Page: `/login/`
  - Tenant page: `/tenant1/login/`
  - API: `/api/auth/login/`
  - Tenant API: `/api/login/tenant1/`
- Main purpose:
  - Purchase and inventory operations within own company
- Can see:
  - Own profile: `/api/auth/profile/`
  - Fish and categories
  - Suppliers
  - Purchase batches
  - Inventory
  - Payments limited to purchase-side records only:
    - `purchase`
    - `advance`
  - Limited dashboards:
    - `/api/dashboard/financial-overview/` returns store summary only
    - `/api/dashboard/inventory-overview/`
    - `/api/dashboard/inventory-by-category/`
    - `/api/dashboard/today/`
    - `/api/dashboard/monthly/`
    - `/api/dashboard/yearly/`
    - `/api/dashboard/filters/`
- Cannot see:
  - Buyers
  - Sales
  - Full finance-only dashboards
  - Tenant user directory
  - Tenant user management
  - Batch financial dashboard

### 7. Tenant 2 Admin
- Seeded credential:
  - Username: `tenant2_admin`
  - Password: `tenant2123`
  - Email: `tenant2@fishapp.com`
  - Default seeded company slug: `tenant2`
- Login URLs:
  - Page: `/login/`
  - Tenant page: `/tenant2/login/`
  - API: `/api/auth/login/`
  - Tenant API: `/api/login/tenant2/`
- Main purpose:
  - Isolation testing for a second tenant
- Can see:
  - Exactly the same access level as tenant admin
  - Only data belonging to company `tenant2`
- Cannot see:
  - Company `tenant1` data
  - Platform-wide business data

## Quick Test Credentials

```text
platform_operator / platform123
platform_support  / support123
admin             / admin123
accountant        / accountant123
trader            / trader123
store             / store123
tenant2_admin     / tenant2123
```

## Quick Verification TODO
- [ ] Run `python manage.py create_default_users` if default users are missing
- [ ] Verify platform login at `/platform/login/`
- [ ] Verify tenant login at `/login/`
- [ ] Verify tenant-specific login at `/<tenant_slug>/login/`
- [ ] Verify `platform_operator` sees only platform users in `/api/auth/users/`
- [ ] Verify `admin` sees only own-company users in `/api/auth/users/`
- [ ] Verify `accountant` gets finance dashboards but not user management
- [ ] Verify `trader` sees only sales-side payments
- [ ] Verify `store` sees only purchase-side payments
- [ ] Verify `tenant2_admin` cannot see `tenant1` data
