// Unified application shell and page router

let currentUserRole = localStorage.getItem('userRole') || 'tenant_admin';
let isPlatformUser = localStorage.getItem('isPlatformUser') === 'true';
let currentPage = 'dashboard';
let platformDashboardMarkup = '';

const pages = {
    dashboard: 'dashboard.html',
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
    settings: 'settings.html'
};

const roleMenus = {
    admin: Object.keys(pages),
    tenant_admin: Object.keys(pages),
    accountant: ['dashboard', 'purchases', 'sales', 'payments', 'reports', 'subscription'],
    trader: ['dashboard', 'sales', 'buyers', 'inventory'],
    store: ['dashboard', 'fish', 'fishCategories', 'purchases', 'inventory'],
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
            { id: 'settings', label: 'Settings', icon: 'fa-sliders', caption: 'Workspace preferences' }
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
    return String(value ?? '').replace(/[&<>"]/g, (char) => {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
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
    const isNestedShell = window.location.pathname.includes('/app/') || window.location.pathname.includes('/platform/');
    const prefix = isNestedShell ? '../' : './';
    return `${prefix}${pages[pageName] || 'dashboard.html'}`;
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
        users: 'Users',
        subscription: 'Subscriptions',
        settings: 'Settings'
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
            <div class="brand-mark">${isPlatformShell() ? 'PO' : 'FT'}</div>
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

    const mainContent = document.getElementById('main-content');
    if (isPlatformShell() && mainContent && !platformDashboardMarkup) {
        platformDashboardMarkup = mainContent.innerHTML;
    }

    renderSidebar();
    bindShellInteractions();
    syncShellMeta(currentPage);
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
    const fragmentSource =
        documentParser.querySelector('main.main-content') ||
        documentParser.querySelector('main') ||
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
        closeSidebar();
        return;
    }

    loadPage('dashboard');
}

async function loadSuppliersData() {
    const data = await apiCall('/trading/suppliers/');
    const tbody = resolveElement('supplierTable');
    if (!tbody) return;

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

async function loadDashboardData() {
    const [financialData, salesData, purchaseData, inventoryData] = await Promise.all([
        apiCall('/dashboard/financial-overview/'),
        apiCall('/trading/sales/'),
        apiCall('/trading/purchase-batches/'),
        apiCall('/trading/inventory/')
    ]);

    if (!financialData) return;

    const todaySales = financialData.today_sales ?? financialData.total_sales_amount ?? 0;
    const todayPurchases = financialData.today_purchases ?? financialData.total_purchase_amount ?? 0;
    const todayProfit = financialData.today_profit ?? financialData.profit ?? 0;
    const totalStock = financialData.stock_packages ?? financialData.inventory_total ?? 0;

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

    const recentSales = Array.isArray(salesData) ? salesData.slice(0, 4) : [];
    const recentPurchases = Array.isArray(purchaseData) ? purchaseData.slice(0, 4) : [];
    const inventory = Array.isArray(inventoryData) ? inventoryData : [];

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
        sales: Array.isArray(salesData) ? salesData : [],
        purchases: recentPurchases,
        inventory
    });
}

async function loadPaymentsData() {
    const data = await apiCall('/trading/payments/');
    if (!Array.isArray(data)) return;

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
    const data = await apiCall('/auth/users/');
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

function isPageAllowed(page) {
    return getAllowedPages(localStorage.getItem('userRole') || currentUserRole).includes(page);
}

async function loadPage(pageName) {
    if (!isPageAllowed(pageName)) {
        showAlert('Access denied for this page.', 'danger');
        return;
    }

    currentPage = pageName;
    syncShellMeta(pageName);
    updateActiveNav(pageName);

    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = '<div class="page-loading"><div class="loading-spinner">Loading page...</div></div>';

    try {
        const response = await fetch(resolvePagePath(pageName));
        const html = await response.text();
        injectPageMarkup(mainContent, html);
        if (pageLoaders[pageName]) {
            await pageLoaders[pageName]();
        }
        closeSidebar();
    } catch (error) {
        console.error('Page load failed:', error);
        mainContent.innerHTML = '<div class="empty-state">Page load failed. Please try again.</div>';
    }
}

const pageLoaders = {
    dashboard: loadDashboardData,
    fish: loadFishData,
    fishCategories: loadFishCategoriesData,
    suppliers: loadSuppliersData,
    buyers: loadBuyersData,
    purchases: loadPurchasesData,
    sales: loadSalesData,
    inventory: loadInventoryData,
    payments: loadPaymentsData,
    users: loadUsersData,
    reports: () => window.ReportsPage?.init?.()
};

const showModal = (...args) => window.UI?.showModal?.(...args);
const closeModal = (...args) => window.UI?.closeModal?.(...args);

window.showModal = showModal;
window.closeModal = closeModal;
window.loadPage = loadPage;

window.App = {
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
    logout
};
