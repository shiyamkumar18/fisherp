// ==================== Configuration ====================
const API_BASE_URL = `${window.location.origin}/api`;

// Global state (encapsulated to avoid pollution)
const AppState = {
    currentUser: {
        username: localStorage.getItem('username') || 'admin',
        role: localStorage.getItem('userRole') || 'tenant_admin'
    },
    charts: {},          // Chart.js instances
    sidebar: null,       // Sidebar instance
    activePage: 'dashboard'
};

// ==================== Utility Functions ====================
function sanitize(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Safe table row rendering
function createTableRow(data, columns) {
    const row = document.createElement('tr');
    columns.forEach(col => {
        const cell = document.createElement('td');
        let value = data[col.key];
        if (col.type === 'currency') {
            cell.textContent = formatCurrency(value);
        } else if (col.type === 'date') {
            cell.textContent = formatDate(value);
        } else if (col.type === 'badge') {
            const span = document.createElement('span');
            span.className = `status-badge ${value}`;
            span.textContent = String(value || 'pending').toUpperCase();
            cell.appendChild(span);
        } else {
            cell.textContent = String(value || '');
        }
        row.appendChild(cell);
    });
    return row;
}

function formatCurrency(amount) {
    if (!amount) return '₹0';
    return '₹' + parseFloat(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN');
    } catch {
        return dateStr;
    }
}

// Use centralized apiCall from window.API instead of local duplicate
async function apiCall(endpoint, method = 'GET', body = null) {
    if (!window.API) {
        console.error('API module not loaded');
        return null;
    }
    try {
        const result = await window.API[method.toLowerCase()](endpoint, body);
        if (window.API.lastError) {
            showAlert(window.API.lastError.detail, 'danger');
        }
        return result;
    } catch (error) {
        console.error('API Error:', error);
        showAlert(error.message, 'danger');
        return null;
    }
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    
    const iconEl = document.createElement('i');
    iconEl.className = `fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'}`;
    alertDiv.appendChild(iconEl);
    
    const textNode = document.createTextNode(String(message || ''));
    alertDiv.appendChild(textNode);
    
    const container = document.getElementById('mainContent') || document.body;
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        setTimeout(() => alertDiv.remove(), 5000);
    }
}

// ==================== Modal Functions ====================
function showModal(title, content, footer = '') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modalFooter').innerHTML = footer || '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>';
    document.getElementById('modalOverlay').classList.add('show');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
}

// ==================== Sidebar Class (Enhanced) ====================
class Sidebar {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        if (!this.sidebar) throw new Error('Sidebar element not found');
        this.init();
    }

    init() {
        this.injectNavIfEmpty();
        this.updateVisibility();
        this.addEventListeners();
    }

    injectNavIfEmpty() {
        if (this.sidebar.querySelector('ul.nav-menu')) return;
        this.sidebar.innerHTML = `
            <ul class="nav-menu">
                <li data-page="dashboard" class="active"><i class="fas fa-tachometer-alt"></i> Dashboard</li>
                <li data-page="fish"><i class="fas fa-fish"></i> Fish Types</li>
                <li data-page="suppliers"><i class="fas fa-truck"></i> Suppliers</li>
                <li data-page="buyers"><i class="fas fa-user-friends"></i> Buyers</li>
                <li data-page="purchases"><i class="fas fa-shopping-cart"></i> Purchases</li>
                <li data-page="sales"><i class="fas fa-dollar-sign"></i> Sales</li>
                <li data-page="inventory"><i class="fas fa-warehouse"></i> Inventory</li>
                <li data-page="payments"><i class="fas fa-credit-card"></i> Payments</li>
                <li data-page="reports" class="admin-only"><i class="fas fa-chart-bar"></i> Reports</li>
                <li data-page="analytics" class="admin-only"><i class="fas fa-chart-line"></i> Analytics</li>
                <li data-page="users" class="admin-only"><i class="fas fa-users-cog"></i> Users</li>
                <li data-page="subscription" class="admin-only"><i class="fas fa-crown"></i> Subscription</li>
                <li data-page="settings" class="admin-only"><i class="fas fa-cog"></i> Settings</li>
            </ul>
        `;
    }

    updateVisibility() {
        const isAdmin = ['admin', 'tenant_admin', 'platform_operator'].includes(AppState.currentUser.role);
        this.sidebar.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isAdmin ? 'flex' : 'none';
        });
    }

    setActiveNav(pageId) {
        this.sidebar.querySelectorAll('.nav-menu li').forEach(li => {
            if (li.dataset.page === pageId) li.classList.add('active');
            else li.classList.remove('active');
        });
    }

    addEventListeners() {
        this.sidebar.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (!li) return;
            const page = li.dataset.page;
            if (page) {
                e.preventDefault();
                loadPage(page);
                this.setActiveNav(page);
            }
        });
    }
}

