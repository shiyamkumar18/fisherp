// Fish ERP - Login JavaScript
// Uses centralized API and TokenManager from js/api.js

function getRedirectURL(data) {
    const role = data.role || data.userRole;
    if (
        data.is_platform_user ||
        data.is_platform_operator ||
        data.is_platform_support ||
        data.is_platform_super_admin ||
        data.is_platform_maintainer ||
        ['platform_maintainer', 'platform_operator', 'platform_support', 'platform_super_admin'].includes(role)
    ) {
        return '/platform/dashboard.html';
    }

    return '/dashboard.html';
}

document.addEventListener('DOMContentLoaded', function () {
    const searchParams = new URLSearchParams(window.location.search);
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.querySelector('.btn-login');
    const usernameLabel = document.getElementById('usernameLabel');
    const loginButtonText = document.getElementById('loginButtonText');
    const companyNameInput = document.getElementById('companyName');
    const companyNameStatus = document.getElementById('companyNameStatus');
    const usernameInput = document.getElementById('username');
    const usernameStatus = document.getElementById('usernameStatus');
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('passwordToggle');
    const demoToggle = document.getElementById('demoToggle');
    const demoCredentials = document.getElementById('demoCredentials');
    const presetCompanyName = searchParams.get('company_name') || localStorage.getItem('company_name') || '';
    const presetUsername = searchParams.get('username') || '';
    const initialError = searchParams.get('error');

    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = localStorage.getItem('isPlatformUser') === 'true'
            ? '/platform/dashboard.html'
            : '/dashboard.html';
        return;
    }

    const isLikelyEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const isLikelyPhone = (value) => /^\+?[0-9][0-9\s-]{7,}$/.test(value);
    const hasCompanyName = (value) => value.trim().length >= 2;

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

    const validateCompanyName = () => {
        if (!companyNameInput || !companyNameStatus) return true;
        const value = companyNameInput.value.trim();
        if (!value) {
            setFieldState(companyNameInput, companyNameStatus, '', 'Company users should enter their company name or code.');
            return true;
        }
        if (!hasCompanyName(value)) {
            setFieldState(companyNameInput, companyNameStatus, 'error', 'Enter at least 2 characters.');
            return false;
        }
        setFieldState(companyNameInput, companyNameStatus, 'success', 'Company looks valid.');
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

    if (companyNameInput) {
        companyNameInput.addEventListener('input', validateCompanyName);
        companyNameInput.addEventListener('blur', validateCompanyName);
    }

    if (usernameInput) {
        usernameInput.addEventListener('input', validateUsernameHint);
        usernameInput.addEventListener('blur', validateUsernameHint);
    }

    if (companyNameInput && presetCompanyName) {
        companyNameInput.value = presetCompanyName;
        validateCompanyName();
    }

    if (usernameInput && presetUsername) {
        usernameInput.value = presetUsername;
        validateUsernameHint();
    }

    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', () => {
            const nextType = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = nextType;
            const icon = passwordToggle.querySelector('i');
            if (icon) {
                icon.className = nextType === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
            } else {
                passwordToggle.textContent = nextType === 'password' ? 'Show' : 'Hide';
            }
            passwordToggle.setAttribute('aria-label', nextType === 'password' ? 'Show password' : 'Hide password');
        });
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

    if (initialError) {
        showError(initialError);
    }

    if (usernameLabel) usernameLabel.textContent = 'Username / Email / Mobile';
    if (loginButtonText) loginButtonText.textContent = 'Login';

    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const companyName = document.getElementById('companyName')?.value?.trim() || '';

        if (!username || !password) {
            showError('Please enter your username and password.');
            return;
        }

        if (!validateCompanyName()) {
            showError('Please check the company name.');
            return;
        }

        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
        loginBtn.setAttribute('aria-busy', 'true');
        errorMessage.classList.remove('show');
        errorMessage.textContent = '';

        try {
            const requestBody = { username, password, company_name: companyName };
            const API_BASE_URL = `${window.location.origin}/api`;

            const response = await fetch(`${API_BASE_URL}/auth/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                credentials: 'include'
            });

            const data = await response.json();
            if (!response.ok) {
                showError(data.error || data.detail || data.message || 'Login failed. Please check your credentials.');
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
            
            localStorage.setItem('username', data.username || username);
            localStorage.setItem('userRole', data.role || 'tenant_admin');
            localStorage.setItem('role', data.role || 'tenant_admin');
            const isPlatformUser = Boolean(
                data.is_platform_user ||
                data.is_platform_operator ||
                data.is_platform_support ||
                ['platform_operator', 'platform_support', 'platform_maintainer', 'platform_super_admin'].includes(data.role)
            );
            localStorage.setItem('isPlatformUser', isPlatformUser ? 'true' : 'false');
            if (data.user_id) localStorage.setItem('user_id', data.user_id);
            localStorage.setItem('two_factor_enabled', data.two_factor_enabled ? '1' : '0');
            if (data.tenant_slug) localStorage.setItem('tenant_slug', data.tenant_slug);
            else localStorage.removeItem('tenant_slug');
            if (companyName) localStorage.setItem('company_name', companyName);
            else localStorage.removeItem('company_name');
            if (data.company_name) localStorage.setItem('company_name', data.company_name);

            const redirectURL = data.redirect_url || getRedirectURL(data);
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
