// Fish ERP - Event Handlers Module

const EventHandlers = {
    // Initialize all event listeners
    init: () => {
        EventHandlers.setupAddButtons();
        EventHandlers.setupForms();
        EventHandlers.setupKeyboardShortcuts();
    },
    
    // Setup Add button event listeners
    setupAddButtons: () => {
        // Add Fish button
        document.getElementById('addFishBtn')?.addEventListener('click', () => {
            window.Forms.showAddFishModal();
        });

        // Add Fish Category button
        document.getElementById('addFishCategoryBtn')?.addEventListener('click', () => {
            window.Forms.showAddFishCategoryModal();
        });
        
        // Add Supplier button
        document.getElementById('addSupplierBtn')?.addEventListener('click', () => {
            window.Forms.showAddSupplierModal();
        });
        
        // Add Buyer button
        document.getElementById('addBuyerBtn')?.addEventListener('click', () => {
            window.Forms.showAddBuyerModal();
        });
        
        // Add Purchase button
        document.getElementById('addPurchaseBtn')?.addEventListener('click', () => {
            window.Forms.showAddPurchaseModal();
        });
        
        // Add Sale button
        document.getElementById('addSaleBtn')?.addEventListener('click', () => {
            window.Forms.showAddSaleModal();
        });
        
        // Add Payment button
        document.getElementById('addPaymentBtn')?.addEventListener('click', () => {
            window.Forms.showAddPaymentModal();
        });
        
        // Add User button
        document.getElementById('addUserBtn')?.addEventListener('click', () => {
            window.ManagementPages.showAddUserModal();
        });
    },
    
    // Setup form event listeners
    setupForms: () => {
        EventHandlers.loadProfileForm();

        // Profile form
        document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const payload = {
                email: document.getElementById('settingsEmail')?.value?.trim(),
                phone: document.getElementById('settingsPhone')?.value?.trim(),
            };

            const result = await window.API.put('/auth/profile/', payload);
            if (result) {
                window.UI.showAlert('Profile updated successfully!', 'success');
                return;
            }

            const error = window.API.lastError?.error || window.API.lastError?.detail || 'Failed to update profile';
            window.UI.showAlert(error, 'danger');
        });
        
        // Password form
        document.getElementById('passwordForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (newPassword !== confirmPassword) {
                window.UI.showAlert('Passwords do not match!', 'danger');
                return;
            }

            window.UI.showAlert('Password change endpoint is not available yet. Contact platform admin.', 'info');
            document.getElementById('passwordForm').reset();
        });
    },

    loadProfileForm: async () => {
        const profile = await window.API.get('/auth/profile/');
        if (!profile) return;

        const email = document.getElementById('settingsEmail');
        const phone = document.getElementById('settingsPhone');
        if (email) email.value = profile.email || '';
        if (phone) phone.value = profile.phone || '';
    },

    setupKeyboardShortcuts: () => {
        document.addEventListener('keydown', (event) => {
            if (!(event.altKey || event.ctrlKey)) return;

            const key = event.key.toLowerCase();
            if (key === 'p') {
                event.preventDefault();
                window.App.loadPage('purchases');
                setTimeout(() => window.Forms.showAddPurchaseModal(), 120);
            }
            if (key === 's') {
                event.preventDefault();
                window.App.loadPage('sales');
                setTimeout(() => window.Forms.showAddSaleModal(), 120);
            }
        });
    },
};

window.EventHandlers = EventHandlers;
