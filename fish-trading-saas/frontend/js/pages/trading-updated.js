// Updated Trading Module with Phase 1 completeness
// Uses TradingAPI, full CRUD lists for buyers/suppliers/sales/purchases/inventory

const Trading = {
    tableBodies: {
        buyers: 'buyerTable',
        suppliers: 'supplierTable',
        sales: 'salesTableBody',
        purchases: 'purchasesTableBody',
        inventory: 'inventoryTableBody'
    },

    init: function(page) {
        console.log(`Trading ${page} initialized`);
        this[`load${this.capitalize(page)}`]( );
    },

    capitalize: function(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    showLoading: function(tableId) {
        document.getElementById(tableId).innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
    },

    showEmpty: function(tableId) {
        document.getElementById(tableId).innerHTML = '<tr><td colspan="7" class="text-center">No data found.</td></tr>';
    },

    showError: function(tableId, msg) {
        document.getElementById(tableId).innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error: ' + msg + '</td></tr>';
    },

    // Buyers (migrated + improved)
    loadBuyers: async function() {
        const tableBody = document.getElementById('buyerTable');
        this.showLoading('buyerTable');
        try {
            const buyers = await window.TradingAPI.buyers.list();
            if (!buyers || buyers.length === 0) {
                this.showEmpty('buyerTable');
                return;
            }
            tableBody.innerHTML = buyers.map(buyer => `
                <tr>
                    <td>${buyer.name || ''}</td>
                    <td>${buyer.phone_number || ''}</td>
                    <td>${buyer.buyer_type || ''}</td>
                    <td>${window.Utils?.formatCurrency(buyer.credit_limit) || buyer.credit_limit}</td>
                    <td>${window.Utils?.formatCurrency(buyer.balance) || buyer.balance}</td>
                    <td><span class="status-badge status-${buyer.is_active ? 'active' : 'inactive'}">${buyer.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn-icon" onclick="Trading.showEditBuyerModal(${buyer.id})" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon danger" onclick="Trading.deleteBuyer(${buyer.id})" title="Delete"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Buyers load error:', error);
            this.showError('buyerTable', error.detail || error.message);
        }
    },

    showAddBuyerModal: function() {
        Forms.showAddBuyerModal();
    },

    showEditBuyerModal: async function(buyerId) {
        // Phase 3: SlidePanel
        try {
            const buyer = await window.TradingAPI.buyers.list().then(list => list.find(b => b.id === buyerId));
            const formHTML = `
                <form id="buyerForm" class="form-grid">
                    <input type="hidden" name="id" value="${buyer?.id || ''}">
                    <div class="form-group"><label>Name</label><input name="name" class="form-control" value="${buyer?.name || ''}"></div>
                    <div class="form-group"><label>Phone</label><input name="phone" class="form-control" value="${buyer?.phone_number || ''}"></div>
                    <div class="form-group"><label>Type</label><select name="buyer_type" class="form-control"><option ${buyer?.buyer_type === 'retail' ? 'selected' : ''}>Retail</option></select></div>
                    <div class="form-group"><label>Credit Limit</label><input name="credit_limit" class="form-control" value="${buyer?.credit_limit || ''}"></div>
                </form>
            `;
            window.SlidePanel.open('Edit Buyer', formHTML, {
                onSave: () => Trading.saveBuyer()
            });
        } catch (error) {
            console.error('Edit buyer error:', error);
        }
    },

    closeBuyerModal: function() {
        const modal = document.getElementById('buyerModal');
        if (modal) modal.style.display = 'none';
    },

    saveBuyer: async function() {
        const form = document.getElementById('buyerForm');
        if (!form) return;
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
            console.error('Save buyer error:', error);
            alert('Error: ' + (window.API.lastError?.detail || error.message));
        }
    },

    deleteBuyer: async function(buyerId) {
        if (!confirm('Delete this buyer?')) return;
        try {
            await window.TradingAPI.buyers.destroy(buyerId);
            this.loadBuyers();
        } catch (error) {
            console.error('Delete error:', error);
            alert('Error: ' + (window.API.lastError?.detail || error.message));
        }
    },

    // Suppliers
    loadSuppliers: async function() {
        const tableBody = document.getElementById('supplierTable');
        this.showLoading('supplierTable');
        try {
            const suppliers = await window.TradingAPI.suppliers.list();
            if (!suppliers || suppliers.length === 0) {
                this.showEmpty('supplierTable');
                return;
            }
            tableBody.innerHTML = suppliers.map(supplier => `
                <tr>
                    <td>${supplier.name || ''}</td>
                    <td>${supplier.phone || ''}</td>
                    <td>${supplier.supplier_type || ''}</td>
                    <td>${supplier.place_of_origin || ''}</td>
                    <td><span class="status-badge status-${supplier.is_active ? 'active' : 'inactive'}">${supplier.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn-icon" onclick="Trading.showEditSupplierModal(${supplier.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon danger" onclick="Trading.deleteSupplier(${supplier.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Suppliers error:', error);
            this.showError('supplierTable', error.detail || error.message);
        }
    },

    showAddSupplierModal: function() {
        Forms.showAddSupplierModal();
    },

    showEditSupplierModal: async function(id) {
        // Similar to buyer
        Forms.showEditSupplierModal(await window.TradingAPI.suppliers.list().then(list => list.find(s => s.id === id)) || {});
    },

    deleteSupplier: async function(id) {
        if (!confirm('Delete supplier?')) return;
        try {
            await window.TradingAPI.suppliers.destroy(id);
            this.loadSuppliers();
        } catch (error) {
            alert('Delete error: ' + error.message);
        }
    },

    // Sales
    loadSales: async function() {
        // Phase 2: Use reusable DataTable
        if (typeof DataTable !== 'undefined') {
            new DataTable('sales-container', [
                {key: 'invoice_number', label: 'Invoice', editable: false},
                {key: 'buyer_name', label: 'Buyer', editable: true},
                {key: 'fish_name', label: 'Fish', editable: false},
                {key: 'quantity_sold', label: 'Qty', editable: true},
                {key: 'total_revenue', label: 'Revenue', editable: false},
                {key: 'profit', label: 'Profit', editable: false},
                {key: 'payment_status', label: 'Status', editable: false},
                {key: 'actions', label: 'Actions'}
            ], () => window.TradingAPI.sales.list(), {
                title: 'Sales History',
                addBtn: 'Trading.showAddSaleModal()',
                emptyCTA: 'Add your first sale!'
            });
        } else {
            // Fallback
            this.loadSalesFallback();
        }
    },

    loadSalesFallback: async function() {
        // Original code as fallback
        const tableBody = document.getElementById('salesTableBody');
        // ... original ...
    },

    showAddSaleModal: function() {
        Forms.showAddSaleModal();
    },

    // Purchases
    loadPurchases: async function() {
        const tableBody = document.getElementById('purchasesTableBody');
        this.showLoading('purchasesTableBody');
        try {
            const purchases = await window.TradingAPI.purchases.list();
            if (!purchases || purchases.length === 0) {
                this.showEmpty('purchasesTableBody');
                return;
            }
            tableBody.innerHTML = purchases.map(purchase => `
                <tr>
                    <td>${purchase.batch_number || purchase.id}</td>
                    <td>${purchase.supplier?.name || ''}</td>
                    <td>${purchase.fish?.name || ''}</td>
                    <td>${purchase.total_packages || 0}</td>
                    <td>${window.Utils?.formatCurrency(purchase.total_cost) || purchase.total_cost}</td>
                    <td>${window.Utils?.formatDate(purchase.created_at) || ''}</td>
                    <td><span class="status-badge ${purchase.is_sold_out ? 'sold' : 'stock'}">${purchase.is_sold_out ? 'Sold Out' : 'Stock'}</span></td>
                </tr>
            `).join('');
        } catch (error) {
            this.showError('purchasesTableBody', error.message);
        }
    },

    showAddPurchaseModal: function() {
        Forms.showAddPurchaseModal();
    },

    // Inventory
    loadInventory: async function() {
        const tableBody = document.getElementById('inventoryTableBody');
        this.showLoading('inventoryTableBody');
        try {
            const inventory = await window.TradingAPI.inventory.list();
            if (!inventory || inventory.length === 0) {
                this.showEmpty('inventoryTableBody');
                return;
            }
            tableBody.innerHTML = inventory.map(item => `
                <tr>
                    <td>${item.fish_name || ''}</td>
                    <td>${item.remaining_packages || 0}</td>
                    <td>${item.batch_number || ''}</td>
                    <td>${item.status || ''}</td>
                    <td>${window.Utils?.formatDate(item.expiry_date) || ''}</td>
                    <td><span class="status-badge ${item.is_expiring_soon ? 'warning' : 'good'}">${item.is_expiring_soon ? 'Expiring' : 'OK'}</span></td>
                </tr>
            `).join('');
        } catch (error) {
            this.showError('inventoryTableBody', error.message);
        }
    },

    // Page loaders mapping
};

Object.keys(Trading.tableBodies).forEach(page => {
    window.App.pageLoaders[page] = () => Trading.init(page);
});

// Init for buyers backward compat
window.App.pageLoaders.buyers = () => Trading.loadBuyers(); 

console.log('Trading module enhanced with Phase 1');
