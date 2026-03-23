// Fish ERP - Tier-Based Feature Access Hook

/**
 * Subscription tier levels
 */
const TIER_LEVELS = {
    'free': 0,
    'basic': 1,
    'premium': 2,
    'enterprise': 3
};

/**
 * Tier display names
 */
const TIER_DISPLAY_NAMES = {
    'free': 'Free Trial',
    'basic': 'Basic',
    'premium': 'Premium',
    'enterprise': 'Enterprise'
};

/**
 * Feature to menu/page mapping
 * Maps feature flags to accessible pages
 */
const FEATURE_PAGE_MAP = {
    // Basic features - always available for any tier
    'allow_purchase_entry': 'purchases',
    'allow_sale_entry': 'sales',
    'allow_inventory': 'inventory',
    'allow_payment_tracking': 'payments',
    
    // Reports & Analytics - Premium+
    'allow_advanced_analytics': 'analytics',
    'allow_csv_export': 'reports',
    'allow_pdf_reports': 'reports',
    
    // Enterprise features
    'allow_multi_location': 'warehouses',
    'allow_audit_logs': 'audit',
    'allow_temperature_monitoring': 'temperature',
    'allow_transport_management': 'transport'
};

/**
 * Dashboard features by tier
 * Defines which KPIs are available at each tier
 */
const TIER_DASHBOARD_FEATURES = {
    // Basic tier
    basic: {
        kpis: ['todaySales', 'todayProfit', 'receivables', 'inventoryValue'],
        charts: [],
        alerts: ['lowStock']
    },
    // Premium tier
    premium: {
        kpis: ['todaySales', 'todayProfit', 'receivables', 'inventoryValue', 'monthlyRevenue', 'profitMargin'],
        charts: ['salesTrend', 'stockStatus', 'profitBreakdown'],
        alerts: ['lowStock', 'expiryAlert', 'creditRisk']
    },
    // Enterprise tier
    enterprise: {
        kpis: ['todaySales', 'todayProfit', 'receivables', 'inventoryValue', 'monthlyRevenue', 'profitMargin', 'warehouseValue'],
        charts: ['salesTrend', 'stockStatus', 'profitBreakdown', 'warehouseComparison', 'temperature'],
        alerts: ['lowStock', 'expiryAlert', 'creditRisk', 'temperatureAlert']
    }
};

/**
 * Mobile navigation items by tier
 */
const TIER_MOBILE_NAV = {
    // All tiers
    basic: [
        { id: 'home', icon: 'fa-home', label: 'Home', page: 'dashboard' },
        { id: 'sales', icon: 'fa-shopping-cart', label: 'Sales', page: 'sales' },
        { id: 'purchase', icon: 'fa-truck', label: 'Purchase', page: 'purchases' },
        { id: 'payment', icon: 'fa-money-bill', label: 'Payment', page: 'payments' },
        { id: 'profile', icon: 'fa-user', label: 'Profile', page: 'settings' }
    ],
    // Premium adds Reports
    premium: [
        { id: 'home', icon: 'fa-home', label: 'Home', page: 'dashboard' },
        { id: 'sales', icon: 'fa-shopping-cart', label: 'Sales', page: 'sales' },
        { id: 'purchase', icon: 'fa-truck', label: 'Purchase', page: 'purchases' },
        { id: 'payment', icon: 'fa-money-bill', label: 'Payment', page: 'payments' },
        { id: 'reports', icon: 'fa-chart-bar', label: 'Reports', page: 'reports' },
        { id: 'profile', icon: 'fa-user', label: 'Profile', page: 'settings' }
    ],
    // Enterprise adds Warehouses
    enterprise: [
        { id: 'home', icon: 'fa-home', label: 'Home', page: 'dashboard' },
        { id: 'sales', icon: 'fa-shopping-cart', label: 'Sales', page: 'sales' },
        { id: 'purchase', icon: 'fa-truck', label: 'Purchase', page: 'purchases' },
        { id: 'payment', icon: 'fa-money-bill', label: 'Payment', page: 'payments' },
        { id: 'reports', icon: 'fa-chart-bar', label: 'Reports', page: 'reports' },
        { id: 'warehouses', icon: 'fa-warehouse', label: 'Warehouses', page: 'warehouses' },
        { id: 'profile', icon: 'fa-user', label: 'Profile', page: 'settings' }
    ]
};