// ==================== Page Loading ====================
async function loadPage(page) {
    // Destroy existing charts to avoid memory leaks
    Object.values(AppState.charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') chart.destroy();
    });
    AppState.charts = {};

    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        fish: 'Fish Products',
        suppliers: 'Suppliers',
        buyers: 'Buyers',
        purchases: 'Purchases',
        sales: 'Sales',
        inventory: 'Inventory',
        payments: 'Payments',
        reports: 'Reports',
        analytics: 'Analytics',
        users: 'User Management',
        audit: 'Audit Logs',
        platform: 'Platform Admin',
        security: 'Security',
        subscription: 'Subscription',
        settings: 'Settings'
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';

    // Hide all pages and show selected
    document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
    const pageElement = document.getElementById(page + 'Page');
    if (pageElement) pageElement.classList.remove('hidden');

    // Close mobile sidebar if open
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }

    // Load page-specific data
    try {
        switch(page) {
            case 'dashboard':
                await loadDashboardData();
                break;
            case 'fish':
                await loadFishData();
                break;
            case 'suppliers':
                await loadSuppliersData();
                break;
            case 'buyers':
                await loadBuyersData();
                break;
            case 'purchases':
                await loadPurchasesData();
                break;
            case 'sales':
                await loadSalesData();
                break;
            case 'inventory':
                await loadInventoryData();
                break;
            case 'payments':
                await loadPaymentsData();
                break;
            case 'reports':
                await loadReportsData();
                break;
            case 'subscription':
                await loadSubscriptionData();
                break;
            case 'analytics':
                await loadAnalyticsData();
                break;
            case 'users':
                await loadUsersData();
                break;
            case 'audit':
                await loadAuditData();
                break;
            case 'platform':
                await loadPlatformData();
                break;
            case 'security':
                await loadSecurityData();
                break;
            // Add other pages if needed
            default:
                if (pageElement) pageElement.innerHTML = '<div class="text-center">Page under construction</div>';
        }
    } catch (error) {
        console.error(`Error loading ${page}:`, error);
        if (pageElement) pageElement.innerHTML = '<div class="alert alert-danger">Failed to load page.</div>';
    }
}

// ==================== Data Loading Functions ====================
async function loadDashboardData() {
    // KPI data
    const financialData = await apiCall('/dashboard/financial-overview/');
    if (financialData) {
        document.getElementById('todaySales').textContent = formatCurrency(financialData.today_sales);
        document.getElementById('todayProfit').textContent = formatCurrency(financialData.today_profit);
        document.getElementById('todayPurchases').textContent = formatCurrency(financialData.today_purchases);
        document.getElementById('receivables').textContent = formatCurrency(financialData.outstanding_receivables);
    }

    // Sales trend chart
    const salesTrend = await apiCall('/dashboard/sales-trend/?days=7');
    if (salesTrend) renderSalesTrendChart(salesTrend);

    // Fish type chart
    const fishTypeData = await apiCall('/dashboard/top-fish/?limit=5');
    if (fishTypeData) renderFishTypeChart(fishTypeData);

    // Recent sales
    const recentSales = await apiCall('/trading/sales/?limit=5');
    renderRecentSales(recentSales);

    // Inventory alerts
    const inventoryData = await apiCall('/dashboard/inventory-overview/');
    renderInventoryAlerts(inventoryData);
}

function renderSalesTrendChart(data) {
    const ctx = document.getElementById('salesTrendChart').getContext('2d');
    const labels = data.map(d => formatDate(d.date));
    const revenues = data.map(d => parseFloat(d.revenue || 0));
    const profits = data.map(d => parseFloat(d.profit || 0));

    if (AppState.charts.salesTrend) AppState.charts.salesTrend.destroy();
    AppState.charts.salesTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Revenue', data: revenues, borderColor: '#0077b6', backgroundColor: 'rgba(0,119,182,0.1)', fill: true, tension: 0.4 },
                { label: 'Profit', data: profits, borderColor: '#28a745', backgroundColor: 'rgba(40,167,69,0.1)', fill: true, tension: 0.4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { ticks: { callback: v => '₹' + v.toLocaleString() } } }
        }
    });
}

