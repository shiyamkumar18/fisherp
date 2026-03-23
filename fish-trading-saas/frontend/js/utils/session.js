// Fish ERP - Session Management Utility

const SessionManager = {
    // Session timeout in milliseconds (default 30 minutes)
    timeout: 30 * 60 * 1000,
    
    // Warning before timeout (default 5 minutes)
    warningTime: 5 * 60 * 1000,
    
    // Timer references
    idleTimer: null,
    warningTimer: null,
    
    /**
     * Initialize session management
     */
    init: (options = {}) => {
        // Set custom timeout if provided
        if (options.timeout) {
            SessionManager.timeout = options.timeout;
        }
        if (options.warningTime) {
            SessionManager.warningTime = options.warningTime;
        }
        
        // Start tracking
        SessionManager.resetTimer();
        
        // Listen for user activity
        SessionManager.addActivityListeners();
        
        // Check for existing impersonation
        SessionManager.checkImpersonation();
    },
    
    /**
     * Reset the idle timer
     */
    resetTimer: () => {
        // Clear existing timers
        SessionManager.clearTimers();
        
        // Set new idle timer
        SessionManager.idleTimer = setTimeout(() => {
            SessionManager.showTimeoutWarning();
        }, SessionManager.timeout);
    },
    
    /**
     * Clear all timers
     */
    clearTimers: () => {
        if (SessionManager.idleTimer) {
            clearTimeout(SessionManager.idleTimer);
            SessionManager.idleTimer = null;
        }
        if (SessionManager.warningTimer) {
            clearTimeout(SessionManager.warningTimer);
            SessionManager.warningTimer = null;
        }
        
        // Close warning modal if open
        const warningModal = document.getElementById('sessionWarningModal');
        if (warningModal) {
            warningModal.remove();
        }
    },
    
    /**
     * Show timeout warning modal
     */
    showTimeoutWarning: () => {
        // Create modal
        const modalHtml = `
            <div class="modal-overlay show" id="sessionWarningModal">
                <div class="modal" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3 class="modal-title">Session Expiring</h3>
                    </div>
                    <div class="modal-body">
                        <div class="text-center">
                            <i class="fas fa-clock" style="font-size: 3rem; color: var(--warning); margin-bottom: 1rem;"></i>
                            <p>Your session will expire in 5 minutes due to inactivity.</p>
                            <p class="text-muted">Click "Stay Signed In" to continue working.</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-danger" onclick="SessionManager.logout()">Sign Out</button>
                        <button class="btn btn-primary" onclick="SessionManager.staySignedIn()">Stay Signed In</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Set timer to auto-logout
        SessionManager.warningTimer = setTimeout(() => {
            SessionManager.logout();
        }, SessionManager.warningTime);
    },
    
    /**
     * Stay signed in - reset timer
     */
    staySignedIn: () => {
        SessionManager.clearTimers();
        SessionManager.resetTimer();
        SessionManager.refreshSession();
    },
    
    /**
     * Logout user
     */
    logout: () => {
        SessionManager.clearTimers();
        window.Auth.logout();
    },
    
    /**
     * Refresh session via API call
     */
    refreshSession: async () => {
        try {
            const response = await fetch(`${window.API.baseUrl}/auth/profile/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Session refresh failed');
            }
        } catch (error) {
            console.log('Session refresh skipped:', error.message);
        }
    },
    
    /**
     * Add activity listeners
     */
    addActivityListeners: () => {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        
        events.forEach(event => {
            document.addEventListener(event, () => {
                SessionManager.resetTimer();
            });
        });
    },
    
    /**
     * Check if user is being impersonated (platform operator)
     */
    checkImpersonation: () => {
        const impersonating = localStorage.getItem('impersonating_tenant');
        
        if (impersonating) {
            SessionManager.showImpersonationBanner(impersonating);
        }
    },
    
    /**
     * Show impersonation banner
     */
    showImpersonationBanner: (tenantName) => {
        // Remove existing banner
        const existing = document.getElementById('impersonationBanner');
        if (existing) existing.remove();
        
        const bannerHtml = `
            <div id="impersonationBanner" class="impersonation-banner">
                <i class="fas fa-user-secret"></i>
                <span>You are impersonating <strong>${tenantName}</strong></span>
                <button onclick="SessionManager.stopImpersonation()">Exit Impersonation</button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', bannerHtml);
        
        // Add padding to body to account for banner
        document.body.style.paddingTop = '50px';
    },
    
    /**
     * Stop impersonation
     */
    stopImpersonation: async () => {
        try {
            await fetch(`${window.API.baseUrl}/platform/impersonate/end/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
        } catch (error) {
            console.error('Error stopping impersonation:', error);
        }
        
        localStorage.removeItem('impersonating_tenant');
        
        const banner = document.getElementById('impersonationBanner');
        if (banner) banner.remove();
        
        document.body.style.paddingTop = '';
        
        // Reload to refresh permissions
        window.location.reload();
    },
    
    /**
     * Start impersonating a tenant
     */
    startImpersonation: async (tenantId) => {
        try {
            const response = await fetch(`${window.API.baseUrl}/platform/impersonate/${tenantId}/start/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: 'Platform support tenant troubleshooting' })
            });
            
            if (response.ok) {
                const data = await response.json();
                const tenantName = data.tenant?.name;
                if (tenantName) {
                    localStorage.setItem('impersonating_tenant', tenantName);
                    SessionManager.showImpersonationBanner(tenantName);
                }
                window.location.reload();
            }
        } catch (error) {
            console.error('Error starting impersonation:', error);
            window.UI.showAlert('Failed to start impersonation', 'danger');
        }
    },
    
    /**
     * Handle API 403 responses
     */
    handleForbidden: () => {
        window.UI.showAlert('You do not have permission to perform this action', 'danger');
    },
    
    /**
     * Handle unauthorized access (redirect to login)
     */
    handleUnauthorized: () => {
        SessionManager.clearTimers();
        window.location.href = '/web/login/';
    }
};

// Export to window
window.SessionManager = SessionManager;
