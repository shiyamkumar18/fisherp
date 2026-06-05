// Unified application shell and page router

const AppState = { charts: {} };

let currentUserRole = localStorage.getItem('userRole') || 'tenant_admin';
let isPlatformUser = localStorage.getItem('isPlatformUser') === 'true';
let currentPage = 'dashboard';
let platformDashboardMarkup = '';

const pages = {
    dashboard: 'dashboard-content.html',
    fish: 'fish.html',
    fishCategories: 'fishCategories.html',
    suppliers: 'suppliers.html',
    buyers: 'buyers.html',
    purchases: 'purchases.html',
    sales: 'sales.html',
    inventory: 'inventory.html',
    payments: 'payments.html',
    reports: 'reports.html',
    analytics: 'analytics.html',
    users: 'users.html',
    subscription: 'subscriptions.html',
    settings: 'settings.html',
    companySettings: 'company-settings.html',
    productsMaster: 'products-master.html',
    customersMgmt: 'customers-mgmt.html',
    suppliersMgmt: 'suppliers-mgmt.html'
};

const roleMenus = {
    admin: Object.keys(pages),
    tenant_admin: Object.keys(pages),
    accountant: ['dashboard', 'purchases', 'sales', 'payments', 'reports', 'subscription', 'settings', 'customersMgmt'],
    trader: ['dashboard', 'sales', 'buyers', 'inventory', 'settings', 'productsMaster', 'customersMgmt'],
    store: ['dashboard', 'fish', 'fishCategories', 'purchases', 'inventory', 'settings', 'productsMaster'],
    platform_operator: ['dashboard', 'reports', 'users', 'subscription'],
    platform_support: ['dashboard', 'users', 'subscription']
};

const tenantMenuSections = [
    {
        title: 'Overview',
        items: [
            { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line', caption: 'Daily trading pulse' }
        ]
    },
    {
        title: 'Trading',
        items: [
            { id: 'sales', label: 'Sales', icon: 'fa-bag-shopping', caption: 'Invoices and collections' },
            { id: 'purchases', label: 'Purchases', icon: 'fa-cart-flatbed', caption: 'Supplier buying' },
            { id: 'inventory', label: 'Inventory', icon: 'fa-boxes-stacked', caption: 'Stock and expiry' },
            { id: 'payments', label: 'Payments', icon: 'fa-money-bill-wave', caption: 'Cash movement' }
        ]
    },
    {
        title: 'Network',
        items: [
            { id: 'suppliers', label: 'Suppliers', icon: 'fa-truck-field', caption: 'Vendor relationships' },
            { id: 'buyers', label: 'Buyers', icon: 'fa-handshake', caption: 'Customer accounts' },
            { id: 'fish', label: 'Fish Types', icon: 'fa-fish-fins', caption: 'Catalog and pricing' },
            { id: 'fishCategories', label: 'Categories', icon: 'fa-layer-group', caption: 'Product structure' }
        ]
    },
    {
        title: 'Management',
        items: [
            { id: 'reports', label: 'Reports', icon: 'fa-chart-pie', caption: 'Business reporting' },
            { id: 'users', label: 'Users', icon: 'fa-users-gear', caption: 'Team access' },
            { id: 'subscription', label: 'Subscription', icon: 'fa-crown', caption: 'Plan and billing' },
            { id: 'companySettings', label: 'Shop Settings', icon: 'fa-store', caption: 'Business identity' },
            { id: 'productsMaster', label: 'Products', icon: 'fa-fish', caption: 'Product catalog' },
            { id: 'customersMgmt', label: 'Customers', icon: 'fa-users', caption: 'Customer management' },
            { id: 'suppliersMgmt', label: 'Suppliers', icon: 'fa-truck', caption: 'Vendor management' },
            { id: 'settings', label: 'Account Settings', icon: 'fa-sliders', caption: 'Personal preferences' }
        ]
    }
];

const platformMenuSections = [
    {
        title: 'Overview',
        items: [
            { id: 'dashboard', label: 'Platform Home', icon: 'fa-satellite-dish', caption: 'Tenant health', action: 'home' }
        ]
    },
    {
        title: 'Operations',
        items: [
            { id: 'users', label: 'Users', icon: 'fa-user-shield', caption: 'Operator and tenant accounts' },
            { id: 'subscription', label: 'Subscriptions', icon: 'fa-file-invoice-dollar', caption: 'Plans and renewals' },
            { id: 'reports', label: 'Reports', icon: 'fa-chart-column', caption: 'Revenue and usage' }
        ]
    }
];

function isPlatformShell() {
    return document.body.classList.contains('platform-shell') || window.location.pathname.includes('/platform/');
}

function friendlyRole(role) {
    return (role || 'tenant_admin')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getAllowedPages(role = currentUserRole) {
    return roleMenus[role] || roleMenus.tenant_admin;
}

function resolveElement(...ids) {
    for (const id of ids) {
        const element = document.getElementById(id);
        if (element) return element;
    }
    return null;
}

function sanitize(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return map[char] || char;
    });
}

function buildRowActions(primaryLabel, secondaryLabel = 'History') {
    return `
        <div class="row-actions" role="group" aria-label="Row actions">
            <button class="btn btn-secondary btn-sm" type="button">${sanitize(primaryLabel)}</button>
            <button class="btn btn-ghost btn-sm" type="button">${sanitize(secondaryLabel)}</button>
        </div>
    `;
}

function protectRoute(requiredType) {
    const token = localStorage.getItem('token');
    const platformFlag = localStorage.getItem('isPlatformUser');

    if (!token) {
        window.location.href = '/';
        return false;
    }

    const isPlatform = platformFlag === 'true';
    if (requiredType === 'platform' && !isPlatform) {
        window.location.href = '/app/dashboard.html';
        return false;
    }

    if (requiredType === 'tenant' && isPlatform) {
        window.location.href = '/platform/dashboard.html';
        return false;
    }

    return true;
}

function formatCurrency(amount) {
    if (amount === null || amount === undefined || amount === '') return '₹0.00';
    return `₹${Number(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('en-IN');
    } catch {
        return String(dateStr);
    }
}

function logout() {
    localStorage.clear();
    window.location.href = '/';
}

function showAlert(message, type = 'info') {
    if (window.UI?.showAlert) {
        window.UI.showAlert(message, type);
        return;
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'circle-exclamation' : 'circle-info'}"></i>
        ${sanitize(message)}
    `;

    const content = resolveElement('main-content', 'mainContent') || document.body;
    content.prepend(alertDiv);
    window.setTimeout(() => alertDiv.remove(), 3000);
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('token') || '';
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(`${window.location.origin}/api${endpoint}`, options);
        if (response.status === 401) {
            logout();
            return null;
        }

        const payload = await response.json();
        return Array.isArray(payload?.results) ? payload.results : payload;
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

function resolvePagePath(pageName) {
    const pagePath = pages[pageName] || 'dashboard.html';
    return pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
}

function getShellBasePath() {
    return isPlatformShell() ? '/platform/dashboard.html' : '/dashboard.html';
}

function getPageFromLocation() {
    const params = new URLSearchParams(window.location.search);
    const requestedPage = params.get('page');
    if (requestedPage && pages[requestedPage]) {
        return requestedPage;
    }
    return 'dashboard';
}

function syncBrowserURL(pageName, mode = 'push') {
    const targetPage = pages[pageName] ? pageName : 'dashboard';
    const nextUrl = targetPage === 'dashboard'
        ? getShellBasePath()
        : `${getShellBasePath()}?page=${encodeURIComponent(targetPage)}`;
    const historyMethod = mode === 'replace' ? 'replaceState' : 'pushState';
    window.history[historyMethod]({ page: targetPage }, '', nextUrl);
}

function syncShellMeta(pageName = currentPage) {
    const roleLabel = friendlyRole(localStorage.getItem('userRole') || currentUserRole);
    const workspaceLabel = isPlatformShell() ? 'Platform Workspace' : 'Tenant Workspace';
    const username = localStorage.getItem('username') || roleLabel;
    const pageTitles = {
        dashboard: isPlatformShell() ? 'Platform Home' : 'Dashboard',
        fish: 'Fish Types',
        fishCategories: 'Categories',
        suppliers: 'Suppliers',
        buyers: 'Buyers',
        purchases: 'Purchases',
        sales: 'Sales',
        inventory: 'Inventory',
        payments: 'Payments',
        reports: 'Reports',
        analytics: 'Analytics',
        users: 'Users',
        subscription: 'Subscriptions',
        settings: 'Account Settings',
        companySettings: 'Shop Settings',
        productsMaster: 'Product Master',
        customersMgmt: 'Customer Management',
        suppliersMgmt: 'Supplier Management'
    };

    const roleTargets = ['user-role', 'userRole'];
    roleTargets.forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.textContent = roleLabel;
    });

    const userName = document.getElementById('userName');
    if (userName) userName.textContent = username;

    const workspace = document.getElementById('workspaceLabel');
    if (workspace) workspace.textContent = workspaceLabel;

    const title = document.getElementById('pageTitle');
    if (title) title.textContent = pageTitles[pageName] || 'Dashboard';
}

