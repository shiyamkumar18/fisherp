const rolePermissions = {
  admin: ["dashboard:view", "orders:view", "products:manage", "users:profile", "settings:manage"],
  trader: ["dashboard:view", "orders:view", "products:manage", "users:profile"],
  customer: ["dashboard:view", "users:profile"],
};

export const hasPermission = (role, permission) => rolePermissions[role]?.includes(permission) ?? false;

export const routeAccess = {
  "/": ["admin", "trader", "customer"],
  "/orders": ["admin", "trader"],
  "/products": ["admin", "trader"],
  "/profile": ["admin", "trader", "customer"],
  "/settings": ["admin"],
};

export const canAccessRoute = (role, path) => {
  const allowedRoles = routeAccess[path] || ["admin"];
  return allowedRoles.includes(role);
};
