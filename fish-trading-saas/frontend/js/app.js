// Fish ERP - Main Application Entry Point

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!window.Auth.isAuthenticated()) {
        return;
    }
    
    // Initialize UI components
    window.UI.init();
    
    // Setup user info
    window.UI.setupUserInfo();
    
    // Initialize dynamic Sidebar with role-based filtering
    window.Sidebar.init();
    
    // Initialize Mobile Navigation
    window.MobileNav.init();
    
    // Initialize Quick Actions
    window.QuickActions.init();
    
    // Initialize Session Manager
    window.SessionManager.init();
    
    // Setup navigation
    App.setupNavigation();

    // Attach search/filter handlers once.
    window.Trading.attachSearchHandlers();
    window.ManagementPages.attachSearchHandlers();
    
    // Load dashboard by default
    App.loadPage('dashboard');
});

// Main Application Module
const App = {
    // Page loader mapping
    pageLoaders: {
        'dashboard': window.DashboardPage.init,
        'fish': window.Trading.loadFish,
        'fishCategories': window.Trading.loadFishCategories,
        'suppliers': window.Trading.loadSuppliers,
        'buyers': window.Trading.loadBuyers,
        'purchases': window.Trading.loadPurchases,
        'sales': window.Trading.loadSales,
        'inventory': window.Trading.loadInventory,
        'payments': window.Trading.loadPayments,
        'accounts': window.AccountsPage.init,
        'reports': window.ReportsPage.init,
        'analytics': window.AnalyticsPage.init,
        'subscription': window.ManagementPages.loadSubscription,
        'users': window.ManagementPages.loadUsers,
        'audit': window.ManagementPages.loadAudit,
        'platform': window.ManagementPages.loadPlatform,
        'security': window.ManagementPages.loadSecurity
    },
    
    // Setup navigation event listeners
    setupNavigation: () => {
        // Navigation is now handled by Sidebar component
        // Re-attach events when sidebar is re-rendered
    },
    
    // Load a page
    loadPage: (page) => {
        // Check role and feature access
        if (!window.Sidebar.checkAccess(page)) {
            return;
        }
        
        // Update page title
        window.UI.setPageTitle(page);
        
        // Show the page
        window.UI.showPage(page);
        
        // Update navigation (both sidebar and mobile)
        window.Sidebar.setActive(page);
        window.MobileNav.setActive(page);
        
        // Update page title with role/tier badge
        App.updatePageTitle(page);
        
        // Load page data if loader exists
        if (App.pageLoaders[page]) {
            App.pageLoaders[page]();
        }
    },
    
    // Update page title with subscription tier badge
    updatePageTitle: (page) => {
        const pageTitle = document.getElementById('pageTitle');
        if (!pageTitle) return;
        
        const tier = window.useFeature.getTier();
        const tierDisplay = window.useFeature.getCurrentTierDisplayName();
        
        // Get base title
        const titles = {
            'dashboard': 'Dashboard',
            'fish': 'Fish Products',
            'fishCategories': 'Fish Categories',
            'suppliers': 'Suppliers',
            'buyers': 'Buyers',
            'purchases': 'Purchases',
            'sales': 'Sales',
            'inventory': 'Inventory',
            'payments': 'Payments',
            'accounts': 'Accounts',
            'reports': 'Reports',
            'analytics': 'Analytics',
            'subscription': 'Subscription',
            'users': 'Staff Management',
            'audit': 'Audit Logs',
            'platform': 'Platform Admin',
            'security': 'Security',
            'settings': 'Settings'
        };
        
        let titleHtml = titles[page] || 'Dashboard';
        
        // Add tier badge for premium+ features
        if (['reports', 'analytics', 'audit'].includes(page)) {
            if (tier === 'basic') {
                titleHtml += ` <span class="tier-badge tier-premium">${tierDisplay}</span>`;
            }
        }
        
        pageTitle.innerHTML = titleHtml;
    }
};

// Export to window
window.App = App;
window.loadPage = (page) => window.App.loadPage(page);
window.showAlert = (message, type = 'info') => window.UI.showAlert(message, type);

// Initialize event handlers
document.addEventListener('DOMContentLoaded', function() {
    window.EventHandlers.init();
});
