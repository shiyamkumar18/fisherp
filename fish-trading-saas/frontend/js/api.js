// Fish ERP - API Configuration
const API_BASE_URL = `${window.location.origin}/api`;

// Enhanced Token management with refresh capability
const TokenManager = {
    getToken: () => {
        // Try localStorage first (for backward compatibility)
        return localStorage.getItem('token') || localStorage.getItem('access_token');
    },
    
    setToken: (token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('access_token', token);
    },
    
    setRefreshToken: (token) => {
        localStorage.setItem('refresh_token', token);
    },
    
    getRefreshToken: () => localStorage.getItem('refresh_token'),
    
    removeToken: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    },
    
    isAuthenticated: () => !!localStorage.getItem('token'),
    
    // Refresh token if expired
    async refreshToken() {
        const refreshToken = TokenManager.getRefreshToken();
        if (!refreshToken) return false;
        
        try {
            const response = await fetch(`${API_BASE_URL}/auth/token-refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: refreshToken })
            });
            
            if (response.ok) {
                const data = await response.json();
                TokenManager.setToken(data.access);
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }
        return false;
    }
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

// Generic API call function with auto-retry on 401
async function apiCall(endpoint, method = 'GET', body = null) {
    const token = TokenManager.getToken();
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include' // Send cookies for HttpOnly support in future
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        let response = await fetch(`${API_BASE_URL}${endpoint}`, options);
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

        // Handle 401 - attempt token refresh once
        if (response.status === 401) {
            const refreshed = await TokenManager.refreshToken();
            if (refreshed) {
                // Retry request with new token
                const newToken = TokenManager.getToken();
                options.headers['Authorization'] = `Bearer ${newToken}`;
                response = await fetch(`${API_BASE_URL}${endpoint}`, options);
                const retryText = await response.text();
                if (retryText) {
                    try {
                        data = JSON.parse(retryText);
                    } catch (parseError) {
                        data = { detail: retryText };
                    }
                }
            } else {
                handleUnauthorized();
                return null;
            }
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

// Handle unauthorized access - clear tokens and redirect to login
function handleUnauthorized() {
    TokenManager.removeToken();
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    localStorage.removeItem('role');
    localStorage.removeItem('user_id');
    localStorage.removeItem('tenant_slug');
    localStorage.removeItem('company_code');
    localStorage.removeItem('company_name');
    localStorage.removeItem('two_factor_enabled');
    
    // Redirect to appropriate login page
    const currentPath = window.location.pathname;
    if (currentPath.includes('platform')) {
        window.location.href = '/login_admin.html';
    } else {
        window.location.href = '/login.html';
    }
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
