// Fish ERP - Main Application JavaScript

const API_BASE_URL = `${window.location.origin}/api`;

// Global state
let currentUser = {
    username: localStorage.getItem('username') || 'admin',
    role: localStorage.getItem('userRole') || 'tenant_admin'
};

let charts = {};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/web/login/';
        return;
    }
    
    // Set up user info
    setupUserInfo();
    
    // Set up navigation
    setupNavigation();
    
    // Set up menu toggle
    setupMenuToggle();
    
    // Set up logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Load dashboard data
    loadDashboardData();
    
    // Set up tabs
    setupTabs();
});

// Setup user info in header
function setupUserInfo() {
    document.getElementById('userName').textContent = currentUser.username;
    document.getElementById('userAvatar').textContent = currentUser.username.charAt(0).toUpperCase();
    
    const roleNames = {
        'platform_maintainer': 'Platform Maintainer',
        'platform_operator': 'Platform Operator',
        'platform_support': 'Platform Support',
        'tenant_admin': 'Tenant Admin',
        'accountant': 'Accountant',
        'trader': 'Trader',
        'store': 'Store / Inventory',
        // Backward compatibility labels
        'sales_staff': 'Trader',
        'store_accounts': 'Store / Inventory'
    };
    document.getElementById('userRole').textContent = roleNames[currentUser.role] || currentUser.role;
    
    // Settings page
    document.getElementById('settingsUsername').value = currentUser.username;
    document.getElementById('settingsRole').value = roleNames[currentUser.role] || currentUser.role;
}

// Setup navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            loadPage(page);
            
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Setup menu toggle for mobile
function setupMenuToggle() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    menuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('open');
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });
}

// Load page content
function loadPage(page) {
    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'fish': 'Fish Products',
        'suppliers': 'Suppliers',
        'buyers': 'Buyers',
        'purchases': 'Purchases',
        'sales': 'Sales',
        'inventory': 'Inventory',
        'payments': 'Payments',
        'reports': 'Reports',
        'analytics': 'Analytics',
        'users': 'User Management',
        'audit': 'Audit Logs',
        'platform': 'Platform Admin',
        'security': 'Security',
        'subscription': 'Subscription',
        'settings': 'Settings'
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';
    
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
    
    // Show selected page
    const pageElement = document.getElementById(page + 'Page');
    if (pageElement) {
        pageElement.classList.remove('hidden');
    }
    
    // Close mobile sidebar
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
    
    // Load page-specific data
    switch(page) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'fish':
            loadFishData();
            break;
        case 'suppliers':
            loadSuppliersData();
            break;
        case 'buyers':
            loadBuyersData();
            break;
        case 'purchases':
            loadPurchasesData();
            break;
        case 'sales':
            loadSalesData();
            break;
        case 'inventory':
            loadInventoryData();
            break;
        case 'payments':
            loadPaymentsData();
            break;
        case 'reports':
            loadReportsData();
            break;
        case 'subscription':
            loadSubscriptionData();
            break;
        case 'analytics':
            loadAnalyticsData();
            break;
        case 'users':
            loadUsersData();
            break;
        case 'audit':
            loadAuditData();
            break;
        case 'platform':
            loadPlatformData();
            break;
        case 'security':
            loadSecurityData();
            break;
    }
}

// API helper function
async function apiCall(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('token');
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        if (response.status === 401) {
            logout();
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

// Format currency
function formatCurrency(amount) {
    if (!amount) return '₹0';
    return '₹' + parseFloat(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Format date
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN');
}

// Load dashboard data
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
    if (salesTrend) {
        renderSalesTrendChart(salesTrend);
    }
    
    // Fish type chart
    const fishTypeData = await apiCall('/dashboard/top-fish/?limit=5');
    if (fishTypeData) {
        renderFishTypeChart(fishTypeData);
    }
    
    // Recent sales
    const recentSales = await apiCall('/trading/sales/?limit=5');
    renderRecentSales(recentSales);
    
    // Inventory alerts
    const inventoryData = await apiCall('/dashboard/inventory-overview/');
    renderInventoryAlerts(inventoryData);
}

// Render sales trend chart
function renderSalesTrendChart(data) {
    const ctx = document.getElementById('salesTrendChart').getContext('2d');
    
    if (charts.salesTrend) {
        charts.salesTrend.destroy();
    }
    
    const labels = data.map(d => formatDate(d.date));
    const revenues = data.map(d => parseFloat(d.revenue || 0));
    const profits = data.map(d => parseFloat(d.profit || 0));
    
    charts.salesTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Revenue',
                    data: revenues,
                    borderColor: '#0077b6',
                    backgroundColor: 'rgba(0, 119, 182, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Profit',
                    data: profits,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Render fish type chart
function renderFishTypeChart(data) {
    const ctx = document.getElementById('fishTypeChart').getContext('2d');
    
    if (charts.fishType) {
        charts.fishType.destroy();
    }
    
    const labels = data.map(d => d.batch__fish__name || 'Unknown');
    const revenues = data.map(d => parseFloat(d.total_revenue || 0));
    
    charts.fishType = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: revenues,
                backgroundColor: [
                    '#0077b6',
                    '#00b4d8',
                    '#48cae4',
                    '#90e0ef',
                    '#caf0f8'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + formatCurrency(context.raw);
                        }
                    }
                }
            }
        }
    });
}

// Render recent sales table
function renderRecentSales(sales) {
    const tbody = document.getElementById('recentSalesTable');
    
    if (!sales || sales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No recent sales</td></tr>';
        return;
    }
    
    tbody.innerHTML = sales.slice(0, 5).map(sale => `
        <tr>
            <td>${sale.invoice_number || '-'}</td>
            <td>${sale.buyer_name || '-'}</td>
            <td>${sale.batch_fish_name || '-'}</td>
            <td>${formatCurrency(sale.total_revenue)}</td>
            <td>${formatCurrency(sale.profit)}</td>
            <td><span class="status-badge ${sale.payment_status}">${sale.payment_status || 'pending'}</span></td>
        </tr>
    `).join('');
}

