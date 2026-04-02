// Fish ERP - Subscription, Users, Audit, Platform, Security Pages Module

const ManagementPages = {
    dataCache: {
        users: [],
        auditLogs: [],
        tenants: [],
        subscriptions: [],
        tiers: [],
        addons: [],
    },
    searchHandlersAttached: false,

    // ========== SHARED ==========
    attachSearchHandlers: () => {
        if (ManagementPages.searchHandlersAttached) return;

        const bindings = [
            ['userSearch', () => ManagementPages.renderUsersTable()],
            ['auditSearch', () => ManagementPages.renderAuditTable()],
            ['tenantSearch', () => ManagementPages.renderTenantsTable()],
        ];

        bindings.forEach(([id, handler]) => {
            const input = document.getElementById(id);
            if (input) input.addEventListener('input', handler);
        });

        ManagementPages.searchHandlersAttached = true;
    },

    getSearchValue: (inputId) => {
        const input = document.getElementById(inputId);
        return input ? input.value.trim().toLowerCase() : '';
    },

    applySearch: (rows, query, fields) => {
        if (!query) return rows;
        return rows.filter((row) =>
            fields.some((field) => String(row[field] ?? '').toLowerCase().includes(query))
        );
    },

    getErrorMessage: (fallback) => {
        return (
            window.API.lastError?.error ||
            window.API.lastError?.detail ||
            fallback
        );
    },

    // ========== SUBSCRIPTION ==========
    loadSubscription: async () => {
        await Promise.all([
            ManagementPages.loadCurrentSubscription(),
            ManagementPages.loadSubscriptionTiers(),
            ManagementPages.loadSubscriptionAddons(),
        ]);
        ManagementPages.attachSearchHandlers();
    },

    loadCurrentSubscription: async () => {
        const data = await window.API.get('/subscriptions/current/');

        const container = document.getElementById('currentSubDetails');
        if (!container) return;

        if (!data) {
            container.innerHTML = '<div class="text-center p-4 text-danger">No active subscription found. Contact support.</div>';
            document.getElementById('subscriptionStatus').innerHTML = '<span class="status-badge inactive">No Subscription</span>';
            return;
        }

        const tierName = data.tier?.name || 'Free';
        const monthlyPrice = data.tier?.price_monthly || data.price || 0;
        const status = data.status || 'active';
        const daysRemaining = data.days_remaining || 0;

        container.innerHTML = `
            <div class="subscription-card">
                <h4>Current Plan: <span class="tier-badge ${status === 'active' ? tierName.toLowerCase() : 'inactive'}">${tierName}</span></h4>
                <p><strong>Status:</strong> <span class="status-badge ${status}">${status.toUpperCase()}</span></p>
                <p><strong>Monthly Price:</strong> ${window.Utils.formatCurrency(monthlyPrice)}</p>
                <p><strong>Days Remaining:</strong> <span class="days-remaining ${daysRemaining < 7 ? 'warning' : ''}">${daysRemaining}</span></p>
                <p><strong>Max Users:</strong> ${data.tier?.max_users || 'Unlimited'}</p>
                ${data.tier?.features?.map(f => `<span class="feature-tag">${f}</span>`).join('') || ''}
            </div>
        `;

        document.getElementById('subscriptionStatus').innerHTML = `<span class="status-badge ${status}">${status.toUpperCase()} (${daysRemaining} days left)</span>`;
    },

    loadSubscriptionTiers: async () => {
        const data = await window.API.get('/subscriptions/tiers/');

        const plansTable = document.getElementById('plansTable');
        const tbody = plansTable ? plansTable.querySelector('tbody') : null;
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No subscription plans available</td></tr>';
            return;
        }

        tbody.innerHTML = data
            .map(
                (tier) => `
                    <tr>
                        <td><strong>${tier.name}</strong></td>
                        <td>${window.Utils.formatCurrency(tier.price_monthly)}/mo</td>
                        <td>${tier.max_users || 'Unlimited'}</td>
                        <td>
                            ${tier.allow_advanced_reporting ? '<span class="feature-tag">Advanced Reports</span>' : ''}
                            ${tier.allow_staff_users ? '<span class="feature-tag">Multi-User</span>' : ''}
                            ${tier.allow_inventory ? '<span class="feature-tag">Inventory Mgmt</span>' : ''}
                            ${Array.isArray(tier.features)
                                ? tier.features.map((feature) => `<span class="feature-tag">${String(feature).trim()}</span>`).join('')
                                : (typeof tier.features === 'string'
                                    ? tier.features.split(',').map((feature) => `<span class="feature-tag">${feature.trim()}</span>`).join('')
                                    : '')}
                        </td>
                        <td><span class="status-badge ${tier.is_active ? 'active' : 'inactive'}">${tier.is_active ? 'Available' : 'Disabled'}</span></td>
                        <td>
                            <button class="btn btn-sm ${tier.is_current ? 'btn-secondary' : 'btn-primary'}" 
                                onclick="ManagementPages.upgradeToTier('${tier.id}')" 
                                ${tier.is_current ? 'disabled' : ''}>
                                ${tier.is_current ? 'Current' : 'Upgrade'}
                            </button>
                        </td>
                    </tr>
                `
            )
            .join('');
    },

    loadSubscriptionAddons: async () => {
        const data = await window.API.get('/subscriptions/addons/');

        const tbody = document.getElementById('subscriptionAddons');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No add-ons available</td></tr>';
            return;
        }

        tbody.innerHTML = data
            .map(
                (addon) => `
            <tr>
                <td>${addon.name}</td>
                <td>${addon.description || '-'}</td>
                <td>${window.Utils.formatCurrency(addon.price_monthly)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="ManagementPages.purchaseAddon('${addon.id}')">
                        Purchase
                    </button>
                </td>
            </tr>
        `
            )
            .join('');
    },

    upgradeToTier: async (tierId) => {
        if (!confirm('Upgrade to this subscription plan? Changes take effect immediately.')) return;
        const result = await window.API.post('/subscriptions/upgrade/', { tier_id: tierId });
        if (result) {
            window.UI.showAlert('Subscription upgraded! Reloading...', 'success');
            setTimeout(() => location.reload(), 1500);
            return;
        }
        window.UI.showAlert(ManagementPages.getErrorMessage('Upgrade failed'), 'danger');
    },

    purchaseAddon: async (addonId) => {
        const result = await window.API.post('/subscriptions/addons/purchase/', { addon_id: addonId });
        if (result) {
            window.UI.showAlert('Add-on purchased successfully!', 'success');
            ManagementPages.loadSubscription();
            return;
        }
        window.UI.showAlert(ManagementPages.getErrorMessage('Failed to purchase add-on'), 'danger');
    },

    // ========== USERS ==========
    loadUsers: async () => {
        const userRole = window.useRole.getRole();
        const endpoint = userRole === 'tenant_admin' ? '/auth/tenant-users/' : '/auth/users/';
        const data = await window.API.get(endpoint);

        ManagementPages.dataCache.users = Array.isArray(data) ? data : [];
        ManagementPages.renderUsersTable();
    },

    getFilteredUsers: () => {
        const query = ManagementPages.getSearchValue('userSearch');
        return ManagementPages.applySearch(
            ManagementPages.dataCache.users,
            query,
            ['username', 'email', 'role']
        );
    },

    renderUsersTable: (users = ManagementPages.getFilteredUsers()) => {
        const tbody = document.getElementById('usersTable');
        if (!tbody) return;

        if (!users.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No users found</td></tr>';
            return;
        }

        tbody.innerHTML = users
            .map(
                (user) => `
            <tr>
                <td>${user.username}</td>
                <td>${window.Auth.getRoleName(user.role)}</td>
                <td>${user.email || '-'}</td>
                <td><span class="status-badge ${user.is_active ? 'active' : 'inactive'}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="ManagementPages.editUser(${user.id})">Edit</button>
                </td>
            </tr>
        `
            )
            .join('');
    },

    showAddUserModal: () => {
        const role = window.useRole.getRole();
        if (role !== 'tenant_admin') {
            window.UI.showAlert('Only tenant admin can create users from this screen.', 'info');
            return;
        }

        const content = `
            <form id="addUserForm">
                <div class="form-row">
                    <div class="form-group">
                        <label>Name *</label>
                        <input type="text" class="form-control" name="username" required placeholder="Staff name">
                    </div>
                    <div class="form-group">
                        <label>Email / Mobile *</label>
                        <input type="text" class="form-control" name="email" required placeholder="staff@company.com">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Role</label>
                        <select class="form-control" name="role">
                            <option value="accountant">Accountant</option>
                            <option value="trader">Trader</option>
                            <option value="store">Store</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Phone (optional)</label>
                        <input type="text" class="form-control" name="phone" placeholder="Mobile number">
                    </div>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" class="form-control" name="password">
                </div>
            </form>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="ManagementPages.submitAddUser()">Save Staff</button>
        `;

        window.UI.showModal('Add Staff', content, footer);
    },

    submitAddUser: async () => {
        const form = document.getElementById('addUserForm');
        if (!form) return;

        const formData = new FormData(form);
        const payload = {
            username: formData.get('username')?.trim(),
            email: formData.get('email')?.trim(),
            phone: formData.get('phone')?.trim(),
            role: formData.get('role') || 'trader',
            password: formData.get('password') || null,
        };

        const result = await window.API.post('/auth/tenant-users/', payload);
        if (result) {
            const tempPwdMessage = result.temp_password ? ` Temporary password: ${result.temp_password}` : '';
            window.UI.showAlert(`User created successfully.${tempPwdMessage}`, 'success');
            window.UI.closeModal();
            ManagementPages.loadUsers();
            return;
        }

        window.UI.showAlert(ManagementPages.getErrorMessage('Failed to create user'), 'danger');
    },

    editUser: (id) => {
        const user = ManagementPages.dataCache.users.find((item) => item.id === id);
        if (!user) {
            window.UI.showAlert('User not found.', 'danger');
            return;
        }

        const role = window.useRole.getRole();
        if (role !== 'tenant_admin') {
            ManagementPages.showUserDetails(user);
            return;
        }

        if (String(user.id) === localStorage.getItem('user_id')) {
            window.UI.showAlert('Use profile settings to update your own account.', 'info');
            return;
        }

        const content = `
            <form id="editUserForm" data-id="${user.id}">
                <div class="form-row">
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" class="form-control" value="${user.username}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="text" class="form-control" value="${user.email || '-'}" readonly>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Role</label>
                        <select class="form-control" name="role">
                            <option value="accountant" ${user.role === 'accountant' ? 'selected' : ''}>Accountant</option>
                            <option value="trader" ${user.role === 'trader' ? 'selected' : ''}>Trader</option>
                            <option value="store" ${user.role === 'store' ? 'selected' : ''}>Store</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="is_active" ${user.is_active ? 'checked' : ''}>
                            Active User
                        </label>
                    </div>
                </div>
            </form>
        `;

        const footer = `
            <button class="btn btn-danger" onclick="ManagementPages.deleteUser(${user.id})">Delete</button>
            <button class="btn btn-warning" onclick="ManagementPages.resetUserPassword(${user.id})">Reset Password</button>
            <button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="ManagementPages.submitEditUser()">Save</button>
        `;

        window.UI.showModal('Edit User', content, footer);
    },

    showUserDetails: (user) => {
        const content = `
            <div class="tenant-details">
                <p><strong>Username:</strong> ${user.username}</p>
                <p><strong>Email:</strong> ${user.email || '-'}</p>
                <p><strong>Role:</strong> ${window.Auth.getRoleName(user.role)}</p>
                <p><strong>Status:</strong> ${user.is_active ? 'Active' : 'Inactive'}</p>
            </div>
        `;
        window.UI.showModal('User Details', content, '<button class="btn btn-secondary" onclick="UI.closeModal()">Close</button>');
    },

    submitEditUser: async () => {
        const form = document.getElementById('editUserForm');
        const userId = form?.dataset?.id;
        if (!form || !userId) return;

        const formData = new FormData(form);
        const payload = {
            user_id: parseInt(userId, 10),
            role: formData.get('role'),
            is_active: form.querySelector('input[name="is_active"]').checked,
        };

        const result = await window.API.put('/auth/tenant-users/', payload);
        if (result) {
            window.UI.showAlert('User updated successfully.', 'success');
            window.UI.closeModal();
            ManagementPages.loadUsers();
            return;
        }

        window.UI.showAlert(ManagementPages.getErrorMessage('Failed to update user'), 'danger');
    },

    resetUserPassword: async (id) => {
        const result = await window.API.put('/auth/tenant-users/', {
            user_id: id,
            reset_password: true,
        });
        if (result) {
            window.UI.showAlert(`Password reset successful. Temporary password: ${result.temp_password || '-'}`, 'success');
            return;
        }
        window.UI.showAlert(ManagementPages.getErrorMessage('Failed to reset password'), 'danger');
    },

    deleteUser: async (id) => {
        if (!confirm('Delete this user permanently?')) return;

        const result = await window.API.delete('/auth/tenant-users/', { user_id: id });
        if (result) {
            window.UI.showAlert('User deleted successfully.', 'success');
            window.UI.closeModal();
            ManagementPages.loadUsers();
            return;
        }

        window.UI.showAlert(ManagementPages.getErrorMessage('Failed to delete user'), 'danger');
    },

    // ========== AUDIT ==========
    loadAudit: async () => {
        const role = window.useRole.getRole();
        const tbody = document.getElementById('auditTable');
        if (!tbody) return;

        if (!['platform_maintainer', 'platform_operator', 'platform_support'].includes(role)) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Audit logs are available to platform users only</td></tr>';
            return;
        }

        const data = await window.API.get('/platform/audit/');
        const logs = Array.isArray(data?.logs) ? data.logs : [];
        ManagementPages.dataCache.auditLogs = logs;
        ManagementPages.renderAuditTable();
    },

    getFilteredAuditLogs: () => {
        const query = ManagementPages.getSearchValue('auditSearch');
        return ManagementPages.applySearch(ManagementPages.dataCache.auditLogs, query, ['user', 'action', 'model_name']);
    },

    renderAuditTable: (logs = ManagementPages.getFilteredAuditLogs()) => {
        const tbody = document.getElementById('auditTable');
        if (!tbody) return;

        if (!logs.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No audit logs available</td></tr>';
            return;
        }

        tbody.innerHTML = logs
            .map(
                (log) => `
            <tr>
                <td>${window.Utils.formatDate(log.timestamp)}</td>
                <td>${log.user || 'System'}</td>
                <td>${log.action || '-'}</td>
                <td>${log.model_name || '-'}</td>
            </tr>
        `
            )
            .join('');
    },

    // ========== PLATFORM ==========
    loadPlatform: async () => {
        const role = window.useRole.getRole();
        if (!['platform_maintainer', 'platform_operator', 'platform_support'].includes(role)) {
            window.UI.showAlert('You do not have permission to access this page', 'danger');
            return;
        }

        await Promise.all([ManagementPages.loadPlatformStats(), ManagementPages.loadTenants()]);
    },

    loadPlatformStats: async () => {
        const stats = await window.API.get('/platform/dashboard/');
        if (!stats) return;

        document.getElementById('totalTenants').textContent = stats.total_tenants || 0;
        document.getElementById('totalUsers').textContent = stats.total_users || 0;
        document.getElementById('platformRevenue').textContent = window.Utils.formatCurrency(stats.mrr || 0);
        document.getElementById('activeIssues').textContent = (stats.suspended_tenants || 0) + (stats.expired_tenants || 0);
    },

    loadTenants: async () => {
        const data = await window.API.get('/platform/tenants/');
        ManagementPages.dataCache.tenants = Array.isArray(data?.tenants) ? data.tenants : [];
        ManagementPages.renderTenantsTable();
    },

    getFilteredTenants: () => {
        const query = ManagementPages.getSearchValue('tenantSearch');
        return ManagementPages.applySearch(ManagementPages.dataCache.tenants, query, ['name', 'email', 'tier', 'subscription_status']);
    },

    renderTenantsTable: (tenants = ManagementPages.getFilteredTenants()) => {
        const tbody = document.getElementById('tenantsTable');
        if (!tbody) return;

        if (!tenants.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No tenants found</td></tr>';
            return;
        }

        tbody.innerHTML = tenants
            .map(
                (tenant) => `
            <tr>
                <td>${tenant.name || 'N/A'}</td>
                <td>${tenant.admin_name || tenant.email || '-'}</td>
                <td><span class="status-badge active">${tenant.tier || 'Basic'}</span></td>
                <td>${tenant.user_count || 0}</td>
                <td><span class="status-badge ${tenant.is_subscription_active ? 'active' : 'inactive'}">${tenant.is_subscription_active ? 'Active' : 'Suspended'}</span></td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="ManagementPages.viewTenant(${tenant.id})">View</button>
                    <button class="btn btn-sm btn-warning" onclick="ManagementPages.suspendTenant(${tenant.id})">Suspend</button>
                    <button class="btn btn-sm btn-primary" onclick="ManagementPages.upgradeTenant(${tenant.id})">Upgrade</button>
                </td>
            </tr>
        `
            )
            .join('');
    },

    viewTenant: async (id) => {
        const tenant = await window.API.get(`/platform/tenants/${id}/`);
        if (!tenant) return;

        const content = `
            <div class="tenant-details">
                <p><strong>Company:</strong> ${tenant.name || 'N/A'}</p>
                <p><strong>Email:</strong> ${tenant.email || 'N/A'}</p>
                <p><strong>Plan:</strong> ${tenant.subscription?.tier?.name || 'Basic'}</p>
                <p><strong>Status:</strong> ${tenant.is_active ? 'Active' : 'Suspended'}</p>
                <p><strong>Created:</strong> ${window.Utils.formatDate(tenant.created_at)}</p>
            </div>
        `;

        window.UI.showModal('Tenant Details', content, '<button class="btn btn-secondary" onclick="UI.closeModal()">Close</button>');
    },

    suspendTenant: async (id) => {
        const result = await window.API.post(`/platform/tenants/${id}/suspend/`, {
            action: 'suspend',
            reason: 'Suspended from platform console',
        });
        if (result) {
            window.UI.showAlert('Tenant status updated.', 'success');
            ManagementPages.loadTenants();
            return;
        }
        window.UI.showAlert(ManagementPages.getErrorMessage('Failed to suspend tenant'), 'danger');
    },

    upgradeTenant: async (id) => {
        const result = await window.API.post(`/platform/subscriptions/${id}/extend/`, {
            days: 30,
            reason: 'Plan upgrade extension',
        });
        if (result) {
            window.UI.showAlert('Tenant subscription upgraded.', 'success');
            ManagementPages.loadTenants();
            return;
        }
        window.UI.showAlert(ManagementPages.getErrorMessage('Failed to upgrade tenant'), 'danger');
    },

    loadPlatformTool: async (tool) => {
        const endpoints = {
            activity: '/platform/activity-heatmap/',
            billing: '/platform/billing-history/',
            errors: '/platform/error-tracking/',
            backup: '/platform/backup-status/',
        };

        const endpoint = endpoints[tool];
        if (!endpoint) return;

        const data = await window.API.get(endpoint);
        if (!data) {
            window.UI.showAlert(ManagementPages.getErrorMessage('Unable to load platform tool data'), 'danger');
            return;
        }

        const pretty = `<pre style="white-space: pre-wrap; max-height: 360px; overflow:auto;">${JSON.stringify(data, null, 2)}</pre>`;
        const titleMap = {
            activity: 'Activity Heatmap',
            billing: 'Billing History',
            errors: 'Error Tracking',
            backup: 'Backup Status',
        };
        window.UI.showModal(titleMap[tool] || 'Platform Tool', pretty, '<button class="btn btn-secondary" onclick="UI.closeModal()">Close</button>');
    },

    // ========== SECURITY (2FA) ==========
    loadSecurity: async () => {
        const container = document.getElementById('twoFactorStatus');
        if (!container) return;

        const profile = await window.API.get('/auth/profile/');
        const localFlag = localStorage.getItem('two_factor_enabled') === '1';
        const isEnabled = profile?.two_factor_enabled != null ? Boolean(profile.two_factor_enabled) : localFlag;

        container.innerHTML = `
            <div class="two-factor-setup">
                <div class="two-factor-icon">
                    <i class="fas fa-shield-alt"></i>
                </div>
                <h3>Two-Factor Authentication</h3>
                <p>Add an extra layer of security to your account.</p>
                <div class="two-factor-status ${isEnabled ? 'enabled' : 'disabled'}">
                    <span class="status-badge ${isEnabled ? 'active' : 'inactive'}">2FA is currently ${isEnabled ? 'enabled' : 'disabled'}</span>
                </div>
                ${
                    isEnabled
                        ? '<button class="btn btn-warning mt-2" onclick="ManagementPages.disableTwoFactor()">Disable Two-Factor Authentication</button>'
                        : '<button class="btn btn-primary mt-2" onclick="ManagementPages.setupTwoFactor()"><i class="fas fa-lock"></i> Enable Two-Factor Authentication</button>'
                }
            </div>
        `;
    },

    setupTwoFactor: async () => {
        const result = await window.API.post('/auth/2fa/setup/');
        if (!result) {
            window.UI.showAlert(ManagementPages.getErrorMessage('Failed to setup 2FA'), 'danger');
            return;
        }

        window.UI.showModal(
            'Setup Two-Factor Authentication',
            `
                <div class="two-factor-qr">
                    <p>Enter the secret in your authenticator app:</p>
                    <p class="mt-2"><strong>${result.secret || 'N/A'}</strong></p>
                    <p class="mt-2">Then verify with the 6-digit code.</p>
                </div>
            `,
            '<button class="btn btn-primary" onclick="ManagementPages.verifyTwoFactor()">Verify</button><button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>'
        );
    },

    verifyTwoFactor: async () => {
        const code = prompt('Enter the 6-digit code from your authenticator app:');
        if (!code) return;

        const result = await window.API.post('/auth/2fa/verify/', { code: code.trim() });
        if (result && (result.success || result.two_factor_enabled)) {
            localStorage.setItem('two_factor_enabled', '1');
            window.UI.showAlert('Two-Factor Authentication enabled!', 'success');
            window.UI.closeModal();
            ManagementPages.loadSecurity();
            return;
        }

        window.UI.showAlert(ManagementPages.getErrorMessage('Invalid code'), 'danger');
    },

    disableTwoFactor: async () => {
        const password = prompt('Enter your current password to disable 2FA:');
        if (!password) return;

        const result = await window.API.post('/auth/2fa/disable/', { password });
        if (result) {
            localStorage.setItem('two_factor_enabled', '0');
            window.UI.showAlert('Two-Factor Authentication disabled.', 'success');
            ManagementPages.loadSecurity();
            return;
        }
        window.UI.showAlert(ManagementPages.getErrorMessage('Failed to disable 2FA'), 'danger');
    },
};

window.ManagementPages = ManagementPages;
