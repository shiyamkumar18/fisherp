# 🐟 FisherP — Development Credentials
> ⚠️ **DEV ONLY** — These credentials are for local development and testing only.
> Rotate ALL passwords before any staging/production deployment.

---

## 🔗 Login URLs

| Side | URL |
|---|---|
| **Platform (operators/staff)** | `http://localhost:5173/platform/login` |
| **Tenant (business users)** | `http://localhost:5173/login` |

---

## 🏢 Platform Side Users
> Login at: `http://localhost:5173/platform/login`

| Role | Username | Email | Password | Access Level |
|---|---|---|---|---|
| Platform Operator | `platform_operator` | `platform.operator@fishapp.com` | `platform123` | Full SaaS control |
| Platform DevOps | `platform_devops` | `devops@fishapp.com` | `devops123` | Infrastructure & health |
| Platform Finance | `platform_finance` | `pfin@fishapp.com` | `pfin123` | Revenue & billing reports |
| Platform Billing Admin | `platform_billing` | `billing@fishapp.com` | `billing123` | Subscription billing |
| Support Manager | `platform_support_mgr` | `supportmgr@fishapp.com` | `supportmgr123` | Manage support team |
| Customer Success | `platform_cs` | `cs@fishapp.com` | `cs123` | Tenant onboarding & health |
| Sales Manager | `platform_sales_mgr` | `salesmgr@fishapp.com` | `salesmgr123` | SaaS growth & leads |
| Onboarding Specialist | `platform_onboarding` | `onboarding@fishapp.com` | `onboarding123` | New tenant setup |
| Platform Support L2 | `platform_support_l2` | `supportl2@fishapp.com` | `supportl2123` | Technical support (can impersonate) |
| Platform Support L1 | `platform_support_l1` | `supportl1@fishapp.com` | `supportl1123` | Frontline support |
| Platform Support | `platform_support` | `support@fishapp.com` | `support123` | General support |

---

## 🏪 Tenant Side Users — Company: Tenant 1
> Login at: `http://localhost:5173/login`

| Role | Username | Email | Password | Access |
|---|---|---|---|---|
| Tenant Admin | `admin` | `admin@fishapp.com` | `admin123` | Full access within tenant |
| Finance Manager | `finance_mgr` | `financemgr@fishapp.com` | `financemgr123` | Financial reports & ledger |
| Accountant | `accountant` | `accountant@fishapp.com` | `accountant123` | Accounting & invoices |
| Purchase Manager | `purchase_mgr` | `purchase@fishapp.com` | `purchase123` | Purchase batches & suppliers |
| Auction Manager | `auction_mgr` | `auction@fishapp.com` | `auction123` | Live fish auctions |
| Inventory Manager | `inv_manager` | `inventory@fishapp.com` | `inventory123` | Cold storage & stock |
| Branch Manager | `branch_mgr` | `branch@fishapp.com` | `branch123` | Branch-level operations |
| Supervisor | `supervisor` | `supervisor@fishapp.com` | `supervisor123` | Daily ops supervision |
| Trader | `trader` | `trader@fishapp.com` | `trader123` | Buy/sell operations |
| Sales Staff | `sales_staff` | `sales@fishapp.com` | `sales123` | Sales & customer orders |
| Store | `store` | `store@fishapp.com` | `store123` | Physical stock & purchases |
| Staff | `staff` | `staff@fishapp.com` | `staff123` | General staff access |
| Viewer | `viewer` | `viewer@fishapp.com` | `viewer123` | Read-only dashboards |

---

## 🏪 Tenant Side Users — Company: Tenant 2 (Isolation Testing)
> Login at: `http://localhost:5173/login`

| Role | Username | Email | Password |
|---|---|---|---|
| Tenant Admin | `tenant2_admin` | `tenant2@fishapp.com` | `tenant2123` |

---

## 🔒 Security Notes
- **Platform Operator is NOT a Django superuser** — must use impersonation to view tenant data
- All impersonation sessions are audit-logged
- Tenant data is fully isolated; Tenant 1 users cannot see Tenant 2 data
- Django superuser admin is at `http://localhost:8000/django-admin/`
