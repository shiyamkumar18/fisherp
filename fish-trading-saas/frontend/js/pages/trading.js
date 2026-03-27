const Trading = {
    init: function() {
        console.log("Trading module initialized");
        this.loadBuyers();
    },

    // Common helpers
showLoading: function(tableId) {
        const tableBody = document.getElementById(tableId);
        if (tableBody) tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="shimmer-row">
                    <div class="shimmer"></div>
                </td>
            </tr>
            <tr>
                <td colspan="7" class="shimmer-row">
                    <div class="shimmer"></div>
                </td>
            </tr>
            <tr>
                <td colspan="7" class="shimmer-row">
                    <div class="shimmer"></div>
                </td>
            </tr>
        `;
    },

    showEmpty: function(tableId) {
        const tableBody = document.getElementById(tableId);
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No data found.</td></tr>';
    },

    showError: function(tableId, msg) {
        const tableBody = document.getElementById(tableId);
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error: ' + (msg || 'Unknown') + '</td></tr>';
    },

    formatCurrency: function(val) {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
    },

    formatDate: function(dateStr) {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-IN');
    },

    capitalize: function(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    // Buyers
    loadBuyers: async function() {
        this.showLoading('buyerTable');
        try {
            const buyers = await window.TradingAPI.buyers.list();
            const tableBody = document.getElementById('buyerTable');
            if (!buyers || buyers.length === 0) {
                this.showEmpty('buyerTable');
                return;
            }
            tableBody.innerHTML = buyers.map(buyer => `
                <tr>
                    <td>${buyer.name || ''}</td>
                    <td>${buyer.phone_number || ''}</td>
                    <td>${buyer.buyer_type || ''}</td>
                    <td>${this.formatCurrency(buyer.credit_limit)}</td>
                    <td>${this.formatCurrency(buyer.balance)}</td>
                    <td><span class="status-badge status-${buyer.is_active ? 'active' : 'inactive'}">${buyer.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn-icon" onclick="Trading.showEditBuyerModal(${buyer.id})" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon danger" onclick="Trading.deleteBuyer(${buyer.id})" title="Delete"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Buyers load error:', error);
            this.showError('buyerTable', window.API.lastError?.detail || error.message);
        }
    },

    showAddBuyerModal: function() {
        document.getElementById('buyerModalTitle').textContent = 'Add New Buyer';
        document.getElementById('buyerForm').reset();
        document.getElementById('buyerModal').style.display = 'flex';
    },

    showEditBuyerModal: async function(buyerId) {
        try {
            const buyer = await window.TradingAPI.buyers.detail(buyerId);
            document.getElementById('buyerModalTitle').textContent = 'Edit Buyer';
            const form = document.getElementById('buyerForm');
            form.querySelector('[name="id"]').value = buyer.id;
            form.querySelector('[name="name"]').value = buyer.name || '';
            form.querySelector('[name="phone"]').value = buyer.phone_number || '';
            form.querySelector('[name="email"]').value = buyer.email || '';
            form.querySelector('[name="buyer_type"]').value = buyer.buyer_type || 'retail';
            form.querySelector('[name="credit_limit"]').value = buyer.credit_limit || '';
            form.querySelector('[name="is_active"]').checked = buyer.is_active !== false;
            document.getElementById('buyerModal').style.display = 'flex';
        } catch (error) {
            alert('Error loading buyer: ' + (window.API.lastError?.detail || error.message));
        }
    },

    closeBuyerModal: function() {
        document.getElementById('buyerModal').style.display = 'none';
    },

    saveBuyer: async function() {
        const form = document.getElementById('buyerForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.is_active = form.querySelector('[name="is_active"]').checked;
        data.credit_limit = parseFloat(data.credit_limit) || 0;
        const id = data.id;
        delete data.id;
        try {
            if (id) {
                await window.TradingAPI.buyers.update(id, data);
            } else {
                await window.TradingAPI.buyers.create(data);
            }
            this.closeBuyerModal();
            this.loadBuyers();
        } catch (error) {
            alert('Save error: ' + (window.API.lastError?.detail || error.message));
        }
    },

    deleteBuyer: async function(buyerId) {
        if (!confirm('Delete buyer?')) return;
        try {
            await window.TradingAPI.buyers.destroy(buyerId);
            this.loadBuyers();
        } catch (error) {
            alert('Delete error: ' + (window.API.lastError?.detail || error.message));
        }
    },

    // Suppliers
    loadSuppliers: async function() {
        this.showLoading('supplierTable');
        try {
            const suppliers = await window.TradingAPI.suppliers.list();
            const tableBody = document.getElementById('supplierTable');
            if (!suppliers || suppliers.length === 0) {
                this.showEmpty('supplierTable');
                return;
            }
            tableBody.innerHTML = suppliers.map(sup => `
                <tr>
                    <td>${sup.name || ''}</td>
                    <td>${sup.phone || ''}</td>
                    <td>${sup.supplier_type || ''}</td>
                    <td>${sup.place_of_origin || ''}</td>
                    <td>${this.formatCurrency(sup.outstanding || 0)}</td>
                    <td><span class="status-badge status-${sup.is_active ? 'active' : 'inactive'}">${sup.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn-icon" onclick="Trading.editSupplier(${sup.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon danger" onclick="Trading.deleteSupplier(${sup.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            this.showError('supplierTable', window.API.lastError?.detail || error.message);
        }
    },

    editSupplier: async function(id) {
        try {
            const sup = await window.TradingAPI.suppliers.detail(id);
            Forms.showEditSupplierModal(sup);
        } catch (error) {
            alert('Error');
        }
    },

    deleteSupplier: async function(id) {
        if (confirm('Delete?')) {
            try {
                await window.TradingAPI.suppliers.destroy(id);
                this.loadSuppliers();
            } catch (error) {
                alert('Error');
            }
        }
    },

    // Sales
    loadSales: async function() {
        this.showLoading('salesTableBody');
        try {
            const sales = await window.TradingAPI.sales.list();
            const tableBody = document.getElementById('salesTableBody');
            if (!sales || sales.length === 0) {
                this.showEmpty('salesTableBody');
                return;
            }
            tableBody.innerHTML = sales.map(sale => `
                <tr>
                    <td>${sale.invoice_number || ''}</td>
                    <td>${sale.buyer_name || ''}</td>
                    <td>${sale.fish_name || ''}</td>
                    <td>${sale.number_of_packages_sold || 0}</td>
                    <td>${this.formatCurrency(sale.total_revenue)}</td>
                    <td>${this.formatCurrency(sale.profit)}</td>
                    <td><span class="status-badge ${sale.payment_status || 'pending'}">${sale.payment_status || 'Pending'}</span></td>
                    <td>
                        <button onclick="Trading.editSale(${sale.id})" class="btn-icon"><i class="fas fa-edit"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            this.showError('salesTableBody', window.API.lastError?.detail || error.message);
        }
    },

    editSale: async function(id) {
        Forms.showAddSaleModal(); // Edit modal stub
    },

    // Purchases
    loadPurchases: async function() {
        this.showLoading('purchasesTableBody');
        try {
            const purchases = await window.TradingAPI.purchases.list();
            const tableBody = document.getElementById('purchasesTableBody');
            if (!purchases || purchases.length === 0) {
                this.showEmpty('purchasesTableBody');
                return;
            }
            tableBody.innerHTML = purchases.map(p => `
                <tr>
                    <td>${p.batch_number || ''}</td>
                    <td>${p.supplier_name || ''}</td>
                    <td>${p.fish_name || ''}</td>
                    <td>${p.number_of_packages || 0}</td>
                    <td>${this.formatCurrency(p.total_cost)}</td>
                    <td>${this.formatDate(p.created_at)}</td>
                    <td><span class="status-badge stock">${p.remaining_packages > 0 ? 'Stock' : 'Sold'}</span></td>
                    <td><button onclick="Trading.editPurchase(${p.id})" class="btn-icon"><i class="fas fa-edit"></i></button></td>
                </tr>
            `).join('');
        } catch (error) {
            this.showError('purchasesTableBody', window.API.lastError?.detail || error.message);
        }
    },

    editPurchase: async function(id) {
        Forms.showAddPurchaseModal(); // Edit stub
    },

    // Inventory
    loadInventory: async function() {
        this.showLoading('inventoryTableBody');
        try {
            const inventory = await window.TradingAPI.inventory.list();
            const tableBody = document.getElementById('inventoryTableBody');
            if (!inventory || inventory.length === 0) {
                this.showEmpty('inventoryTableBody');
                return;
            }
            tableBody.innerHTML = inventory.map(item => `
                <tr>
                    <td>${item.fish_name || ''}</td>
                    <td>${item.remaining_packages || 0}</td>
                    <td>${item.weight_kg || 'N/A'}</td>
                    <td><span class="status-badge ${item.remaining_packages < 10 ? 'low' : 'good'}">${item.status || 'Stock'}</span></td>
                    <td>${this.formatDate(item.expiry_date)}</td>
                    <td>${this.formatCurrency(item.value)}</td>
                    <td><button class="btn-icon" onclick="Trading.adjustInventory(${item.id})"><i class="fas fa-edit"></i></button></td>
                </tr>
            `).join('');
        } catch (error) {
            this.showError('inventoryTableBody', window.API.lastError?.detail || error.message);
        }
    },

adjustInventory: function(id) {
        showModal('Adjust Inventory', '<p>Adjust quantity form here</p>');
    },

    // Payments
    paymentsPage: 1,
    paymentsSearch: '',
    paymentsTotalPages: 1,

    loadPayments: async function() {
        const params = {
            page: this.paymentsPage,
            search: this.paymentsSearch,
            page_size: 20
        };
        const tableId = 'paymentsTable';
        this.showLoading(tableId);
        try {
            const data = await window.TradingAPI.payments.list(params);
            const payments = Array.isArray(data) ? data : (data.results || []);
            const tableBody = document.getElementById(tableId);
            if (!payments || payments.length === 0) {
                this.showEmpty(tableId);
                return;
            }
            tableBody.innerHTML = payments.map(p => `
                <tr>
                    <td>${this.formatDate(p.date)}</td>
                    <td>${p.payment_type_display || p.payment_type || 'N/A'}</td>
                    <td>${p.supplier ? p.supplier.name : (p.buyer ? p.buyer.name : (p.purchase_batch ? p.purchase_batch.batch_number : 'N/A')) || 'N/A'}</td>
                    <td>${this.formatCurrency(p.amount)}</td>
                    <td>${p.payment_mode_display || p.payment_mode || 'N/A'}</td>
                    <td><span class="status-badge status-${p.approval_status || 'pending'}">${p.approval_status_display || p.approval_status || 'Pending'}</span></td>
                    <td>
                        <button class="btn-icon" onclick="Trading.editPayment(${p.id})" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon danger" onclick="Trading.deletePayment(${p.id})" title="Delete"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
            this.updatePaymentsPagination(data.count || payments.length);
        } catch (error) {
            console.error('Payments load error:', error);
            this.showError(tableId, window.API.lastError?.detail || error.message);
        }
    },

    onPaymentsSearch: function() {
        this.paymentsSearch = document.getElementById('paymentsSearch').value;
        this.paymentsPage = 1;
        this.loadPayments();
    },

    prevPaymentsPage: function() {
        if (this.paymentsPage > 1) {
            this.paymentsPage--;
            this.loadPayments();
        }
    },

    nextPaymentsPage: function() {
        if (this.paymentsPage < this.paymentsTotalPages) {
            this.paymentsPage++;
            this.loadPayments();
        }
    },

    updatePaymentsPagination: function(totalCount) {
        this.paymentsTotalPages = Math.ceil(totalCount / 20);
        document.getElementById('paymentsPageInfo').textContent = `Page ${this.paymentsPage} of ${this.paymentsTotalPages}`;
        document.getElementById('prevPayments').disabled = this.paymentsPage === 1;
        document.getElementById('nextPayments').disabled = this.paymentsPage >= this.paymentsTotalPages;
    },

    showAddPaymentModal: function() {
        showModal('Record Payment', `
            <form id="paymentForm">
                <div class="form-group">
                    <label>Type</label>
                    <select name="payment_type" class="form-select">
                        <option value="sale">Sale Payment</option>
                        <option value="purchase">Purchase Payment</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Amount</label>
                    <input type="number" name="amount" class="form-input" step="0.01" required>
                </div>
                <div class="form-group">
                    <label>Method</label>
                    <select name="payment_mode" class="form-select">
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <input type="date" name="date" class="form-input" required>
                </div>
                <div class="form-group">
                    <label>Reference</label>
                    <input type="text" name="reference_number" class="form-input">
                </div>
            </form>
            <script>
            document.getElementById('paymentForm').onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData);
                data.amount = parseFloat(data.amount);
                try {
                    await window.TradingAPI.payments.create(data);
                    Trading.closePaymentModal();
                    Trading.loadPayments();
                } catch (error) {
                    alert('Error: ' + error.message);
                }
            };
            </script>
        `, () => document.getElementById('paymentForm')?.onsubmit());
    },

    editPayment: async function(id) {
        // Stub - load detail and populate form
        alert('Edit payment stub');
    },

    deletePayment: async function(id) {
        if (confirm('Delete payment?')) {
            try {
                await window.TradingAPI.payments.destroy(id);
                Trading.loadPayments();
            } catch (error) {
                alert('Delete error');
            }
        }
    },

    closePaymentModal: function() {
        closeModal();
    }
};

window.App.pageLoaders.buyers = () => Trading.loadBuyers();
window.App.pageLoaders.payments = () => Trading.loadPayments();
['suppliers', 'sales', 'purchases', 'inventory'].forEach(page => {
    window.App.pageLoaders[page] = () => Trading['load' + Trading.capitalize(page)]();
});
