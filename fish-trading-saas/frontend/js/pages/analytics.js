// Fish ERP - Analytics Page Module

const AnalyticsPage = {
    init: () => {
        AnalyticsPage.loadData();
    },
    
    loadData: async () => {
        await Promise.all([
            AnalyticsPage.loadKPIs(),
            AnalyticsPage.loadCharts(),
            AnalyticsPage.loadTables()
        ]);
    },
    
    loadKPIs: async () => {
        const overview = await window.API.get('/dashboard/overview/');
        if (overview) {
            const revenue = parseFloat(overview.current_year?.total_sales_amount || 0);
            const profit = parseFloat(overview.current_year?.total_profit || 0);
            const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;
            
            document.getElementById('monthlyRevenueAnalytics').textContent = window.Utils.formatCurrency(revenue);
            document.getElementById('profitMarginAnalytics').textContent = margin + '%';
        }
        
        const cashflow = await window.API.get('/dashboard/payment-cashflow/');
        if (cashflow) {
            document.getElementById('cashInflow').textContent = window.Utils.formatCurrency(cashflow.total_received || 0);
            document.getElementById('cashOutflow').textContent = window.Utils.formatCurrency(cashflow.total_made || 0);
        }
    },
    
    loadCharts: async () => {
        // Profit margin trend
        const profitTrend = await window.API.get('/dashboard/profit-margin-trend/');
        if (profitTrend) {
            AnalyticsPage.renderProfitTrendChart(profitTrend);
        }
        
        // Sales by payment method
        const paymentMethod = await window.API.get('/dashboard/sales-by-payment/');
        if (paymentMethod) {
            AnalyticsPage.renderPaymentMethodChart(paymentMethod);
        }
    },
    
    loadTables: async () => {
        // Profit by purchase type
        const profitByType = await window.API.get('/dashboard/profit/by-purchase-type/');
        AnalyticsPage.renderProfitByType(profitByType);
        
        // Credit customers
        const creditCustomers = await window.API.get('/dashboard/credit-customers/');
        AnalyticsPage.renderCreditCustomers(creditCustomers);
        
        // Pending payments
        const pendingPayments = await window.API.get('/dashboard/pending-payments/');
        AnalyticsPage.renderPendingPayments(pendingPayments);
    },
    
    renderProfitTrendChart: (data) => {
        const labels = data.map(d => d.month || d.date);
        const profits = data.map(d => parseFloat(d.profit || 0));
        
        window.UI.renderChart('profitTrendChart', 'line', {
            labels: labels,
            datasets: [{
                label: 'Profit',
                data: profits,
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                fill: true,
                tension: 0.4
            }]
        });
    },
    
    renderPaymentMethodChart: (data) => {
        const labels = data.map(d => d.payment_mode || 'Unknown');
        const amounts = data.map(d => parseFloat(d.total || 0));
        
        window.UI.renderChart('paymentMethodChart', 'pie', {
            labels: labels,
            datasets: [{
                data: amounts,
                backgroundColor: ['#0077b6', '#00b4d8', '#48cae4', '#90e0ef']
            }]
        });
    },
    
    renderProfitByType: (data) => {
        const tbody = document.getElementById('profitByTypeTable');
        if (!tbody) return;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="text-center">No data</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${item.purchase_type || 'Unknown'}</td>
                <td>${window.Utils.formatCurrency(item.total_profit)}</td>
            </tr>
        `).join('');
    },
    
    renderCreditCustomers: (data) => {
        const tbody = document.getElementById('creditCustomersTable');
        if (!tbody) return;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="text-center">No data</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${item.buyer__name || item.name || 'Unknown'}</td>
                <td>${window.Utils.formatCurrency(item.credit_balance || 0)}</td>
            </tr>
        `).join('');
    },
    
    renderPendingPayments: (data) => {
        const tbody = document.getElementById('pendingPaymentsTable');
        if (!tbody) return;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No pending payments</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.slice(0, 5).map(payment => `
            <tr>
                <td>${payment.invoice_number || payment.receipt_number || 'N/A'}</td>
                <td>${payment.buyer_name || payment.supplier_name || 'N/A'}</td>
                <td>${window.Utils.formatCurrency(payment.amount)}</td>
                <td>${window.Utils.formatDate(payment.due_date)}</td>
                <td><span class="status-badge pending">Pending</span></td>
            </tr>
        `).join('');
    }
};

window.AnalyticsPage = AnalyticsPage;