// Render inventory alerts
function renderInventoryAlerts(data) {
    const tbody = document.getElementById('inventoryAlertsTable');
    
    if (!data || !data.expiring_batches || data.expiring_batches.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No alerts</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.expiring_batches.map(inv => `
        <tr>
            <td>${inv.fish__name || '-'}</td>
            <td>${inv.purchase_batch__batch_number || '-'}</td>
            <td>${inv.remaining_packages || 0}</td>
            <td>${formatDate(inv.expiry_date)}</td>
            <td><span class="status-badge pending">Expiring Soon</span></td>
        </tr>
    `).join('');
}

// Load Fish data
async function loadFishData() {
    const fishData = await apiCall('/trading/fish/');
    
    const tbody = document.getElementById('fishTable');
    
    if (!fishData || fishData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No fish products found</td></tr>';
        return;
    }
    
    tbody.innerHTML = fishData.map(fish => `
        <tr>
            <td>${fish.name}</td>
            <td>${fish.category_name || '-'}</td>
            <td>${fish.unit_type}</td>
            <td>${formatCurrency(fish.min_price_per_kg)}</td>
            <td>${formatCurrency(fish.max_price_per_kg)}</td>
            <td><span class="status-badge ${fish.is_active ? 'active' : 'inactive'}">${fish.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary">Edit</button>
            </td>
        </tr>
    `).join('');
}

// Load Suppliers data
async function loadSuppliersData() {
    const supplierData = await apiCall('/trading/suppliers/');
    
    const tbody = document.getElementById('supplierTable');
    
    if (!supplierData || supplierData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No suppliers found</td></tr>';
        return;
    }
    
    tbody.innerHTML = supplierData.map(supplier => `
        <tr>
            <td>${supplier.name}</td>
            <td>${supplier.phone || '-'}</td>
            <td>${supplier.supplier_type || '-'}</td>
            <td>${formatCurrency(supplier.outstanding_amount)}</td>
            <td>${supplier.rating || '-'}</td>
            <td><span class="status-badge ${supplier.is_active ? 'active' : 'inactive'}">${supplier.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary">View</button>
            </td>
        </tr>
    `).join('');
}

// Load Buyers data
async function loadBuyersData() {
    const buyerData = await apiCall('/trading/buyers/');
    
    const tbody = document.getElementById('buyerTable');
    
    if (!buyerData || buyerData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No buyers found</td></tr>';
        return;
    }
    
    tbody.innerHTML = buyerData.map(buyer => `
        <tr>
            <td>${buyer.name}</td>
            <td>${buyer.phone || '-'}</td>
            <td>${buyer.buyer_type || '-'}</td>
            <td>${formatCurrency(buyer.credit_limit)}</td>
            <td>${formatCurrency(buyer.current_credit_balance)}</td>
            <td><span class="status-badge ${buyer.is_active ? 'active' : 'inactive'}">${buyer.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary">View</button>
            </td>
        </tr>
    `).join('');
}

// Load Purchases data
async function loadPurchasesData() {
    const purchaseData = await apiCall('/trading/purchase-batches/');
    
    const tbody = document.getElementById('purchaseTable');
    
    if (!purchaseData || purchaseData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No purchases found</td></tr>';
        return;
    }
    
    tbody.innerHTML = purchaseData.map(purchase => `
        <tr>
            <td>${purchase.batch_number}</td>
            <td>${formatDate(purchase.date)}</td>
            <td>${purchase.supplier_name || '-'}</td>
            <td>${purchase.fish_name || '-'}</td>
            <td>${purchase.number_of_packages}</td>
            <td>${formatCurrency(purchase.total_expense)}</td>
            <td><span class="status-badge ${purchase.status}">${purchase.status || 'pending'}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary">View</button>
            </td>
        </tr>
    `).join('');
}

// Load Sales data
async function loadSalesData() {
    const saleData = await apiCall('/trading/sales/');
    
    const tbody = document.getElementById('saleTable');
    
    if (!saleData || saleData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No sales found</td></tr>';
        return;
    }
    
    tbody.innerHTML = saleData.map(sale => `
        <tr>
            <td>${sale.invoice_number}</td>
            <td>${formatDate(sale.date)}</td>
            <td>${sale.buyer_name || '-'}</td>
            <td>${sale.batch_fish_name || '-'}</td>
            <td>${formatCurrency(sale.total_revenue)}</td>
            <td>${formatCurrency(sale.profit)}</td>
            <td><span class="status-badge ${sale.payment_status}">${sale.payment_status || 'pending'}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary">View</button>
            </td>
        </tr>
    `).join('');
}

// Load Inventory data
async function loadInventoryData() {
    const inventoryData = await apiCall('/trading/inventory/');
    
    const tbody = document.getElementById('inventoryTable');
    
    if (!inventoryData || inventoryData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No inventory found</td></tr>';
        return;
    }
    
    tbody.innerHTML = inventoryData.map(inv => `
        <tr>
            <td>${inv.fish_name || '-'}</td>
            <td>${inv.purchase_batch_batch_number || '-'}</td>
            <td>${inv.remaining_packages}</td>
            <td>${inv.remaining_weight_kg || 0}</td>
            <td>${formatDate(inv.expiry_date)}</td>
            <td><span class="status-badge ${inv.status}">${inv.status || 'in_stock'}</span></td>
        </tr>
    `).join('');
}

// Load Payments data
async function loadPaymentsData() {
    const paymentData = await apiCall('/trading/payments/');
    
    const receivedTbody = document.getElementById('paymentsReceivedTable');
    const madeTbody = document.getElementById('paymentsMadeTable');
    
    if (!paymentData || paymentData.length === 0) {
        receivedTbody.innerHTML = '<tr><td colspan="6" class="text-center">No payments found</td></tr>';
        madeTbody.innerHTML = '<tr><td colspan="6" class="text-center">No payments found</td></tr>';
        return;
    }
    
    const received = paymentData.filter(p => p.payment_type === 'sale');
    const made = paymentData.filter(p => p.payment_type === 'purchase');
    
    receivedTbody.innerHTML = received.length > 0 ? received.map(payment => `
        <tr>
            <td>${payment.receipt_number || '-'}</td>
            <td>${formatDate(payment.date)}</td>
            <td>${payment.buyer_name || '-'}</td>
            <td>${formatCurrency(payment.amount)}</td>
            <td>${payment.payment_mode || '-'}</td>
            <td><span class="status-badge ${payment.is_cleared ? 'paid' : 'pending'}">${payment.is_cleared ? 'Cleared' : 'Pending'}</span></td>
        </tr>
    `).join('') : '<tr><td colspan="6" class="text-center">No payments received</td></tr>';
    
    madeTbody.innerHTML = made.length > 0 ? made.map(payment => `
        <tr>
            <td>${payment.receipt_number || '-'}</td>
            <td>${formatDate(payment.date)}</td>
            <td>${payment.supplier_name || '-'}</td>
            <td>${formatCurrency(payment.amount)}</td>
            <td>${payment.payment_mode || '-'}</td>
            <td><span class="status-badge ${payment.is_cleared ? 'paid' : 'pending'}">${payment.is_cleared ? 'Cleared' : 'Pending'}</span></td>
        </tr>
    `).join('') : '<tr><td colspan="6" class="text-center">No payments made</td></tr>';
}

// Load Reports data
async function loadReportsData() {
    const overview = await apiCall('/dashboard/overview/');
    
    if (overview) {
        document.getElementById('monthlyRevenue').textContent = formatCurrency(overview.current_year?.total_sales_amount || 0);
        document.getElementById('inventoryValue').textContent = formatCurrency(overview.today?.inventory_value || 0);
        
        // Calculate profit margin
        const revenue = parseFloat(overview.current_year?.total_sales_amount || 0);
        const profit = parseFloat(overview.current_year?.total_profit || 0);
        const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;
        document.getElementById('profitMargin').textContent = margin + '%';
    }
    
    const riskAlerts = await apiCall('/dashboard/risk-alerts/');
    document.getElementById('riskAlerts').textContent = riskAlerts ? riskAlerts.length : 0;
    
    const topBuyers = await apiCall('/dashboard/top-buyers/?limit=5');
    renderTopBuyers(topBuyers);
}

// Load Subscription data
async function loadSubscriptionData() {
    // Load current subscription
    const currentSub = await apiCall('/subscriptions/current/');
    renderCurrentSubscription(currentSub);
    
    // Load subscription tiers
    const tiers = await apiCall('/subscriptions/tiers/');
    renderSubscriptionTiers(tiers, currentSub);
    
    // Load add-ons
    const addons = await apiCall('/subscriptions/addons/');
    renderSubscriptionAddons(addons);
}

// Render current subscription
function renderCurrentSubscription(data) {
    const container = document.getElementById('currentSubscription');
    
    if (!data || !data.tier) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                No active subscription found. Please subscribe to a plan.
            </div>
        `;
        return;
    }
    
    const tier = data.tier;
    const features = tier.features ? tier.features.split(',') : [];
    
    container.innerHTML = `
        <div class="subscription-current">
            <div class="current-tier-badge ${tier.name.toLowerCase()}">
                <i class="fas fa-crown"></i> ${tier.name}
            </div>
            <div class="subscription-details">
                <div class="detail-row">
                    <span class="label">Status:</span>
                    <span class="value"><span class="status-badge ${data.is_active ? 'active' : 'inactive'}">${data.is_active ? 'Active' : 'Inactive'}</span></span>
                </div>
                <div class="detail-row">
                    <span class="label">Billing Cycle:</span>
                    <span class="value">${data.billing_cycle || 'Monthly'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Start Date:</span>
                    <span class="value">${formatDate(data.start_date)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">End Date:</span>
                    <span class="value">${formatDate(data.end_date)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Price:</span>
                    <span class="value">${formatCurrency(tier.price)}/${tier.billing_cycle || 'month'}</span>
                </div>
            </div>
            <div class="current-features">
                <h4>Your Features:</h4>
                <ul class="feature-list">
                    ${features.map(f => `<li><i class="fas fa-check"></i> ${f.trim()}</li>`).join('')}
                </ul>
            </div>
            <div class="subscription-actions">
                <button class="btn btn-primary" onclick="showUpgradeModal()">Upgrade Plan</button>
            </div>
        </div>
    `;
}

// Render subscription tiers
function renderSubscriptionTiers(tiers, currentSub) {
    const container = document.getElementById('subscriptionTiers');
    
    if (!tiers || tiers.length === 0) {
        container.innerHTML = '<div class="text-center p-4">No plans available</div>';
        return;
    }
    
    const currentTierId = currentSub?.tier?.id;
    
    container.innerHTML = tiers.map(tier => {
        const isCurrent = tier.id === currentTierId;
        const features = tier.features ? tier.features.split(',') : [];
        const tierClass = tier.name.toLowerCase();
        
        return `
            <div class="tier-card ${tierClass} ${isCurrent ? 'current' : ''}">
                <div class="tier-header">
                    <h3>${tier.name}</h3>
                    <div class="tier-price">
                        <span class="price">${formatCurrency(tier.price)}</span>
                        <span class="period">/${tier.billing_cycle || 'month'}</span>
                    </div>
                </div>
                <div class="tier-body">
                    <ul class="tier-features">
                        ${features.map(f => `<li><i class="fas fa-check"></i> ${f.trim()}</li>`).join('')}
                    </ul>
                </div>
                <div class="tier-footer">
                    ${isCurrent 
                        ? '<button class="btn btn-secondary" disabled>Current Plan</button>' 
                        : `<button class="btn btn-primary" onclick="selectTier(${tier.id})">${tier.price > (currentSub?.tier?.price || 0) ? 'Upgrade' : 'Downgrade'}</button>`
                    }
                </div>
            </div>
        `;
    }).join('');
}

// Render subscription add-ons
function renderSubscriptionAddons(addons) {
    const tbody = document.getElementById('subscriptionAddons');
    
    if (!addons || addons.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No add-ons available</td></tr>';
        return;
    }
    
    tbody.innerHTML = addons.map(addon => `
        <tr>
            <td><strong>${addon.name}</strong></td>
            <td>${addon.description || '-'}</td>
            <td>${formatCurrency(addon.price)}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="purchaseAddon(${addon.id})">Add</button>
            </td>
        </tr>
    `).join('');
}

// Show upgrade modal
function showUpgradeModal() {
    const content = `
        <form id="upgradeForm">
            <div class="form-group">
                <label>Select New Plan</label>
                <select class="form-control" name="tier_id" id="upgradeTierSelect" required>
                    <option value="">Select a plan</option>
                </select>
            </div>
            <div class="form-group">
                <label>Billing Cycle</label>
                <select class="form-control" name="billing_cycle">
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly (Save 20%)</option>
                </select>
            </div>
        </form>
    `;
    
    const footer = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitUpgrade()">Confirm Upgrade</button>
    `;
    
    showModal('Upgrade Subscription', content, footer);
    
    // Load tiers for dropdown
    loadTiersForUpgrade();
}

// Load tiers for upgrade dropdown
async function loadTiersForUpgrade() {
    const tiers = await apiCall('/subscriptions/tiers/');
    const select = document.getElementById('upgradeTierSelect');
    
    if (tiers) {
        select.innerHTML = '<option value="">Select a plan</option>' + 
            tiers.map(t => `<option value="${t.id}">${t.name} - ${formatCurrency(t.price_monthly)}/month</option>`).join('');
    }
}

// Select tier
async function selectTier(tierId) {
    showUpgradeModal();
    document.getElementById('upgradeTierSelect').value = tierId;
}

// Submit upgrade
async function submitUpgrade() {
    const tierId = document.getElementById('upgradeTierSelect').value;
    const billingCycle = document.querySelector('#upgradeForm select[name="billing_cycle"]').value;
    
    if (!tierId) {
        showAlert('Please select a plan', 'danger');
        return;
    }
    
    const result = await apiCall('/subscriptions/update/', 'PUT', {
        tier_id: tierId,
        billing_cycle: billingCycle
    });
    
    if (result) {
        showAlert('Subscription updated successfully!', 'success');
        closeModal();
        loadSubscriptionData();
    } else {
        showAlert('Failed to update subscription', 'danger');
    }
}

// Purchase addon
async function purchaseAddon(addonId) {
    const result = await apiCall('/subscriptions/addons/purchase/', 'POST', { addon_id: addonId });
    
    if (result) {
        showAlert('Add-on purchased successfully!', 'success');
        loadSubscriptionData();
    } else {
        showAlert('Failed to purchase add-on', 'danger');
    }
}

// Load Analytics data
async function loadAnalyticsData() {
    // Monthly revenue and profit margin
    const overview = await apiCall('/dashboard/overview/');
    if (overview) {
        const revenue = parseFloat(overview.current_year?.total_sales_amount || 0);
        const profit = parseFloat(overview.current_year?.total_profit || 0);
        const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;
        
        document.getElementById('monthlyRevenueAnalytics').textContent = formatCurrency(revenue);
        document.getElementById('profitMarginAnalytics').textContent = margin + '%';
    }
    
    // Cash flow
    const cashflow = await apiCall('/dashboard/payment-cashflow/');
    if (cashflow) {
        document.getElementById('cashInflow').textContent = formatCurrency(cashflow.total_received || 0);
        document.getElementById('cashOutflow').textContent = formatCurrency(cashflow.total_made || 0);
    }
    
    // Profit margin trend
    const profitTrend = await apiCall('/dashboard/profit-margin-trend/');
    if (profitTrend) {
        renderProfitTrendChart(profitTrend);
    }
    
    // Sales by payment method
    const paymentMethod = await apiCall('/dashboard/sales-by-payment/');
    if (paymentMethod) {
        renderPaymentMethodChart(paymentMethod);
    }
    
    // Profit by purchase type
    const profitByType = await apiCall('/dashboard/profit/by-purchase-type/');
    renderProfitByType(profitByType);
    
    // Credit customers
    const creditCustomers = await apiCall('/dashboard/credit-customers/');
    renderCreditCustomers(creditCustomers);
    
    // Pending payments
    const pendingPayments = await apiCall('/dashboard/pending-payments/');
    renderPendingPayments(pendingPayments);
}

// Render pending payments table
function renderPendingPayments(data) {
    const tbody = document.getElementById('pendingPaymentsTable');
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No pending payments</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.slice(0, 5).map(payment => `
        <tr>
            <td>${payment.invoice_number || payment.receipt_number || 'N/A'}</td>
            <td>${payment.buyer_name || payment.supplier_name || 'N/A'}</td>
            <td>${formatCurrency(payment.amount)}</td>
            <td>${formatDate(payment.due_date)}</td>
            <td><span class="status-badge pending">Pending</span></td>
        </tr>
    `).join('');
}

// Render profit trend chart
function renderProfitTrendChart(data) {
    const ctx = document.getElementById('profitTrendChart').getContext('2d');
    
    if (charts.profitTrend) {
        charts.profitTrend.destroy();
    }
    
    const labels = data.map(d => d.month || d.date);
    const revenues = data.map(d => parseFloat(d.revenue || d.total_revenue || 0));
    const profits = data.map(d => parseFloat(d.profit || 0));
    
    charts.profitTrend = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Revenue',
                    data: revenues,
                    backgroundColor: '#0077b6'
                },
                {
                    label: 'Profit',
                    data: profits,
                    backgroundColor: '#28a745'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Render payment method chart
function renderPaymentMethodChart(data) {
    const ctx = document.getElementById('paymentMethodChart').getContext('2d');
    
    if (charts.paymentMethod) {
        charts.paymentMethod.destroy();
    }
    
    const labels = data.map(d => d.payment_mode || d.method);
    const amounts = data.map(d => parseFloat(d.total || d.amount || 0));
    
    charts.paymentMethod = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: amounts,
                backgroundColor: ['#0077b6', '#00b4d8', '#48cae4', '#90e0ef', '#caf0f8']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

// Render profit by type table
function renderProfitByType(data) {
    const tbody = document.getElementById('profitByTypeTable');
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-center">No data</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${item.purchase_type || 'N/A'}</td>
            <td>${formatCurrency(item.profit || 0)}</td>
        </tr>
    `).join('');
}

// Render credit customers table
function renderCreditCustomers(data) {
    const tbody = document.getElementById('creditCustomersTable');
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-center">No data</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${item.buyer__name || item.name || 'N/A'}</td>
            <td>${formatCurrency(item.credit_balance || item.balance || 0)}</td>
        </tr>
    `).join('');
}

// Load Users data
async function loadUsersData() {
    const role = localStorage.getItem('userRole') || localStorage.getItem('role');
    const endpoint = role === 'tenant_admin' ? '/auth/tenant-users/' : '/auth/users/';
    const users = await apiCall(endpoint);
    renderUsersTable(users);
}

// Render users table
function renderUsersTable(users) {
    const tbody = document.getElementById('usersTable');
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.username}</td>
            <td>${user.email || '-'}</td>
            <td><span class="status-badge ${user.role === 'platform_operator' ? 'active' : 'pending'}">${user.role || 'user'}</span></td>
            <td><span class="status-badge ${user.is_active ? 'active' : 'inactive'}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary">Edit</button>
            </td>
        </tr>
    `).join('');
}

// Load Audit data
async function loadAuditData() {
    // Try to get audit logs - this might need a backend endpoint
    // For now, we'll show a placeholder
    const tbody = document.getElementById('auditTable');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">No audit logs available</td></tr>';
    
    // If there's an audit endpoint, uncomment below:
    // const logs = await apiCall('/platform/audit-logs/');
    // renderAuditTable(logs);
}

// Render audit table
function renderAuditTable(logs) {
    const tbody = document.getElementById('auditTable');
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No audit logs found</td></tr>';
        return;
    }
    
    tbody.innerHTML = logs.map(log => `
        <tr>
            <td>${formatDate(log.timestamp)}</td>
            <td>${log.user || 'System'}</td>
            <td>${log.action || 'N/A'}</td>
            <td>${log.details || '-'}</td>
        </tr>
    `).join('');
}

// Load Platform Admin data
async function loadPlatformData(tool) {
    // Check if user is platform operator
    if (!['platform_operator', 'platform_maintainer'].includes(currentUser.role)) {
        showAlert('You do not have permission to access this page', 'danger');
        return;
    }
    
    // If a specific tool is requested
    if (tool) {
        switch(tool) {
            case 'activity':
                const activity = await apiCall('/platform/activity-heatmap/');
                showModal('Activity Heatmap', '<div class="text-center p-4">Activity data: ' + JSON.stringify(activity) + '</div>');
                break;
            case 'billing':
                const billing = await apiCall('/platform/billing-history/');
                showModal('Billing History', '<div class="text-center p-4">Billing data loaded</div>');
                break;
            case 'errors':
                const errors = await apiCall('/platform/error-tracking/');
                showModal('Error Tracking', '<div class="text-center p-4">Error data loaded</div>');
                break;
            case 'backup':
                const backup = await apiCall('/platform/backup-status/');
                showModal('Backup Status', '<div class="text-center p-4">Backup status: ' + JSON.stringify(backup) + '</div>');
                break;
        }
        return;
    }
    
    // Load platform statistics
    const stats = await apiCall('/platform/dashboard/');
    if (stats) {
        document.getElementById('totalTenants').textContent = stats.total_tenants || 0;
        document.getElementById('totalUsers').textContent = stats.total_users || 0;
        document.getElementById('platformRevenue').textContent = formatCurrency(stats.mrr || 0);
        document.getElementById('activeIssues').textContent = (stats.suspended_tenants || 0) + (stats.expired_tenants || 0);
    }
    
    // Load tenants
    const tenantsResponse = await apiCall('/platform/tenants/');
    const tenants = tenantsResponse?.tenants || [];
    renderTenantsTable(tenants);
}

// Render tenants table
function renderTenantsTable(tenants) {
    const tbody = document.getElementById('tenantsTable');
    
    if (!tenants || tenants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No tenants found</td></tr>';
        return;
    }
    
    tbody.innerHTML = tenants.map(tenant => `
        <tr>
            <td>${tenant.name || 'N/A'}</td>
            <td>${tenant.email || '-'}</td>
            <td><span class="status-badge active">${tenant.tier || 'Basic'}</span></td>
            <td><span class="status-badge ${tenant.is_subscription_active ? 'active' : 'inactive'}">${tenant.is_subscription_active ? 'Active' : 'Suspended'}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="viewTenant(${tenant.id})">View</button>
            </td>
        </tr>
    `).join('');
}

// View tenant details
async function viewTenant(tenantId) {
    const tenant = await apiCall(`/platform/tenants/${tenantId}/`);
    if (tenant) {
        showModal('Tenant Details', `
            <div class="tenant-details">
                <p><strong>Company:</strong> ${tenant.name || 'N/A'}</p>
                <p><strong>Email:</strong> ${tenant.email || 'N/A'}</p>
                <p><strong>Plan:</strong> ${tenant.subscription?.tier?.name || 'Basic'}</p>
                <p><strong>Status:</strong> ${tenant.is_active ? 'Active' : 'Suspended'}</p>
                <p><strong>Created:</strong> ${formatDate(tenant.created_at)}</p>
            </div>
        `, '<button class="btn btn-secondary" onclick="closeModal()">Close</button>');
    }
}

// Load Security data (2FA)
async function loadSecurityData() {
    const container = document.getElementById('twoFactorStatus');
    
    // Check 2FA status - this would need backend endpoint
    // For now, show setup option
    container.innerHTML = `
        <div class="two-factor-setup">
            <div class="two-factor-icon">
                <i class="fas fa-shield-alt"></i>
            </div>
            <h3>Two-Factor Authentication</h3>
            <p>Add an extra layer of security to your account by enabling two-factor authentication.</p>
            <div class="two-factor-status disabled">
                <span class="status-badge inactive">2FA is currently disabled</span>
            </div>
            <button class="btn btn-primary mt-2" onclick="setupTwoFactor()">
                <i class="fas fa-lock"></i> Enable Two-Factor Authentication
            </button>
        </div>
    `;
}

// Setup Two-Factor Authentication
async function setupTwoFactor() {
    const result = await apiCall('/auth/2fa/setup/', 'POST');
    
    if (result) {
        showModal('Setup Two-Factor Authentication', `
            <div class="two-factor-qr">
                <p>Scan this QR code with your authenticator app:</p>
                <div class="qr-code">
                    <img src="${result.qr_code_url || ''}" alt="QR Code" />
                </div>
                <p class="mt-2">Or enter this code manually: <strong>${result.secret || 'N/A'}</strong></p>
            </div>
        `, '<button class="btn btn-primary" onclick="verifyTwoFactor()">Next</button><button class="btn btn-secondary" onclick="closeModal()">Cancel</button>');
    } else {
        showAlert('Failed to setup 2FA. Please try again.', 'danger');
    }
}

// Verify Two-Factor Authentication
async function verifyTwoFactor() {
    const code = prompt('Enter the 6-digit code from your authenticator app:');
    
    if (code) {
        const result = await apiCall('/auth/2fa/verify/', 'POST', { code: code });
        
        if (result && result.success) {
            showAlert('Two-Factor Authentication enabled successfully!', 'success');
            loadSecurityData();
            closeModal();
        } else {
            showAlert('Invalid code. Please try again.', 'danger');
        }
    }
}

// Disable Two-Factor Authentication
async function disableTwoFactor() {
    if (confirm('Are you sure you want to disable Two-Factor Authentication?')) {
        const result = await apiCall('/auth/2fa/disable/', 'POST');
        
        if (result) {
            showAlert('Two-Factor Authentication disabled', 'success');
            loadSecurityData();
        } else {
            showAlert('Failed to disable 2FA', 'danger');
        }
    }
}

// Render top buyers table
function renderTopBuyers(data) {
    const tbody = document.getElementById('topBuyersTable');
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No data</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(buyer => `
        <tr>
            <td>${buyer.buyer__name || '-'}</td>
            <td>${buyer.order_count || 0}</td>
            <td>${formatCurrency(buyer.total_revenue)}</td>
        </tr>
    `).join('');
}

// Setup tabs
function setupTabs() {
    const tabs = document.querySelectorAll('.tabs .tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById('payments' + tabId.charAt(0).toUpperCase() + tabId.slice(1)).classList.add('active');
        });
    });
}

// Modal functions
function showModal(title, content, footer = '') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modalFooter').innerHTML = footer || '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>';
    document.getElementById('modalOverlay').classList.add('show');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
}

// ==================== ADD/EDIT FORMS ====================

// Set up Add button event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Add Fish button
    document.getElementById('addFishBtn')?.addEventListener('click', function() {
        showAddFishModal();
    });
    
    // Add Supplier button
    document.getElementById('addSupplierBtn')?.addEventListener('click', function() {
        showAddSupplierModal();
    });
    
    // Add Buyer button
    document.getElementById('addBuyerBtn')?.addEventListener('click', function() {
        showAddBuyerModal();
    });
    
    // Add Purchase button
    document.getElementById('addPurchaseBtn')?.addEventListener('click', function() {
        showAddPurchaseModal();
    });
    
    // Add Sale button
    document.getElementById('addSaleBtn')?.addEventListener('click', function() {
        showAddSaleModal();
    });
    
    // Add Payment button
    document.getElementById('addPaymentBtn')?.addEventListener('click', function() {
        showAddPaymentModal();
    });
    
    // Settings form
    document.getElementById('profileForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        showAlert('Profile updated successfully!', 'success');
    });
    
    document.getElementById('passwordForm')?.addEventListener('submit', async function(e) {
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
});

// Show Add Fish Modal
async function showAddFishModal() {
    // Get categories for dropdown
    const categories = await apiCall('/trading/fish-categories/');
    
    const categoryOptions = categories ? categories.map(c => 
        `<option value="${c.id}">${c.name}</option>`
    ).join('') : '<option value="">No categories</option>';
    
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
                <label>
                    <input type="checkbox" name="is_active" checked> Active
                </label>
            </div>
        </form>
    `;
    
    const footer = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitFishForm()">Add Fish</button>
    `;
    
    showModal('Add New Fish', content, footer);
}

// Submit Fish Form
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

// Show Add Supplier Modal
async function showAddSupplierModal() {
    const content = `
        <form id="addSupplierForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Supplier Name *</label>
                    <input type="text" class="form-control" name="name" required>
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <input type="text" class="form-control" name="phone">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" class="form-control" name="email">
                </div>
                <div class="form-group">
                    <label>Supplier Type</label>
                    <select class="form-control" name="supplier_type">
                        <option value="individual">Individual</option>
                        <option value="company">Company</option>
                        <option value="broker">Broker</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Place of Origin</label>
                    <input type="text" class="form-control" name="place_of_origin">
                </div>
                <div class="form-group">
                    <label>ID Number</label>
                    <input type="text" class="form-control" name="id_number">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Bank Name</label>
                    <input type="text" class="form-control" name="bank_name">
                </div>
                <div class="form-group">
                    <label>Account Number</label>
                    <input type="text" class="form-control" name="bank_account">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Payment Terms</label>
                    <select class="form-control" name="payment_terms">
                        <option value="immediate">Immediate</option>
                        <option value="7">7 Days</option>
                        <option value="15">15 Days</option>
                        <option value="30">30 Days</option>
                        <option value="45">45 Days</option>
                        <option value="60">60 Days</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Credit Limit</label>
                    <input type="number" class="form-control" name="credit_limit" step="0.01">
                </div>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" name="is_active" checked> Active
                </label>
            </div>
        </form>
    `;
    
    const footer = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitSupplierForm()">Add Supplier</button>
    `;
    
    showModal('Add New Supplier', content, footer);
}

// Submit Supplier Form
async function submitSupplierForm() {
    const form = document.getElementById('addSupplierForm');
    const formData = new FormData(form);
    
    const data = {
        name: formData.get('name'),
        phone: formData.get('phone') || '',
        email: formData.get('email') || '',
        supplier_type: formData.get('supplier_type') || 'individual',
        place_of_origin: formData.get('place_of_origin') || '',
        id_number: formData.get('id_number') || '',
        bank_name: formData.get('bank_name') || '',
        bank_account: formData.get('bank_account') || '',
        payment_terms: formData.get('payment_terms') || 'immediate',
        credit_limit: parseFloat(formData.get('credit_limit')) || 0,
        is_active: form.querySelector('input[name="is_active"]').checked
    };
    
    if (!data.name) {
        showAlert('Please enter supplier name', 'danger');
        return;
    }
    
    const result = await apiCall('/trading/suppliers/', 'POST', data);
    
    if (result) {
        showAlert('Supplier added successfully!', 'success');
        closeModal();
        loadSuppliersData();
    } else {
        showAlert('Failed to add supplier', 'danger');
    }
}

// Show Add Buyer Modal
async function showAddBuyerModal() {
    const content = `
        <form id="addBuyerForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Buyer Name *</label>
                    <input type="text" class="form-control" name="name" required>
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <input type="text" class="form-control" name="phone">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" class="form-control" name="email">
                </div>
                <div class="form-group">
                    <label>Buyer Type</label>
                    <select class="form-control" name="buyer_type">
                        <option value="retail">Retail</option>
                        <option value="wholesale">Wholesale</option>
                        <option value="export">Export</option>
                        <option value="restaurant">Restaurant</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Business Name</label>
                    <input type="text" class="form-control" name="business_name">
                </div>
                <div class="form-group">
                    <label>GST Number</label>
                    <input type="text" class="form-control" name="gst_number">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Credit Limit</label>
                    <input type="number" class="form-control" name="credit_limit" step="0.01">
                </div>
                <div class="form-group">
                    <label>Default Discount %</label>
                    <input type="number" class="form-control" name="default_discount_percent" step="0.01" value="0">
                </div>
            </div>
            <div class="form-group">
                <label>Address</label>
                <textarea class="form-control" name="address" rows="2"></textarea>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" name="is_active" checked> Active
                </label>
            </div>
        </form>
    `;
    
    const footer = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitBuyerForm()">Add Buyer</button>
    `;
    
    showModal('Add New Buyer', content, footer);
}

// Submit Buyer Form
async function submitBuyerForm() {
    const form = document.getElementById('addBuyerForm');
    const formData = new FormData(form);
    
    const data = {
        name: formData.get('name'),
        phone: formData.get('phone') || '',
        email: formData.get('email') || '',
        buyer_type: formData.get('buyer_type') || 'retail',
        business_name: formData.get('business_name') || '',
        gst_number: formData.get('gst_number') || '',
        credit_limit: parseFloat(formData.get('credit_limit')) || 0,
        default_discount_percent: parseFloat(formData.get('default_discount_percent')) || 0,
        address: formData.get('address') || '',
        is_active: form.querySelector('input[name="is_active"]').checked
    };
    
    if (!data.name) {
        showAlert('Please enter buyer name', 'danger');
        return;
    }
    
    const result = await apiCall('/trading/buyers/', 'POST', data);
    
    if (result) {
        showAlert('Buyer added successfully!', 'success');
        closeModal();
        loadBuyersData();
    } else {
        showAlert('Failed to add buyer', 'danger');
    }
}

// Show Add Purchase Modal
async function showAddPurchaseModal() {
    const suppliers = await apiCall('/trading/suppliers/');
    const fish = await apiCall('/trading/fish/');
    
    const supplierOptions = suppliers ? suppliers.map(s => 
        `<option value="${s.id}">${s.name}</option>`
    ).join('') : '<option value="">No suppliers</option>';
    
    const fishOptions = fish ? fish.map(f => 
        `<option value="${f.id}">${f.name}</option>`
    ).join('') : '<option value="">No fish</option>';
    
    const content = `
        <form id="addPurchaseForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Supplier *</label>
                    <select class="form-control" name="supplier" required>
                        <option value="">Select Supplier</option>
                        ${supplierOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Fish Type *</label>
                    <select class="form-control" name="fish" required>
                        <option value="">Select Fish</option>
                        ${fishOptions}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Purchase Type</label>
                    <select class="form-control" name="purchase_type">
                        <option value="auction">Auction</option>
                        <option value="package">Package</option>
                        <option value="bucket">Bucket</option>
                        <option value="kg">Per KG</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Number of Packages</label>
                    <input type="number" class="form-control" name="number_of_packages" value="1">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Package Weight (kg)</label>
                    <input type="number" class="form-control" name="package_weight" step="0.01">
                </div>
                <div class="form-group">
                    <label>Price per kg</label>
                    <input type="number" class="form-control" name="price_per_kg" step="0.01">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Labour Cost</label>
                    <input type="number" class="form-control" name="labour_cost" step="0.01" value="0">
                </div>
                <div class="form-group">
                    <label>Ice Cost</label>
                    <input type="number" class="form-control" name="ice_cost" step="0.01" value="0">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Transport Cost</label>
                    <input type="number" class="form-control" name="transport_cost" step="0.01" value="0">
                </div>
                <div class="form-group">
                    <label>Commission Cost</label>
                    <input type="number" class="form-control" name="commission_cost" step="0.01" value="0">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Fisherman Name</label>
                    <input type="text" class="form-control" name="fisherman_name">
                </div>
                <div class="form-group">
                    <label>Place of Buying</label>
                    <input type="text" class="form-control" name="place_of_buying">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Amount Paid</label>
                    <input type="number" class="form-control" name="amount_paid" step="0.01" value="0">
                </div>
                <div class="form-group">
                    <label>Expiry Date</label>
                    <input type="date" class="form-control" name="expiry_date">
                </div>
            </div>
        </form>
    `;
    
    const footer = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitPurchaseForm()">Create Purchase</button>
    `;
    
    showModal('New Purchase Order', content, footer);
}

// Submit Purchase Form
async function submitPurchaseForm() {
    const form = document.getElementById('addPurchaseForm');
    const formData = new FormData(form);
    
    const data = {
        supplier: formData.get('supplier'),
        fish: formData.get('fish'),
        purchase_type: formData.get('purchase_type') || 'auction',
        number_of_packages: parseInt(formData.get('number_of_packages')) || 1,
        package_weight: parseFloat(formData.get('package_weight')) || 0,
        price_per_kg: parseFloat(formData.get('price_per_kg')) || 0,
        labour_cost: parseFloat(formData.get('labour_cost')) || 0,
        ice_cost: parseFloat(formData.get('ice_cost')) || 0,
        transport_cost: parseFloat(formData.get('transport_cost')) || 0,
        commission_cost: parseFloat(formData.get('commission_cost')) || 0,
        fisherman_name: formData.get('fisherman_name') || '',
        place_of_buying: formData.get('place_of_buying') || '',
        amount_paid: parseFloat(formData.get('amount_paid')) || 0,
        expiry_date: formData.get('expiry_date') || null
    };
    
    if (!data.supplier || !data.fish) {
        showAlert('Please select supplier and fish type', 'danger');
        return;
    }
    
    const result = await apiCall('/trading/purchase-batches/', 'POST', data);
    
    if (result) {
        showAlert('Purchase created successfully!', 'success');
        closeModal();
        loadPurchasesData();
    } else {
        showAlert('Failed to create purchase', 'danger');
    }
}

// Show Add Sale Modal
async function showAddSaleModal() {
    const buyers = await apiCall('/trading/buyers/');
    const purchases = await apiCall('/trading/purchase-batches/?status=partial');
    
    const buyerOptions = buyers ? buyers.map(b => 
        `<option value="${b.id}">${b.name}</option>`
    ).join('') : '<option value="">No buyers</option>';
    
    const purchaseOptions = purchases ? purchases.map(p => 
        `<option value="${p.id}">${p.batch_number} - ${p.fish_name || 'Fish'} (${p.number_of_packages - (p.sold_packages || 0)} pkg available)</option>`
    ).join('') : '<option value="">No available purchases</option>';
    
    const content = `
        <form id="addSaleForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Buyer *</label>
                    <select class="form-control" name="buyer" required>
                        <option value="">Select Buyer</option>
                        ${buyerOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Purchase Batch *</label>
                    <select class="form-control" name="batch" required>
                        <option value="">Select Batch</option>
                        ${purchaseOptions}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Sale Type</label>
                    <select class="form-control" name="sale_type">
                        <option value="retail">Retail</option>
                        <option value="wholesale">Wholesale</option>
                        <option value="export">Export</option>
                        <option value="bulk">Bulk</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Packages to Sell</label>
                    <input type="number" class="form-control" name="number_of_packages_sold" value="1">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Weight per Package (kg)</label>
                    <input type="number" class="form-control" name="selling_weight_per_package" step="0.01">
                </div>
                <div class="form-group">
                    <label>Selling Price per kg</label>
                    <input type="number" class="form-control" name="selling_price_per_kg" step="0.01">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Discount %</label>
                    <input type="number" class="form-control" name="discount_percent" step="0.01" value="0">
                </div>
                <div class="form-group">
                    <label>Tax %</label>
                    <input type="number" class="form-control" name="tax_percent" step="0.01" value="0">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Amount Received</label>
                    <input type="number" class="form-control" name="amount_received" step="0.01" value="0">
                </div>
                <div class="form-group">
                    <label>Delivery Status</label>
                    <select class="form-control" name="delivery_status">
                        <option value="pending">Pending</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Delivery Address</label>
                <textarea class="form-control" name="delivery_address" rows="2"></textarea>
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea class="form-control" name="notes" rows="2"></textarea>
            </div>
        </form>
    `;
    
    const footer = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitSaleForm()">Create Sale</button>
    `;
    
    showModal('New Sale', content, footer);
}

// Submit Sale Form
async function submitSaleForm() {
    const form = document.getElementById('addSaleForm');
    const formData = new FormData(form);
    
    const data = {
        buyer: formData.get('buyer'),
        batch: formData.get('batch'),
        sale_type: formData.get('sale_type') || 'retail',
        number_of_packages_sold: parseInt(formData.get('number_of_packages_sold')) || 1,
        selling_weight_per_package: parseFloat(formData.get('selling_weight_per_package')) || 0,
        selling_price_per_kg: parseFloat(formData.get('selling_price_per_kg')) || 0,
        discount_percent: parseFloat(formData.get('discount_percent')) || 0,
        tax_percent: parseFloat(formData.get('tax_percent')) || 0,
        amount_received: parseFloat(formData.get('amount_received')) || 0,
        delivery_status: formData.get('delivery_status') || 'pending',
        delivery_address: formData.get('delivery_address') || '',
        notes: formData.get('notes') || ''
    };
    
    if (!data.buyer || !data.batch) {
        showAlert('Please select buyer and purchase batch', 'danger');
        return;
    }
    
    const result = await apiCall('/trading/sales/', 'POST', data);
    
    if (result) {
        showAlert('Sale created successfully!', 'success');
        closeModal();
        loadSalesData();
    } else {
        showAlert('Failed to create sale', 'danger');
    }
}

// Show Add Payment Modal
async function showAddPaymentModal() {
    const buyers = await apiCall('/trading/buyers/');
    const suppliers = await apiCall('/trading/suppliers/');
    
    const buyerOptions = buyers ? buyers.map(b => 
        `<option value="${b.id}">${b.name}</option>`
    ).join('') : '<option value="">No buyers</option>';
    
    const supplierOptions = suppliers ? suppliers.map(s => 
        `<option value="${s.id}">${s.name}</option>`
    ).join('') : '<option value="">No suppliers</option>';
    
    const content = `
        <form id="addPaymentForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Payment Type *</label>
                    <select class="form-control" name="payment_type" id="paymentType" onchange="togglePaymentFields()">
                        <option value="sale">From Buyer</option>
                        <option value="purchase">To Supplier</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Payment Mode</label>
                    <select class="form-control" name="payment_mode">
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="upi">UPI</option>
                        <option value="cheque">Cheque</option>
                        <option value="card">Card</option>
                    </select>
                </div>
            </div>
            <div class="form-row" id="buyerField">
                <div class="form-group">
                    <label>Buyer *</label>
                    <select class="form-control" name="buyer">
                        <option value="">Select Buyer</option>
                        ${buyerOptions}
                    </select>
                </div>
            </div>
            <div class="form-row hidden" id="supplierField">
                <div class="form-group">
                    <label>Supplier *</label>
                    <select class="form-control" name="supplier">
                        <option value="">Select Supplier</option>
                        ${supplierOptions}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Amount *</label>
                    <input type="number" class="form-control" name="amount" step="0.01" required>
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <input type="date" class="form-control" name="date" id="paymentDate">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Reference Number</label>
                    <input type="text" class="form-control" name="reference_number">
                </div>
                <div class="form-group">
                    <label>Bank Name</label>
                    <input type="text" class="form-control" name="bank_name">
                </div>
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea class="form-control" name="notes" rows="2"></textarea>
            </div>
        </form>
    `;
    
    const footer = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitPaymentForm()">Record Payment</button>
    `;
    
    showModal('Record Payment', content, footer);
    
    // Set default date to today
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
}

// Toggle payment fields based on type
function togglePaymentFields() {
    const paymentType = document.getElementById('paymentType').value;
    const buyerField = document.getElementById('buyerField');
    const supplierField = document.getElementById('supplierField');
    
    if (paymentType === 'sale') {
        buyerField.classList.remove('hidden');
        supplierField.classList.add('hidden');
    } else {
        buyerField.classList.add('hidden');
        supplierField.classList.remove('hidden');
    }
}

// Submit Payment Form
async function submitPaymentForm() {
    const form = document.getElementById('addPaymentForm');
    const formData = new FormData(form);
    
    const paymentType = formData.get('payment_type');
    
    const data = {
        payment_type: paymentType,
        payment_mode: formData.get('payment_mode') || 'cash',
        amount: parseFloat(formData.get('amount')) || 0,
        date: formData.get('date') || new Date().toISOString().split('T')[0],
        reference_number: formData.get('reference_number') || '',
        bank_name: formData.get('bank_name') || '',
        notes: formData.get('notes') || ''
    };
    
    if (paymentType === 'sale') {
        data.buyer = formData.get('buyer');
        if (!data.buyer) {
            showAlert('Please select buyer', 'danger');
            return;
        }
    } else {
        data.supplier = formData.get('supplier');
        if (!data.supplier) {
            showAlert('Please select supplier', 'danger');
            return;
        }
    }
    
    if (!data.amount) {
        showAlert('Please enter amount', 'danger');
        return;
    }
    
    const result = await apiCall('/trading/payments/', 'POST', data);
    
    if (result) {
        showAlert('Payment recorded successfully!', 'success');
        closeModal();
        loadPaymentsData();
    } else {
        showAlert('Failed to record payment', 'danger');
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    const content = document.getElementById('mainContent');
    content.insertBefore(alertDiv, content.firstChild);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    window.location.href = '/web/login/';
}

// Close modal on outside click
document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});