function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const sections = isPlatformShell() ? platformMenuSections : tenantMenuSections;
    const allowed = new Set(getAllowedPages(localStorage.getItem('userRole') || currentUserRole));
    const filteredSections = sections
        .map((section) => ({
            ...section,
            items: section.items.filter((item) => allowed.has(item.id))
        }))
        .filter((section) => section.items.length > 0);

    sidebar.innerHTML = `
        <div class="sidebar-brand">
            <div class="brand-mark">${isPlatformShell() ? '<i class="fas fa-satellite-dish"></i>' : '<i class="fas fa-fish"></i>'}</div>
            <div class="brand-copy">
                <strong>${isPlatformShell() ? 'Platform Ops' : 'Fish Trading'}</strong>
                <span>${isPlatformShell() ? 'Multi-tenant oversight' : 'Operational workspace'}</span>
            </div>
        </div>

        <div class="sidebar-nav">
            ${filteredSections.map((section) => `
                <section class="nav-section">
                    <div class="nav-section-title">${section.title}</div>
                    ${section.items.map((item) => `
                        <button type="button" class="nav-item" data-menu="${item.id}" data-action="${item.action || 'page'}">
                            <span class="nav-icon"><i class="fas ${item.icon}"></i></span>
                            <span class="nav-copy">
                                <strong>${item.label}</strong>
                                <small>${item.caption}</small>
                            </span>
                        </button>
                    `).join('')}
                </section>
            `).join('')}
        </div>

        <div class="sidebar-user">
            <div class="sidebar-user-avatar">${(localStorage.getItem('username') || 'U').charAt(0).toUpperCase()}</div>
            <div class="sidebar-user-info">
                <strong>${sanitize(localStorage.getItem('username') || 'User')}</strong>
                <small>${friendlyRole(localStorage.getItem('userRole') || currentUserRole)}</small>
            </div>
        </div>

        <div class="sidebar-footer">
            <strong>${isPlatformShell() ? 'Operator focus' : 'Today\'s focus'}</strong>
            <p>${isPlatformShell() ? 'Stay ahead of renewals, support load, and tenant growth signals.' : 'Keep purchasing, payments, and stock movement aligned through the day.'}</p>
        </div>
    `;

    sidebar.querySelectorAll('.nav-item').forEach((button) => {
        button.addEventListener('click', () => {
            const page = button.dataset.menu;
            const action = button.dataset.action;
            if (action === 'home') {
                restoreHomePage();
                return;
            }
            loadPage(page);
        });
    });

    updateActiveNav(currentPage);
}

function updateActiveNav(pageName) {
    document.querySelectorAll('.sidebar .nav-item').forEach((button) => {
        button.classList.toggle('active', button.dataset.menu === pageName);
    });
}

function closeSidebar() {
    document.body.classList.remove('sidebar-open');
}

function bindShellInteractions() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (menuToggle && !menuToggle.dataset.bound) {
        menuToggle.dataset.bound = 'true';
        menuToggle.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-open');
        });
    }

    if (sidebarOverlay && !sidebarOverlay.dataset.bound) {
        sidebarOverlay.dataset.bound = 'true';
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    window.addEventListener('resize', () => {
        if (window.innerWidth > 900) closeSidebar();
    }, { passive: true });
}

function initShell() {
    currentUserRole = localStorage.getItem('userRole') || currentUserRole;
    isPlatformUser = localStorage.getItem('isPlatformUser') === 'true';
    currentPage = getPageFromLocation();
    syncCompatibilityGlobals();

    const mainContent = document.getElementById('main-content');
    if (isPlatformShell() && mainContent && !platformDashboardMarkup) {
        platformDashboardMarkup = mainContent.innerHTML;
    }

    renderSidebar();
    bindShellInteractions();
    syncShellMeta(currentPage);
    syncBrowserURL(currentPage, 'replace');
    if (isPlatformShell()) {
        loadPlatformHomeData();
    }
    
    // Load initial dashboard page
    if (mainContent && mainContent.textContent.includes('Loading')) {
        loadPage(currentPage, { updateHistory: false });
    }
}

function filterSidebarByRole() {
    renderSidebar();
    syncShellMeta(currentPage);
}

function removeInjectedPageStyles() {
    document.querySelectorAll('[data-injected-page-style="true"]').forEach((style) => style.remove());
}

function parsePageDocument(html) {
    const documentParser = new DOMParser().parseFromString(html, 'text/html');
    const mainSource =
        documentParser.querySelector('main.main-content') ||
        documentParser.querySelector('main');
    const fragmentSource =
        mainSource?.querySelector(':scope > .content') ||
        mainSource?.querySelector('.content') ||
        mainSource ||
        documentParser.querySelector('#app') ||
        documentParser.body;

    const styles = Array.from(documentParser.querySelectorAll('style')).map((style) => style.textContent);

    return {
        html: fragmentSource ? fragmentSource.innerHTML : html,
        styles
    };
}

function injectPageMarkup(container, html) {
    const { html: fragmentHtml, styles } = parsePageDocument(html);
    removeInjectedPageStyles();

    styles.forEach((styleText) => {
        const style = document.createElement('style');
        style.dataset.injectedPageStyle = 'true';
        style.textContent = styleText;
        document.head.appendChild(style);
    });

    const wrapper = document.createElement('div');
    wrapper.innerHTML = fragmentHtml;
    const scripts = Array.from(wrapper.querySelectorAll('script'));
    scripts.forEach((script) => script.remove());

    container.innerHTML = wrapper.innerHTML;
    scripts
        .filter((script) => !script.src)
        .forEach((script) => {
            const executable = document.createElement('script');
            executable.textContent = script.textContent;
            container.appendChild(executable);
        });
}

function restoreHomePage() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    currentPage = 'dashboard';
    if (isPlatformShell() && platformDashboardMarkup) {
        removeInjectedPageStyles();
        mainContent.innerHTML = platformDashboardMarkup;
        updateActiveNav('dashboard');
        syncShellMeta('dashboard');
        syncBrowserURL('dashboard');
        loadPlatformHomeData();
        closeSidebar();
        return;
    }

    loadPage('dashboard');
}

