// Landing auth modal controller

let currentTab = 'login';

function openAuthModal(tab = 'login') {
    currentTab = tab;
    const container = document.getElementById('auth-modal-container');
    if (!container) return;

    container.innerHTML = getModalHTML();

    const modal = container.querySelector('.auth-modal');
    window.requestAnimationFrame(() => {
        modal?.classList.add('show');
        document.body.style.overflow = 'hidden';
        setInitialFocus(tab);
    });

    attachHandlers();
    switchTab(tab);
}

function closeAuthModal() {
    const container = document.getElementById('auth-modal-container');
    if (!container) return;

    const modal = container.querySelector('.auth-modal');
    modal?.classList.remove('show');

    window.setTimeout(() => {
        container.innerHTML = '';
        document.body.style.overflow = '';
    }, 220);
}

function setInitialFocus(tab) {
    const focusTarget = tab === 'register'
        ? document.getElementById('reg-company')
        : document.getElementById('login-username');
    focusTarget?.focus();
}

function getModalHTML() {
    return `
    <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div>
        <div class="modal-header">
          <div>
            <div class="modal-logo"><i class="fas fa-water"></i> FisherP</div>
            <h2 id="modal-title">Access Your Workspace</h2>
          </div>
          <button class="modal-close" type="button" onclick="closeAuthModal()" aria-label="Close">&times;</button>
        </div>

        <div class="tab-switcher">
          <button class="tab-btn active" type="button" data-tab="login">Login</button>
          <button class="tab-btn" type="button" data-tab="register">Register</button>
        </div>

        <div class="tab-content active" data-tab="login">
          <form id="login-form">
            <div class="form-group">
              <input type="text" id="login-username" placeholder="Email / mobile / username" autocomplete="username" required>
              <div class="error" id="login-username-error"></div>
            </div>
            <div class="form-group">
              <input type="password" id="login-password" placeholder="Password" autocomplete="current-password" required>
              <div class="error" id="login-password-error"></div>
            </div>
            <div class="form-extras">
              <label class="checkbox">
                <input type="checkbox" id="remember-me">
                Remember me
              </label>
              <a href="/login.html">Advanced login</a>
            </div>
            <button type="submit" class="auth-btn" id="login-btn">
              <span class="btn-text">Login</span>
              <span class="btn-spinner"><i class="fas fa-spinner fa-spin"></i></span>
            </button>
          </form>
        </div>

        <div class="tab-content" data-tab="register">
          <form id="register-form">
            <div class="form-group">
              <input type="text" id="reg-company" placeholder="Company name" required>
              <div class="error" id="reg-company-error"></div>
            </div>
            <div class="form-group">
              <input type="text" id="reg-name" placeholder="Admin full name" required>
              <div class="error" id="reg-name-error"></div>
            </div>
            <div class="form-group">
              <input type="email" id="reg-email" placeholder="Admin email" autocomplete="email" required>
              <div class="error" id="reg-email-error"></div>
            </div>
            <div class="form-group">
              <input type="password" id="reg-password" placeholder="Password (minimum 8 characters)" autocomplete="new-password" required>
              <div class="error" id="reg-password-error"></div>
            </div>
            <button type="submit" class="auth-btn success" id="register-btn">
              <span class="btn-text">Create Workspace</span>
              <span class="btn-spinner"><i class="fas fa-spinner fa-spin"></i></span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach((button) => {
        button.classList.toggle('active', button.dataset.tab === tab);
    });

    document.querySelectorAll('.tab-content').forEach((content) => {
        content.classList.toggle('active', content.dataset.tab === tab);
    });

    setInitialFocus(tab);
}

function attachHandlers() {
    document.querySelectorAll('.tab-btn').forEach((button) => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    loginForm?.addEventListener('submit', handleLogin);
    registerForm?.addEventListener('submit', handleRegister);

    [
        'login-username',
        'login-password',
        'reg-company',
        'reg-name',
        'reg-email',
        'reg-password'
    ].forEach((id) => {
        const input = document.getElementById(id);
        input?.addEventListener('input', () => clearError(id));
    });
}

async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('login-username')?.value.trim() || '';
    const password = document.getElementById('login-password')?.value || '';
    const button = document.getElementById('login-btn');

    if (!username) return showError('login-username', 'Username/email is required.');
    if (!password || password.length < 6) return showError('login-password', 'Password must be at least 6 characters.');

    setLoading(button, true);

    try {
        const payload = await fetchApi('/auth/login/', {
            username,
            password
        });

        if (!payload.ok) {
            showError('login-username', payload.message || 'Login failed. Please check credentials.');
            return;
        }

        const data = payload.data || {};
        const token = data.token || data.access;
        const role = data.role || data.userRole || 'tenant_admin';
        const isPlatform = !!(
            data.is_platform_operator ||
            data.is_platform_support ||
            data.is_platform_super_admin ||
            ['platform_operator', 'platform_support', 'platform_super_admin'].includes(role)
        );

        if (token) {
            localStorage.setItem('token', token);
            localStorage.setItem('access_token', token);
        }
        localStorage.setItem('userRole', role);
        localStorage.setItem('role', role);
        localStorage.setItem('username', username);
        localStorage.setItem('isPlatformUser', String(isPlatform));

        closeAuthModal();
        window.location.href = isPlatform ? '/platform/dashboard.html' : '/app/dashboard.html';
    } catch (error) {
        showError('login-username', 'Unable to connect. Please try again.');
    } finally {
        setLoading(button, false);
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const companyName = document.getElementById('reg-company')?.value.trim() || '';
    const fullName = document.getElementById('reg-name')?.value.trim() || '';
    const email = document.getElementById('reg-email')?.value.trim() || '';
    const password = document.getElementById('reg-password')?.value || '';
    const button = document.getElementById('register-btn');

    if (!companyName) return showError('reg-company', 'Company name is required.');
    if (!fullName) return showError('reg-name', 'Full name is required.');
    if (!email) return showError('reg-email', 'Email is required.');
    if (!password || password.length < 8) return showError('reg-password', 'Password must be at least 8 characters.');

    setLoading(button, true);

    try {
        const payload = await fetchApi('/auth/register/', {
            company_name: companyName,
            full_name: fullName,
            email,
            password,
            confirm_password: password
        });

        if (!payload.ok) {
            showError('reg-email', payload.message || 'Registration failed.');
            return;
        }

        closeAuthModal();
        window.location.href = '/register.html';
    } catch (error) {
        showError('reg-email', 'Unable to connect. Please try again.');
    } finally {
        setLoading(button, false);
    }
}

async function fetchApi(endpoint, body) {
    try {
        const response = await fetch(`${window.location.origin}/api${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            credentials: 'include'
        });

        const data = await response.json();
        return {
            ok: response.ok,
            data,
            message: data.detail || data.message || data.error
        };
    } catch (error) {
        return {
            ok: false,
            data: null,
            message: 'Network error.'
        };
    }
}

function showError(fieldId, message) {
    const element = document.getElementById(`${fieldId}-error`);
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
}

function clearError(fieldId) {
    const element = document.getElementById(`${fieldId}-error`);
    if (!element) return;
    element.classList.remove('show');
}

function setLoading(button, isLoading) {
    if (!button) return;
    button.classList.toggle('loading', isLoading);
    button.disabled = isLoading;
}

document.addEventListener('click', (event) => {
    if (event.target.classList.contains('auth-modal')) {
        closeAuthModal();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeAuthModal();
    }
});