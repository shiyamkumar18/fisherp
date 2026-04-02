// Fish ERP - Login JavaScript
// Uses centralized API and TokenManager from js/api.js

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
        return `/login/${encodeURIComponent(companyCode.toLowerCase())}/`;
    }
    return `/auth/login/`;
}

document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.querySelector('.btn-login');
    const loginTypeInputs = document.querySelectorAll('input[name="loginType"]');
    const companyOnlyFields = document.querySelectorAll('.company-only');
    const usernameLabel = document.getElementById('usernameLabel');
    const loginButtonText = document.getElementById('loginButtonText');
    const companyCodeInput = document.getElementById('companyCode');
    const companyCodeStatus = document.getElementById('companyCodeStatus');
    const usernameInput = document.getElementById('username');
    const usernameStatus = document.getElementById('usernameStatus');
    const demoToggle = document.getElementById('demoToggle');
    const demoCredentials = document.getElementById('demoCredentials');

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

        if (companyCodeInput && !isCompany) {
            companyCodeInput.classList.remove('valid', 'invalid');
            if (companyCodeStatus) companyCodeStatus.textContent = '';
        }
    };

    const isLikelyEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const isLikelyPhone = (value) => /^\+?[0-9][0-9\s-]{7,}$/.test(value);
    const isValidCompanyCode = (value) => /^[A-Za-z0-9]{3,12}$/.test(value);

    const setFieldState = (field, statusEl, type, message) => {
        if (!field || !statusEl) return;
        field.classList.remove('valid', 'invalid');
        statusEl.classList.remove('success', 'error');
        if (!type) {
            statusEl.textContent = '';
            return;
        }
        field.classList.add(type === 'success' ? 'valid' : 'invalid');
        statusEl.classList.add(type);
        statusEl.textContent = message;
    };

    const validateCompanyCode = () => {
        if (!companyCodeInput || !companyCodeStatus) return true;
        const value = companyCodeInput.value.trim();
        if (!value) {
            setFieldState(companyCodeInput, companyCodeStatus, '', '');
            return true;
        }
        if (!isValidCompanyCode(value)) {
            setFieldState(companyCodeInput, companyCodeStatus, 'error', 'Use 3-12 letters or numbers only.');
            return false;
        }
        setFieldState(companyCodeInput, companyCodeStatus, 'success', 'Looks good.');
        return true;
    };

    const validateUsernameHint = () => {
        if (!usernameInput || !usernameStatus) return;
        const value = usernameInput.value.trim();
        if (!value) {
            setFieldState(usernameInput, usernameStatus, '', '');
            return;
        }
        if (isLikelyEmail(value)) {
            setFieldState(usernameInput, usernameStatus, 'success', 'Email format detected.');
            return;
        }
        if (isLikelyPhone(value)) {
            setFieldState(usernameInput, usernameStatus, 'success', 'Phone format detected.');
            return;
        }
        setFieldState(usernameInput, usernameStatus, '', 'Username format detected.');
    };

    if (companyCodeInput) {
        companyCodeInput.addEventListener('input', validateCompanyCode);
        companyCodeInput.addEventListener('blur', validateCompanyCode);
    }

    if (usernameInput) {
        usernameInput.addEventListener('input', validateUsernameHint);
        usernameInput.addEventListener('blur', validateUsernameHint);
    }

    if (demoToggle && demoCredentials) {
        demoToggle.addEventListener('click', () => {
            const isExpanded = demoToggle.getAttribute('aria-expanded') === 'true';
            demoToggle.setAttribute('aria-expanded', String(!isExpanded));
            demoToggle.textContent = isExpanded ? 'Show demo users' : 'Hide demo users';
            demoCredentials.hidden = isExpanded;
        });
    }

    document.querySelectorAll('.credential-copy').forEach((button) => {
        button.addEventListener('click', async () => {
            const value = button.getAttribute('data-copy');
            if (!value) return;
            try {
                await navigator.clipboard.writeText(value);
                const previous = button.textContent;
                button.textContent = 'Copied';
                setTimeout(() => {
                    button.textContent = previous;
                }, 1000);
            } catch (error) {
                console.warn('Clipboard write failed:', error);
            }
        });
    });

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

        if (loginType === 'company' && !validateCompanyCode()) {
            showError('Please fix the company code format or leave it empty.');
            return;
        }

        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
        loginBtn.setAttribute('aria-busy', 'true');
        errorMessage.classList.remove('show');
        errorMessage.textContent = '';

        try {
            const requestBody = { username, password };
            const API_BASE_URL = `${window.location.origin}/api`;

            let response;
            if (loginType === 'platform') {
                response = await fetch(`${API_BASE_URL}/platform/login/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                    credentials: 'include'
                });

                // Backward-compatible fallback if older route is still configured in some environments.
                if (response.status === 404) {
                    response = await fetch(`${API_BASE_URL}/auth/platform-login/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody),
                        credentials: 'include'
                    });
                }
            } else {
                response = await fetch(`${API_BASE_URL}${getCompanyLoginURL(companyCode)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                    credentials: 'include'
                });

                // If company-code route is unavailable, retry on unified endpoint.
                if ((response.status === 404 || response.status === 400) && companyCode) {
                    response = await fetch(`${API_BASE_URL}/auth/login/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody),
                        credentials: 'include'
                    });
                }
            }

            const data = await response.json();
            if (!response.ok) {
                showError(data.detail || data.message || 'Login failed. Please check your credentials.');
                return;
            }

            // Use TokenManager from centralized API module
            const accessToken = data.token || data.access;
            if (window.TokenManager) {
                TokenManager.setToken(accessToken);
                if (data.refresh) TokenManager.setRefreshToken(data.refresh);
            } else {
                localStorage.setItem('token', accessToken);
                localStorage.setItem('access_token', accessToken);
            }
            
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
            loginBtn.setAttribute('aria-busy', 'false');
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
    }
});
