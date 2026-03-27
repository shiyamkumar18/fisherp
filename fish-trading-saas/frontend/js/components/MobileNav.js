// Fish ERP - Mobile Bottom Navigation Component

const MobileNav = {
    baseItems: [
        { icon: 'fa-th-large', label: 'Dashboard', page: 'dashboard' },
        { icon: 'fa-shopping-cart', label: 'Purchases', page: 'purchases' },
        { icon: 'fa-cash-register', label: 'Sales', page: 'sales' },
        { icon: 'fa-boxes', label: 'Inventory', page: 'inventory' },
        { icon: 'fa-ellipsis-h', label: 'More', page: 'more' },
    ],

    init: () => {
        MobileNav.render();
        MobileNav.attachEvents();
    },

    shouldShow: () => window.innerWidth <= 768,

    render: () => {
        const mobileNav = document.getElementById('mobileNav');
        if (!mobileNav) return;

        if (!MobileNav.shouldShow()) {
            mobileNav.style.display = 'none';
            return;
        }
        mobileNav.style.display = '';

        const items = MobileNav.baseItems.filter((item) => {
            if (item.page === 'more') return true;
            return window.useRole.canAccessPage(item.page);
        });

        mobileNav.innerHTML = `
            <div class="mobile-nav-list">
                ${items
                    .map(
                        (item) => `
                            <a href="#" class="mobile-nav-item" data-page="${item.page}">
                                <i class="fas ${item.icon}"></i>
                                <span>${item.label}</span>
                            </a>
                        `
                    )
                    .join('')}
            </div>
        `;
    },

    attachEvents: () => {
        const navItems = document.querySelectorAll('.mobile-nav-item');
        navItems.forEach((item) => {
            item.addEventListener('click', function (event) {
                event.preventDefault();
                const page = this.getAttribute('data-page');
                if (page === 'more') {
                    document.getElementById('sidebar')?.classList.add('open');
                    return;
                }
                if (!window.Sidebar.checkAccess(page)) return;
                App.loadPage(page);
            });
        });
    },

    setActive: (page) => {
        document.querySelectorAll('.mobile-nav-item').forEach((item) => {
            item.classList.toggle('active', item.getAttribute('data-page') === page);
        });
    },

    handleResize: () => {
        MobileNav.render();
        MobileNav.attachEvents();
    },
};

window.MobileNav = MobileNav;
window.addEventListener('resize', MobileNav.handleResize);