const useFeature = {
    /**
     * Get current subscription tier
     */
    getTier: () => {
        return localStorage.getItem('subscriptionTier') || 'basic';
    },

    /**
     * Get tier level number
     */
    getTierLevel: (tier) => {
        return TIER_LEVELS[tier] || 0;
    },

    /**
     * Get current tier level number
     */
    getCurrentTierLevel: () => {
        const tier = useFeature.getTier();
        return TIER_LEVELS[tier] || 0;
    },

    /**
     * Check if current tier is at least the specified level
     */
    hasTierAtLeast: (requiredTier) => {
        const currentLevel = useFeature.getCurrentTierLevel();
        const requiredLevel = TIER_LEVELS[requiredTier] || 0;
        return currentLevel >= requiredLevel;
    },

    /**
     * Check if user can access a specific feature
     */
    canAccessFeature: (featureName) => {
        // Get feature flags from localStorage (set during login)
        const features = JSON.parse(localStorage.getItem('subscriptionFeatures') || '{}');
        
        // If features are not loaded, default to basic access
        if (Object.keys(features).length === 0) {
            // Default to basic tier permissions for core features
            const basicFeatures = [
                'allow_purchase_entry', 'allow_sale_entry', 'allow_inventory',
                'allow_payment_tracking', 'allow_today_sales', 'allow_today_profit',
                'allow_outstanding_receivables', 'allow_inventory_value'
            ];
            return basicFeatures.includes(featureName);
        }
        
        return features[featureName] === true;
    },

    /**
     * Get all enabled features for current tier
     */
    getEnabledFeatures: () => {
        return JSON.parse(localStorage.getItem('subscriptionFeatures') || '{}');
    },

    /**
     * Check if a page is accessible based on tier
     */
    canAccessPage: (page) => {
        // Find which feature controls this page
        const controllingFeature = Object.entries(FEATURE_PAGE_MAP).find(
            ([feature, pageName]) => pageName === page
        )?.[0];

        if (!controllingFeature) {
            // No feature restriction - allow access
            return true;
        }

        return useFeature.canAccessFeature(controllingFeature);
    },

    /**
     * Get dashboard features for current tier
     */
    getDashboardFeatures: () => {
        const tier = useFeature.getTier();
        return TIER_DASHBOARD_FEATURES[tier] || TIER_DASHBOARD_FEATURES.basic;
    },

    /**
     * Get visible KPIs for current tier
     */
    getVisibleKpis: () => {
        const features = useFeature.getDashboardFeatures();
        return features.kpis || [];
    },

    /**
     * Get visible charts for current tier
     */
    getVisibleCharts: () => {
        const features = useFeature.getDashboardFeatures();
        return features.charts || [];
    },

    /**
     * Get visible alerts for current tier
     */
    getVisibleAlerts: () => {
        const features = useFeature.getDashboardFeatures();
        return features.alerts || [];
    },

    /**
     * Get mobile navigation for current tier
     */
    getMobileNav: () => {
        const tier = useFeature.getTier();
        
        // Start with basic nav
        let nav = [...TIER_MOBILE_NAV.basic];
        
        // Add premium items
        if (useFeature.hasTierAtLeast('premium')) {
            const premiumNav = TIER_MOBILE_NAV.premium.filter(
                item => !nav.find(n => n.id === item.id)
            );
            nav = [...nav, ...premiumNav];
        }
        
        // Add enterprise items
        if (useFeature.hasTierAtLeast('enterprise')) {
            const enterpriseNav = TIER_MOBILE_NAV.enterprise.filter(
                item => !nav.find(n => n.id === item.id)
            );
            nav = [...nav, ...enterpriseNav];
        }
        
        return nav;
    },

    /**
     * Get tier display name
     */
    getTierDisplayName: (tier) => {
        return TIER_DISPLAY_NAMES[tier] || tier;
    },

    /**
     * Get current tier display name
     */
    getCurrentTierDisplayName: () => {
        const tier = useFeature.getTier();
        return TIER_DISPLAY_NAMES[tier] || tier;
    },

    /**
     * Check if user is on enterprise tier
     */
    isEnterprise: () => {
        return useFeature.hasTierAtLeast('enterprise');
    },

    /**
     * Check if user is on premium tier or above
     */
    isPremium: () => {
        return useFeature.hasTierAtLeast('premium');
    },

    /**
     * Fetch subscription features from API
     */
    fetchFeatures: async () => {
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

    /**
     * Show feature locked modal
     */
    showFeatureLocked: (featureName, upgradeTier = 'premium') => {
        const modalContent = `
            <div class="feature-locked-modal">
                <div class="locked-icon">
                    <i class="fas fa-lock"></i>
                </div>
                <h3>Feature Not Available</h3>
                <p>This feature requires a higher subscription tier.</p>
                <div class="current-plan">
                    <span class="label">Current Plan:</span>
                    <span class="value">${useFeature.getCurrentTierDisplayName()}</span>
                </div>
                <div class="required-plan">
                    <span class="label">Required Plan:</span>
                    <span class="value">${upgradeTier.charAt(0).toUpperCase() + upgradeTier.slice(1)}</span>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="UI.closeModal()">Maybe Later</button>
                    <button class="btn btn-primary" onclick="App.loadPage('subscription'); UI.closeModal();">Upgrade Now</button>
                </div>
            </div>
        `;
        
        window.UI.showModal('Upgrade Required', modalContent);
    }
};

// Export to window
window.useFeature = useFeature;
