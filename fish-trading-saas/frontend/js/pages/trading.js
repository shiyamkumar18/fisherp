
const Trading = {
    init: function() {
        console.log("Trading module initialized");
        this.loadBuyers();
    },

    loadBuyers: async function() {
        const tableBody = document.getElementById('buyerTable');
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading buyers...</td></tr>';

        try {
            const buyers = await api.get('/trading/buyers/');
            if (buyers.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No buyers found.</td></tr>';
                return;
            }

            tableBody.innerHTML = '';
            buyers.forEach(buyer => {
                const row = `
                    <tr>
                        <td>${buyer.name}</td>
                        <td>${buyer.phone_number}</td>
                        <td>${buyer.buyer_type}</td>
                        <td>${buyer.credit_limit}</td>
                        <td>${buyer.balance}</td>
                        <td><span class="status-badge status-${buyer.is_active ? 'active' : 'inactive'}">${buyer.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td>
                            <button class="btn-icon" onclick="Trading.showEditBuyerModal(${buyer.id})"><i class="fas fa-edit"></i></button>
                            <button class="btn-icon" onclick="Trading.deleteBuyer(${buyer.id})"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        } catch (error) {
            console.error('Error loading buyers:', error);
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Error loading buyers.</td></tr>';
        }
    },

    showAddBuyerModal: function() {
        document.getElementById('buyerModalTitle').textContent = 'Add New Buyer';
        document.getElementById('buyerForm').reset();
        document.getElementById('buyerModal').style.display = 'flex';
    },

    showEditBuyerModal: async function(buyerId) {
        try {
            const buyer = await api.get(`/trading/buyers/${buyerId}/`);
            document.getElementById('buyerModalTitle').textContent = 'Edit Buyer';
            const form = document.getElementById('buyerForm');
            form.querySelector('[name="id"]').value = buyer.id;
            form.querySelector('[name="name"]').value = buyer.name;
            form.querySelector('[name="phone"]').value = buyer.phone || '';
            form.querySelector('[name="email"]').value = buyer.email || '';
            form.querySelector('[name="buyer_type"]').value = buyer.buyer_type || 'retail';
            form.querySelector('[name="credit_limit"]').value = buyer.credit_limit || '';
            form.querySelector('[name="is_active"]').checked = buyer.is_active !== false;
            document.getElementById('buyerModal').style.display = 'flex';
        } catch (error) {
            console.error('Error loading buyer:', error);
            alert('Error loading buyer data');
        }
    },

    closeBuyerModal: function() {
        document.getElementById('buyerModal').style.display = 'none';
    },

    saveBuyer: async function() {
        const form = document.getElementById('buyerForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        data.is_active = form.querySelector('[name="is_active"]').checked;
        data.credit_limit = parseFloat(data.credit_limit) || 0;

        try {
            const id = data.id;
            delete data.id;
            if (id) {
                await api.put(`/trading/buyers/${id}/`, data);
            } else {
                await api.post('/trading/buyers/', data);
            }
            this.closeBuyerModal();
            this.loadBuyers();
        } catch (error) {
            console.error('Error saving buyer:', error);
            alert('Error saving buyer: ' + (error.message || 'Unknown error'));
        }
    },

    deleteBuyer: async function(buyerId) {
        console.log(`deleteBuyer called for buyer ID: ${buyerId}`);
        if (!confirm('Are you sure you want to delete this buyer?')) {
            return;
        }

        try {
            await api.delete(`/trading/buyers/${buyerId}/`);
            this.loadBuyers();
        } catch (error) {
            console.error('Error deleting buyer:', error);
            alert('Error deleting buyer. Please try again.');
        }
    }
};

window.App.pageLoaders.buyers = () => {
    Trading.init();
};