function syncCompatibilityGlobals() {
    window.Trading = {
        ...(window.Trading || {}),
        loadFish: loadFishData,
        loadFishCategories: loadFishCategoriesData,
        loadSuppliers: loadSuppliersData,
        loadBuyers: loadBuyersData,
        loadPurchases: loadPurchasesData,
        loadSales: loadSalesData,
        loadInventory: loadInventoryData,
        loadPayments: loadPaymentsData
    };

    if (window.ManagementPages) {
        window.Management = window.ManagementPages;
    }

    window.showAddFishModal = () => window.Forms?.showAddFishModal?.();
    window.showAddCategoryModal = () => window.Forms?.showAddFishCategoryModal?.();
    window.showAddSupplierModal = () => window.Forms?.showAddSupplierModal?.();
    window.showAddBuyerModal = () => window.Forms?.showAddBuyerModal?.();
    window.showAddPurchaseModal = () => window.Forms?.showAddPurchaseModal?.();
    window.showAddSaleModal = () => window.Forms?.showAddSaleModal?.();
    window.showPaymentModal = () => window.Forms?.showAddPaymentModal?.();
    window.showInviteUserModal = () => window.ManagementPages?.showAddUserModal?.();
}

function renderManagedChart(key, canvasId, config) {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (AppState.charts[key] && typeof AppState.charts[key].destroy === 'function') {
        AppState.charts[key].destroy();
    }

    AppState.charts[key] = new Chart(canvas.getContext('2d'), config);
}

function renderCanvasFallback(canvasId, title, svgMarkup = '', emptyMessage = 'No chart data available yet.') {
    const canvas = document.getElementById(canvasId);
    const wrapper = canvas?.parentElement;
    if (!wrapper) return;

    wrapper.innerHTML = `
        <div class="chart-fallback" style="height:100%;display:flex;flex-direction:column;padding:0.25rem 0.1rem;">
            <div style="font-size:0.78rem;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:0.75rem;">${sanitize(title)}</div>
            ${svgMarkup || `<div style="color:#64748b;font-size:0.92rem;">${sanitize(emptyMessage)}</div>`}
        </div>
    `;
}

function renderSvgStackedBars(rows) {
    if (!rows.length) return '';
    const width = 640;
    const height = 240;
    const left = 44;
    const right = 16;
    const top = 12;
    const bottom = 34;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const maxValue = Math.max(...rows.map((row) => Number(row.profit || 0) + Number(row.loss || 0) + Number(row.receivable || 0)), 1);
    const step = plotWidth / rows.length;
    const barWidth = Math.min(52, step * 0.62);

    const bars = rows.map((row, index) => {
        const x = left + index * step + (step - barWidth) / 2;
        const profit = Number(row.profit || 0);
        const loss = Number(row.loss || 0);
        const receivable = Number(row.receivable || 0);
        let cursorY = top + plotHeight;
        const parts = [];

        [
            { value: profit, fill: '#22c55e' },
            { value: loss, fill: '#ef4444' },
            { value: receivable, fill: '#f59e0b' },
        ].forEach((part) => {
            const barHeight = (part.value / maxValue) * plotHeight;
            cursorY -= barHeight;
            parts.push(`<rect x="${x}" y="${cursorY}" width="${barWidth}" height="${barHeight}" rx="4" fill="${part.fill}"></rect>`);
        });

        parts.push(`<text x="${x + barWidth / 2}" y="${height - 10}" text-anchor="middle" font-size="11" fill="#64748b">${sanitize(String(row.label || '-'))}</text>`);
        return parts.join('');
    }).join('');

    return `
        <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" preserveAspectRatio="none" aria-label="Stacked bar chart">
            <line x1="${left}" y1="${top + plotHeight}" x2="${width - right}" y2="${top + plotHeight}" stroke="#cbd5e1" stroke-width="1"></line>
            ${bars}
        </svg>
    `;
}

function renderSvgHorizontalBars(rows) {
    if (!rows.length) return '';
    const width = 640;
    const rowHeight = 42;
    const height = Math.max(220, rows.length * rowHeight + 26);
    const left = 120;
    const right = 18;
    const top = 10;
    const plotWidth = width - left - right;
    const maxValue = Math.max(...rows.map((row) => Number(row.sold || 0) + Number(row.remaining || 0)), 1);

    const bars = rows.map((row, index) => {
        const y = top + index * rowHeight;
        const soldWidth = (Number(row.sold || 0) / maxValue) * plotWidth;
        const remainingWidth = (Number(row.remaining || 0) / maxValue) * plotWidth;
        return `
            <text x="8" y="${y + 18}" font-size="12" fill="#475569">${sanitize(String(row.product || '-'))}</text>
            <rect x="${left}" y="${y}" width="${soldWidth}" height="12" rx="4" fill="#0f766e"></rect>
            <rect x="${left + soldWidth}" y="${y}" width="${remainingWidth}" height="12" rx="4" fill="#93c5fd"></rect>
            <text x="${left}" y="${y + 28}" font-size="11" fill="#64748b">${Number(row.sold || 0)} sold / ${Number(row.remaining || 0)} left</text>
        `;
    }).join('');

    return `
        <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" preserveAspectRatio="none" aria-label="Horizontal bar chart">
            ${bars}
        </svg>
    `;
}

function renderSvgLines(rows) {
    if (!rows.length) return '';
    const width = 640;
    const height = 240;
    const left = 42;
    const right = 14;
    const top = 10;
    const bottom = 34;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const dates = Array.from(new Set(rows.map((row) => row.date).filter(Boolean))).sort();
    const productMap = {};
    const palette = ['#2563eb', '#14b8a6', '#f97316', '#8b5cf6', '#ef4444'];

    rows.forEach((row) => {
        const product = row.product || 'Unknown';
        if (!productMap[product]) productMap[product] = {};
        productMap[product][row.date] = Number(row.sold_qty || 0);
    });

    const allValues = rows.map((row) => Number(row.sold_qty || 0));
    const maxValue = Math.max(...allValues, 1);
    const step = dates.length > 1 ? plotWidth / (dates.length - 1) : plotWidth / 2;

    const series = Object.keys(productMap).map((product, index) => {
        const points = dates.map((date, pointIndex) => {
            const x = left + pointIndex * step;
            const y = top + plotHeight - ((productMap[product][date] || 0) / maxValue) * plotHeight;
            return `${x},${y}`;
        }).join(' ');
        const color = palette[index % palette.length];
        return `<polyline fill="none" stroke="${color}" stroke-width="3" points="${points}"></polyline>`;
    }).join('');

    const labels = dates.map((date, index) => {
        const x = left + index * step;
        return `<text x="${x}" y="${height - 10}" text-anchor="middle" font-size="11" fill="#64748b">${sanitize(formatDate(date))}</text>`;
    }).join('');

    return `
        <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" preserveAspectRatio="none" aria-label="Line chart">
            <line x1="${left}" y1="${top + plotHeight}" x2="${width - right}" y2="${top + plotHeight}" stroke="#cbd5e1" stroke-width="1"></line>
            ${series}
            ${labels}
        </svg>
    `;
}

function getSeriesValue(item, keys) {
    return keys.reduce((value, key) => {
        if (value !== null && value !== undefined) return value;
        return item?.[key];
    }, null);
}

