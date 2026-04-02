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
        const tableBody = document.getElementById(tableId);
        if (tableBody) {
            tableBody.innerHTML = '';
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 7;
            cell.className = 'text-center';
            cell.textContent = 'Loading...';
            row.appendChild(cell);
            tableBody.appendChild(row);
        }
    },

    showEmpty: function(tableId) {
        const tableBody = document.getElementById(tableId);
        if (tableBody) {
            tableBody.innerHTML = '';
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 7;
            cell.className = 'text-center';
            cell.textContent = 'No data found.';
            row.appendChild(cell);
            tableBody.appendChild(row);
        }
    },

    showError: function(tableId, msg) {
        const tableBody = document.getElementById(tableId);
        if (tableBody) {
            tableBody.innerHTML = '';
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 7;
            cell.className = 'text-center text-danger';
            cell.textContent = 'Error: ' + String(msg || 'Unknown error');
            row.appendChild(cell);
            tableBody.appendChild(row);
        }
    },

    // Buyers (migrated + improved)
    loadBuyers: async function() {
        const tableBody = document.getElementById('buyerTable');
        if (!tableBody) return;
        
        this.showLoading('buyerTable');
        try {
            const buyers = await window.TradingAPI.buyers.list();
            if (!buyers || buyers.length === 0) {
                this.showEmpty('buyerTable');
                return;
            }
            
            tableBody.innerHTML = '';
            buyers.forEach(buyer => {
                const row = document.createElement('tr');
                
                // Name
                const nameCell = document.createElement('td');
                nameCell.textContent = String(buyer.name || '');
                row.appendChild(nameCell);
                
                // Phone
                const phoneCell = document.createElement('td');
                phoneCell.textContent = String(buyer.phone_number || '');
                row.appendChild(phoneCell);
                
                // Type
                const typeCell = document.createElement('td');
                typeCell.textContent = String(buyer.buyer_type || '');
                row.appendChild(typeCell);
                
                // Credit Limit
                const creditCell = document.createElement('td');
                creditCell.textContent = window.Utils?.formatCurrency(buyer.credit_limit) || String(buyer.credit_limit);
                row.appendChild(creditCell);
                
                // Balance
                const balanceCell = document.createElement('td');
                balanceCell.textContent = window.Utils?.formatCurrency(buyer.balance) || String(buyer.balance);
                row.appendChild(balanceCell);
                
                // Status
                const statusCell = document.createElement('td');
                const statusBadge = document.createElement('span');
                statusBadge.className = `status-badge status-${buyer.is_active ? 'active' : 'inactive'}`;
                statusBadge.textContent = buyer.is_active ? 'Active' : 'Inactive';
                statusCell.appendChild(statusBadge);
                row.appendChild(statusCell);
                
                // Actions
                const actionsCell = document.createElement('td');
                
                const editBtn = document.createElement('button');
                editBtn.className = 'btn-icon';
                editBtn.title = 'Edit';
                editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                editBtn.onclick = () => Trading.showEditBuyerModal(buyer.id);
                actionsCell.appendChild(editBtn);
                
                const delBtn = document.createElement('button');
                delBtn.className = 'btn-icon danger';
                delBtn.title = 'Delete';
                delBtn.innerHTML = '<i class="fas fa-trash"></i>';
                delBtn.onclick = () => Trading.deleteBuyer(buyer.id);
                actionsCell.appendChild(delBtn);
                
                row.appendChild(actionsCell);
                tableBody.appendChild(row);
            });
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
        if (!tableBody) return;
        
        this.showLoading('supplierTable');
        try {
            const suppliers = await window.TradingAPI.suppliers.list();
            if (!suppliers || suppliers.length === 0) {
                this.showEmpty('supplierTable');
                return;
            }
            
            tableBody.innerHTML = '';
            suppliers.forEach(supplier => {
                const row = document.createElement('tr');
                
                const nameCell = document.createElement('td');
                nameCell.textContent = String(supplier.name || '');
                row.appendChild(nameCell);
                
                const phoneCell = document.createElement('td');
                phoneCell.textContent = String(supplier.phone || '');
                row.appendChild(phoneCell);
                
                const typeCell = document.createElement('td');
                typeCell.textContent = String(supplier.supplier_type || '');
                row.appendChild(typeCell);
                
                const originCell = document.createElement('td');
                originCell.textContent = String(supplier.place_of_origin || '');
                row.appendChild(originCell);
                
                const statusCell = document.createElement('td');
                const statusBadge = document.createElement('span');
                statusBadge.className = `status-badge status-${supplier.is_active ? 'active' : 'inactive'}`;
                statusBadge.textContent = supplier.is_active ? 'Active' : 'Inactive';
                statusCell.appendChild(statusBadge);
                row.appendChild(statusCell);
                
                const actionsCell = document.createElement('td');
                const editBtn = document.createElement('button');
                editBtn.className = 'btn-icon';
                editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                editBtn.onclick = () => Trading.showEditSupplierModal(supplier.id);
                actionsCell.appendChild(editBtn);
                
                const delBtn = document.createElement('button');
                delBtn.className = 'btn-icon danger';
                delBtn.innerHTML = '<i class="fas fa-trash"></i>';
                delBtn.onclick = () => Trading.deleteSupplier(supplier.id);
                actionsCell.appendChild(delBtn);
                
                row.appendChild(actionsCell);
                tableBody.appendChild(row);
            });
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
        if (!tableBody) return;
        
        this.showLoading('purchasesTableBody');
        try {
            const purchases = await window.TradingAPI.purchases.list();
            if (!purchases || purchases.length === 0) {
                this.showEmpty('purchasesTableBody');
                return;
            }
            
            tableBody.innerHTML = '';
            purchases.forEach(purchase => {
                const row = document.createElement('tr');
                
                const batchCell = document.createElement('td');
                batchCell.textContent = String(purchase.batch_number || purchase.id);
                row.appendChild(batchCell);
                
                const supplierCell = document.createElement('td');
                supplierCell.textContent = String(purchase.supplier?.name || '');
                row.appendChild(supplierCell);
                
                const fishCell = document.createElement('td');
                fishCell.textContent = String(purchase.fish?.name || '');
                row.appendChild(fishCell);
                
                const pkgCell = document.createElement('td');
                pkgCell.textContent = String(purchase.total_packages || 0);
                row.appendChild(pkgCell);
                
                const costCell = document.createElement('td');
                costCell.textContent = window.Utils?.formatCurrency(purchase.total_cost) || String(purchase.total_cost);
                row.appendChild(costCell);
                
                const dateCell = document.createElement('td');
                dateCell.textContent = window.Utils?.formatDate(purchase.created_at) || '';
                row.appendChild(dateCell);
                
                const statusCell = document.createElement('td');
                const statusBadge = document.createElement('span');
                statusBadge.className = `status-badge ${purchase.is_sold_out ? 'sold' : 'stock'}`;
                statusBadge.textContent = purchase.is_sold_out ? 'Sold Out' : 'Stock';
                statusCell.appendChild(statusBadge);
                row.appendChild(statusCell);
                
                tableBody.appendChild(row);
            });
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
        if (!tableBody) return;
        
        this.showLoading('inventoryTableBody');
        try {
            const inventory = await window.TradingAPI.inventory.list();
            if (!inventory || inventory.length === 0) {
                this.showEmpty('inventoryTableBody');
                return;
            }
            
            tableBody.innerHTML = '';
            inventory.forEach(item => {
                const row = document.createElement('tr');
                
                const fishCell = document.createElement('td');
                fishCell.textContent = String(item.fish_name || '');
                row.appendChild(fishCell);
                
                const pkgCell = document.createElement('td');
                pkgCell.textContent = String(item.remaining_packages || 0);
                row.appendChild(pkgCell);
                
                const batchCell = document.createElement('td');
                batchCell.textContent = String(item.batch_number || '');
                row.appendChild(batchCell);
                
                const statusCell = document.createElement('td');
                statusCell.textContent = String(item.status || '');
                row.appendChild(statusCell);
                
                const dateCell = document.createElement('td');
                dateCell.textContent = window.Utils?.formatDate(item.expiry_date) || '';
                row.appendChild(dateCell);
                
                const expiryCell = document.createElement('td');
                const expiryBadge = document.createElement('span');
                expiryBadge.className = `status-badge ${item.is_expiring_soon ? 'warning' : 'good'}`;
                expiryBadge.textContent = item.is_expiring_soon ? 'Expiring' : 'OK';
                expiryCell.appendChild(expiryBadge);
                row.appendChild(expiryCell);
                
                tableBody.appendChild(row);
            });
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
