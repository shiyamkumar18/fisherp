// Fish ERP - Utility Functions

const Utils = {
    // Format currency
    formatCurrency: (amount) => {
        if (!amount) return '₹0';
        return '₹' + parseFloat(amount).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },
    
    // Format date
    formatDate: (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN');
    },
    
    // Format datetime
    formatDateTime: (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleString('en-IN');
    },
    
    // Format percentage
    formatPercent: (value, decimals = 1) => {
        if (!value && value !== 0) return '0%';
        return parseFloat(value).toFixed(decimals) + '%';
    },
    
    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function
    throttle: (func, limit) => {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Generate random ID
    generateId: () => {
        return '_' + Math.random().toString(36).substr(2, 9);
    },
    
    // Deep clone object
    deepClone: (obj) => {
        return JSON.parse(JSON.stringify(obj));
    },
    
    // Check if object is empty
    isEmpty: (obj) => {
        return Object.keys(obj).length === 0;
    },
    
    // Sort array by field
    sortBy: (array, field, order = 'asc') => {
        return array.sort((a, b) => {
            if (order === 'asc') {
                return a[field] > b[field] ? 1 : -1;
            }
            return a[field] < b[field] ? 1 : -1;
        });
    },
    
    // Filter array by search term
    filterBySearch: (array, searchTerm, fields) => {
        if (!searchTerm) return array;
        const term = searchTerm.toLowerCase();
        return array.filter(item => 
            fields.some(field => 
                String(item[field]).toLowerCase().includes(term)
            )
        );
    },
    
    // Group array by field
    groupBy: (array, field) => {
        return array.reduce((result, item) => {
            const key = item[field];
            if (!result[key]) {
                result[key] = [];
            }
            result[key].push(item);
            return result;
        }, {});
    },
    
    // Calculate sum
    sum: (array, field) => {
        return array.reduce((total, item) => total + (parseFloat(item[field]) || 0), 0);
    },
    
    // Calculate average
    average: (array, field) => {
        if (array.length === 0) return 0;
        return Utils.sum(array, field) / array.length;
    },
    
    // Validate email
    isValidEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    // Validate phone
    isValidPhone: (phone) => {
        const re = /^[6-9]\d{9}$/;
        return re.test(phone);
    },
    
    // Get status badge class
    getStatusClass: (status) => {
        const statusMap = {
            'active': 'active',
            'inactive': 'inactive',
            'pending': 'pending',
            'completed': 'paid',
            'cancelled': 'inactive',
            'delivered': 'paid',
            'shipped': 'active',
            'paid': 'paid',
            'partial': 'pending'
        };
        return statusMap[status] || 'pending';
    }
};

// Export to window
window.Utils = Utils;

