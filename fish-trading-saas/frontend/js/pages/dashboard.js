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
            DashboardPage.loadCharts(),
            DashboardPage.loadRecentSales(),
            DashboardPage.loadInventoryAlerts()
        ]);
    },
    
    // Load KPI cards
    loadKPIs: async () => {
        const financialData = await window.API.get('/dashboard/financial-overview/');
        
        if (financialData) {
            document.getElementById('todaySales').textContent = window.Utils.formatCurrency(financialData.today_sales);
            document.getElementById('todayProfit').textContent = window.Utils.formatCurrency(financialData.today_profit);
            document.getElementById('todayPurchases').textContent = window.Utils.formatCurrency(financialData.today_purchases);
            document.getElementById('receivables').textContent = window.Utils.formatCurrency(financialData.outstanding_receivables);
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
        const sales = await window.API.get('/trading/sales/?limit=5');
        
        const tbody = document.getElementById('recentSalesTable');
        if (!tbody) return;
        
        if (!sales || sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No recent sales</td></tr>';
            return;
        }
        
        tbody.innerHTML = sales.slice(0, 5).map(sale => `
            <tr>
                <td>${sale.invoice_number || '-'}</td>
                <td>${sale.buyer_name || '-'}</td>
                <td>${sale.batch_fish_name || '-'}</td>
                <td>${window.Utils.formatCurrency(sale.total_revenue)}</td>
                <td>${window.Utils.formatCurrency(sale.profit)}</td>
                <td><span class="status-badge ${sale.payment_status}">${sale.payment_status || 'pending'}</span></td>
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

// Export to window
window.DashboardPage = DashboardPage;

