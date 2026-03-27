/**
 * Quick Actions (Floating Action Button with Radial Menu)
 * - Always-visible bottom-right FAB
 * - Click toggles radial menu with filtered actions
 * - Keyboard shortcut: Ctrl+/
 * - Auto-closes on outside click
 * - Integrates with App.loadPage and triggers create actions
 */

class QuickActions {
    // Define the available actions with metadata
    static actions = [
        { id: 'addSale', icon: 'fa-shopping-cart', label: 'Add Sale', page: 'sales', action: 'create', feature: 'allow_sale_entry' },
        { id: 'addPurchase', icon: 'fa-truck', label: 'Add Purchase', page: 'purchases', action: 'create', feature: 'allow_purchase_entry' },
        { id: 'recordPayment', icon: 'fa-money-bill', label: 'Record Payment', page: 'payments', action: 'create', feature: 'allow_payment_tracking' },
        { id: 'viewStock', icon: 'fa-boxes', label: 'View Stock', page: 'inventory', feature: 'allow_inventory' },
        { id: 'addFish', icon: 'fa-fish', label: 'Add Fish', page: 'fish', action: 'create', feature: 'allow_sale_entry' },
        { id: 'addSupplier', icon: 'fa-user-plus', label: 'Add Supplier', page: 'suppliers', action: 'create', feature: 'allow_purchase_entry' }
    ];

    constructor() {
        this.container = null;
        this.isOpen = false;
        this.init();
    }

    /**
     * Initialise: render FAB, attach events
     */
    init() {
        this.renderFAB();
        this.attachEvents();
    }

    /**
     * Create the FAB DOM structure
     */
    renderFAB() {
        // Avoid duplicate
        if (document.getElementById('quick-actions-fab')) return;

        this.container = document.createElement('div');
        this.container.id = 'quick-actions-fab';
        this.container.innerHTML = `
            <button id="fab-main" class="fab-primary" title="Quick Actions (Ctrl+/)">
                <i class="fas fa-plus"></i>
            </button>
            <div id="fab-menu" class="fab-menu hidden"></div>
        `;
        document.body.appendChild(this.container);
    }

    /**
     * Filter actions based on role/feature permissions.
     * Uses global objects if available, otherwise allows all.
     */
    getFilteredActions() {
        return QuickActions.actions.filter(action => {
            // Feature check
            if (action.feature && window.useFeature?.canAccessFeature) {
                if (!window.useFeature.canAccessFeature(action.feature)) return false;
            }
            // Action permission check
            if (action.action && window.useRole?.canPerformAction) {
                if (!window.useRole.canPerformAction(action.action)) return false;
            }
            return true;
        }).slice(0, 6); // Limit to 6 for radial menu
    }

    /**
     * Build the radial menu from filtered actions
     */
    renderMenu() {
        const filtered = this.getFilteredActions();
        const menu = document.getElementById('fab-menu');
        if (!menu) return;

        menu.innerHTML = filtered.map(action => `
            <button class="fab-item" data-action="${action.id}" data-page="${action.page}" title="${action.label}">
                <i class="fas ${action.icon}"></i>
                <span class="fab-label">${action.label}</span>
            </button>
        `).join('');

        // Attach click handlers to each item
        menu.querySelectorAll('.fab-item').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const page = btn.dataset.page;
                const actionId = btn.dataset.action;
                this.triggerAction(page, actionId);
                this.closeMenu();
            };
        });
    }

    /**
     * Execute the quick action: load the target page and trigger create modal if applicable
     */
    triggerAction(page, actionId) {
        // Load the page
        if (window.App && typeof window.App.loadPage === 'function') {
            window.App.loadPage(page);
        } else {
            console.warn('App.loadPage not available');
        }

        // If it's a "create" action, try to click the corresponding create button after page loads
        if (actionId && actionId.startsWith('add')) {
            setTimeout(() => {
                // Look for a button with data-action starting with "create-" or a general "add" button
                const createBtn = document.querySelector(`[data-action="create-${page.replace(/s$/, '')}"]`) ||
                                   document.querySelector(`#${page}Page .btn-primary`);
                if (createBtn) {
                    createBtn.click();
                }
            }, 300);
        }
    }

    /**
     * Open the menu
     */
    openMenu() {
        if (this.isOpen) return;
        this.renderMenu();
        const menu = document.getElementById('fab-menu');
        const mainBtn = document.getElementById('fab-main');
        if (menu) menu.classList.remove('hidden');
        if (mainBtn) mainBtn.style.transform = 'rotate(45deg)';
        this.isOpen = true;
    }

    /**
     * Close the menu
     */
    closeMenu() {
        if (!this.isOpen) return;
        const menu = document.getElementById('fab-menu');
        const mainBtn = document.getElementById('fab-main');
        if (menu) menu.classList.add('hidden');
        if (mainBtn) mainBtn.style.transform = 'rotate(0deg)';
        this.isOpen = false;
    }

    /**
     * Toggle menu open/close
     */
    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    /**
     * Attach event listeners: main button, keyboard shortcut, outside click
     */
    attachEvents() {
        // Main FAB button click
        const mainBtn = document.getElementById('fab-main');
        if (mainBtn) {
            mainBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMenu();
            });
        }

        // Keyboard shortcut: Ctrl+/
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === '/') {
                e.preventDefault();
                this.toggleMenu();
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && this.container && !this.container.contains(e.target)) {
                this.closeMenu();
            }
        });
    }

    /**
     * Public method to refresh the menu (e.g., after role change)
     */
    refresh() {
        if (this.isOpen) {
            // If menu is open, re-render it
            this.renderMenu();
        }
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.QuickActions = new QuickActions();
});