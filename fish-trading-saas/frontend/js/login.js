// DEPRECATED: Landing now uses auth-modal.js
// Skip overlay on landing page
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        return;
    }
    // Check auth on load
    checkAuth();
    
    function checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) {
            showLoginModal();
            return;
        }
        // Valid token, hide login, init app
        document.body.classList.remove('login-overlay');
        initApp();
    }
    
    function showLoginModal() {
        // Create overlay with blur effect
        const overlayHTML = `
            <div id="login-overlay" class="login-overlay show">
                <div class="login-modal">
                    <div class="brand-logo">🐟 Fish Trading SaaS</div>
                    <h2>Welcome Back</h2>
                    <p>Enter your credentials to access your dashboard</p>
                    
                    <form id="quickLoginForm">
                        <div class="form-group">
                            <input type="text" id="quickUsername" placeholder="Email / Username" required autocomplete="username">
                        </div>
                        <div class="form-group">
                            <input type="password" id="quickPassword" placeholder="Password" required autocomplete="current-password">
                        </div>
                        <button type="submit" class="login-btn">Sign In Securely</button>
                        <div class="demo-link" onclick="useDemoAccount()">Demo: admin/admin123</div>
                    </form>
                    
                    <div class="error" id="loginError"></div>
                    <div class="switch-mode">
                        <a href="login.html">Full Login Page →</a>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', overlayHTML);
        document.body.classList.add('login-overlay');
        
// Login handler w/ platform/tenant redirect (PRODUCTION)
        document.getElementById('quickLoginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('quickUsername').value;
            const password = document.getElementById('quickPassword').value;
            
            const result = await window.App.apiCall('/api/auth/login/', 'POST', { username, password });
            if (result && result.user) {
                localStorage.setItem('token', result.access);
                localStorage.setItem('userRole', result.user.role || 'tenant_admin');
                localStorage.setItem('isPlatformUser', result.user.is_platform_user || false);
                localStorage.setItem('companyId', result.user.company_id || null);
                
                document.getElementById('login-overlay').remove();
                document.body.classList.remove('login-overlay');
                
                // FINAL PRODUCTION ROUTING
                if (result.user.is_platform_user) {
                    window.location.href = '/platform/dashboard/';
                } else {
                    window.location.href = '/app/dashboard/';
                }
            } else {
                document.getElementById('loginError').textContent = 'Invalid credentials';
            }
        });
    }
    
    window.useDemoAccount = () => {
        document.getElementById('quickUsername').value = 'admin';
        document.getElementById('quickPassword').value = 'admin123';
    };
    
    function initApp() {
        if (window.App && window.App.loadPage) {
            window.App.loadPage('dashboard');
        }
    }
    
    // CSS for overlay (inline)
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
        .form-group { margin: 1rem 0; }
        .form-group input { width: 100%; padding: 12px; border: 2px solid #e1e5e9; 
            border-radius: 12px; font-size: 16px; transition: border-color 0.3s; }
        .form-group input:focus { outline: none; border-color: #0077b6; }
        .login-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #0077b6, #00b4d8); 
            color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; 
            cursor: pointer; transition: transform 0.2s; }
        .login-btn:hover { transform: translateY(-2px); }
        .demo-link { color: #666; cursor: pointer; font-size: 14px; margin-top: 1rem; }
        .error { color: #e74c3c; margin-top: 1rem; }
        .switch-mode { margin-top: 1.5rem; font-size: 14px; }
        .switch-mode a { color: #0077b6; text-decoration: none; }
        body.login-overlay * { pointer-events: none; }
        body.login-overlay #login-overlay * { pointer-events: auto; }
        body.login-overlay .top-bar, body.login-overlay .sidebar { filter: blur(5px); opacity: 0.5; }
    `;
    document.head.appendChild(style);
});