async function loadPlatformHomeData() {
    if (!isPlatformShell()) return;

    try {
        const [stats, tenantsPayload] = await Promise.all([
            apiCall('/platform/dashboard/'),
            apiCall('/platform/tenants/?page_size=5'),
        ]);

        const queue = Number(stats?.expired_tenants || 0) + Number(stats?.suspended_tenants || 0);
        const metrics = {
            platformMetricActiveTenants: String(Number(stats?.active_tenants || 0)),
            platformMetricTrialAccounts: String(Number(stats?.new_signups_this_month || 0)),
            platformMetricMrr: formatCurrency(stats?.mrr || 0),
            platformMetricQueue: String(queue),
        };

        Object.entries(metrics).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });

        const renewalAttention = document.getElementById('platformRenewalAttention');
        if (renewalAttention) {
            renewalAttention.textContent = queue
                ? `${queue} tenant${queue === 1 ? '' : 's'} need billing or suspension follow-up.`
                : 'No urgent renewals or suspensions right now.';
        }

        const supportFocus = document.getElementById('platformSupportFocus');
        if (supportFocus) {
            supportFocus.textContent = `${Number(stats?.total_users || 0)} users are active across the platform right now.`;
        }

        const growthFeed = document.getElementById('platformGrowthFeed');
        if (growthFeed) {
            const tenants = Array.isArray(tenantsPayload?.tenants) ? tenantsPayload.tenants.slice(0, 3) : [];
            growthFeed.innerHTML = tenants.length
                ? tenants.map((tenant) => `
                    <div class="platform-feed-item">
                        <i class="fas ${tenant.subscription_status === 'active' ? 'fa-chart-line' : tenant.subscription_status === 'suspended' ? 'fa-life-ring' : 'fa-triangle-exclamation'}"></i>
                        <div>
                            <strong>${sanitize(tenant.name || 'Tenant')}</strong>
                            <p>${sanitize(String(tenant.tier || 'No tier'))} plan, ${tenant.user_count || 0} users, status ${sanitize(tenant.subscription_status || 'unknown')}.</p>
                        </div>
                    </div>
                `).join('')
                : `
                    <div class="platform-feed-item">
                        <i class="fas fa-circle-info"></i>
                        <div>
                            <strong>No tenant activity yet</strong>
                            <p>Seed demo data or onboard a tenant to populate this platform feed.</p>
                        </div>
                    </div>
                `;
        }
    } catch (error) {
        console.error('Platform home loading error:', error);
    }
}

async function loadSuppliersData() {
    const data = await apiCall('/trading/suppliers/');
    const tbody = resolveElement('supplierTable');
    if (!tbody) return;

    // Update KPI values dynamically
    const supplierList = Array.isArray(data) ? data : [];
    const activeCount = supplierList.filter(s => s.is_active).length;
    const totalPayable = supplierList.reduce((sum, s) => sum + parseFloat(s.outstanding_amount ?? 0), 0);
    const types = new Set(supplierList.map(s => s.supplier_type || s.type).filter(Boolean));

    const kpiCards = document.querySelectorAll('.kpi-card .kpi-value');
    if (kpiCards.length >= 3) {
        kpiCards[0].textContent = String(activeCount);
        kpiCards[1].textContent = formatCurrency(totalPayable);
        if (kpiCards[2]) kpiCards[2].textContent = String(types.size);
    }

    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No suppliers found. Add your first supplier to start purchase tracking.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((supplier) => `
        <tr>
            <td><input type="checkbox" aria-label="Select supplier" onchange="window.updateSupplierSelectionCount && window.updateSupplierSelectionCount()"></td>
            <td>${sanitize(supplier.name || '-')}</td>
            <td>${sanitize(supplier.phone || '-')}</td>
            <td>${sanitize(supplier.supplier_type || supplier.type || '-')}</td>
            <td>${formatCurrency(supplier.outstanding_amount || 0)}</td>
            <td><span class="status-badge ${supplier.is_active ? 'active' : 'inactive'}">${supplier.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>${buildRowActions('Open Profile', 'Quick Pay')}</td>
        </tr>
    `).join('');
}

async function loadFishData() {
    const data = await apiCall('/trading/fish/');
    const tbody = resolveElement('fishTable', 'fish-table-body');
    if (!tbody) return;

    // Update KPI values dynamically
    const fishList = Array.isArray(data) ? data : [];
    const activeCount = fishList.filter(f => f.is_active !== false).length;
    const categories = new Set(fishList.map(f => f.category_name || f.category?.name).filter(Boolean));
    const units = new Set(fishList.map(f => f.unit_type).filter(Boolean));

    const kpiCards = document.querySelectorAll('.kpi-card .kpi-value');
    if (kpiCards.length >= 3) {
        kpiCards[0].textContent = String(activeCount);
        kpiCards[1].textContent = String(categories.size);
        kpiCards[2].textContent = String(units.size);
    }

    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No fish configured yet. Add fish types to unlock purchase and sales entry.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((fish) => `
        <tr>
            <td><input type="checkbox" aria-label="Select fish" onchange="window.updateFishSelectionCount && window.updateFishSelectionCount()"></td>
            <td>${sanitize(fish.name || '-')}</td>
            <td>${sanitize(fish.category_name || fish.category?.name || '-')}</td>
            <td>${sanitize(fish.unit_type || '-')}</td>
            <td>${formatDate(fish.created_at || fish.created_date)}</td>
            <td><span class="status-badge ${fish.is_active === false ? 'inactive' : 'active'}">${fish.is_active === false ? 'Inactive' : 'Active'}</span></td>
            <td>${buildRowActions('Edit Fish', 'Deactivate')}</td>
        </tr>
    `).join('');
}

async function loadFishCategoriesData() {
    const data = await apiCall('/trading/fish-categories/');
    const tbody = resolveElement('fishCategoryTable');
    if (!tbody) return;

    // Update KPI values dynamically
    const catList = Array.isArray(data) ? data : [];
    const featuredCount = catList.filter(c => c.is_featured).length;
    const priorities = new Set(catList.map(c => c.priority).filter(p => p != null));
    const activeCount = catList.filter(c => c.is_active !== false).length;
    const activeRate = catList.length > 0 ? Math.round((activeCount / catList.length) * 100) : 0;

    const kpiCards = document.querySelectorAll('.kpi-card .kpi-value');
    if (kpiCards.length >= 3) {
        kpiCards[0].textContent = String(featuredCount);
        kpiCards[1].textContent = String(priorities.size);
        kpiCards[2].textContent = `${activeRate}%`;
    }

    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No fish categories created yet. Add categories to improve reporting and pricing clarity.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((category) => `
        <tr>
            <td><input type="checkbox" aria-label="Select category" onchange="window.updateCategorySelectionCount && window.updateCategorySelectionCount()"></td>
            <td>${sanitize(category.name || '-')}</td>
            <td>${sanitize(category.category_type || category.type || '-')}</td>
            <td>${sanitize(String(category.priority ?? '-'))}</td>
            <td>${category.is_featured ? 'Yes' : 'No'}</td>
            <td><span class="status-badge ${category.is_active === false ? 'inactive' : 'active'}">${category.is_active === false ? 'Inactive' : 'Active'}</span></td>
            <td>${buildRowActions('Edit Category', 'Set Priority')}</td>
        </tr>
    `).join('');
}

async function loadBuyersData() {
    const data = await apiCall('/trading/buyers/');
    const tbody = resolveElement('buyerTable', 'buyers-table-body');
    if (!tbody) return;

    // Update KPI values dynamically
    const buyerList = Array.isArray(data) ? data : [];
    const activeCount = buyerList.filter(b => b.is_active).length;
    const totalOutstanding = buyerList.reduce((sum, b) => sum + parseFloat(b.current_credit_balance ?? b.outstanding_amount ?? 0), 0);
    const repeatBuyers = buyerList.filter(b => (b.total_orders ?? b.order_count ?? 0) > 1).length;
    const repeatRate = buyerList.length > 0 ? Math.round((repeatBuyers / buyerList.length) * 100) : 0;

    const kpiCards = document.querySelectorAll('.kpi-card .kpi-value');
    if (kpiCards.length >= 3) {
        kpiCards[0].textContent = String(activeCount);
        kpiCards[1].textContent = formatCurrency(totalOutstanding);
        kpiCards[2].textContent = `${repeatRate}%`;
    }

    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No buyers found. Add buyer accounts to start invoice tracking.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((buyer) => `
        <tr>
            <td><input type="checkbox" aria-label="Select buyer" onchange="window.updateBuyerSelectionCount && window.updateBuyerSelectionCount()"></td>
            <td>${sanitize(buyer.name || '-')}</td>
            <td>${sanitize(buyer.phone || '-')}</td>
            <td>${sanitize(buyer.address || buyer.location || '-')}</td>
            <td>${sanitize(String(buyer.total_orders ?? buyer.order_count ?? '-'))}</td>
            <td>${formatCurrency(buyer.current_credit_balance ?? buyer.outstanding_amount ?? 0)}</td>
            <td><span class="status-badge ${buyer.is_active ? 'active' : 'inactive'}">${buyer.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>${buildRowActions('Open Account', 'Send Reminder')}</td>
        </tr>
    `).join('');
}

