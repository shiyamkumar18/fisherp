// Fish ERP - Reports Page Module

const ReportsPage = {
    init: () => {
        ReportsPage.loadData();
    },
    
    loadData: async () => {
        const results = await Promise.allSettled([
            ReportsPage.loadKPIs(),
            ReportsPage.loadTopBuyers()
        ]);

        if (results.some((result) => result.status === 'rejected')) {
            window.UI?.showAlert?.('Some report data failed to load. Please retry.', 'warning');
        }
    },
    
    loadKPIs: async () => {
        const overview = await window.API.get('/dashboard/overview/');
        
        if (overview) {
            const revenue = parseFloat(overview.current_year?.total_sales_amount || 0);
            const profit = parseFloat(overview.current_year?.total_profit || 0);
            const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;
            
            document.getElementById('monthlyRevenue').textContent = window.Utils.formatCurrency(revenue);
            document.getElementById('profitMargin').textContent = margin + '%';
            document.getElementById('inventoryValue').textContent = window.Utils.formatCurrency(overview.today?.inventory_value || 0);
        }
        
        const riskAlerts = await window.API.get('/dashboard/risk-alerts/');
        document.getElementById('riskAlerts').textContent = riskAlerts ? riskAlerts.length : 0;
    },
    
    loadTopBuyers: async () => {
        const topBuyers = await window.API.get('/dashboard/top-buyers/?limit=5');
        
        const tbody = document.getElementById('topBuyersTable');
        if (!tbody) return;
        
        if (!topBuyers || topBuyers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center">No data</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        topBuyers.forEach((buyer) => {
            const row = document.createElement('tr');

            const nameCell = document.createElement('td');
            nameCell.textContent = String(buyer.buyer__name || '-');
            row.appendChild(nameCell);

            const countCell = document.createElement('td');
            countCell.textContent = String(buyer.order_count || 0);
            row.appendChild(countCell);

            const revenueCell = document.createElement('td');
            revenueCell.textContent = window.Utils.formatCurrency(buyer.total_revenue);
            row.appendChild(revenueCell);

            tbody.appendChild(row);
        });
    }
};

window.ReportsPage = ReportsPage;

