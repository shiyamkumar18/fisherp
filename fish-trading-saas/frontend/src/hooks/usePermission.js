import { useAuthStore } from "@/store/authStore";

export function usePermission() {
  const { user } = useAuthStore();
  const role = user?.role || "guest";

  const isTenantAdmin = () => role === "tenant_admin";
  const isPlatformUser = () => ["platform_operator", "platform_support"].includes(role);
  
  // Financial visibility: Admin and Accountant can see profit/cost metrics
  const canViewFinancial = () => ["tenant_admin", "accountant", "platform_operator"].includes(role);
  
  // Delete/destructive actions: Usually Admin only
  const canDelete = () => isTenantAdmin();
  
  // Action capabilities mapped to backend defaults
  const canCreateSale = () => ["tenant_admin", "trader"].includes(role);
  const canEditPurchase = () => ["tenant_admin", "store"].includes(role);
  const canAccessPayments = () => ["tenant_admin", "accountant"].includes(role);
  
  // Settings tab visibility
  const canManageCompanySettings = () => isTenantAdmin();
  const canManageSubscription = () => isTenantAdmin() || isPlatformUser();
  const canManageSecurity = () => isTenantAdmin();

  const isTrader = () => role === "trader";
  const isStore = () => role === "store";
  const isAccountant = () => role === "accountant";

  return {
    role,
    isTenantAdmin,
    isPlatformUser,
    isTrader,
    isStore,
    isAccountant,
    canViewFinancial,
    canDelete,
    canCreateSale,
    canEditPurchase,
    canAccessPayments,
    canManageCompanySettings,
    canManageSubscription,
    canManageSecurity
  };
}
