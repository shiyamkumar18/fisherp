// Fish ERP - Accounts Page Module

const AccountsPage = {
    init: async () => {
        await Promise.all([
            AccountsPage.loadSummary(),
            AccountsPage.loadLedger(),
        ]);
    },

    loadSummary: async () => {
        const [financial, cashflow, pending] = await Promise.all([
            window.API.get('/dashboard/financial-overview/'),
            window.API.get('/dashboard/payment-cashflow/'),
            window.API.get('/dashboard/pending-payments/'),
        ]);

        const revenue = Number(cashflow?.total_received || financial?.today_sales || 0);
        const expenses = Number(cashflow?.total_made || financial?.today_purchases || 0);
        const profit = Number(financial?.today_profit || revenue - expenses);
        const pendingAmount = Array.isArray(pending)
            ? pending.reduce((sum, row) => sum + Number(row.pending_amount || row.amount || 0), 0)
            : 0;

        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = window.Utils.formatCurrency(value);
        };

        setValue('accountsRevenue', revenue);
        setValue('accountsExpenses', expenses);
        setValue('accountsProfit', profit);
        setValue('accountsPending', pendingAmount);
    },

    loadLedger: async () => {
        const tbody = document.getElementById('accountsLedgerTable');
        if (!tbody) return;

        const [payments, pending] = await Promise.all([
            window.API.get('/trading/payments/'),
            window.API.get('/dashboard/pending-payments/'),
        ]);

        const paymentRows = (Array.isArray(payments) ? payments : []).map((row) => ({
            date: row.date,
            type: row.payment_type === 'purchase' ? 'Expense' : 'Revenue',
            amount: Number(row.amount || 0),
            notes: row.notes || row.reference_number || row.receipt_number || '-',
        }));

        const pendingRows = (Array.isArray(pending) ? pending : []).map((row) => ({
            date: row.due_date || row.date,
            type: 'Pending',
            amount: Number(row.pending_amount || row.amount || 0),
            notes: row.invoice_number || row.receipt_number || row.buyer_name || row.supplier_name || '-',
        }));

        const allRows = [...paymentRows, ...pendingRows]
            .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
            .slice(0, 15);

        if (!allRows.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No ledger entries found</td></tr>';
            return;
        }

        tbody.innerHTML = allRows
            .map(
                (row) => `
                <tr>
                    <td>${window.Utils.formatDate(row.date)}</td>
                    <td>${row.type}</td>
                    <td>${window.Utils.formatCurrency(row.amount)}</td>
                    <td>${row.notes}</td>
                </tr>
            `
            )
            .join('');
    },
};

window.AccountsPage = AccountsPage;
