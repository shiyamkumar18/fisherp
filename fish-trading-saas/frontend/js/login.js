// Legacy protected-page login overlay.
// Keep it aligned with the main login page so users only see one login pattern.
document.addEventListener('DOMContentLoaded', function() {
    if (
        window.location.pathname === '/' ||
        window.location.pathname.includes('index.html') ||
        window.location.pathname.endsWith('/landing.html') ||
        window.location.pathname.endsWith('/login.html')
    ) {
        return;
    }

    checkAuth();

    function checkAuth() {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            showLoginModal();
            return;
        }

        document.body.classList.remove('login-overlay');
        initApp();
    }

    function showLoginModal() {
        const overlayHTML = `
            <div id="login-overlay" class="login-overlay show">
                <div class="login-modal">
                    <div class="brand-logo">🐟 Fish Trading SaaS</div>
                    <h2>Welcome Back</h2>
                    <p>Sign in with your company name, username, and password.</p>

                    <form id="quickLoginForm">
                        <div class="form-group">
                            <label for="quickCompany">Company Name</label>
                            <input type="text" id="quickCompany" placeholder="Enter company name or code" autocomplete="organization">
                            <div class="helper-text">Company users should enter their company name or code. Platform users can leave this blank.</div>
                        </div>
                        <div class="form-group">
                            <label for="quickUsername">Username / Email / Mobile</label>
                            <input type="text" id="quickUsername" placeholder="Enter username, email, or mobile" required autocomplete="username">
                        </div>
                        <div class="form-group">
                            <label for="quickPassword">Password</label>
                            <div class="password-field">
                                <input type="password" id="quickPassword" placeholder="Enter password" required autocomplete="current-password">
                                <button type="button" class="password-toggle" id="quickPasswordToggle" aria-label="Show password">
                                    <i class="fas fa-eye" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                        <div class="form-meta">
                            <a href="mailto:support@fisherp.com?subject=Forgot%20Password">Forgot password?</a>
                        </div>
                        <button type="submit" class="login-btn">Sign In Securely</button>
                        <div class="demo-link" onclick="useDemoAccount()">Demo: tenant1 / admin / admin123</div>
                    </form>

                    <div class="error" id="loginError"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', overlayHTML);
        document.body.classList.add('login-overlay');

        const presetCompany = localStorage.getItem('company_name');
        if (presetCompany) {
            document.getElementById('quickCompany').value = presetCompany;
        }

        document.getElementById('quickPasswordToggle').addEventListener('click', () => {
            const passwordInput = document.getElementById('quickPassword');
            const nextType = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = nextType;
            document.getElementById('quickPasswordToggle').setAttribute('aria-label', nextType === 'password' ? 'Show password' : 'Hide password');
            document.getElementById('quickPasswordToggle').innerHTML = nextType === 'password'
                ? '<i class="fas fa-eye" aria-hidden="true"></i>'
                : '<i class="fas fa-eye-slash" aria-hidden="true"></i>';
        });

        document.getElementById('quickLoginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const companyName = document.getElementById('quickCompany').value.trim();
            const username = document.getElementById('quickUsername').value.trim();
            const password = document.getElementById('quickPassword').value;
            const loginError = document.getElementById('loginError');

            loginError.textContent = '';

            if (!username || !password) {
                loginError.textContent = 'Please enter your username and password.';
                return;
            }

            try {
                const response = await fetch(`${window.location.origin}/api/auth/login/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        company_name: companyName,
                        username,
                        password
                    }),
                    credentials: 'include'
                });

                const result = await response.json();
                if (!response.ok) {
                    loginError.textContent = result.error || result.detail || result.message || 'Invalid credentials';
                    return;
                }

                const accessToken = result.token || result.access;
                const role = result.role || 'tenant_admin';
                const isPlatformUser = Boolean(
                    result.is_platform_user ||
                    result.is_platform_operator ||
                    result.is_platform_support ||
                    ['platform_operator', 'platform_support', 'platform_maintainer', 'platform_super_admin'].includes(role)
                );

                if (accessToken) {
                    localStorage.setItem('token', accessToken);
                    localStorage.setItem('access_token', accessToken);
                }
                localStorage.setItem('username', result.username || username);
                localStorage.setItem('userRole', role);
                localStorage.setItem('role', role);
                localStorage.setItem('isPlatformUser', isPlatformUser ? 'true' : 'false');
                if (result.user_id) localStorage.setItem('user_id', result.user_id);
                if (result.tenant_slug) localStorage.setItem('tenant_slug', result.tenant_slug);
                else localStorage.removeItem('tenant_slug');
                if (result.company_name) localStorage.setItem('company_name', result.company_name);
                else if (companyName) localStorage.setItem('company_name', companyName);
                else localStorage.removeItem('company_name');

                document.getElementById('login-overlay').remove();
                document.body.classList.remove('login-overlay');

                window.location.href = result.redirect_url || (isPlatformUser ? '/platform/dashboard.html' : '/dashboard.html');
            } catch (error) {
                loginError.textContent = 'Unable to connect to server. Please try again.';
            }
        });
    }

    window.useDemoAccount = () => {
        const companyField = document.getElementById('quickCompany');
        if (companyField) {
            companyField.value = 'tenant1';
        }
        document.getElementById('quickUsername').value = 'admin';
        document.getElementById('quickPassword').value = 'admin123';
    };

    function initApp() {
        if (window.App && window.App.loadPage) {
            window.App.loadPage('dashboard');
        }
    }

    const style = document.createElement('style');
    style.textContent = `
        .login-overlay { 
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
            background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); z-index: 9999; 
            display: flex; align-items: center; justify-content: center;
        }
        .login-overlay.show { display: flex !important; }
        .login-modal {
            background: white; border-radius: 20px; padding: 2rem; max-width: 400px; 
            box-shadow: 0 25px 50px rgba(0,0,0,0.25); text-align: center;
        }
        .brand-logo { font-size: 2.5rem; margin-bottom: 1rem; }
        .form-group { margin: 1rem 0; text-align: left; }
        .form-group label { display: block; margin-bottom: 0.45rem; font-weight: 700; color: #163042; }
        .form-group input { width: 100%; padding: 12px; border: 2px solid #e1e5e9; 
            border-radius: 12px; font-size: 16px; transition: border-color 0.3s; }
        .form-group input:focus { outline: none; border-color: #0077b6; }
        .password-field { position: relative; }
        .password-field input { padding-right: 52px; }
        .password-toggle { position: absolute; top: 50%; right: 8px; transform: translateY(-50%); width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 10px; background: transparent; color: #5f7285; cursor: pointer; }
        .password-toggle:hover { background: rgba(0,119,182,0.08); color: #0077b6; }
        .form-meta { display: flex; justify-content: flex-end; margin: 0 0 1rem; font-size: 14px; }
        .form-meta a { color: #0077b6; text-decoration: none; }
        .helper-text { margin-top: 0.45rem; color: #5b7080; font-size: 13px; line-height: 1.45; }
        .login-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #0077b6, #00b4d8); 
            color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; 
            cursor: pointer; transition: transform 0.2s; }
        .login-btn:hover { transform: translateY(-2px); }
        .demo-link { color: #666; cursor: pointer; font-size: 14px; margin-top: 1rem; }
        .error { color: #e74c3c; margin-top: 1rem; }
        body.login-overlay * { pointer-events: none; }
        body.login-overlay #login-overlay * { pointer-events: auto; }
        body.login-overlay .top-bar, body.login-overlay .sidebar { filter: blur(5px); opacity: 0.5; }
    `;
    document.head.appendChild(style);
});
