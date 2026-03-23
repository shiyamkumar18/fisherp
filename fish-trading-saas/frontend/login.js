// Fish ERP - Login JavaScript

const API_BASE_URL = `${window.location.origin}/api`;

function getRedirectURL(data) {
    if (data.redirect_url) return data.redirect_url;

    const role = data.role || data.userRole;
    if (
        data.is_platform_operator ||
        data.is_platform_support ||
        data.is_platform_super_admin ||
        data.is_platform_maintainer ||
        ['platform_maintainer', 'platform_operator', 'platform_support', 'platform_super_admin'].includes(role)
    ) {
        return '/platform-admin/';
    }

    if (data.tenant_slug) {
        return `/dashboard/${data.tenant_slug}/`;
    }
    return '/dashboard/';
}

function getSelectedLoginType() {
    const selected = document.querySelector('input[name="loginType"]:checked');
    if (selected) return selected.value;
    if (window.location.pathname.includes('_admin')) return 'platform';
    return 'company';
}

function getCompanyLoginURL(companyCode) {
    if (companyCode) {
        return `${API_BASE_URL}/login/${encodeURIComponent(companyCode.toLowerCase())}/`;
    }
    return `${API_BASE_URL}/auth/login/`;
}

document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.querySelector('.btn-login');
    const loginTypeInputs = document.querySelectorAll('input[name="loginType"]');
    const companyOnlyFields = document.querySelectorAll('.company-only');
    const usernameLabel = document.getElementById('usernameLabel');
    const loginButtonText = document.getElementById('loginButtonText');

    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = '/dashboard/';
        return;
    }

    const syncLoginTypeUI = () => {
        const type = getSelectedLoginType();
        const isCompany = type === 'company';

        companyOnlyFields.forEach((field) => {
            field.style.display = isCompany ? '' : 'none';
        });

        if (usernameLabel) {
            usernameLabel.textContent = isCompany ? 'Email / Mobile / Username' : 'Email or Username';
        }
        if (loginButtonText) {
            loginButtonText.textContent = isCompany ? 'Login' : 'Login to Platform';
        }
    };

    loginTypeInputs.forEach((input) => input.addEventListener('change', syncLoginTypeUI));
    syncLoginTypeUI();

    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const loginType = getSelectedLoginType();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const companyCode = document.getElementById('companyCode')?.value?.trim() || '';

        if (!username || !password) {
            showError('Please enter username/email and password');
            return;
        }

        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
        errorMessage.classList.remove('show');

        try {
            const requestBody = { username, password };

            let response;
            if (loginType === 'platform') {
                response = await fetch(`${API_BASE_URL}/auth/platform-login/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                });
            } else {
                response = await fetch(getCompanyLoginURL(companyCode), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                });

                // If company-code route is unavailable, retry on unified endpoint.
                if ((response.status === 404 || response.status === 400) && companyCode) {
                    response = await fetch(`${API_BASE_URL}/auth/login/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody),
                    });
                }
            }

            const data = await response.json();
            if (!response.ok) {
                showError(data.detail || data.message || 'Login failed. Please check your credentials.');
                return;
            }

            const accessToken = data.token || data.access;
            localStorage.setItem('token', accessToken);
            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('username', username);
            localStorage.setItem('userRole', data.role || 'tenant_admin');
            localStorage.setItem('role', data.role || 'tenant_admin');
            if (data.user_id) localStorage.setItem('user_id', data.user_id);
            localStorage.setItem('two_factor_enabled', data.two_factor_enabled ? '1' : '0');
            if (data.tenant_slug) localStorage.setItem('tenant_slug', data.tenant_slug);
            if (companyCode) localStorage.setItem('company_code', companyCode);
            if (data.company_name) localStorage.setItem('company_name', data.company_name);

            const redirectURL = getRedirectURL(data);
            window.location.href = redirectURL;
        } catch (error) {
            console.error('Login error:', error);
            showError('Unable to connect to server. Please make sure the backend is running.');
        } finally {
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
    }
});
