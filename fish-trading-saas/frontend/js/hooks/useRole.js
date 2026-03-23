// Fish ERP - Role-Based Access Control Hook

const ROLE_ALIASES = {
    platform_super_admin: 'platform_maintainer',
    sales_staff: 'trader',
    store_accounts: 'store',
};

/**
 * Role hierarchy - higher number = more authority
 */
const ROLE_HIERARCHY = {
    platform_maintainer: 7,
    platform_operator: 6,
    platform_support: 5,
    tenant_admin: 4,
    accountant: 3,
    trader: 2,
    store: 1,
};

/**
 * Role display names
 */
const ROLE_DISPLAY_NAMES = {
    platform_maintainer: 'Platform Maintainer',
    platform_operator: 'Platform Operator',
    platform_support: 'Platform Support',
    tenant_admin: 'Owner',
    accountant: 'Accountant',
    trader: 'Trader',
    store: 'Store',

    // Legacy aliases.
    platform_super_admin: 'Platform Maintainer',
    sales_staff: 'Trader',
    store_accounts: 'Store',
};

/**
 * Menu visibility by role
 * Format: { page: [allowed_roles] }
 */
const ROLE_MENU_PERMISSIONS = {
    // Shared
    dashboard: ['platform_maintainer', 'platform_operator', 'platform_support', 'tenant_admin', 'accountant', 'trader', 'store'],
    settings: ['platform_maintainer', 'platform_operator', 'platform_support', 'tenant_admin'],

    // Owner
    users: ['tenant_admin'],
    fishCategories: ['tenant_admin', 'store'],
    suppliers: ['tenant_admin', 'trader'],
    payments: ['tenant_admin', 'accountant'],
    subscription: ['tenant_admin', 'platform_maintainer', 'platform_operator'],

    // Tenant role matrix
    fish: ['tenant_admin', 'store'],
    buyers: ['tenant_admin', 'trader'],
    purchases: ['tenant_admin', 'trader'],
    sales: ['tenant_admin', 'trader'],
    inventory: ['tenant_admin', 'store'],
    accounts: ['tenant_admin', 'accountant'],
    reports: ['tenant_admin', 'accountant'],
    analytics: ['tenant_admin', 'accountant', 'platform_maintainer', 'platform_operator'],

    // Platform role matrix
    platform: ['platform_maintainer', 'platform_operator', 'platform_support'],
    audit: ['platform_maintainer', 'platform_operator', 'platform_support'],
    security: ['platform_maintainer', 'platform_operator', 'platform_support', 'tenant_admin', 'accountant', 'trader', 'store'],
};

/**
 * Column visibility by role
 * Format: { page: { columnName: [allowed_roles] } }
 */
const ROLE_COLUMN_PERMISSIONS = {
    sales: {
        profit: ['platform_maintainer', 'platform_operator', 'platform_support', 'tenant_admin', 'accountant'],
        cost: ['platform_maintainer', 'platform_operator', 'platform_support', 'tenant_admin', 'accountant'],
        margin: ['platform_maintainer', 'platform_operator', 'platform_support', 'tenant_admin', 'accountant'],
    },
    purchases: {
        cost: ['platform_maintainer', 'platform_operator', 'platform_support', 'tenant_admin', 'accountant'],
        supplier_contact: ['platform_maintainer', 'platform_operator', 'platform_support', 'tenant_admin', 'accountant'],
    },
    inventory: {
        cost: ['platform_maintainer', 'platform_operator', 'platform_support', 'tenant_admin', 'accountant'],
        margin: ['platform_maintainer', 'platform_operator', 'platform_support', 'tenant_admin', 'accountant'],
        supplier: ['platform_maintainer', 'platform_operator', 'platform_support', 'tenant_admin', 'accountant', 'store'],
    },
};

/**
 * Action permissions by role
 */
const ROLE_ACTION_PERMISSIONS = {
    delete: ['platform_maintainer', 'platform_operator', 'tenant_admin'],
    edit: ['platform_maintainer', 'platform_operator', 'platform_support', 'tenant_admin', 'accountant'],
    create: ['platform_maintainer', 'platform_operator', 'platform_support', 'tenant_admin', 'accountant', 'trader', 'store'],
    export: ['platform_maintainer', 'platform_operator', 'platform_support', 'tenant_admin', 'accountant'],
    import: ['platform_maintainer', 'platform_operator', 'platform_support', 'tenant_admin', 'accountant'],
};

