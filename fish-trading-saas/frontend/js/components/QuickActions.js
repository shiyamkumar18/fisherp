// Fish ERP - Quick Actions Component for Mobile

const QuickActions = {
    /**
     * Quick action buttons configuration
     */
    actions: [
        { id: 'addSale', icon: 'fa-shopping-cart', label: 'Add Sale', page: 'sales', action: 'create', feature: 'allow_sale_entry' },
        { id: 'addPurchase', icon: 'fa-truck', label: 'Add Purchase', page: 'purchases', action: 'create', feature: 'allow_purchase_entry' },
        { id: 'recordPayment', icon: 'fa-money-bill', label: 'Record Payment', page: 'payments', action: 'create', feature: 'allow_payment_tracking' },
        { id: 'viewStock', icon: 'fa-boxes', label: 'View Stock', page: 'inventory', feature: 'allow_inventory' },
        { id: 'addFish', icon: 'fa-fish', label: 'Add Fish', page: 'fish', action: 'create', feature: 'allow_sale_entry' },
        { id: 'addSupplier', icon: 'fa-user-plus', label: 'Add Supplier', page: 'suppliers', action: 'create', feature: 'allow_purchase_entry' }
    ],

    /**
     * Initialize quick actions
     */
    init: () => {
        QuickActions.render();
    },

    /**
     * Filter actions based on role and features
     */
    filterActions: () => {
        return QuickActions.actions.filter(action => {
            // Check feature requirement
            if (action.feature && !window.useFeature.canAccessFeature(action.feature)) {
                return false;
            }

            // Check action permission
            if (action.action && !window.useRole.canPerformAction(action.action)) {
                return false;
            }

            return true;
        });
    },

    /**
     * Render quick actions grid
     */
    render: (containerId = 'quickActions') => {
        const container = document.getElementById(containerId);
        if (!container) return;

        const visibleActions = QuickActions.filterActions();

        // Take first 4 actions for mobile
        const actionsToShow = visibleActions.slice(0, 4);

        let html = '<div class="quick-actions">';
        
        actionsToShow.forEach(action => {
            html += `
                <button class="quick-action-btn" data-action="${action.id}" data-page="${action.page}">
                    <i class="fas ${action.icon}"></i>
                    <span>${action.label}</span>
                </button>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Attach events
        QuickActions.attachEvents();
    },

    /**
     * Attach click events
     */
    attachEvents: () => {
        const buttons = document.querySelectorAll('.quick-action-btn');
        
        buttons.forEach(btn => {
            btn.addEventListener('click', function() {
                const page = this.getAttribute('data-page');
                const actionId = this.getAttribute('data-action');

                // Check access
                if (!window.Sidebar.checkAccess(page)) {
                    return;
                }

                // Load the page and trigger create action
                window.App.loadPage(page);
                
                // If there's a create button on the page, trigger it
                setTimeout(() => {
                    const createBtn = document.querySelector(`[data-action="create-${page.replace('s', '')}"]`);
                    if (createBtn) {
                        createBtn.click();
                    }
                }, 300);
            });
        });
    },

    /**
     * Update visibility based on current state
     */
    refresh: () => {
        QuickActions.render();
    }
};

// Export to window
window.QuickActions = QuickActions;