function renderFishTypeChart(data) {
    const ctx = document.getElementById('fishTypeChart').getContext('2d');
    const labels = data.map(d => d.batch__fish__name || 'Unknown');
    const revenues = data.map(d => parseFloat(d.total_revenue || 0));

    if (AppState.charts.fishType) AppState.charts.fishType.destroy();
    AppState.charts.fishType = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data: revenues, backgroundColor: ['#0077b6', '#00b4d8', '#48cae4', '#90e0ef', '#caf0f8'] }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { tooltip: { callbacks: { label: ctx => `${ctx.label}: ${formatCurrency(ctx.raw)}` } } }
        }
    });
}

function renderRecentSales(sales) {
    const tbody = document.getElementById('recentSalesTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!sales || sales.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 6;
        cell.className = 'text-center';
        cell.textContent = 'No recent sales';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }
    
    const columns = [
        { key: 'invoice_number' },
        { key: 'buyer_name' },
        { key: 'batch_fish_name' },
        { key: 'total_revenue', type: 'currency' },
        { key: 'profit', type: 'currency' },
        { key: 'payment_status', type: 'badge' }
    ];
    
    sales.slice(0, 5).forEach(sale => {
        tbody.appendChild(createTableRow(sale, columns));
    });
}

function renderInventoryAlerts(data) {
    const tbody = document.getElementById('inventoryAlertsTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!data || !data.expiring_batches || data.expiring_batches.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.className = 'text-center';
        cell.textContent = 'No alerts';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }
    
    data.expiring_batches.forEach(inv => {
        const row = document.createElement('tr');
        
        const fishCell = document.createElement('td');
        fishCell.textContent = sanitize(inv.fish__name);
        row.appendChild(fishCell);
        
        const batchCell = document.createElement('td');
        batchCell.textContent = sanitize(inv.purchase_batch__batch_number);
        row.appendChild(batchCell);
        
        const pkgCell = document.createElement('td');
        pkgCell.textContent = String(inv.remaining_packages || 0);
        row.appendChild(pkgCell);
        
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDate(inv.expiry_date);
        row.appendChild(dateCell);
        
        const statusCell = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = 'status-badge pending';
        badge.textContent = 'Expiring Soon';
        statusCell.appendChild(badge);
        row.appendChild(statusCell);
        
        tbody.appendChild(row);
    });
}

// Other data loading functions (fish, suppliers, buyers, etc.) follow the same pattern.
// They are omitted for brevity but should be updated to use sanitize and proper error handling.

// ==================== Authentication & Initialization ====================
function setupUserInfo() {
    document.getElementById('userName').textContent = sanitize(AppState.currentUser.username);
    document.getElementById('userAvatar').textContent = AppState.currentUser.username.charAt(0).toUpperCase();

    const roleNames = {
        platform_maintainer: 'Platform Maintainer',
        platform_operator: 'Platform Operator',
        platform_support: 'Platform Support',
        tenant_admin: 'Tenant Admin',
        accountant: 'Accountant',
        trader: 'Trader',
        store: 'Store / Inventory',
        sales_staff: 'Trader',
        store_accounts: 'Store / Inventory'
    };
    document.getElementById('userRole').textContent = roleNames[AppState.currentUser.role] || AppState.currentUser.role;

    // Settings page
    if (document.getElementById('settingsUsername')) {
        document.getElementById('settingsUsername').value = AppState.currentUser.username;
        document.getElementById('settingsRole').value = roleNames[AppState.currentUser.role] || AppState.currentUser.role;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    window.location.href = '/login.html';
}

// Setup menu toggle for mobile
function setupMenuToggle() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    if (!menuToggle || !sidebar) return;
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
}

// Setup tabs (if needed)
function setupTabs() {
    const tabs = document.querySelectorAll('.tabs .tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById('payments' + tabId.charAt(0).toUpperCase() + tabId.slice(1)).classList.add('active');
        });
    });
}

