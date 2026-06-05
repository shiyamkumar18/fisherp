// Fish ERP - Dashboard Page Module

const DashboardPage = {
    _plrPeriod: 'day',

    // Initialize dashboard
    init: () => {
        DashboardPage.loadData();
        DashboardPage._bindToggles();
    },
    
    // Load dashboard data
    loadData: async () => {
        await Promise.all([
            DashboardPage.loadKPIs(),
            DashboardPage.loadCharts(),
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
    
    // ============================================================
    // CHART SYSTEM — MVP Charts
    // ============================================================

    loadCharts: async () => {
        await Promise.all([
            DashboardPage.loadProfitLossChart(),
            DashboardPage.loadSoldRemainingChart(),
            DashboardPage.loadDemandTrendChart(),
        ]);
    },

    // ---- Chart 1: Profit / Loss / Receivables (Stacked Bar) ----
    loadProfitLossChart: async () => {
        const period = DashboardPage._plrPeriod;
        const days = period === 'month' ? 180 : period === 'week' ? 56 : 30;
        const data = await window.API.get(`/dashboard/profit-loss-receivable/?days=${days}&period=${period}`);
        if (!data || !data.length) {
            DashboardPage._renderEmpty('profitLossChart', 'No profit/loss data yet');
            return;
        }
        DashboardPage.renderProfitLossChart(data);
    },

    renderProfitLossChart: (data) => {
        const labels = data.map(d => d.label);
        const profits = data.map(d => parseFloat(d.profit || 0));
        const losses = data.map(d => parseFloat(d.loss || 0));
        const receivables = data.map(d => parseFloat(d.receivable || 0));

        window.UI.renderChart('profitLossChart', 'bar', {
            labels,
            datasets: [
                {
                    label: 'Profit',
                    data: profits,
                    backgroundColor: '#22c55e',
                    borderRadius: 4,
                },
                {
                    label: 'Loss',
                    data: losses,
                    backgroundColor: '#ef4444',
                    borderRadius: 4,
                },
                {
                    label: 'Receivable',
                    data: receivables,
                    backgroundColor: '#f59e0b',
                    borderRadius: 4,
                }
            ]
        }, {
            scales: {
                x: { stacked: true },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) { return '₹' + value.toLocaleString(); }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(ctx) { return ctx.dataset.label + ': ₹' + ctx.parsed.y.toLocaleString(); }
                    }
                }
            }
        });
    },

    // ---- Chart 2: Sold vs Remaining (Horizontal Stacked Bar) ----
    loadSoldRemainingChart: async () => {
        const data = await window.API.get('/dashboard/sold-vs-remaining/');
        if (!data || !data.length) {
            DashboardPage._renderEmpty('soldRemainingChart', 'No inventory data yet');
            return;
        }
        DashboardPage.renderSoldRemainingChart(data);
    },

    renderSoldRemainingChart: (data) => {
        const labels = data.map(d => d.product);
        const sold = data.map(d => d.sold || 0);
        const remaining = data.map(d => d.remaining || 0);

        window.UI.renderChart('soldRemainingChart', 'bar', {
            labels,
            datasets: [
                {
                    label: 'Sold',
                    data: sold,
                    backgroundColor: '#0077b6',
                    borderRadius: 4,
                },
                {
                    label: 'Remaining',
                    data: remaining,
                    backgroundColor: '#90e0ef',
                    borderRadius: 4,
                }
            ]
        }, {
            indexAxis: 'y',
            scales: {
                x: { stacked: true, beginAtZero: true },
                y: { stacked: true }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(ctx) { return ctx.dataset.label + ': ' + ctx.parsed.x + ' pkg'; }
                    }
                }
            }
        });
    },

    // ---- Chart 3: Fish Demand Trend (Multi-Line) ----
    loadDemandTrendChart: async () => {
        const data = await window.API.get('/dashboard/fish-demand-trend/?days=14&limit=5');
        if (!data || !data.length) {
            DashboardPage._renderEmpty('demandTrendChart', 'No demand data yet');
            return;
        }
        DashboardPage.renderDemandTrendChart(data);
    },

    renderDemandTrendChart: (data) => {
        // Pivot: group by product, build one dataset per fish
        const palette = ['#0077b6', '#00b4d8', '#ff6b6b', '#f59e0b', '#8b5cf6'];
        const productMap = {};
        const dateSet = new Set();

        data.forEach(row => {
            dateSet.add(row.date);
            if (!productMap[row.product]) productMap[row.product] = {};
            productMap[row.product][row.date] = row.sold_qty;
        });

        const dates = Array.from(dateSet).sort();
        const labels = dates.map(d => {
            const dt = new Date(d);
            return dt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        });

        const datasets = Object.keys(productMap).map((product, i) => ({
            label: product,
            data: dates.map(d => productMap[product][d] || 0),
            borderColor: palette[i % palette.length],
            backgroundColor: palette[i % palette.length] + '22',
            fill: false,
            tension: 0.4,
            pointRadius: 3,
        }));

        window.UI.renderChart('demandTrendChart', 'line', { labels, datasets }, {
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Packages sold' }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            }
        });
    },

    // ---- Toggle Binding for Profit/Loss period ----
    _bindToggles: () => {
        document.querySelectorAll('.plr-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.plr-toggle').forEach(b => {
                    b.style.background = 'transparent';
                    b.style.color = 'var(--text,#0F172A)';
                    b.classList.remove('active');
                });
                btn.style.background = 'var(--primary,#2563EB)';
                btn.style.color = '#fff';
                btn.classList.add('active');
                DashboardPage._plrPeriod = btn.dataset.period;
                DashboardPage.loadProfitLossChart();
            });
        });
    },

    // ---- Empty state helper ----
    _renderEmpty: (canvasId, message) => {
        window.UI.destroyChart(canvasId);
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '14px Manrope, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
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

