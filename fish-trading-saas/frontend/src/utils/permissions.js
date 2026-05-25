// Centralized roles and permissions
export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
};

export const PERMISSIONS = {
  dashboard: [ROLES.ADMIN, ROLES.USER],
  suppliers: [ROLES.ADMIN],
};

export const routeAccess = {
  "/dashboard": [ROLES.ADMIN, ROLES.USER],
  "/dashboard/settings": [ROLES.ADMIN],
};

export const canAccessRoute = (role, path) => {
  const normalizedPath = path.replace(/^\/app/, "") || "/";
  const allowedRoles = routeAccess[normalizedPath] ?? [ROLES.ADMIN, ROLES.USER];
  return allowedRoles.includes(role);
};
