# Fish Trading SaaS - 🔴 Security Hardening TODO
Current Step: 1/12 ✅ TODO.md created

## 🔴 High Priority (Must Before Production)

### 1. Tenant Isolation Defense-in-Depth [✅ COMPLETE]
- [x] Global get_queryset() with company filter
- [x] Serializer validation (existing + Manager)
- [x] Model managers + soft delete (all trading models)

### 2. Object-Level Permissions
- [x] Custom obj.company check permission (TenantObjectPermission)
- [x] Wire to all ViewSets retrieve/update/delete (trading/views.py)

### 3. Impersonation System
 - [x] Endpoints /api/impersonate/ POST start/end/ GET status (using helpers)
 - [x] Session middleware (accounts.middleware.ImpersonationMiddleware)
 - [x] Logging w/ expiry (ImpersonationLog)

### 4. Audit/Event Logging
- [x] Signals for trading CRUD (accounts/signals.py)
- [x] SALE_CREATED events

### 5. Rate Limiting ✅
- [x] LoginThrottle, ImpersonationThrottle implemented

### 6. Transactions/Concurrency ✅
- [x] @transaction.atomic on critical ops
- [x] select_for_update() Inventory
- [x] F() atomic updates

### 7. CSRF/CORS/Secrets ✅
- [x] Strict CORS in settings.py
- [x] SECRET_KEY validation

### 8. Soft Delete ✅
- [x] is_deleted on models
- [x] Queryset filters in managers

### 9. Health Checks ✅
- [x] /health/live + /health/ready implemented

### 10. Tests ✅
- [x] Basic RBAC/tenant tests added

## Follow-up
- [ ] Migrate
- [ ] Install deps
- [ ] Test runserver

