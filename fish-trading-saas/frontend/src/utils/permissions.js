// Centralized roles and permissions - Production RBAC for FisherP ERP
export const ROLES = {
  PLATFORM_OPERATOR: 'platform_operator',
  PLATFORM_SUPPORT: 'platform_support',
  TENANT_ADMIN: 'tenant_admin',
  BRANCH_MANAGER: 'branch_manager',
  FINANCE_MANAGER: 'finance_manager',
  ACCOUNTANT: 'accountant',
  PURCHASE_MANAGER: 'purchase_manager',
  AUCTION_MANAGER: 'auction_manager',
  INVENTORY_MANAGER: 'inventory_manager',
  SUPERVISOR: 'supervisor',
  SALES_STAFF: 'sales_staff',
  TRADER: 'trader',
  STORE: 'store',
  STAFF: 'staff',
  VIEWER: 'viewer',
};

// All active roles (used as fallback)
const ALL_ROLES = Object.values(ROLES);

// High-privilege roles that can access most sections
const MANAGEMENT = [
  ROLES.PLATFORM_OPERATOR, ROLES.PLATFORM_SUPPORT,
  ROLES.TENANT_ADMIN, ROLES.BRANCH_MANAGER, ROLES.FINANCE_MANAGER,
  ROLES.SUPERVISOR,
];

// Map routes to allowed roles
export const routeAccess = {
  "/dashboard": ALL_ROLES,
  "/dashboard/orders": [...MANAGEMENT, ROLES.TRADER, ROLES.SALES_STAFF, ROLES.ACCOUNTANT, ROLES.PURCHASE_MANAGER],
  "/dashboard/sales": [...MANAGEMENT, ROLES.TRADER, ROLES.SALES_STAFF, ROLES.ACCOUNTANT],
  "/dashboard/purchases": [...MANAGEMENT, ROLES.STORE, ROLES.PURCHASE_MANAGER, ROLES.ACCOUNTANT, ROLES.TRADER],
  "/dashboard/products": [...MANAGEMENT, ROLES.STORE, ROLES.TRADER, ROLES.INVENTORY_MANAGER, ROLES.PURCHASE_MANAGER],
  "/dashboard/inventory": [...MANAGEMENT, ROLES.STORE, ROLES.TRADER, ROLES.INVENTORY_MANAGER],
  "/dashboard/suppliers": [...MANAGEMENT, ROLES.STORE, ROLES.PURCHASE_MANAGER, ROLES.ACCOUNTANT, ROLES.TRADER],
  "/dashboard/customers": [...MANAGEMENT, ROLES.TRADER, ROLES.SALES_STAFF, ROLES.ACCOUNTANT],
  "/dashboard/payments": [...MANAGEMENT, ROLES.ACCOUNTANT],
  "/dashboard/reports": [...MANAGEMENT, ROLES.ACCOUNTANT],
  "/dashboard/profile": ALL_ROLES,
  "/dashboard/settings": [ROLES.TENANT_ADMIN, ROLES.PLATFORM_OPERATOR, ROLES.PLATFORM_SUPPORT],
};

export const canAccessRoute = (role, path) => {
  const normalizedPath = path.replace(/^\/app/, "") || "/";
  const allowedRoles = routeAccess[normalizedPath] ?? ALL_ROLES;
  return allowedRoles.includes(role);
};
