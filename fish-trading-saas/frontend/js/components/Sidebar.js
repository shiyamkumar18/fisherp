class Sidebar {
    constructor() {
        this.sidebar = document.querySelector('.sidebar');
        if (!this.sidebar) {
            console.error('Sidebar element not found');
            return;
        }
        this.init();
    }

    init() {
        this.injectNavIfEmpty();       // Ensure menu exists
        this.updateVisibility();       // Apply role-based visibility
        this.addEventListeners();      // Attach interactive behavior
    }

    /**
     * Injects the navigation structure if it doesn't exist.
     * Uses innerHTML carefully; consider event delegation to avoid re‑binding.
     */
    injectNavIfEmpty() {
        if (this.sidebar.querySelector('ul.nav-menu')) return;

        this.sidebar.innerHTML = `
            <ul class="nav-menu">
                <li data-page="dashboard" class="active">
                    <i class="fas fa-tachometer-alt"></i> Dashboard
                </li>
                <li data-page="fish">
                    <i class="fas fa-fish"></i> Fish Types
                </li>
                <li data-page="fishCategories">
                    <i class="fas fa-tags"></i> Fish Categories
                </li>
                <li data-page="suppliers">
                    <i class="fas fa-truck"></i> Suppliers
                </li>
                <li data-page="buyers">
                    <i class="fas fa-user-friends"></i> Buyers
                </li>
                <li data-page="purchases">
                    <i class="fas fa-shopping-cart"></i> Purchases
                </li>
                <li data-page="sales">
                    <i class="fas fa-dollar-sign"></i> Sales
                </li>
                <li data-page="inventory">
                    <i class="fas fa-warehouse"></i> Inventory
                </li>
                <li data-page="payments">
                    <i class="fas fa-credit-card"></i> Payments
                </li>
                <li data-page="reports" class="admin-only">
                    <i class="fas fa-chart-bar"></i> Reports
                </li>
                <li data-page="staff" class="admin-only">
                    <i class="fas fa-users-cog"></i> Staff
                </li>
                <li data-page="settings" class="admin-only">
                    <i class="fas fa-cog"></i> Settings
                </li>
            </ul>
        `;

        // Optional: Set active page after injection
        const currentPage = localStorage.getItem('currentPage') || 'dashboard';
        this.setActiveNav(currentPage);
    }

    /**
     * Show/hide admin-only items based on user role.
     */
    updateVisibility() {
        const role = localStorage.getItem('role') || 'trader';
        const isAdmin = role === 'admin';

        this.sidebar.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isAdmin ? 'flex' : 'none';
        });
    }

    /**
     * Set active navigation item visually and optionally load page.
     * This method is called after injection or when the page changes.
     */
    setActiveNav(pageId) {
        const items = this.sidebar.querySelectorAll('.nav-menu li');
        items.forEach(item => {
            if (item.dataset.page === pageId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        // Store current page for persistence
        localStorage.setItem('currentPage', pageId);
    }

    /**
     * Attach event listeners using delegation to handle dynamic content.
     */
    addEventListeners() {
        // Delegate click events for navigation
        this.sidebar.addEventListener('click', (e) => {
            // Navigate when clicking a list item (or its children)
            const li = e.target.closest('li');
            if (!li) return;

            const page = li.dataset.page;
            if (page && typeof App !== 'undefined' && App.loadPage) {
                App.loadPage(page);
                this.setActiveNav(page);
            }

            // Handle collapsible submenus (if needed)
            const span = e.target.closest('li > span');
            if (span) {
                const parentLi = span.closest('li');
                const submenu = parentLi?.querySelector('.submenu');
                if (submenu) {
                    submenu.style.display = submenu.style.display === 'none' ? 'block' : 'none';
                }
            }
        });
    }
}

// Initialize sidebar when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Sidebar();
});