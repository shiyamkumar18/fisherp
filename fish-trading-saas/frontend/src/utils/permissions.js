// Centralized roles and permissions
export const ROLES = {
  PLATFORM_OPERATOR: 'platform_operator',
  PLATFORM_SUPPORT: 'platform_support',
  TENANT_ADMIN: 'tenant_admin',
  ACCOUNTANT: 'accountant',
  TRADER: 'trader',
  STORE: 'store',
};

// Map routes to allowed roles
export const routeAccess = {
  "/dashboard": Object.values(ROLES),
  "/dashboard/orders": [ROLES.TENANT_ADMIN, ROLES.TRADER, ROLES.ACCOUNTANT],
  "/dashboard/sales": [ROLES.TENANT_ADMIN, ROLES.TRADER, ROLES.ACCOUNTANT],
  "/dashboard/purchases": [ROLES.TENANT_ADMIN, ROLES.STORE, ROLES.ACCOUNTANT],
  "/dashboard/products": [ROLES.TENANT_ADMIN, ROLES.STORE, ROLES.TRADER],
  "/dashboard/inventory": [ROLES.TENANT_ADMIN, ROLES.STORE, ROLES.TRADER],
  "/dashboard/suppliers": [ROLES.TENANT_ADMIN, ROLES.STORE, ROLES.ACCOUNTANT],
  "/dashboard/customers": [ROLES.TENANT_ADMIN, ROLES.TRADER, ROLES.ACCOUNTANT],
  "/dashboard/payments": [ROLES.TENANT_ADMIN, ROLES.ACCOUNTANT],
  "/dashboard/reports": [ROLES.TENANT_ADMIN, ROLES.ACCOUNTANT],
  "/dashboard/profile": Object.values(ROLES),
  "/dashboard/settings": [ROLES.TENANT_ADMIN, ROLES.ACCOUNTANT, ROLES.PLATFORM_OPERATOR],
};

export const canAccessRoute = (role, path) => {
  const normalizedPath = path.replace(/^\/app/, "") || "/";
  const allowedRoles = routeAccess[normalizedPath] ?? Object.values(ROLES);
  return allowedRoles.includes(role);
};
