// Fish ERP - Dynamic Sidebar Component

const TENANT_MENU = [
    {
        title: 'Main',
        items: [{ icon: 'fa-th-large', label: 'Dashboard', page: 'dashboard' }],
    },
    {
        title: 'Trading',
        items: [
            { icon: 'fa-shopping-cart', label: 'Purchases', page: 'purchases' },
            { icon: 'fa-cash-register', label: 'Sales', page: 'sales' },
        ],
    },
    {
        title: 'Inventory',
        items: [
            { icon: 'fa-fish', label: 'Fish', page: 'fish' },
            { icon: 'fa-boxes', label: 'Stock', page: 'inventory' },
        ],
    },
    {
        title: 'Customers',
        items: [{ icon: 'fa-users', label: 'Buyers', page: 'buyers' }],
    },
    {
        title: 'Finance',
        items: [
            { icon: 'fa-file-invoice-dollar', label: 'Accounts', page: 'accounts' },
            { icon: 'fa-money-bill-wave', label: 'Payments', page: 'payments' },
        ],
    },
    {
        title: 'Reports',
        items: [{ icon: 'fa-chart-bar', label: 'Reports', page: 'reports' }],
    },
    {
        title: 'Management',
        items: [{ icon: 'fa-user-cog', label: 'Staff Management', page: 'users' }],
    },
    {
        title: 'Settings',
        items: [
            { icon: 'fa-crown', label: 'Subscription', page: 'subscription' },
            { icon: 'fa-cog', label: 'Settings', page: 'settings' },
        ],
    },
];

const PLATFORM_MENU = [
    {
        title: 'Platform',
        items: [
            { icon: 'fa-th-large', label: 'Dashboard', page: 'dashboard' },
            { icon: 'fa-building', label: 'Companies', page: 'platform' },
            { icon: 'fa-crown', label: 'Subscriptions', page: 'subscription' },
            { icon: 'fa-chart-line', label: 'Analytics', page: 'analytics' },
            { icon: 'fa-life-ring', label: 'Support', page: 'audit' },
            { icon: 'fa-cog', label: 'Settings', page: 'settings' },
        ],
    },
];

const Sidebar = {
    init: () => {
        Sidebar.render();
    },

    getMenuByRole: () => {
        if (window.useRole.isPlatformUser()) {
            return PLATFORM_MENU;
        }
        return TENANT_MENU;
    },

    canShowItem: (item) => {
        return window.useRole.canAccessPage(item.page) && window.useFeature.canAccessPage(item.page);
    },

    render: () => {
        const sidebarNav = document.querySelector('.sidebar-nav');
        if (!sidebarNav) return;

        const menu = Sidebar.getMenuByRole();
        let html = '';

        menu.forEach((section) => {
            const visibleItems = section.items.filter((item) => Sidebar.canShowItem(item));
            if (!visibleItems.length) return;

            html += `
                <div class="nav-section">
                    <div class="nav-section-title">${section.title}</div>
                    ${visibleItems
                        .map(
                            (item) => `
                                <a href="#" class="nav-item" data-page="${item.page}">
                                    <i class="fas ${item.icon}"></i>
                                    <span>${item.label}</span>
                                </a>
                            `
                        )
                        .join('')}
                </div>
            `;
        });

        html += `
            <div class="nav-section">
                <a href="#" class="nav-item" id="logoutBtn">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Logout</span>
                </a>
            </div>
        `;

        sidebarNav.innerHTML = html;
        Sidebar.attachEvents();
    },

    attachEvents: () => {
        const navItems = document.querySelectorAll('.sidebar-nav .nav-item[data-page]');
        navItems.forEach((item) => {
            item.addEventListener('click', function (event) {
                event.preventDefault();
                const page = this.getAttribute('data-page');
                if (!Sidebar.checkAccess(page)) return;
                window.App.loadPage(page);
            });
        });

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (event) => {
                event.preventDefault();
                window.Auth.logout();
            });
        }
    },

    setActive: (page) => {
        document.querySelectorAll('.sidebar-nav .nav-item').forEach((item) => {
            item.classList.toggle('active', item.getAttribute('data-page') === page);
        });
    },

    checkAccess: (page) => {
        if (!window.useRole.canAccessPage(page)) {
            window.UI.showAlert('You do not have permission to access this page', 'danger');
            return false;
        }

        if (!window.useFeature.canAccessPage(page)) {
            window.useFeature.showFeatureLocked('feature', 'premium');
            return false;
        }

        return true;
    },
};

window.Sidebar = Sidebar;
