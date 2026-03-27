// Unified Auth Modal - Login/Register Toggle
// Mobile-first, spec-compliant (420-480px desktop, full mobile)
// Tabs, validation, loading, role-redirects

let currentTab = 'login';

function openAuthModal(tab = 'login') {
  currentTab = tab;
  const container = document.getElementById('auth-modal-container');
  container.innerHTML = getModalHTML();
  
  // Show with animation
  const modal = container.querySelector('.auth-modal');
  setTimeout(() => {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    // Auto-focus
    document.getElementById('login-email')?.focus();
  }, 10);
  
  // Init tab
  switchTab(tab);
  attachHandlers();
}

function closeAuthModal() {
  const container = document.getElementById('auth-modal-container');
  const modal = container.querySelector('.auth-modal');
  modal.classList.remove('show');
  setTimeout(() => {
    container.innerHTML = '';
    document.body.style.overflow = '';
  }, 300);
}

function switchTab(tab) {
  currentTab = tab;
  const loginTab = document.querySelector('[data-tab="login"]');
  const registerTab = document.querySelector('[data-tab="register"]');
  const loginContent = document.querySelector('.tab-content[data-tab="login"]');
  const registerContent = document.querySelector('.tab-content[data-tab="register"]');
  
  // Tab buttons
  loginTab.classList.toggle('active', tab === 'login');
  registerTab.classList.toggle('active', tab === 'register');
  
  // Content slide animation
  loginContent.classList.toggle('active', tab === 'login');
  registerContent.classList.toggle('active', tab === 'register');
}

function getModalHTML() {
  return `
    <div class="auth-modal">
      <div class="modal-header">
        <div class="modal-logo"><i class="fas fa-fish"></i> FishTrader</div>
        <h2 id="modal-title">${currentTab === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
        <button class="modal-close" onclick="closeAuthModal()">&amp;times;</button>
      </div>
      
      <div class="tab-switcher">
        <button class="tab-btn active" data-tab="login" onclick="switchTab('login')">
          Login
        </button>
        <button class="tab-btn" data-tab="register" onclick="switchTab('register')">
          Register
        </button>
      </div>
      
      <div class="tab-contents">
        <!-- Login Tab -->
        <div class="tab-content active" data-tab="login">
          <form id="login-form">
            <div class="form-group">
              <input type="email" id="login-email" placeholder="Email or Phone" required>
              <div class="error" id="login-email-error"></div>
            </div>
            <div class="form-group">
              <input type="password" id="login-password" placeholder="Password" required>
              <div class="error" id="login-password-error"></div>
            </div>
            <div class="form-extras">
              <label class="checkbox">
                <input type="checkbox" id="remember">
                Remember me
              </label>
              <a href="#" class="forgot-link">Forgot password?</a>
            </div>
            <button type="submit" class="auth-btn" id="login-btn">
              <span class="btn-text">Login</span>
              <span class="btn-spinner"><i class="fas fa-spinner fa-spin"></i></span>
            </button>
          </form>
        </div>
        
        <!-- Register Tab -->
        <div class="tab-content" data-tab="register">
          <form id="register-form">
            <div class="form-group">
              <input type="text" id="reg-company" placeholder="Company Name" required>
              <div class="error" id="reg-company-error"></div>
            </div>
            <div class="form-group">
              <input type="text" id="reg-name" placeholder="Full Name" required>
              <div class="error" id="reg-name-error"></div>
            </div>
            <div class="form-group">
              <input type="tel" id="reg-phone" placeholder="Phone or Email" required>
              <div class="error" id="reg-phone-error"></div>
            </div>
            <div class="form-group">
              <input type="password" id="reg-password" placeholder="Password (min 6 chars)" required>
              <div class="error" id="reg-password-error"></div>
            </div>
            <button type="submit" class="auth-btn success" id="register-btn">
              <span class="btn-text">Create Account</span>
              <span class="btn-spinner"><i class="fas fa-spinner fa-spin"></i></span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
}

function attachHandlers() {
  // Tab switches
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(btn.dataset.tab);
    });
  });

  // Login form
  document.getElementById('login-form').addEventListener('submit', handleLogin);

  // Register form
  document.getElementById('register-form').addEventListener('submit', handleRegister);

  // Input validation live
  ['login-email', 'login-password', 'reg-company', 'reg-name', 'reg-phone', 'reg-password'].forEach(id => {
    document.getElementById(id).addEventListener('input', clearError);
  });
}

async function handleLogin(e) {
  e.preventDefault();
  
  const btn = document.getElementById('login-btn');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const remember = document.getElementById('remember').checked;
  
  // Validation
  if (!email) return showError('login-email', 'Email is required');
  if (!password || password.length < 6) return showError('login-password', 'Password must be at least 6 characters');
  
  setLoading(btn, true);
  
  try {
    // Use central API call
    const result = await App.apiCall('/api/auth/login/', 'POST', { email, password });
    
    if (!result) {
      showError('login-email', 'Invalid credentials');
      return;
    }
    
    if (result.error) {
      showError('login-email', result.error);
      return;
    }
    
    // Store
    localStorage.setItem('token', result.access);
    localStorage.setItem('userRole', result.user.role || 'tenant_admin');
    localStorage.setItem('isPlatformUser', result.user.is_platform_user || false);
    localStorage.setItem('companyId', result.user.company_id || null);
    if (remember) localStorage.setItem('rememberMe', 'true');
    
    // Success toast + delayed redirect
    UI.showAlert('Login successful', 'success');
    closeAuthModal();
    setTimeout(() => {
      if (result.user.is_platform_user) {
        window.location.href = '/platform/dashboard.html';
      } else {
        window.location.href = '/app/dashboard.html';
      }
    }, 1200);
    
  } catch (err) {
    showError('login-email', 'Network error. Try again.');
  } finally {
    setLoading(btn, false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  
  const btn = document.getElementById('register-btn');
  const company = document.getElementById('reg-company').value.trim();
  const name = document.getElementById('reg-name').value.trim();
  const phoneEmail = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;
  
  // Validation
  if (!company || !name || !phoneEmail || !password) return showFieldError('All fields required');
  if (password.length < 6) return showError('reg-password', 'Password ≥ 6 chars');
  
  setLoading(btn, true);
  
  try {
    const response = await fetch('/api/auth/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: company,
        full_name: name,
        phone_or_email: phoneEmail,
        password
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      showError('reg-phone', data.error || 'Registration failed');
      return;
    }
    
    // Success: redirect to login
    closeAuthModal();
    UI.showAlert('Account created! Please login.', 'success');
    setTimeout(() => {
      openAuthModal('login');
    }, 1500);
    
  } catch (err) {
    showError('reg-phone', 'Network error.');
  } finally {
    setLoading(btn, false);
  }
}

function showError(fieldId, message) {
  clearError(fieldId);
  const errorEl = document.getElementById(fieldId + '-error');
  errorEl.textContent = message;
  errorEl.classList.add('show');
}

function clearError(e) {
  if (typeof e === 'string') {
    document.getElementById(e + '-error')?.classList.remove('show');
  } else {
    clearError(e.target.id);
  }
}

function setLoading(btn, loading) {
  btn.classList.toggle('loading', loading);
  btn.disabled = loading;
}

// Close on overlay/esc
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('auth-modal')) closeAuthModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAuthModal();
});