async function loadPurchasesData() {
    const data = await apiCall('/trading/purchase-batches/');
    const tbody = resolveElement('purchaseTable', 'purchases-table-body');
    if (!tbody) return;

    // Update KPI values dynamically
    const purchaseList = Array.isArray(data) ? data : [];
    const totalSpend = purchaseList.reduce((sum, p) => sum + parseFloat(p.total_expense ?? p.total_cost ?? 0), 0);
    const activeBatches = purchaseList.filter(p => (p.status || '').toLowerCase() !== 'cancelled').length;
    const uniqueSuppliers = new Set(purchaseList.map(p => p.supplier_name).filter(Boolean)).size;

    const kpiCards = document.querySelectorAll('.kpi-card .kpi-value');
    if (kpiCards.length >= 3) {
        kpiCards[0].textContent = formatCurrency(totalSpend);
        kpiCards[1].textContent = String(activeBatches);
        if (kpiCards[2]) kpiCards[2].textContent = String(uniqueSuppliers);
    }

    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No purchases found. Create a purchase batch to begin inventory flow.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((purchase) => `
        <tr>
            <td><input type="checkbox" aria-label="Select purchase" onchange="window.updatePurchaseSelectionCount && window.updatePurchaseSelectionCount()"></td>
            <td>${sanitize(purchase.batch_number || '-')}</td>
            <td>${sanitize(purchase.fish_name || '-')}</td>
            <td>${sanitize(purchase.supplier_name || '-')}</td>
            <td>${sanitize(String(purchase.number_of_packages ?? purchase.packages ?? '-'))}</td>
            <td>${formatCurrency(purchase.total_expense ?? purchase.total_cost ?? 0)}</td>
            <td><span class="status-badge ${purchase.status || 'pending'}">${sanitize(purchase.status || 'pending')}</span></td>
            <td>${formatDate(purchase.date)}</td>
            <td>${buildRowActions('View Batch', 'Mark Received')}</td>
        </tr>
    `).join('');
}

async function loadSalesData() {
    const data = await apiCall('/trading/sales/');
    const tbody = resolveElement('saleTable', 'sales-table-body');
    if (!tbody) return;

    // Update KPI values dynamically
    const salesList = Array.isArray(data) ? data : [];
    const totalRevenue = salesList.reduce((sum, s) => sum + parseFloat(s.total_revenue ?? 0), 0);
    const paidCount = salesList.filter(s => (s.payment_status || '').toLowerCase() === 'paid').length;
    const collectionRate = salesList.length > 0 ? Math.round((paidCount / salesList.length) * 100) : 0;
    const totalProfit = salesList.reduce((sum, s) => sum + parseFloat(s.profit ?? 0), 0);
    const avgMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

    const kpiCards = document.querySelectorAll('.kpi-card .kpi-value');
    if (kpiCards.length >= 3) {
        kpiCards[0].textContent = formatCurrency(totalRevenue);
        kpiCards[1].textContent = `${collectionRate}%`;
        kpiCards[2].textContent = `${avgMargin}%`;
    }

    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No sales found. Create invoices to track revenue and collections.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((sale) => `
        <tr>
            <td><input type="checkbox" aria-label="Select sale" onchange="window.updateSalesSelectionCount && window.updateSalesSelectionCount()"></td>
            <td>${sanitize(sale.invoice_number || '-')}</td>
            <td>${sanitize(sale.buyer_name || '-')}</td>
            <td>${sanitize(sale.fish_name || sale.batch_number || '-')}</td>
            <td>${sanitize(String(sale.number_of_packages ?? sale.packages_sold ?? sale.quantity ?? '-'))}</td>
            <td>${formatCurrency(sale.total_revenue ?? 0)}</td>
            <td>${formatCurrency(sale.profit ?? 0)}</td>
            <td><span class="status-badge ${sale.payment_status || 'pending'}">${sanitize(sale.payment_status || 'pending')}</span></td>
            <td>${buildRowActions('View Invoice', 'Collect')}</td>
        </tr>
    `).join('');
}

async function loadInventoryData() {
    const data = await apiCall('/trading/inventory/');
    const tbody = resolveElement('inventoryTable', 'inventoryTableBody');
    if (!tbody) return;

    // Update KPI values dynamically
    const inventoryList = Array.isArray(data) ? data : [];
    const totalPackages = inventoryList.reduce((sum, i) => sum + parseInt(i.remaining_packages ?? i.packages ?? 0, 10), 0);
    const totalValue = inventoryList.reduce((sum, i) => sum + parseFloat(i.remaining_stock_value ?? i.stock_value ?? 0), 0);
    const lowStockCount = inventoryList.filter(i => ['low_stock', 'expiring', 'expired'].includes((i.status || '').toLowerCase())).length;
    const inStockCount = inventoryList.filter(i => (i.status || '').toLowerCase() === 'in_stock').length;

    const kpiCards = document.querySelectorAll('.kpi-card .kpi-value');
    if (kpiCards.length >= 4) {
        kpiCards[0].textContent = String(totalPackages);
        kpiCards[1].textContent = formatCurrency(totalValue);
        kpiCards[2].textContent = String(inStockCount);
        kpiCards[3].textContent = String(lowStockCount);
    } else if (kpiCards.length >= 3) {
        kpiCards[0].textContent = String(totalPackages);
        kpiCards[1].textContent = formatCurrency(totalValue);
        kpiCards[2].textContent = String(lowStockCount);
    }

    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No inventory records found. Add purchase batches to populate stock.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((inventory) => `
        <tr>
            <td><input type="checkbox" aria-label="Select inventory row" onchange="window.updateInventorySelectionCount && window.updateInventorySelectionCount()"></td>
            <td>${sanitize(inventory.fish_name || '-')}</td>
            <td>${sanitize(String(inventory.remaining_packages ?? inventory.packages ?? 0))}</td>
            <td>${sanitize(String(inventory.remaining_weight_kg ?? inventory.remaining_weight ?? 0))}</td>
            <td><span class="status-badge ${inventory.status || 'in_stock'}">${sanitize(inventory.status || 'in_stock')}</span></td>
            <td>${formatDate(inventory.expiry_date)}</td>
            <td>${formatCurrency(inventory.remaining_stock_value ?? inventory.stock_value ?? 0)}</td>
            <td>${buildRowActions('Inspect Batch', 'Adjust')}</td>
        </tr>
    `).join('');
}

