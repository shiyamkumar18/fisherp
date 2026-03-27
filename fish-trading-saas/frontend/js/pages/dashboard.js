// Fish ERP - Dashboard Page Module

const DashboardPage = {
    // Initialize dashboard
    init: () => {
        DashboardPage.loadData();
    },
    
    // Load dashboard data
loadData: async () => {
        await Promise.all([
            DashboardPage.loadKPIs(),
            DashboardPage.loadRecentSales(),
            DashboardPage.loadRecentPurchases()
        ]);
    },
    
    // Load KPI cards
loadKPIs: async () => {
        const data = await window.TradingAPI.dashboard.tenant();
        if (data && data.kpi) {
            document.getElementById('sales-today').textContent = window.Utils.formatCurrency(data.kpi.today_sales);
            document.getElementById('purchases-today').textContent = window.Utils.formatCurrency(data.kpi.today_purchases || 0);
            document.getElementById('stock').textContent = data.inventory_total || 0;
            document.getElementById('profit').textContent = window.Utils.formatCurrency(data.kpi.today_profit);
        }
    },
    
    // Load charts
    loadCharts: async () => {
        // Sales trend chart
        const salesTrend = await window.API.get('/dashboard/sales-trend/?days=7');
        if (salesTrend) {
            DashboardPage.renderSalesTrendChart(salesTrend);
        }
        
        // Fish type chart
        const fishTypeData = await window.API.get('/dashboard/top-fish/?limit=5');
        if (fishTypeData) {
            DashboardPage.renderFishTypeChart(fishTypeData);
        }
    },
    
    // Render sales trend chart
    renderSalesTrendChart: (data) => {
        const labels = data.map(d => window.Utils.formatDate(d.date));
        const revenues = data.map(d => parseFloat(d.revenue || 0));
        const profits = data.map(d => parseFloat(d.profit || 0));
        
        window.UI.renderChart('salesTrendChart', 'line', {
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
        }, {
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
        });
    },
    
    // Render fish type chart
    renderFishTypeChart: (data) => {
        const labels = data.map(d => d.batch__fish__name || 'Unknown');
        const revenues = data.map(d => parseFloat(d.total_revenue || 0));
        
        window.UI.renderChart('fishTypeChart', 'doughnut', {
            labels: labels,
            datasets: [{
                data: revenues,
                backgroundColor: [
                    '#0077b6', '#00b4d8', '#48cae4', '#90e0ef', '#caf0f8'
                ]
            }]
        });
    },
    
    // Load recent sales
loadRecentSales: async () => {
        const sales = await window.TradingAPI.sales.list({page_size: 5});
        const tbody = document.querySelector('.data-table tbody:nth-of-type(1)'); // Recent Sales
        if (!tbody) return;
        if (!sales || sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No recent sales</td></tr>';
            return;
        }
        tbody.innerHTML = sales.map(sale => `
            <tr>
                <td>${sale.invoice_number || '-'}</td>
                <td>${sale.buyer_name || '-'}</td>
                <td>${sale.fish_name || '-'}</td>
                <td>${sale.number_of_packages_sold || 0}</td>
                <td>${Trading.formatCurrency(sale.total_revenue)}</td>
                <td>${Trading.formatCurrency(sale.profit)}</td>
                <td>${Trading.formatDate(sale.date)}</td>
            </tr>
        `).join('');
    },

    loadRecentPurchases: async () => {
        const purchases = await window.TradingAPI.purchases.list({page_size: 5});
        const tbody2 = document.querySelector('.data-table tbody:nth-of-type(2)'); // Recent Purchases
        if (!tbody2) return;
        if (!purchases || purchases.length === 0) {
            tbody2.innerHTML = '<tr><td colspan="6" class="text-center">No recent purchases</td></tr>';
            return;
        }
        tbody2.innerHTML = purchases.map(p => `
            <tr>
                <td>${p.batch_number || '-'}</td>
                <td>${p.fish_name || '-'}</td>
                <td>${p.supplier_name || '-'}</td>
                <td>${p.number_of_packages || 0}</td>
                <td>${Trading.formatCurrency(p.total_expense)}</td>
                <td>${Trading.formatDate(p.date)}</td>
            </tr>
        `).join('');
    },
    
    // Load inventory alerts
    loadInventoryAlerts: async () => {
        const inventoryData = await window.API.get('/dashboard/inventory-overview/');
        
        const tbody = document.getElementById('inventoryAlertsTable');
        if (!tbody) return;
        
        if (!inventoryData || !inventoryData.expiring_batches || inventoryData.expiring_batches.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No alerts</td></tr>';
            return;
        }
        
        tbody.innerHTML = inventoryData.expiring_batches.map(inv => `
            <tr>
                <td>${inv.fish__name || '-'}</td>
                <td>${inv.purchase_batch__batch_number || '-'}</td>
                <td>${inv.remaining_packages || 0}</td>
                <td>${window.Utils.formatDate(inv.expiry_date)}</td>
                <td><span class="status-badge pending">Expiring Soon</span></td>
            </tr>
        `).join('');
    }
};

// Page loader
window.App.pageLoaders.dashboard = () => DashboardPage.init();

// Export
window.DashboardPage = DashboardPage;

