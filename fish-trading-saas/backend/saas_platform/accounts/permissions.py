"""
Role-Based Permission Classes for Fisherp SaaS

Implements professional, security-hardened RBAC.
This file is a compatibility shim that exports permissions from the subpackage.
"""

from saas_platform.accounts.permissions.base import (
    check_module_permission,
    check_role_permission,
    check_feature_access,
    get_role_display_name,
    get_role_description,
)
from saas_platform.accounts.permissions.platform import (
    IsPlatformSuperAdmin,
    IsPlatformOperator,
    IsPlatformSupport,
    IsPlatformOperatorOrReadOnlySupport,
    CanUseImpersonation,
    is_impersonating,
    get_impersonated_tenant,
    start_impersonation,
    end_impersonation,
)
from saas_platform.accounts.permissions.tenant import (
    IsTenantAdmin,
    IsAccountant,
    IsSalesStaff,
    IsStoreAccounts,
    IsTenantUser,
    TenantObjectPermission,
    CanManageUsers,
    CanDeleteRecord,
)
from saas_platform.accounts.permissions.combined import (
    IsTenantAdminOrAbove,
    HasAnyRole,
    CanCreateSale,
    CanCreatePurchase,
    CanRecordPayment,
    CanEditSale,
    CanEditPayment,
    BaseModulePermission,
    CanViewSales,
    CanEditSales,
    CanDeleteSales,
    CanViewPurchases,
    CanEditPurchases,
    CanDeletePurchases,
    CanViewInventory,
    CanEditInventory,
    CanDeleteInventory,
    CanViewPayments,
    CanEditPayments,
    CanDeletePayments,
    CanViewCustomers,
    CanEditCustomers,
    CanDeleteCustomers,
    CanViewSuppliers,
    CanEditSuppliers,
    CanDeleteSuppliers,
)
from saas_platform.accounts.permissions.financial import (
    CanViewFinancials,
    CanViewProfit,
    CanViewSupplierCost,
    CanViewPurchaseCost,
    QuerysetProtectionMixin,
)
from saas_platform.accounts.permissions.throttles import (
    LoginThrottle,
    ImpersonationThrottle,
    HasFeatureAccess,
)
