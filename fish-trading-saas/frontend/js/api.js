// Fish ERP - API Configuration
const API_BASE_URL = `${window.location.origin}/api`;

// Token management
const TokenManager = {
    getToken: () => localStorage.getItem('token') || localStorage.getItem('access_token'),
    
    setToken: (token) => localStorage.setItem('token', token),
    
    removeToken: () => localStorage.removeItem('token'),
    
    isAuthenticated: () => !!localStorage.getItem('token')
};

function unwrapPaginatedResponse(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return data;
    }

    // DRF default pagination payload.
    if (
        Object.prototype.hasOwnProperty.call(data, 'results') &&
        Object.prototype.hasOwnProperty.call(data, 'count') &&
        Object.prototype.hasOwnProperty.call(data, 'next') &&
        Object.prototype.hasOwnProperty.call(data, 'previous')
    ) {
        return Array.isArray(data.results) ? data.results : [];
    }

    return data;
}

// Generic API call function
async function apiCall(endpoint, method = 'GET', body = null) {
    const token = TokenManager.getToken();
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        let data = null;

        // Handle empty responses.
        const text = await response.text();
        if (text) {
            try {
                data = JSON.parse(text);
            } catch (parseError) {
                data = { detail: text };
            }
        }

        if (response.status === 401) {
            handleUnauthorized();
            return null;
        }

        if (!response.ok) {
            window.API.lastError = data || { detail: `Request failed (${response.status})` };
            return null;
        }

        window.API.lastError = null;
        return unwrapPaginatedResponse(data);
    } catch (error) {
        console.error('API Error:', error);
        window.API.lastError = { detail: error.message };
        return null;
    }
}

// Handle unauthorized access
function handleUnauthorized() {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    localStorage.removeItem('role');
    window.location.href = '/web/login/';
}

// Export for use in other modules
window.API = {
    baseUrl: API_BASE_URL,
    lastError: null,
    get: (endpoint) => apiCall(endpoint),
    post: (endpoint, body) => apiCall(endpoint, 'POST', body),
    put: (endpoint, body) => apiCall(endpoint, 'PUT', body),
    patch: (endpoint, body) => apiCall(endpoint, 'PATCH', body),
    delete: (endpoint, body = null) => apiCall(endpoint, 'DELETE', body),
    isAuthenticated: TokenManager.isAuthenticated
};
