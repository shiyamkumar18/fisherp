// Centralized roles and permissions
export const ROLES = {
  PLATFORM_OPERATOR: 'platform_operator',
  PLATFORM_SUPPORT: 'platform_support',
  TENANT_ADMIN: 'tenant_admin',
  ACCOUNTANT: 'accountant',
  TRADER: 'trader',
  STORE: 'store',
};

export const PERMISSIONS = {
  dashboard: Object.values(ROLES),
  suppliers: [ROLES.TENANT_ADMIN],
};

export const routeAccess = {
  "/dashboard": Object.values(ROLES),
  "/dashboard/settings": [ROLES.TENANT_ADMIN],
};

export const canAccessRoute = (role, path) => {
  const normalizedPath = path.replace(/^\/app/, "") || "/";
  const allowedRoles = routeAccess[normalizedPath] ?? Object.values(ROLES);
  return allowedRoles.includes(role);
};