const normalizeRole = (role) => ROLE_ALIASES[role] || role;

const useRole = {
    /**
     * Get current user's role
     */
    getRole: () => {
        const role = localStorage.getItem('userRole') || localStorage.getItem('role') || 'tenant_admin';
        return normalizeRole(role);
    },

    /**
     * Get role level (hierarchy number)
     */
    getRoleLevel: (role) => {
        const normalized = normalizeRole(role);
        return ROLE_HIERARCHY[normalized] || 0;
    },

    /**
     * Get current user's role level
     */
    getCurrentRoleLevel: () => {
        const role = useRole.getRole();
        return ROLE_HIERARCHY[role] || 0;
    },

    /**
     * Check if current user has a specific role
     */
    hasRole: (requiredRole) => {
        const currentRole = useRole.getRole();
        return currentRole === normalizeRole(requiredRole);
    },

    /**
     * Check if current user's role is in the allowed list
     */
    hasAnyRole: (allowedRoles) => {
        const currentRole = useRole.getRole();
        const normalizedAllowedRoles = allowedRoles.map(normalizeRole);
        return normalizedAllowedRoles.includes(currentRole);
    },

    /**
     * Check if current user's role level is >= required level
     */
    hasRoleLevel: (requiredLevel) => {
        return useRole.getCurrentRoleLevel() >= requiredLevel;
    },

    /**
     * Check if user can access a specific page/menu
     */
    canAccessPage: (page) => {
        const allowedRoles = ROLE_MENU_PERMISSIONS[page];
        if (!allowedRoles) {
            // Page not in permissions list - allow by default.
            return true;
        }
        return useRole.hasAnyRole(allowedRoles);
    },

    /**
     * Get all accessible pages for current role
     */
    getAccessiblePages: () => {
        const currentRole = useRole.getRole();
        const accessiblePages = [];

        for (const [page, allowedRoles] of Object.entries(ROLE_MENU_PERMISSIONS)) {
            if (allowedRoles.includes(currentRole)) {
                accessiblePages.push(page);
            }
        }

        return accessiblePages;
    },

    /**
     * Check if user can view a specific column
     */
    canViewColumn: (page, column) => {
        const pageColumns = ROLE_COLUMN_PERMISSIONS[page];
        if (!pageColumns) {
            // No restrictions - show by default.
            return true;
        }

        const allowedRoles = pageColumns[column];
        if (!allowedRoles) {
            // Column not restricted - show by default.
            return true;
        }

        return useRole.hasAnyRole(allowedRoles);
    },

    /**
     * Check if user can perform an action
     */
    canPerformAction: (action) => {
        const allowedRoles = ROLE_ACTION_PERMISSIONS[action];
        if (!allowedRoles) {
            return false;
        }
        return useRole.hasAnyRole(allowedRoles);
    },

    /**
     * Check if user is a platform-level user
     */
    isPlatformUser: () => {
        const role = useRole.getRole();
        return ['platform_maintainer', 'platform_operator', 'platform_support'].includes(role);
    },

    /**
     * Check if user is a tenant-level user
     */
    isTenantUser: () => {
        const role = useRole.getRole();
        return ['tenant_admin', 'accountant', 'trader', 'store'].includes(role);
    },

    /**
     * Check if user can view financial data (profit, margins)
     */
    canViewFinancials: () => {
        const role = useRole.getRole();
        return ['platform_maintainer', 'platform_operator', 'platform_support', 'tenant_admin', 'accountant'].includes(role);
    },

    /**
     * Check if user can manage users
     */
    canManageUsers: () => {
        const role = useRole.getRole();
        return ['platform_maintainer', 'platform_operator', 'platform_support', 'tenant_admin'].includes(role);
    },

    /**
     * Check if user can delete records
     */
    canDeleteRecords: () => {
        const role = useRole.getRole();
        return ['platform_maintainer', 'platform_operator', 'tenant_admin'].includes(role);
    },

    /**
     * Get role display name
     */
    getRoleDisplayName: (role) => {
        return ROLE_DISPLAY_NAMES[role] || ROLE_DISPLAY_NAMES[normalizeRole(role)] || role;
    },

    /**
     * Get current user's role display name
     */
    getCurrentRoleDisplayName: () => {
        const role = useRole.getRole();
        return ROLE_DISPLAY_NAMES[role] || role;
    },
};

// Export to window
window.useRole = useRole;
