// Fish ERP - Authentication Module

const Auth = {
    // Current user state
    currentUser: {
        username: localStorage.getItem('username') || 'admin',
        role: localStorage.getItem('userRole') || localStorage.getItem('role') || 'tenant_admin',
        subscriptionTier: localStorage.getItem('subscriptionTier') || 'basic',
        features: JSON.parse(localStorage.getItem('subscriptionFeatures') || '{}')
    },
    
    // Role display names
    roleNames: {
        'platform_maintainer': 'Platform Maintainer',
        'platform_operator': 'Platform Operator',
        'platform_support': 'Platform Support',
        'tenant_admin': 'Owner',
        'accountant': 'Accountant',
        'trader': 'Trader',
        'store': 'Store',
        // Legacy aliases
        'sales_staff': 'Trader',
        'store_accounts': 'Store',
        'platform_super_admin': 'Platform Maintainer'
    },
    
    // Check if user is authenticated
    isAuthenticated: () => {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    },
    
    // Get current user
    getUser: () => Auth.currentUser,
    
    // Get role display name
    getRoleName: (role) => Auth.roleNames[role] || role,
    
    // Login function
    login: async (username, password) => {
        try {
            const response = await fetch(`${window.API.baseUrl}/auth/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                const accessToken = data.token || data.access;
                localStorage.setItem('token', accessToken);
                localStorage.setItem('access_token', accessToken);
                localStorage.setItem('username', username);
                localStorage.setItem('userRole', data.role || 'tenant_admin');
                localStorage.setItem('role', data.role || 'tenant_admin');
                if (data.user_id) {
                    localStorage.setItem('user_id', data.user_id);
                }
                localStorage.setItem('two_factor_enabled', data.two_factor_enabled ? '1' : '0');
                Auth.currentUser = { 
                    username, 
                    role: data.role || 'tenant_admin',
                    subscriptionTier: 'basic',
                    features: {}
                };
                
                // Fetch subscription features after successful login
                await Auth.fetchSubscriptionFeatures();
                
                return { success: true };
            }
            
            return { success: false, error: 'Invalid credentials' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Fetch subscription features from API
    fetchSubscriptionFeatures: async () => {
        try {
            const response = await fetch(`${window.API.baseUrl}/subscriptions/current/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Store tier
                localStorage.setItem('subscriptionTier', data.tier?.name || 'basic');
                Auth.currentUser.subscriptionTier = data.tier?.name || 'basic';
                
                // Store features as key-value object
                const features = {};
                if (data.features) {
                    if (Array.isArray(data.features)) {
                        data.features.forEach(feature => {
                            features[feature] = true;
                        });
                    } else if (typeof data.features === 'object') {
                        Object.assign(features, data.features);
                    }
                }
                
                // Also store individual feature flags from tier
                if (data.tier) {
                    Object.keys(data.tier).forEach(key => {
                        if (key.startsWith('allow_')) {
                            features[key] = data.tier[key];
                        }
                    });
                }
                
                localStorage.setItem('subscriptionFeatures', JSON.stringify(features));
                Auth.currentUser.features = features;
                
                return {
                    tier: data.tier?.name,
                    features: features,
                    daysRemaining: data.days_remaining
                };
            }
        } catch (error) {
            console.error('Error fetching subscription features:', error);
        }
        
        return null;
    },
    
    // Logout function
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('username');
        localStorage.removeItem('userRole');
        localStorage.removeItem('role');
        localStorage.removeItem('user_id');
        localStorage.removeItem('two_factor_enabled');
        localStorage.removeItem('subscriptionTier');
        localStorage.removeItem('subscriptionFeatures');
        window.location.href = '/login.html';
    },
    
    // Check role permission
    hasPermission: (requiredRole) => {
        const roleAliases = {
            platform_super_admin: 'platform_maintainer',
            sales_staff: 'trader',
            store_accounts: 'store',
        };
        const roles = ['platform_maintainer', 'platform_operator', 'platform_support', 'tenant_admin', 'accountant', 'trader', 'store'];
        const normalizedUserRole = roleAliases[Auth.currentUser.role] || Auth.currentUser.role;
        const normalizedRequiredRole = roleAliases[requiredRole] || requiredRole;
        const userRoleIndex = roles.indexOf(normalizedUserRole);
        const requiredRoleIndex = roles.indexOf(normalizedRequiredRole);
        if (userRoleIndex === -1 || requiredRoleIndex === -1) return false;
        return userRoleIndex <= requiredRoleIndex;
    },
    
    // Get subscription tier
    getSubscriptionTier: () => {
        return localStorage.getItem('subscriptionTier') || 'basic';
    },
    
    // Get subscription features
    getSubscriptionFeatures: () => {
        return JSON.parse(localStorage.getItem('subscriptionFeatures') || '{}');
    },
    
    // Check if feature is enabled
    hasFeature: (featureName) => {
        const features = Auth.getSubscriptionFeatures();
        return features[featureName] === true;
    }
};

// Export to window
window.Auth = Auth;
