import { useAuthStore } from "@/store/authStore";

export function usePermission() {
  const { user, impersonation } = useAuthStore();
  const role = impersonation?.role || (impersonation ? "tenant_admin" : (user?.role || "guest"));
  const granular = user?.granular_permissions || {};

  // Platform staff (non-impersonating) should NOT access tenant modules.
  // They only get tenant-level perms when they are actively impersonating.
  const isRawPlatformStaff = ["platform_operator", "platform_support", "platform_super_admin"].includes(user?.role) && !impersonation;

  const isTenantAdmin = () => role === "tenant_admin";
  // isPlatformUser is TRUE only while impersonating (so they get editor access during impersonation)
  const isPlatformUser = () => !isRawPlatformStaff && ["platform_operator", "platform_support", "platform_super_admin"].includes(user?.role);

  // Role Hierarchy Level
  const ROLE_HIERARCHY = {
    'platform_super_admin': 16,
    'platform_operator': 15,
    'platform_support': 14,
    'tenant_admin': 13,
    'branch_manager': 12,
    'finance_manager': 11,
    'accountant': 10,
    'purchase_manager': 9,
    'auction_manager': 8,
    'inventory_manager': 7,
    'supervisor': 6,
    'sales_staff': 5,
    'trader': 4,
    'store': 3,
    'staff': 2,
    'viewer': 1,
    'guest': 0
  };
  const roleLevel = ROLE_HIERARCHY[role] || 0;

  // Granular override checker
  const checkPerm = (module, action, defaultCheck) => {
    if (granular && granular[module] && typeof granular[module][action] !== 'undefined') {
      return granular[module][action] === true;
    }
    return defaultCheck();
  };

  // Base role-based defaults for modules
  const defaults = {
    dashboard: ['tenant_admin', 'branch_manager', 'finance_manager', 'purchase_manager', 'supervisor'],
    sales: ['tenant_admin', 'branch_manager', 'supervisor', 'sales_staff', 'trader'],
    purchases: ['tenant_admin', 'branch_manager', 'supervisor', 'purchase_manager', 'trader', 'store'],
    inventory: ['tenant_admin', 'branch_manager', 'supervisor', 'inventory_manager', 'store'],
    customers: ['tenant_admin', 'branch_manager', 'supervisor', 'sales_staff', 'trader'],
    suppliers: ['tenant_admin', 'branch_manager', 'supervisor', 'purchase_manager', 'trader', 'store'],
    payments: ['tenant_admin', 'branch_manager', 'finance_manager', 'accountant'],
    financials: ['tenant_admin', 'branch_manager', 'finance_manager', 'accountant'],
    catalog: ['tenant_admin', 'branch_manager', 'inventory_manager', 'purchase_manager'],
    orders: ['tenant_admin', 'branch_manager', 'supervisor', 'sales_staff', 'purchase_manager'],
    reports: ['tenant_admin', 'branch_manager', 'finance_manager', 'accountant'],
    users: ['tenant_admin'],
    settings: ['tenant_admin']
  };

  // Generic Edit/View checks per module
  const canEditForm = (module) => {
    if (role === 'viewer') return false;
    // Raw platform staff (not impersonating) cannot edit tenant modules
    if (isRawPlatformStaff) return false;
    return checkPerm(module, 'edit', () => (defaults[module] || []).includes(role) || isTenantAdmin() || isPlatformUser());
  };

  const canViewForm = (module) => {
    if (role === 'viewer') return true;
    // Raw platform staff (not impersonating) cannot view tenant modules
    if (isRawPlatformStaff) return false;
    return checkPerm(module, 'view', () => (defaults[module] || []).includes(role) || isTenantAdmin() || isPlatformUser());
  };

  // Delete/destructive actions: Usually Admin or specific managers only
  const canDelete = (module) => {
    if (isRawPlatformStaff) return false;
    return checkPerm(module, 'delete', () => isTenantAdmin() || isPlatformUser());
  };

  // Specific Action capabilities
  const canViewFinancial = () => {
    if (isRawPlatformStaff) return false;
    return checkPerm('financials', 'view', () => defaults.financials.includes(role) || isPlatformUser());
  };
  const canAccessPayments = () => {
    if (isRawPlatformStaff) return false;
    return checkPerm('payments', 'view', () => defaults.payments.includes(role));
  };

  // Settings tab visibility
  const canManageCompanySettings = () => isRawPlatformStaff ? false : isTenantAdmin() || isPlatformUser();
  const canManageSubscription = () => isRawPlatformStaff ? false : isTenantAdmin() || isPlatformUser();
  const canManageSecurity = () => isRawPlatformStaff ? false : isTenantAdmin() || isPlatformUser();
  const canManageStaff = () => {
    if (isRawPlatformStaff) return false;
    return checkPerm('settings', 'manage_staff', () => isTenantAdmin() || isPlatformUser());
  };

  return {
    role,
    roleLevel,
    isRawPlatformStaff,
    isTenantAdmin,
    isPlatformUser,
    canEditForm,
    canViewForm,
    canViewFinancial,
    canDelete,
    canAccessPayments,
    canManageCompanySettings,
    canManageSubscription,
    canManageSecurity,
    canManageStaff,
  };
}
