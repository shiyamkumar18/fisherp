# FisherP Seeded Demo Credentials

This file lists the pre-seeded default demo credentials for local development and testing.

> [!WARNING]
> These credentials are for local development and testing purposes only. All passwords must be rotated before deploying to production.

---

### Platform Level Users

| Role | Username | Email | Password | Description |
|---|---|---|---|---|
| **Platform Operator** | `platform_operator` | `platform.operator@fishapp.com` | `platform123` | Can manage SaaS subscriptions and tenants. (Not a superuser; requires audit-logged impersonation to see business data). |
| **Platform Support** | `platform_support` | `support@fishapp.com` | `support123` | Limited-privilege support role for troubleshooting tenant issues (GET-only access to SaaS dashboard/monitoring, supports audit-logged tenant impersonation). |

---

### Tenant 1 (Main Tenant) Users

| Role | Username | Email | Password | Description |
|---|---|---|---|---|
| **Tenant Admin** | `admin` | `admin@fishapp.com` | `admin123` | Full administrative control within Tenant 1. |
| **Accountant** | `accountant` | `accountant@fishapp.com` | `accountant123` | Access to financial records and accounting functions. |
| **Trader** | `trader` | `trader@fishapp.com` | `trader123` | Trading, buying, and selling operations. |
| **Store Manager** | `store` | `store@fishapp.com` | `store123` | Inventory, storage, and batch management. |

---

### Tenant 2 (Isolation Testing) Users

| Role | Username | Email | Password | Description |
|---|---|---|---|---|
| **Tenant Admin** | `tenant2_admin` | `tenant2@fishapp.com` | `tenant2123` | Full administrative control within Tenant 2. Used to test tenant isolation boundaries. |
