// Landing auth modal controller

const OTP_DIGITS = 6;
let otpTimerId = null;
let otpSecondsRemaining = 0;
let activePhone = '';
let activeVerificationId = '';

function openAuthModal(tab = 'login') {
    if (tab === 'register') {
        window.location.href = '/register.html';
        return;
    }

    const container = document.getElementById('auth-modal-container');
    if (!container) return;

    container.innerHTML = getModalHTML();

    const modal = container.querySelector('.auth-modal');
    window.requestAnimationFrame(() => {
        modal?.classList.add('show');
        document.body.style.overflow = 'hidden';
        document.getElementById('login-phone')?.focus();
    });

    attachHandlers();
}

function closeAuthModal() {
    const container = document.getElementById('auth-modal-container');
    if (!container) return;

    if (otpTimerId) {
        window.clearInterval(otpTimerId);
        otpTimerId = null;
    }

    const modal = container.querySelector('.auth-modal');
    modal?.classList.remove('show');

    window.setTimeout(() => {
        container.innerHTML = '';
        document.body.style.overflow = '';
    }, 220);
}

function getModalHTML() {
    return `
    <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="auth-modal-card auth-modal-card-otp">
        <div class="modal-header">
          <div class="modal-header-copy">
            <div class="modal-logo"><i class="fas fa-water"></i><span>FisherP</span></div>
            <h2 id="modal-title">Login</h2>
            <p class="modal-subtitle">Fast mobile login for fish traders and shop owners.</p>
          </div>
          <button class="modal-close" type="button" onclick="closeAuthModal()" aria-label="Close">&times;</button>
        </div>

        <form id="login-form" class="otp-auth-form">
          <section id="phone-step" class="otp-step active" aria-label="Phone number step">
            <div class="form-group">
              <label for="login-phone">Mobile Number</label>
              <div class="phone-field">
                <span class="phone-prefix">+91</span>
                <input type="tel" id="login-phone" inputmode="numeric" maxlength="10" placeholder="Enter mobile number" autocomplete="tel-national" required>
              </div>
              <div class="error" id="login-phone-error"></div>
            </div>

            <button type="submit" class="auth-btn" id="send-otp-btn">
              <span class="btn-text">Send OTP</span>
              <span class="btn-spinner"><i class="fas fa-spinner fa-spin"></i></span>
            </button>
          </section>

          <section id="otp-step" class="otp-step" aria-label="OTP verification step" hidden>
            <div class="otp-summary">
              <strong>Enter OTP</strong>
              <p id="otp-summary-text">We sent a 6-digit code to your mobile number.</p>
            </div>

            <div class="otp-inputs" id="otp-inputs">
              ${Array.from({ length: OTP_DIGITS }).map((_, index) => `
                <input
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  maxlength="1"
                  class="otp-box"
                  data-otp-index="${index}"
                  aria-label="OTP digit ${index + 1}"
                >
              `).join('')}
            </div>

            <div class="error otp-error" id="login-otp-error"></div>

            <div class="otp-actions">
              <button type="button" class="auth-btn" id="verify-otp-btn">
                <span class="btn-text">Verify & Login</span>
                <span class="btn-spinner"><i class="fas fa-spinner fa-spin"></i></span>
              </button>
              <div class="otp-meta">
                <button type="button" class="auth-text-link" id="change-number-btn">Change number</button>
                <button type="button" class="auth-text-link" id="resend-otp-btn" disabled>Resend OTP in 30s</button>
              </div>
            </div>
          </section>

          <div class="auth-footer">
            <div class="auth-footer-row auth-footer-row-stack">
              <p class="auth-footer-copy">New user? <button type="button" class="auth-text-link" id="register-btn">Register</button></p>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
}

function attachHandlers() {
    document.getElementById('login-form')?.addEventListener('submit', handleSendOTP);
    document.getElementById('verify-otp-btn')?.addEventListener('click', handleVerifyOTP);
    document.getElementById('change-number-btn')?.addEventListener('click', showPhoneStep);
    document.getElementById('resend-otp-btn')?.addEventListener('click', resendOTP);
    document.getElementById('register-btn')?.addEventListener('click', () => {
        const params = new URLSearchParams();
        const phone = normalizePhone(document.getElementById('login-phone')?.value || '');
        if (phone) params.set('phone', phone);
        window.location.href = `/register.html${params.toString() ? `?${params.toString()}` : ''}`;
    });

    const phoneInput = document.getElementById('login-phone');
    phoneInput?.addEventListener('input', () => {
        phoneInput.value = normalizePhone(phoneInput.value).slice(0, 10);
        clearError('login-phone');
    });

    const otpBoxes = Array.from(document.querySelectorAll('.otp-box'));
    otpBoxes.forEach((input, index) => {
        input.addEventListener('input', (event) => {
            const value = String(event.target.value || '').replace(/\D/g, '').slice(0, 1);
            event.target.value = value;
            clearError('login-otp');
            if (value && index < otpBoxes.length - 1) {
                otpBoxes[index + 1].focus();
            }
            if (getOTPValue().length === OTP_DIGITS) {
                handleVerifyOTP();
            }
        });

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Backspace' && !input.value && index > 0) {
                otpBoxes[index - 1].focus();
            }
        });

        input.addEventListener('paste', (event) => {
            event.preventDefault();
            const pasted = String(event.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, OTP_DIGITS);
            if (!pasted) return;
            otpBoxes.forEach((box, boxIndex) => {
                box.value = pasted[boxIndex] || '';
            });
            if (pasted.length === OTP_DIGITS) {
                handleVerifyOTP();
            } else {
                otpBoxes[Math.min(pasted.length, otpBoxes.length - 1)]?.focus();
            }
        });
    });
}

function normalizePhone(value) {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
        digits = digits.slice(2);
    }
    return digits;
}

function getOTPValue() {
    return Array.from(document.querySelectorAll('.otp-box')).map((input) => input.value || '').join('');
}

function showPhoneStep() {
    toggleStep('phone');
    document.getElementById('login-phone')?.focus();
}

function showOTPStep() {
    toggleStep('otp');
    document.querySelector('.otp-box')?.focus();
}

function toggleStep(step) {
    const phoneStep = document.getElementById('phone-step');
    const otpStep = document.getElementById('otp-step');
    if (!phoneStep || !otpStep) return;

    const isPhoneStep = step === 'phone';
    phoneStep.hidden = !isPhoneStep;
    otpStep.hidden = isPhoneStep;
    phoneStep.classList.toggle('active', isPhoneStep);
    otpStep.classList.toggle('active', !isPhoneStep);
}

function setLoading(button, isLoading) {
    if (!button) return;
    button.classList.toggle('loading', isLoading);
    button.disabled = isLoading;
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
    element.textContent = '';
    element.classList.remove('show');
}

async function handleSendOTP(event) {
    if (event) event.preventDefault();

    const phoneInput = document.getElementById('login-phone');
    const phone = normalizePhone(phoneInput?.value || '');
    const button = document.getElementById('send-otp-btn');

    clearError('login-phone');

    if (phone.length !== 10) {
        showError('login-phone', 'Enter a valid 10-digit mobile number.');
        phoneInput?.focus();
        return;
    }

    setLoading(button, true);
    try {
        const payload = await postJSON('/send-otp/', { phone, purpose: 'login' });
        if (!payload.ok) {
            showError('login-phone', payload.message || 'Unable to send OTP.');
            return;
        }

        activePhone = phone;
        activeVerificationId = payload.data.verification_id || '';
        document.getElementById('otp-summary-text').textContent = `We sent a 6-digit code to +91 ${phone}.`;
        if (payload.data.otp_debug) {
            console.info('FisherP OTP (debug):', payload.data.otp_debug);
        }
        Array.from(document.querySelectorAll('.otp-box')).forEach((input) => { input.value = ''; });
        startOTPResendTimer(30);
        showOTPStep();
    } finally {
        setLoading(button, false);
    }
}

async function resendOTP() {
    const resendButton = document.getElementById('resend-otp-btn');
    if (!activePhone || resendButton?.disabled) return;
    await handleSendOTP();
}

function startOTPResendTimer(seconds) {
    const resendButton = document.getElementById('resend-otp-btn');
    if (!resendButton) return;

    if (otpTimerId) {
        window.clearInterval(otpTimerId);
        otpTimerId = null;
    }

    otpSecondsRemaining = seconds;
    resendButton.disabled = true;
    resendButton.textContent = `Resend OTP in ${otpSecondsRemaining}s`;

    otpTimerId = window.setInterval(() => {
        otpSecondsRemaining -= 1;
        if (otpSecondsRemaining <= 0) {
            window.clearInterval(otpTimerId);
            otpTimerId = null;
            resendButton.disabled = false;
            resendButton.textContent = 'Resend OTP';
            return;
        }
        resendButton.textContent = `Resend OTP in ${otpSecondsRemaining}s`;
    }, 1000);
}

async function handleVerifyOTP() {
    const otp = getOTPValue();
    const button = document.getElementById('verify-otp-btn');

    clearError('login-otp');

    if (activePhone.length !== 10) {
        showPhoneStep();
        return;
    }

    if (otp.length !== OTP_DIGITS) {
        showError('login-otp', 'Enter the 6-digit OTP.');
        return;
    }

    setLoading(button, true);
    try {
        const payload = await postJSON('/verify-otp/', {
            phone: activePhone,
            otp,
            verification_id: activeVerificationId,
        });

        if (!payload.ok) {
            showError('login-otp', payload.message || 'OTP verification failed.');
            return;
        }

        const data = payload.data || {};
        if (data.user_exists) {
            persistAuthSession(data);
            closeAuthModal();
            window.location.href = resolvePostLoginURL(data.redirect_url);
            return;
        }

        const params = new URLSearchParams({
            phone: activePhone,
            verification_token: data.verification_token || '',
        });
        window.location.href = `/register.html?${params.toString()}`;
    } finally {
        setLoading(button, false);
    }
}

function persistAuthSession(data) {
    const accessToken = data.token || data.access;
    const role = data.role || 'tenant_admin';
    const isPlatform = Boolean(
        data.is_platform_user ||
        data.is_platform_operator ||
        data.is_platform_support ||
        ['platform_operator', 'platform_support', 'platform_maintainer', 'platform_super_admin'].includes(role)
    );

    if (accessToken) {
        localStorage.setItem('token', accessToken);
        localStorage.setItem('access_token', accessToken);
    }
    localStorage.setItem('username', data.username || activePhone);
    localStorage.setItem('userRole', role);
    localStorage.setItem('role', role);
    localStorage.setItem('isPlatformUser', isPlatform ? 'true' : 'false');
    if (data.user_id) localStorage.setItem('user_id', data.user_id);
    if (data.phone) localStorage.setItem('phone', data.phone);
    if (data.tenant_slug) localStorage.setItem('tenant_slug', data.tenant_slug);
    else localStorage.removeItem('tenant_slug');
    if (data.company_name) localStorage.setItem('company_name', data.company_name);
    else localStorage.removeItem('company_name');
}

function resolvePostLoginURL(defaultUrl) {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
        return next;
    }
    return defaultUrl || '/dashboard.html';
}

async function postJSON(endpoint, body) {
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
            message: 'Network error. Please try again.'
        };
    }
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