function renderDashboardAlerts({ sales, purchases, inventory }) {
    const alerts = [];
    const pendingPayments = sales.filter((sale) => (sale.payment_status || '').toLowerCase() !== 'paid');
    const lowStock = inventory.filter((item) => ['low_stock', 'expiring', 'expired'].includes((item.status || '').toLowerCase()));

    if (pendingPayments.length > 0) {
        alerts.push({
            icon: 'fa-credit-card',
            title: `${pendingPayments.length} sale${pendingPayments.length > 1 ? 's' : ''} still need payment follow-up`,
            text: 'Use the payments page to clear pending and partial invoices before close.'
        });
    }

    if (lowStock.length > 0) {
        alerts.push({
            icon: 'fa-temperature-quarter',
            title: `${lowStock.length} stock item${lowStock.length > 1 ? 's are' : ' is'} time-sensitive`,
            text: 'Review low-stock and expiring inventory before the next buying cycle.'
        });
    }

    if (purchases.length > 0) {
        alerts.push({
            icon: 'fa-truck-ramp-box',
            title: `${purchases.length} fresh batch${purchases.length > 1 ? 'es' : ''} arrived recently`,
            text: 'Check quality, pricing, and turn those batches quickly while freshness is strongest.'
        });
    }

    if (alerts.length === 0) {
        alerts.push({
            icon: 'fa-circle-check',
            title: 'Nothing urgent right now',
            text: 'Trading, payments, and stock signals look calm for the moment.'
        });
    }

    const container = document.getElementById('dashboardAlerts');
    if (!container) return;

    container.innerHTML = alerts.map((alert) => `
        <div class="insight-item">
            <i class="fas ${alert.icon}"></i>
            <div>
                <strong>${sanitize(alert.title)}</strong>
                <p>${sanitize(alert.text)}</p>
            </div>
        </div>
    `).join('');
}

function renderDashboardCharts(financialData) {
    Object.values(AppState.charts).forEach((chart) => {
        if (chart && typeof chart.destroy === 'function') chart.destroy();
    });
    AppState.charts = {};

    const profitLossData = Array.isArray(financialData?.profitLossData) ? financialData.profitLossData : [];
    const soldRemainingData = Array.isArray(financialData?.soldRemainingData) ? financialData.soldRemainingData : [];
    const demandTrendData = Array.isArray(financialData?.demandTrendData) ? financialData.demandTrendData : [];

    if (typeof Chart === 'undefined') {
        renderCanvasFallback(
            'profitLossChart',
            'Profit / Loss / Receivables',
            renderSvgStackedBars(profitLossData),
            'Chart library unavailable. Showing a compact data summary instead.'
        );
        renderCanvasFallback(
            'soldRemainingChart',
            'Sold vs Remaining',
            renderSvgHorizontalBars(soldRemainingData),
            'Chart library unavailable. Showing current stock movement instead.'
        );
        renderCanvasFallback(
            'demandTrendChart',
            'Fish Demand Trend',
            renderSvgLines(demandTrendData),
            'Chart library unavailable. Showing demand totals instead.'
        );
        return;
    }

    if (profitLossData.length) {
        renderManagedChart('profitLoss', 'profitLossChart', {
            type: 'bar',
            data: {
                labels: profitLossData.map((row) => row.label || '-'),
                datasets: [
                    {
                        label: 'Profit',
                        data: profitLossData.map((row) => Number(row.profit || 0)),
                        backgroundColor: '#22c55e',
                        borderRadius: 4,
                    },
                    {
                        label: 'Loss',
                        data: profitLossData.map((row) => Number(row.loss || 0)),
                        backgroundColor: '#ef4444',
                        borderRadius: 4,
                    },
                    {
                        label: 'Receivable',
                        data: profitLossData.map((row) => Number(row.receivable || 0)),
                        backgroundColor: '#f59e0b',
                        borderRadius: 4,
                    }
                ]
            },
            options: {
                plugins: { legend: { position: 'bottom' } },
                scales: {
                    x: { stacked: true },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `₹${Number(value).toLocaleString('en-IN')}`
                        }
                    }
                }
            }
        });
    }

    if (soldRemainingData.length) {
        renderManagedChart('soldRemaining', 'soldRemainingChart', {
            type: 'bar',
            data: {
                labels: soldRemainingData.map((row) => row.product || '-'),
                datasets: [
                    {
                        label: 'Sold',
                        data: soldRemainingData.map((row) => Number(row.sold || 0)),
                        backgroundColor: '#0f766e',
                    },
                    {
                        label: 'Remaining',
                        data: soldRemainingData.map((row) => Number(row.remaining || 0)),
                        backgroundColor: '#93c5fd',
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                plugins: { legend: { position: 'bottom' } },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `${value} pkg`
                        }
                    }
                }
            }
        });
    }

    if (demandTrendData.length) {
        const dates = Array.from(new Set(demandTrendData.map((row) => row.date).filter(Boolean))).sort();
        const productMap = {};
        const palette = ['#2563eb', '#14b8a6', '#f97316', '#8b5cf6', '#ef4444'];

        demandTrendData.forEach((row) => {
            const product = row.product || 'Unknown';
            if (!productMap[product]) productMap[product] = {};
            productMap[product][row.date] = Number(row.sold_qty || 0);
        });

        renderManagedChart('demandTrend', 'demandTrendChart', {
            type: 'line',
            data: {
                labels: dates.map((date) => formatDate(date)),
                datasets: Object.keys(productMap).map((product, index) => ({
                    label: product,
                    data: dates.map((date) => productMap[product][date] || 0),
                    borderColor: palette[index % palette.length],
                    backgroundColor: `${palette[index % palette.length]}22`,
                    fill: false,
                    tension: 0.35,
                }))
            },
            options: {
                plugins: { legend: { position: 'bottom' } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `${value} pkg`
                        }
                    }
                }
            }
        });
    }
}

async function loadDashboardData() {
    const unwrapSettled = (result, fallback) => (
        result?.status === 'fulfilled' && result.value !== null && result.value !== undefined
            ? result.value
            : fallback
    );

    try {
        const results = await Promise.allSettled([
            apiCall('/dashboard/financial-overview/'),
            apiCall('/trading/sales/'),
            apiCall('/trading/purchase-batches/'),
            apiCall('/trading/inventory/'),
            apiCall('/dashboard/profit-loss-receivable/?days=30&period=day'),
            apiCall('/dashboard/sold-vs-remaining/'),
            apiCall('/dashboard/fish-demand-trend/?days=14&limit=5'),
        ]);

        const financialData = unwrapSettled(results[0], {});
        const salesData = unwrapSettled(results[1], []);
        const purchaseData = unwrapSettled(results[2], []);
        const inventoryData = unwrapSettled(results[3], []);
        const profitLossData = unwrapSettled(results[4], []);
        const soldRemainingData = unwrapSettled(results[5], []);
        const demandTrendData = unwrapSettled(results[6], []);

        const finalFinancialData = {
            ...financialData,
            profitLossData: Array.isArray(profitLossData) ? profitLossData : [],
            soldRemainingData: Array.isArray(soldRemainingData) ? soldRemainingData : [],
            demandTrendData: Array.isArray(demandTrendData) ? demandTrendData : [],
        };
        const finalSalesData = Array.isArray(salesData) ? salesData : [];
        const finalPurchaseData = Array.isArray(purchaseData) ? purchaseData : [];
        const finalInventoryData = Array.isArray(inventoryData) ? inventoryData : [];

        const todaySales = finalFinancialData.today_sales ?? finalFinancialData.total_sales_amount ?? 0;
        const todayPurchases = finalFinancialData.today_purchases ?? finalFinancialData.total_purchase_amount ?? 0;
        const todayProfit = finalFinancialData.today_profit ?? finalFinancialData.profit ?? 0;
        const totalStock = finalInventoryData.reduce((sum, item) => sum + Number(item.remaining_packages || 0), 0);

        const textTargets = {
            'sales-today': formatCurrency(todaySales),
            todaySales: formatCurrency(todaySales),
            'purchases-today': formatCurrency(todayPurchases),
            todayPurchases: formatCurrency(todayPurchases),
            profit: formatCurrency(todayProfit),
            todayProfit: formatCurrency(todayProfit),
            stock: String(totalStock),
            stockPackages: String(totalStock)
        };

        Object.entries(textTargets).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });

        const recentSales = finalSalesData.slice(0, 4);
        const recentPurchases = finalPurchaseData.slice(0, 4);

        const salesTable = document.getElementById('dashboardRecentSales');
        if (salesTable) {
            salesTable.innerHTML = recentSales.length
                ? recentSales.map((sale) => `
                    <tr>
                        <td>${sanitize(sale.invoice_number || '-')}</td>
                        <td>${sanitize(sale.buyer_name || '-')}</td>
                        <td>${formatCurrency(sale.total_revenue ?? 0)}</td>
                        <td><span class="status-badge ${sale.payment_status || 'pending'}">${sanitize(sale.payment_status || 'pending')}</span></td>
                    </tr>
                `).join('')
                : '<tr><td colspan="4" class="text-center">No recent sales yet.</td></tr>';
        }

        const purchaseTable = document.getElementById('dashboardRecentPurchases');
        if (purchaseTable) {
            purchaseTable.innerHTML = recentPurchases.length
                ? recentPurchases.map((purchase) => `
                    <tr>
                        <td>${sanitize(purchase.batch_number || '-')}</td>
                        <td>${sanitize(purchase.fish_name || '-')}</td>
                        <td>${sanitize(purchase.supplier_name || '-')}</td>
                        <td>${formatCurrency(purchase.total_expense ?? 0)}</td>
                    </tr>
                `).join('')
                : '<tr><td colspan="4" class="text-center">No recent purchases yet.</td></tr>';
        }

        renderDashboardAlerts({
            sales: finalSalesData,
            purchases: recentPurchases,
            inventory: finalInventoryData
        });

        renderDashboardCharts(finalFinancialData);
    } catch (error) {
        console.error('Dashboard loading error:', error);
        showAlert('Dashboard data could not be loaded completely.', 'danger');
    }
}

