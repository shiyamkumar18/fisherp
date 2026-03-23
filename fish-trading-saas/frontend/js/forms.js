// Fish ERP - Forms Module (Add/Edit forms for all entities)

const Forms = {
    getErrorMessage: (fallback) => {
        return (
            window.API.lastError?.error ||
            window.API.lastError?.detail ||
            fallback
        );
    },

    draftKey: (formId) => `draft:${formId}`,

    saveDraft: (formId) => {
        const form = document.getElementById(formId);
        if (!form) return;
        const payload = {};
        form.querySelectorAll('input[name], select[name], textarea[name]').forEach((field) => {
            if (field.type === 'checkbox') {
                payload[field.name] = field.checked;
                return;
            }
            payload[field.name] = field.value;
        });
        localStorage.setItem(Forms.draftKey(formId), JSON.stringify(payload));
    },

    restoreDraft: (formId) => {
        const raw = localStorage.getItem(Forms.draftKey(formId));
        if (!raw) return;
        const payload = JSON.parse(raw);
        const form = document.getElementById(formId);
        if (!form) return;
        Object.entries(payload).forEach(([name, value]) => {
            const field = form.querySelector(`[name="${name}"]`);
            if (!field) return;
            if (field.type === 'checkbox') {
                field.checked = Boolean(value);
                return;
            }
            field.value = value ?? '';
        });
    },

    clearDraft: (formId) => {
        localStorage.removeItem(Forms.draftKey(formId));
    },

    bindAutoDraft: (formId) => {
        const form = document.getElementById(formId);
        if (!form) return;
        form.querySelectorAll('input[name], select[name], textarea[name]').forEach((field) => {
            field.addEventListener('input', () => Forms.saveDraft(formId));
            field.addEventListener('change', () => Forms.saveDraft(formId));
        });
    },

    bindFastFocus: (formId, fieldOrder) => {
        const form = document.getElementById(formId);
        if (!form) return;
        fieldOrder.forEach((name, index) => {
            const field = form.querySelector(`[name="${name}"]`);
            if (!field) return;
            field.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                const next = form.querySelector(`[name="${fieldOrder[index + 1]}"]`);
                if (next) next.focus();
            });
        });
    },

    setupFastNumericField: (selector) => {
        const input = document.querySelector(selector);
        if (!input) return;
        input.setAttribute('inputmode', 'decimal');
        input.setAttribute('autocomplete', 'off');
    },

    // ========== FISH CATEGORIES ==========
    showAddFishCategoryModal: async () => {
        const content = `
            <form id="addFishCategoryForm">
                <div class="form-row">
                    <div class="form-group">
                        <label>Category Name *</label>
                        <input type="text" class="form-control" name="name" required>
                    </div>
                    <div class="form-group">
                        <label>Type</label>
                        <select class="form-control" name="category_type">
                            <option value="saltwater">Saltwater</option>
                            <option value="freshwater">Freshwater</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Priority</label>
                        <input type="number" class="form-control" name="priority" value="0" min="0">
                    </div>
                    <div class="form-group">
                        <label>Color Code</label>
                        <input type="text" class="form-control" name="color_code" placeholder="#0077b6">
                    </div>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea class="form-control" name="description" rows="3"></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label><input type="checkbox" name="is_featured"> Featured</label>
                    </div>
                    <div class="form-group">
                        <label><input type="checkbox" name="is_active" checked> Active</label>
                    </div>
                </div>
            </form>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="window.UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Forms.submitFishCategoryForm()">Add Category</button>
        `;

        window.UI.showModal('Add Fish Category', content, footer);
    },

    submitFishCategoryForm: async () => {
        const form = document.getElementById('addFishCategoryForm');
        const formData = new FormData(form);

        const data = {
            name: formData.get('name')?.trim(),
            category_type: formData.get('category_type') || 'saltwater',
            priority: parseInt(formData.get('priority'), 10) || 0,
            color_code: formData.get('color_code') || '',
            description: formData.get('description') || '',
            is_featured: form.querySelector('input[name="is_featured"]').checked,
            is_active: form.querySelector('input[name="is_active"]').checked,
        };

        if (!data.name) {
            window.UI.showAlert('Please enter category name', 'danger');
            return;
        }

        const result = await window.API.post('/trading/fish-categories/', data);
        if (result) {
            window.UI.showAlert('Fish category added successfully!', 'success');
            window.UI.closeModal();
            window.Trading.loadFishCategories();
            return;
        }

        window.UI.showAlert(Forms.getErrorMessage('Failed to add fish category'), 'danger');
    },

    showEditFishCategoryModal: async (category) => {
        const content = `
            <form id="editFishCategoryForm" data-id="${category.id}">
                <div class="form-row">
                    <div class="form-group">
                        <label>Category Name *</label>
                        <input type="text" class="form-control" name="name" value="${category.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Type</label>
                        <select class="form-control" name="category_type">
                            <option value="saltwater" ${category.category_type === 'saltwater' ? 'selected' : ''}>Saltwater</option>
                            <option value="freshwater" ${category.category_type === 'freshwater' ? 'selected' : ''}>Freshwater</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Priority</label>
                        <input type="number" class="form-control" name="priority" value="${category.priority || 0}" min="0">
                    </div>
                    <div class="form-group">
                        <label>Color Code</label>
                        <input type="text" class="form-control" name="color_code" value="${category.color_code || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea class="form-control" name="description" rows="3">${category.description || ''}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label><input type="checkbox" name="is_featured" ${category.is_featured ? 'checked' : ''}> Featured</label>
                    </div>
                    <div class="form-group">
                        <label><input type="checkbox" name="is_active" ${category.is_active ? 'checked' : ''}> Active</label>
                    </div>
                </div>
            </form>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="window.UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Forms.submitEditFishCategoryForm()">Save Changes</button>
        `;

        window.UI.showModal('Edit Fish Category', content, footer);
    },

    submitEditFishCategoryForm: async () => {
        const form = document.getElementById('editFishCategoryForm');
        const categoryId = form?.dataset?.id;
        if (!form || !categoryId) return;

        const formData = new FormData(form);
        const data = {
            name: formData.get('name')?.trim(),
            category_type: formData.get('category_type') || 'saltwater',
            priority: parseInt(formData.get('priority'), 10) || 0,
            color_code: formData.get('color_code') || '',
            description: formData.get('description') || '',
            is_featured: form.querySelector('input[name="is_featured"]').checked,
            is_active: form.querySelector('input[name="is_active"]').checked,
        };

        const result = await window.API.patch(`/trading/fish-categories/${categoryId}/`, data);
        if (result) {
            window.UI.showAlert('Fish category updated successfully!', 'success');
            window.UI.closeModal();
            window.Trading.loadFishCategories();
            return;
        }

        window.UI.showAlert(Forms.getErrorMessage('Failed to update fish category'), 'danger');
    },

    // ========== ADD FISH ==========
    showAddFishModal: async () => {
        const categories = await window.API.get('/trading/fish-categories/');
        
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
            <button class="btn btn-secondary" onclick="window.UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Forms.submitFishForm()">Add Fish</button>
        `;
        
        window.UI.showModal('Add New Fish', content, footer);
    },
    
    submitFishForm: async () => {
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
            window.UI.showAlert('Please enter fish name', 'danger');
            return;
        }
        
        const result = await window.API.post('/trading/fish/', data);
        if (result) {
            window.UI.showAlert('Fish added successfully!', 'success');
            window.UI.closeModal();
            window.Trading.loadFish();
        } else {
            window.UI.showAlert(Forms.getErrorMessage('Failed to add fish'), 'danger');
        }
    },

    showEditFishModal: async (fish) => {
        const categories = await window.API.get('/trading/fish-categories/');
        const categoryOptions = (categories || [])
            .map(
                (c) =>
                    `<option value="${c.id}" ${String(c.id) === String(fish.category) ? 'selected' : ''}>${c.name}</option>`
            )
            .join('');

        const content = `
            <form id="editFishForm" data-id="${fish.id}">
                <div class="form-row">
                    <div class="form-group">
                        <label>Fish Name *</label>
                        <input type="text" class="form-control" name="name" value="${fish.name || ''}" required>
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
                            <option value="kg" ${fish.unit_type === 'kg' ? 'selected' : ''}>Kilogram (kg)</option>
                            <option value="box" ${fish.unit_type === 'box' ? 'selected' : ''}>Box</option>
                            <option value="piece" ${fish.unit_type === 'piece' ? 'selected' : ''}>Piece</option>
                            <option value="bucket" ${fish.unit_type === 'bucket' ? 'selected' : ''}>Bucket</option>
                            <option value="tonne" ${fish.unit_type === 'tonne' ? 'selected' : ''}>Tonne</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Min Price/kg</label>
                        <input type="number" class="form-control" name="min_price_per_kg" step="0.01" value="${fish.min_price_per_kg || 0}">
                    </div>
                    <div class="form-group">
                        <label>Max Price/kg</label>
                        <input type="number" class="form-control" name="max_price_per_kg" step="0.01" value="${fish.max_price_per_kg || 0}">
                    </div>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" name="is_active" ${fish.is_active ? 'checked' : ''}> Active</label>
                </div>
            </form>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="window.UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Forms.submitEditFishForm()">Save Changes</button>
        `;

        window.UI.showModal('Edit Fish', content, footer);
    },

    submitEditFishForm: async () => {
        const form = document.getElementById('editFishForm');
        const fishId = form?.dataset?.id;
        if (!form || !fishId) return;

        const formData = new FormData(form);
        const data = {
            name: formData.get('name')?.trim(),
            category: formData.get('category') || null,
            unit_type: formData.get('unit_type') || 'kg',
            min_price_per_kg: parseFloat(formData.get('min_price_per_kg')) || 0,
            max_price_per_kg: parseFloat(formData.get('max_price_per_kg')) || 0,
            is_active: form.querySelector('input[name="is_active"]').checked,
        };

        const result = await window.API.patch(`/trading/fish/${fishId}/`, data);
        if (result) {
            window.UI.showAlert('Fish updated successfully!', 'success');
            window.UI.closeModal();
            window.Trading.loadFish();
            return;
        }

        window.UI.showAlert(Forms.getErrorMessage('Failed to update fish'), 'danger');
    },
    
    // ========== ADD SUPPLIER ==========
    showAddSupplierModal: async () => {
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
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="is_active" checked> Active
                    </label>
                </div>
            </form>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="window.UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Forms.submitSupplierForm()">Add Supplier</button>
        `;
        
        window.UI.showModal('Add New Supplier', content, footer);
    },
    
    submitSupplierForm: async () => {
        const form = document.getElementById('addSupplierForm');
        const formData = new FormData(form);
        
        const data = {
            name: formData.get('name'),
            phone: formData.get('phone') || '',
            email: formData.get('email') || '',
            supplier_type: formData.get('supplier_type') || 'individual',
            place_of_origin: formData.get('place_of_origin') || '',
            id_number: formData.get('id_number') || '',
            is_active: form.querySelector('input[name="is_active"]').checked
        };
        
        if (!data.name) {
            window.UI.showAlert('Please enter supplier name', 'danger');
            return;
        }
        
        const result = await window.API.post('/trading/suppliers/', data);
        if (result) {
            window.UI.showAlert('Supplier added successfully!', 'success');
            window.UI.closeModal();
            window.Trading.loadSuppliers();
        } else {
            window.UI.showAlert(Forms.getErrorMessage('Failed to add supplier'), 'danger');
        }
    },
    
    // ========== ADD BUYER ==========
    showAddBuyerModal: async () => {
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
                        <label>Credit Limit</label>
                        <input type="number" class="form-control" name="credit_limit" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Default Discount %</label>
                        <input type="number" class="form-control" name="default_discount_percent" step="0.01" value="0">
                    </div>
                </div>
                <div class="form-group">
                    <label>Address (optional)</label>
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
            <button class="btn btn-secondary" onclick="window.UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Forms.submitBuyerForm()">Add Buyer</button>
        `;
        
        window.UI.showModal('Add New Buyer', content, footer);
    },
    
    submitBuyerForm: async () => {
        const form = document.getElementById('addBuyerForm');
        const formData = new FormData(form);
        
        const data = {
            name: formData.get('name'),
            phone: formData.get('phone') || '',
            email: formData.get('email') || '',
            buyer_type: formData.get('buyer_type') || 'retail',
            credit_limit: parseFloat(formData.get('credit_limit')) || 0,
            default_discount_percent: parseFloat(formData.get('default_discount_percent')) || 0,
            address: formData.get('address') || '',
            is_active: form.querySelector('input[name="is_active"]').checked
        };
        
        if (!data.name) {
            window.UI.showAlert('Please enter buyer name', 'danger');
            return;
        }
        
        const result = await window.API.post('/trading/buyers/', data);
        if (result) {
            window.UI.showAlert('Buyer added successfully!', 'success');
            window.UI.closeModal();
            window.Trading.loadBuyers();
        } else {
            window.UI.showAlert(Forms.getErrorMessage('Failed to add buyer'), 'danger');
        }
    },
    
    // ========== ADD PURCHASE ==========
    showAddPurchaseModal: async () => {
        const [suppliers, fishList] = await Promise.all([
            window.API.get('/trading/suppliers/'),
            window.API.get('/trading/fish/'),
        ]);

        const supplierOptions = (suppliers || [])
            .map((supplier) => `<option value="${supplier.id}">${supplier.name}</option>`)
            .join('');
        const fishOptions = (fishList || [])
            .map((fish) => `<option value="${fish.id}">${fish.name}</option>`)
            .join('');

        const content = `
            <form id="addPurchaseForm" class="fast-entry-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Supplier</label>
                        <select class="form-control" name="supplier">
                            <option value="">Select Supplier</option>
                            ${supplierOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Fish *</label>
                        <input class="form-control" type="search" id="purchaseFishSearch" placeholder="Search fish">
                        <select class="form-control mt-1" name="fish" required>
                            <option value="">Select Fish</option>
                            ${fishOptions}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Quantity (kg) *</label>
                        <input type="number" class="form-control" name="quantity_kg" step="0.01" min="0.01" inputmode="decimal" required>
                    </div>
                    <div class="form-group">
                        <label>Price / kg *</label>
                        <input type="number" class="form-control" name="price_per_kg" step="0.01" min="0" inputmode="decimal" required>
                    </div>
                    <div class="form-group">
                        <label>Total</label>
                        <input type="text" class="form-control" id="purchaseTotalDisplay" readonly value="₹0.00">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Amount Paid</label>
                        <input type="number" class="form-control" name="amount_paid" step="0.01" min="0" inputmode="decimal" value="0">
                    </div>
                </div>
            </form>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="window.UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Forms.submitPurchaseForm()">Save Purchase</button>
        `;

        window.UI.showModal('Add Purchase', content, footer);

        Forms.restoreDraft('addPurchaseForm');
        Forms.bindAutoDraft('addPurchaseForm');
        Forms.bindFastFocus('addPurchaseForm', ['supplier', 'fish', 'quantity_kg', 'price_per_kg', 'amount_paid']);
        Forms.setupFastNumericField('#addPurchaseForm input[name="quantity_kg"]');
        Forms.setupFastNumericField('#addPurchaseForm input[name="price_per_kg"]');
        Forms.setupFastNumericField('#addPurchaseForm input[name="amount_paid"]');
        Forms.bindSelectSearch('purchaseFishSearch', '#addPurchaseForm select[name="fish"]');
        Forms.bindPurchaseTotal();

        document.querySelector('#addPurchaseForm select[name="fish"]')?.focus();
    },

    bindSelectSearch: (searchInputId, selectQuery) => {
        const input = document.getElementById(searchInputId);
        const select = document.querySelector(selectQuery);
        if (!input || !select) return;

        input.addEventListener('input', () => {
            const query = input.value.trim().toLowerCase();
            Array.from(select.options).forEach((option, index) => {
                if (index === 0) return;
                const match = option.text.toLowerCase().includes(query);
                option.hidden = !match;
            });
        });
    },

    bindPurchaseTotal: () => {
        const form = document.getElementById('addPurchaseForm');
        if (!form) return;
        const qty = form.querySelector('[name="quantity_kg"]');
        const price = form.querySelector('[name="price_per_kg"]');
        const totalDisplay = document.getElementById('purchaseTotalDisplay');
        const update = () => {
            const total = (parseFloat(qty?.value) || 0) * (parseFloat(price?.value) || 0);
            if (totalDisplay) totalDisplay.value = window.Utils.formatCurrency(total);
        };
        qty?.addEventListener('input', update);
        price?.addEventListener('input', update);
        update();
    },

    submitPurchaseForm: async () => {
        const form = document.getElementById('addPurchaseForm');
        const formData = new FormData(form);

        const quantityKg = parseFloat(formData.get('quantity_kg')) || 0;
        const data = {
            supplier: formData.get('supplier') || null,
            fish: formData.get('fish'),
            purchase_type: 'kg',
            number_of_packages: 1,
            package_weight: quantityKg,
            price_per_kg: parseFloat(formData.get('price_per_kg')) || 0,
            amount_paid: parseFloat(formData.get('amount_paid')) || 0,
        };

        if (!data.fish || quantityKg <= 0 || data.price_per_kg <= 0) {
            window.UI.showAlert('Please fill fish, quantity, and price per kg.', 'danger');
            return;
        }

        const result = await window.API.post('/trading/purchase-batches/', data);
        if (result) {
            Forms.clearDraft('addPurchaseForm');
            window.UI.showAlert('Purchase created successfully!', 'success');
            window.UI.closeModal();
            window.Trading.loadPurchases();
            return;
        }

        window.UI.showAlert(Forms.getErrorMessage('Failed to create purchase'), 'danger');
    },

    // ========== ADD SALE ==========
    showAddSaleModal: async () => {
        const [buyers, purchases] = await Promise.all([
            window.API.get('/trading/buyers/'),
            window.API.get('/trading/purchase-batches/'),
        ]);

        const buyerOptions = (buyers || [])
            .map((buyer) => `<option value="${buyer.id}">${buyer.name}</option>`)
            .join('');

        const purchaseRows = (purchases || []).filter((row) => Number(row.remaining_packages || 0) > 0);
        const fishMap = new Map();
        purchaseRows.forEach((row) => {
            if (!fishMap.has(row.fish)) {
                fishMap.set(row.fish, row.fish_name || `Fish ${row.fish}`);
            }
        });

        const fishOptions = Array.from(fishMap.entries())
            .map(([id, name]) => `<option value="${id}">${name}</option>`)
            .join('');

        const batchOptions = purchaseRows
            .map(
                (row) =>
                    `<option value="${row.id}" data-fish="${row.fish}" data-price="${row.actual_cost_per_kg || row.price_per_kg || 0}">
                        ${row.batch_number} - ${row.fish_name || 'Fish'} (${row.remaining_packages} pkg)
                    </option>`
            )
            .join('');

        const content = `
            <form id="addSaleForm" class="fast-entry-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Buyer *</label>
                        <select class="form-control" name="buyer" required>
                            <option value="">Select Buyer</option>
                            ${buyerOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Fish *</label>
                        <input class="form-control" type="search" id="saleFishSearch" placeholder="Search fish">
                        <select class="form-control mt-1" id="saleFishSelect">
                            <option value="">Select Fish</option>
                            ${fishOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Batch *</label>
                        <select class="form-control" name="batch" id="saleBatchSelect" required>
                            <option value="">Select Batch</option>
                            ${batchOptions}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Quantity (kg) *</label>
                        <input type="number" class="form-control" name="quantity_kg" step="0.01" min="0.01" inputmode="decimal" required>
                    </div>
                    <div class="form-group">
                        <label>Price / kg *</label>
                        <input type="number" class="form-control" name="selling_price_per_kg" step="0.01" min="0" inputmode="decimal" required>
                    </div>
                    <div class="form-group">
                        <label>Total</label>
                        <input type="text" class="form-control" id="saleTotalDisplay" readonly value="₹0.00">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Amount Received</label>
                        <input type="number" class="form-control" name="amount_received" step="0.01" min="0" inputmode="decimal" value="0">
                    </div>
                    <div class="form-group">
                        <label>Delivery Status</label>
                        <select class="form-control" name="delivery_status">
                            <option value="pending">Pending</option>
                            <option value="delivered">Delivered</option>
                        </select>
                    </div>
                </div>
            </form>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="window.UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Forms.submitSaleForm()">Save Sale</button>
        `;

        window.UI.showModal('Add Sale', content, footer);

        Forms.restoreDraft('addSaleForm');
        Forms.bindAutoDraft('addSaleForm');
        Forms.bindFastFocus('addSaleForm', ['buyer', 'quantity_kg', 'selling_price_per_kg', 'amount_received', 'delivery_status']);
        Forms.setupFastNumericField('#addSaleForm input[name="quantity_kg"]');
        Forms.setupFastNumericField('#addSaleForm input[name="selling_price_per_kg"]');
        Forms.setupFastNumericField('#addSaleForm input[name="amount_received"]');
        Forms.bindSelectSearch('saleFishSearch', '#saleFishSelect');
        Forms.bindSaleBatchFilter();
        Forms.bindSaleTotal();

        document.querySelector('#addSaleForm select[name="buyer"]')?.focus();
    },

    bindSaleBatchFilter: () => {
        const fishSelect = document.getElementById('saleFishSelect');
        const batchSelect = document.getElementById('saleBatchSelect');
        if (!fishSelect || !batchSelect) return;

        const applyFilter = () => {
            const fishId = fishSelect.value;
            Array.from(batchSelect.options).forEach((option, index) => {
                if (index === 0) return;
                const match = !fishId || option.getAttribute('data-fish') === fishId;
                option.hidden = !match;
            });

            const firstVisible = Array.from(batchSelect.options).find((option, index) => index > 0 && !option.hidden);
            if (firstVisible) {
                batchSelect.value = firstVisible.value;
            }
        };

        fishSelect.addEventListener('change', applyFilter);
        applyFilter();
    },

    bindSaleTotal: () => {
        const form = document.getElementById('addSaleForm');
        if (!form) return;
        const qty = form.querySelector('[name="quantity_kg"]');
        const price = form.querySelector('[name="selling_price_per_kg"]');
        const totalDisplay = document.getElementById('saleTotalDisplay');

        const update = () => {
            const total = (parseFloat(qty?.value) || 0) * (parseFloat(price?.value) || 0);
            if (totalDisplay) totalDisplay.value = window.Utils.formatCurrency(total);
        };

        qty?.addEventListener('input', update);
        price?.addEventListener('input', update);
        update();
    },

    submitSaleForm: async () => {
        const form = document.getElementById('addSaleForm');
        const formData = new FormData(form);

        const quantityKg = parseFloat(formData.get('quantity_kg')) || 0;
        const data = {
            buyer: formData.get('buyer'),
            batch: formData.get('batch'),
            number_of_packages_sold: 1,
            selling_weight_per_package: quantityKg,
            selling_price_per_kg: parseFloat(formData.get('selling_price_per_kg')) || 0,
            amount_received: parseFloat(formData.get('amount_received')) || 0,
            delivery_status: formData.get('delivery_status') || 'pending',
        };

        if (!data.buyer || !data.batch || quantityKg <= 0 || data.selling_price_per_kg <= 0) {
            window.UI.showAlert('Please fill buyer, batch, quantity, and price per kg.', 'danger');
            return;
        }

        const result = await window.API.post('/trading/sales/', data);
        if (result) {
            Forms.clearDraft('addSaleForm');
            window.UI.showAlert('Sale created successfully!', 'success');
            window.UI.closeModal();
            window.Trading.loadSales();
            return;
        }

        window.UI.showAlert(Forms.getErrorMessage('Failed to create sale'), 'danger');
    },
    
    // ========== ADD PAYMENT ==========
    showAddPaymentModal: async () => {
        const [buyers, suppliers] = await Promise.all([
            window.API.get('/trading/buyers/'),
            window.API.get('/trading/suppliers/')
        ]);
        
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
                        <select class="form-control" name="payment_type" id="paymentType" onchange="Forms.togglePaymentFields()">
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
            </form>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="window.UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Forms.submitPaymentForm()">Record Payment</button>
        `;
        
        window.UI.showModal('Record Payment', content, footer);
        
        // Set default date
        document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    },
    
    togglePaymentFields: () => {
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
    },
    
    submitPaymentForm: async () => {
        const form = document.getElementById('addPaymentForm');
        const formData = new FormData(form);
        const paymentType = formData.get('payment_type');
        
        const data = {
            payment_type: paymentType,
            payment_mode: formData.get('payment_mode') || 'cash',
            amount: parseFloat(formData.get('amount')) || 0,
            date: formData.get('date') || new Date().toISOString().split('T')[0]
        };
        
        if (paymentType === 'sale') {
            data.buyer = formData.get('buyer');
            if (!data.buyer) {
                window.UI.showAlert('Please select buyer', 'danger');
                return;
            }
        } else {
            data.supplier = formData.get('supplier');
            if (!data.supplier) {
                window.UI.showAlert('Please select supplier', 'danger');
                return;
            }
        }
        
        if (!data.amount) {
            window.UI.showAlert('Please enter amount', 'danger');
            return;
        }
        
        const result = await window.API.post('/trading/payments/', data);
        if (result) {
            window.UI.showAlert('Payment recorded successfully!', 'success');
            window.UI.closeModal();
            window.Trading.loadPayments();
        } else {
            window.UI.showAlert(Forms.getErrorMessage('Failed to record payment'), 'danger');
        }
    }
};

window.Forms = Forms;
