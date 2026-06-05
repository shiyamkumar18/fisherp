const rolePermissions = {
  admin: ["dashboard:view", "orders:view", "sales:view", "purchases:view", "products:manage", "inventory:view", "suppliers:view", "customers:view", "payments:view", "reports:view", "users:profile", "settings:manage"],
  trader: ["dashboard:view", "orders:view", "sales:view", "purchases:view", "products:manage", "inventory:view", "suppliers:view", "customers:view", "payments:view", "reports:view", "users:profile"],
  customer: ["dashboard:view", "orders:view", "users:profile"],
};

export const hasPermission = (role, permission) => rolePermissions[role]?.includes(permission) ?? false;

export const routeAccess = {
  "/dashboard": ["admin", "trader", "customer"],
  "/dashboard/orders": ["admin", "trader", "customer"],
  "/dashboard/sales": ["admin", "trader"],
  "/dashboard/purchases": ["admin", "trader"],
  "/dashboard/products": ["admin", "trader"],
  "/dashboard/inventory": ["admin", "trader"],
  "/dashboard/suppliers": ["admin", "trader"],
  "/dashboard/customers": ["admin", "trader"],
  "/dashboard/payments": ["admin", "trader"],
  "/dashboard/reports": ["admin", "trader"],
  "/dashboard/profile": ["admin", "trader", "customer"],
  "/dashboard/settings": ["admin"],
};

export const canAccessRoute = (role, path) => {
  const allowedRoles = routeAccess[path] || ["admin"];
  return allowedRoles.includes(role);
};