async function loadPaymentsData() {
    const data = await apiCall('/trading/payments/');
    if (!Array.isArray(data)) return;

    // Update KPI values dynamically
    const received = data.filter(p => p.payment_type === 'sale');
    const made = data.filter(p => p.payment_type === 'purchase');
    const pending = data.filter(p => ['pending', 'partial'].includes((p.payment_status || p.approval_status || '').toLowerCase()));

    const totalCollections = received.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalOutgoing = made.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    const kpiCollections = document.getElementById('kpiCollections');
    const kpiOutgoing = document.getElementById('kpiOutgoing');
    const kpiPending = document.getElementById('kpiPending');
    if (kpiCollections) kpiCollections.textContent = formatCurrency(totalCollections);
    if (kpiOutgoing) kpiOutgoing.textContent = formatCurrency(totalOutgoing);
    if (kpiPending) kpiPending.textContent = String(pending.length);

    const receivedTbody = resolveElement('paymentsReceivedTable');
    const madeTbody = resolveElement('paymentsMadeTable');
    const singleTable = resolveElement('paymentsTable');

    if (receivedTbody && madeTbody) {
        const received = data.filter((payment) => payment.payment_type === 'sale');
        const made = data.filter((payment) => payment.payment_type === 'purchase');

        receivedTbody.innerHTML = received.length
            ? received.map((payment) => `
                <tr>
                    <td>${sanitize(payment.receipt_number || '-')}</td>
                    <td>${formatDate(payment.date)}</td>
                    <td>${sanitize(payment.buyer_name || payment.party_name || '-')}</td>
                    <td>${formatCurrency(payment.amount)}</td>
                    <td><span class="status-badge ${payment.payment_status || payment.approval_status || 'paid'}">${sanitize(payment.payment_status || payment.approval_status || 'paid')}</span></td>
                </tr>
            `).join('')
            : '<tr><td colspan="5" class="text-center">No received payments.</td></tr>';

        madeTbody.innerHTML = made.length
            ? made.map((payment) => `
                <tr>
                    <td>${sanitize(payment.receipt_number || '-')}</td>
                    <td>${formatDate(payment.date)}</td>
                    <td>${sanitize(payment.supplier_name || payment.party_name || '-')}</td>
                    <td>${formatCurrency(payment.amount)}</td>
                    <td><span class="status-badge ${payment.payment_status || payment.approval_status || 'paid'}">${sanitize(payment.payment_status || payment.approval_status || 'paid')}</span></td>
                </tr>
            `).join('')
            : '<tr><td colspan="5" class="text-center">No outgoing payments.</td></tr>';
    }

    if (singleTable) {
        singleTable.innerHTML = data.length
            ? data.map((payment) => `
                <tr>
                    <td><input type="checkbox" aria-label="Select payment" onchange="window.updatePaymentsSelectionCount && window.updatePaymentsSelectionCount()"></td>
                    <td>${formatDate(payment.date)}</td>
                    <td>${sanitize(payment.payment_type || '-')}</td>
                    <td>${sanitize(payment.party_name || payment.buyer_name || payment.supplier_name || '-')}</td>
                    <td>${formatCurrency(payment.amount)}</td>
                    <td>${sanitize(payment.payment_method || payment.method || '-')}</td>
                    <td><span class="status-badge ${payment.payment_status || payment.approval_status || 'paid'}">${sanitize(payment.payment_status || payment.approval_status || 'paid')}</span></td>
                    <td>${buildRowActions('View Entry', 'Reconcile')}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="8" class="text-center">No payments found.</td></tr>';
    }
}

async function loadUsersData() {
    const endpoint = (localStorage.getItem('userRole') || currentUserRole) === 'tenant_admin'
        ? '/auth/tenant-users/'
        : '/auth/users/';
    const data = await apiCall(endpoint);
    const tbody = resolveElement('userTable');
    if (!tbody) return;

    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No users found for this workspace. Invite teammates to collaborate securely.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((user) => `
        <tr>
            <td><input type="checkbox" aria-label="Select user" onchange="window.updateUsersSelectionCount && window.updateUsersSelectionCount()"></td>
            <td>${sanitize(user.full_name || user.username || '-')}</td>
            <td>${sanitize(user.email || user.phone || '-')}</td>
            <td>${sanitize(user.company_name || user.company || '-')}</td>
            <td><span class="role-badge ${sanitize((user.role || '').replace(/_/g, '-'))}">${sanitize(friendlyRole(user.role || 'user'))}</span></td>
            <td><span class="status-badge ${user.is_active === false ? 'inactive' : 'active'}">${user.is_active === false ? 'Inactive' : 'Active'}</span></td>
            <td>${buildRowActions('Manage Access', 'Deactivate')}</td>
        </tr>
    `).join('');
}

async function loadReportsData() {
    const noDataState = document.getElementById('reportNoDataState');
    const topBuyersTable = document.getElementById('reportsTopBuyersTable');
    const riskContainer = document.getElementById('reportsRiskSummary');

    try {
        const [financial, inventory, topBuyers, paymentMix, performanceTrend, riskAlerts] = await Promise.all([
            apiCall('/dashboard/financial-overview/'),
            apiCall('/dashboard/inventory-overview/'),
            apiCall('/dashboard/top-buyers/?limit=5'),
            apiCall('/dashboard/sales-by-payment/'),
            apiCall('/dashboard/profit-loss-receivable/?days=30&period=week'),
            apiCall('/dashboard/risk-alerts/')
        ]);

        const grossSales = financial?.today_sales
            ?? financial?.total_sales_amount
            ?? financial?.current_year?.total_sales_amount
            ?? 0;
        const grossProfit = financial?.today_profit
            ?? financial?.profit
            ?? financial?.current_year?.total_profit
            ?? 0;
        const inventoryValue = inventory?.total_value
            ?? inventory?.inventory_value
            ?? inventory?.total_stock_value
            ?? 0;

        const valueTargets = {
            reportsGrossSales: formatCurrency(grossSales),
            reportsGrossProfit: formatCurrency(grossProfit),
            reportsInventoryValue: formatCurrency(inventoryValue),
            reportsRiskAlerts: `${Array.isArray(riskAlerts) ? riskAlerts.length : 0} alerts`
        };

        Object.entries(valueTargets).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });

        if (topBuyersTable) {
            const rows = Array.isArray(topBuyers) ? topBuyers : [];
            topBuyersTable.innerHTML = rows.length
                ? rows.map((buyer) => `
                    <tr>
                        <td>${sanitize(buyer.buyer__name || buyer.name || '-')}</td>
                        <td>${sanitize(String(buyer.order_count || buyer.total_orders || 0))}</td>
                        <td>${formatCurrency(buyer.total_revenue || buyer.revenue || 0)}</td>
                    </tr>
                `).join('')
                : '<tr><td colspan="3" class="text-center">No buyer data available.</td></tr>';
        }

        if (riskContainer) {
            const alerts = Array.isArray(riskAlerts) ? riskAlerts.slice(0, 3) : [];
            riskContainer.innerHTML = alerts.length
                ? alerts.map((alert) => `
                    <div class="insight-item">
                        <i class="fas fa-triangle-exclamation"></i>
                        <div>
                            <strong>${sanitize(alert.title || alert.name || 'Risk alert')}</strong>
                            <p>${sanitize(alert.message || alert.detail || 'Attention needed in the current reporting window.')}</p>
                        </div>
                    </div>
                `).join('')
                : `
                    <div class="insight-item">
                        <i class="fas fa-circle-check"></i>
                        <div>
                            <strong>No active risk alerts</strong>
                            <p>Backend checks did not flag urgent reporting issues right now.</p>
                        </div>
                    </div>
                `;
        }

        const trendRows = Array.isArray(performanceTrend) ? performanceTrend : [];
        const trendLabels = trendRows.map((row, index) =>
            row.label || row.period || row.bucket || row.date || row.month || `Point ${index + 1}`
        );
        const salesSeries = trendRows.map((row) => Number(getSeriesValue(row, ['sales', 'revenue', 'total_sales', 'total_revenue'])) || 0);
        const profitSeries = trendRows.map((row) => Number(getSeriesValue(row, ['profit', 'net_profit', 'total_profit'])) || 0);

        renderManagedChart('reportsSales', 'sales-report-chart', {
            type: 'bar',
            data: {
                labels: trendLabels.length ? trendLabels : ['No data'],
                datasets: [
                    {
                        label: 'Sales',
                        data: trendLabels.length ? salesSeries : [0],
                        backgroundColor: '#14b8a6'
                    },
                    {
                        label: 'Profit',
                        data: trendLabels.length ? profitSeries : [0],
                        backgroundColor: '#0f766e'
                    }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        const paymentRows = Array.isArray(paymentMix) ? paymentMix : [];
        renderManagedChart('reportsPaymentMix', 'profit-report-chart', {
            type: 'doughnut',
            data: {
                labels: paymentRows.length
                    ? paymentRows.map((row) => row.payment_mode || row.payment_method || row.label || 'Unknown')
                    : ['No data'],
                datasets: [{
                    data: paymentRows.length
                        ? paymentRows.map((row) => Number(getSeriesValue(row, ['total', 'amount', 'value'])) || 0)
                        : [1],
                    backgroundColor: ['#0f766e', '#14b8a6', '#f59e0b', '#2563eb', '#ef4444']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        if (noDataState) {
            noDataState.hidden = trendRows.length > 0 || paymentRows.length > 0;
        }
    } catch (error) {
        console.error('Reports loading error:', error);
        if (noDataState) noDataState.hidden = false;
        showAlert('Unable to load report data right now.', 'warning');
    }
}

async function loadSettingsData() {
    const profile = await apiCall('/auth/profile/');
    const emailInput = document.getElementById('settingsEmail');
    const phoneInput = document.getElementById('settingsPhone');
    const profileForm = document.getElementById('profileForm');
    const passwordForm = document.getElementById('passwordForm');

    if (emailInput) emailInput.value = profile?.email || '';
    if (phoneInput) phoneInput.value = profile?.phone || '';

    if (profileForm && !profileForm.dataset.bound) {
        profileForm.dataset.bound = 'true';
        profileForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const result = await apiCall('/auth/profile/', 'PUT', {
                email: emailInput?.value?.trim() || '',
                phone: phoneInput?.value?.trim() || ''
            });

            if (result) {
                showAlert('Profile updated successfully.', 'success');
                return;
            }

            showAlert(window.API?.lastError?.detail || 'Failed to update profile.', 'danger');
        });
    }

    if (passwordForm && !passwordForm.dataset.bound) {
        passwordForm.dataset.bound = 'true';
        passwordForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const newPassword = document.getElementById('newPassword')?.value || '';
            const confirmPassword = document.getElementById('confirmPassword')?.value || '';

            if (!newPassword || !confirmPassword) {
                showAlert('Enter and confirm the new password first.', 'danger');
                return;
            }

            if (newPassword !== confirmPassword) {
                showAlert('Passwords do not match.', 'danger');
                return;
            }

            showAlert('Password change endpoint is not available yet. Contact platform admin.', 'info');
            passwordForm.reset();
        });
    }

    await window.ManagementPages?.loadSecurity?.();
}

function isPageAllowed(page) {
    return getAllowedPages(localStorage.getItem('userRole') || currentUserRole).includes(page);
}

async function loadPage(pageName, options = {}) {
    const { updateHistory = true } = options;
    if (!isPageAllowed(pageName)) {
        showAlert('Access denied for this page.', 'danger');
        return;
    }

    currentPage = pageName;
    syncShellMeta(pageName);
    updateActiveNav(pageName);
    if (updateHistory) {
        syncBrowserURL(pageName);
    }

    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = '<div class="page-loading"><div class="loading-spinner">Loading page...</div></div>';

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(resolvePagePath(pageName), { signal: controller.signal });
        clearTimeout(timeoutId);
        
        const html = await response.text();
        injectPageMarkup(mainContent, html);
        syncCompatibilityGlobals();
        if (pageLoaders[pageName]) {
            await pageLoaders[pageName]();
        }
        closeSidebar();
    } catch (error) {
        console.error('Page load failed:', error);
        mainContent.innerHTML = '<div class="empty-state">⚠ Page load failed. ' + (error.name === 'AbortError' ? 'Request timed out.' : 'Please try again.') + '</div>';
    }
}

const pageLoaders = {
    dashboard: loadDashboardData,
    fish: loadFishData,
    fishCategories: loadFishCategoriesData,
    suppliers: loadSuppliersData,
    buyers: loadBuyersData,
    purchases: loadPurchasesData,
    purchase_create: () => {}, // No data loading needed for form page
    sales: loadSalesData,
    inventory: loadInventoryData,
    payments: loadPaymentsData,
    users: loadUsersData,
    subscription: () => window.ManagementPages?.loadSubscription?.(),
    reports: loadReportsData,
    analytics: () => window.AnalyticsPage?.init?.(),
    settings: loadSettingsData
};

const showModal = (...args) => window.UI?.showModal?.(...args);
const closeModal = (...args) => window.UI?.closeModal?.(...args);

window.showModal = showModal;
window.closeModal = closeModal;
window.loadPage = loadPage;
window.apiCall = apiCall;
window.showAlert = showAlert;
window.sanitize = sanitize;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;

window.addEventListener('popstate', () => {
    const requestedPage = getPageFromLocation();
    if (requestedPage !== currentPage) {
        loadPage(requestedPage, { updateHistory: false });
    }
});

syncCompatibilityGlobals();

window.App = {
    init: initShell,
    initShell,
    loadPage,
    restoreHomePage,
    formatCurrency,
    formatDate,
    apiCall,
    showAlert,
    showModal,
    closeModal,
    pageLoaders,
    isPageAllowed,
    protectRoute,
    filterSidebarByRole,
    logout,
    toggleSidebar: () => {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.toggle('mobile-open');
    }
};