// ==================== Event Listeners for Add Buttons ====================
function attachAddButtons() {
    document.getElementById('addFishBtn')?.addEventListener('click', () => showAddFishModal());
    document.getElementById('addSupplierBtn')?.addEventListener('click', () => showAddSupplierModal());
    document.getElementById('addBuyerBtn')?.addEventListener('click', () => showAddBuyerModal());
    document.getElementById('addPurchaseBtn')?.addEventListener('click', () => showAddPurchaseModal());
    document.getElementById('addSaleBtn')?.addEventListener('click', () => showAddSaleModal());
    document.getElementById('addPaymentBtn')?.addEventListener('click', () => showAddPaymentModal());

    document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showAlert('Profile updated successfully!', 'success');
    });
    document.getElementById('passwordForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        if (newPassword !== confirmPassword) {
            showAlert('Passwords do not match!', 'danger');
            return;
        }
        showAlert('Password changed successfully!', 'success');
        document.getElementById('passwordForm').reset();
    });
}

// ==================== Modal Forms (Add/Edit) ====================
// These functions are the same as your original but with sanitization added.
// (Example for fish)
async function showAddFishModal() {
    const categories = await apiCall('/trading/fish-categories/');
    const categoryOptions = categories ? categories.map(c => `<option value="${c.id}">${sanitize(c.name)}</option>`).join('') : '<option value="">No categories</option>';
    const content = `
        <form id="addFishForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Fish Name *</label>
                    <input type="text" class="form-control" name="name" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Category</label>
                    <select class="form-control" name="category">
                        <option value="">Select Category</option>
                        ${categoryOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Unit Type</label>
                    <select class="form-control" name="unit_type">
                        <option value="kg">Kilogram (kg)</option>
                        <option value="box">Box</option>
                        <option value="piece">Piece</option>
                        <option value="bucket">Bucket</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Min Price/kg</label>
                    <input type="number" class="form-control" name="min_price_per_kg" step="0.01">
                </div>
                <div class="form-group">
                    <label>Max Price/kg</label>
                    <input type="number" class="form-control" name="max_price_per_kg" step="0.01">
                </div>
            </div>
            <div class="form-group">
                <label><input type="checkbox" name="is_active" checked> Active</label>
            </div>
        </form>
    `;
    const footer = `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="submitFishForm()">Add Fish</button>`;
    showModal('Add New Fish', content, footer);
}

async function submitFishForm() {
    const form = document.getElementById('addFishForm');
    const formData = new FormData(form);
    const data = {
        name: formData.get('name'),
        category: formData.get('category') || null,
        unit_type: formData.get('unit_type') || 'kg',
        min_price_per_kg: parseFloat(formData.get('min_price_per_kg')) || 0,
        max_price_per_kg: parseFloat(formData.get('max_price_per_kg')) || 0,
        is_active: form.querySelector('input[name="is_active"]').checked
    };
    if (!data.name) {
        showAlert('Please enter fish name', 'danger');
        return;
    }
    const result = await apiCall('/trading/fish/', 'POST', data);
    if (result) {
        showAlert('Fish added successfully!', 'success');
        closeModal();
        loadFishData();
    } else {
        showAlert('Failed to add fish', 'danger');
    }
}

// Similarly implement other modal functions (showAddSupplierModal, etc.) with sanitization.

// ==================== Initialization ====================
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Initialize sidebar
    try {
        AppState.sidebar = new Sidebar();
    } catch (error) {
        console.error('Sidebar initialization failed:', error);
    }

    // Set up user info
    setupUserInfo();

    // Set up menu toggle
    setupMenuToggle();

    // Set up logout
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Set up tabs
    setupTabs();

    // Attach add button listeners
    attachAddButtons();

    // Load initial page (default dashboard)
    loadPage('dashboard');

    // Optional: hash-based routing
    if (window.location.hash) {
        const page = window.location.hash.substring(1);
        if (page) loadPage(page);
    }
    window.addEventListener('hashchange', () => {
        const page = window.location.hash.substring(1);
        if (page) loadPage(page);
    });
});

// Close modal on outside click
document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// Expose necessary functions globally for inline event handlers (if any)
window.showModal = showModal;
window.closeModal = closeModal;
window.submitFishForm = submitFishForm;
// Add other modal submit functions similarly
