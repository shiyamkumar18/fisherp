// Fish ERP - UI Components

function _debounce(fn, ms) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    };
}

const UI = {
    charts: {},
    modalLastFocused: null,
    modalKeyHandler: null,

    init: () => {
        UI.setupMenuToggle();
        UI.setupLogout();
        UI.setupModal();
        UI.setupTabs();
        UI.setupGlobalSearch();
        UI.setupNotificationCenter();
        UI.setupExportButtons();
    },

    setupMenuToggle: () => {
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');

        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });

            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                        sidebar.classList.remove('open');
                    }
                }
            });
        }
    },

    setupLogout: () => {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.Auth?.logout) { window.Auth.logout(); }
                else if (window.App?.logout) { window.App.logout(); }
                else { localStorage.clear(); window.location.href = '/'; }
            });
        }
    },

    setupModal: () => {
        const overlay = document.getElementById('modalOverlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    UI.closeModal();
                }
            });
        }

        if (!document.getElementById('appLiveRegion')) {
            const liveRegion = document.createElement('div');
            liveRegion.id = 'appLiveRegion';
            liveRegion.className = 'visually-hidden';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            document.body.appendChild(liveRegion);
        }
    },

    setupTabs: () => {
        const tabs = document.querySelectorAll('.tabs .tab');
        tabs.forEach((tab) => {
            tab.addEventListener('click', function () {
                const tabId = this.getAttribute('data-tab');
                UI.switchTab(tabId);
            });
        });
    },

    setupGlobalSearch: () => {
        const input = document.getElementById('globalSearchInput');
        const results = document.getElementById('globalSearchResults');
        if (!input || !results) return;

        const hideResults = () => {
            results.classList.add('hidden');
            results.innerHTML = '';
        };

        const runSearch = (window.Utils?.debounce || _debounce)(async () => {
            const query = input.value.trim();
            if (query.length < 2) {
                hideResults();
                return;
            }

            const doGet = (url) => window.API ? window.API.get(url) : window.App.apiCall(url);
            const [fish, buyers, purchases, sales] = await Promise.all([
                doGet(`/trading/fish/?search=${encodeURIComponent(query)}`),
                doGet(`/trading/buyers/?search=${encodeURIComponent(query)}`),
                doGet(`/trading/purchase-batches/?search=${encodeURIComponent(query)}`),
                doGet(`/trading/sales/?search=${encodeURIComponent(query)}`),
            ]);

            const items = [];
            (fish || []).slice(0, 3).forEach((row) => items.push({ page: 'fish', label: row.name, type: 'Fish' }));
            (buyers || []).slice(0, 3).forEach((row) => items.push({ page: 'buyers', label: row.name, type: 'Buyer' }));
            (purchases || []).slice(0, 3).forEach((row) => items.push({ page: 'purchases', label: row.batch_number, type: 'Purchase' }));
            (sales || []).slice(0, 3).forEach((row) => items.push({ page: 'sales', label: row.invoice_number, type: 'Sale' }));

            if (!items.length) {
                results.innerHTML = '<div class="search-result-empty">No matching records</div>';
                results.classList.remove('hidden');
                return;
            }

            results.innerHTML = items
                .map(
                    (item) => `
                        <button class="search-result-item" data-page="${item.page}" type="button">
                            <span>${item.label}</span>
                            <small>${item.type}</small>
                        </button>
                    `
                )
                .join('');

            results.classList.remove('hidden');

            results.querySelectorAll('.search-result-item').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const page = btn.getAttribute('data-page');
                    hideResults();
                    input.value = '';
                    window.App.loadPage(page);
                });
            });
        }, 250);

        input.addEventListener('input', runSearch);
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                hideResults();
            }
        });

        document.addEventListener('click', (event) => {
            if (!results.contains(event.target) && event.target !== input) {
                hideResults();
            }
        });
    },

    setupNotificationCenter: () => {
        const wrap = document.getElementById('notificationWrap');
        const button = document.getElementById('notificationBtn');
        const dropdown = document.getElementById('notificationDropdown');
        const list = document.getElementById('notificationList');
        const count = document.getElementById('notificationCount');
        if (!wrap || !button || !dropdown || !list || !count) return;

        const renderNotifications = async () => {
            const api = window.API || { get: (url) => window.App?.apiCall?.(url.replace(/^\/api/, '')) };
            const [lowStock, pendingPayments, subscription] = await Promise.all([
                api.get('/trading/inventory/?status=low_stock').catch(() => []),
                api.get('/dashboard/pending-payments/').catch(() => []),
                api.get('/subscriptions/current/').catch(() => null),
            ]);

            const items = [];
            if ((lowStock || []).length > 0) {
                items.push({
                    text: `${lowStock.length} low inventory item(s)`,
                    page: 'inventory',
                    tone: 'warning',
                });
            }
            if ((pendingPayments || []).length > 0) {
                items.push({
                    text: `${pendingPayments.length} pending payment(s)`,
                    page: 'accounts',
                    tone: 'danger',
                });
            }
            if (subscription?.days_remaining != null && subscription.days_remaining <= 10) {
                items.push({
                    text: `Subscription expires in ${subscription.days_remaining} day(s)`,
                    page: 'subscription',
                    tone: 'warning',
                });
            }
            if (!items.length) {
                items.push({
                    text: 'No new alerts',
                    page: 'dashboard',
                    tone: 'info',
                });
            }

            count.textContent = String(items.length);
            list.innerHTML = items
                .map(
                    (item) => `
                        <button type="button" class="notification-item ${item.tone}" data-page="${item.page}">
                            ${item.text}
                        </button>
                    `
                )
                .join('');

            list.querySelectorAll('.notification-item').forEach((item) => {
                item.addEventListener('click', () => {
                    dropdown.classList.add('hidden');
                    window.App.loadPage(item.getAttribute('data-page'));
                });
            });
        };

        button.addEventListener('click', async () => {
            if (dropdown.classList.contains('hidden')) {
                await renderNotifications();
                dropdown.classList.remove('hidden');
                return;
            }
            dropdown.classList.add('hidden');
        });

        document.addEventListener('click', (event) => {
            if (!wrap.contains(event.target)) {
                dropdown.classList.add('hidden');
            }
        });
    },

    setupExportButtons: () => {
        const bindExport = (id, type) => {
            const button = document.getElementById(id);
            if (!button) return;
            button.addEventListener('click', () => {
                UI.showAlert(`Preparing ${type.toUpperCase()} export...`, 'info');
            });
        };

        bindExport('exportPdfBtn', 'pdf');
        bindExport('exportExcelBtn', 'excel');
    },

    switchTab: (tabId) => {
        document.querySelectorAll('.tabs .tab').forEach((tab) => tab.classList.remove('active'));
        document.querySelector(`.tabs .tab[data-tab="${tabId}"]`)?.classList.add('active');

        document.querySelectorAll('.tab-content').forEach((content) => {
            content.classList.remove('active');
        });

        const contentId = tabId.charAt(0).toUpperCase() + tabId.slice(1);
        document.getElementById(`payments${contentId}`)?.classList.add('active');
    },

    showModal: (title, content, footer = '') => {
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalFooter = document.getElementById('modalFooter');
        const modalOverlay = document.getElementById('modalOverlay');
        const modal = modalOverlay?.querySelector('.modal');

        if (modalTitle) modalTitle.textContent = title;
        if (modalBody) modalBody.innerHTML = content;
        if (modalFooter) modalFooter.innerHTML = footer || '<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>';

        UI.modalLastFocused = document.activeElement;

        if (modalOverlay) {
            modalOverlay.classList.add('show');
            modalOverlay.setAttribute('aria-hidden', 'false');
        }

        if (modal) {
            modal.setAttribute('tabindex', '-1');
            modal.focus();
        }

        UI.modalKeyHandler = (event) => {
            if (!modalOverlay?.classList.contains('show')) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                UI.closeModal();
                return;
            }

            if (event.key !== 'Tab' || !modal) return;

            const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (!focusable.length) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', UI.modalKeyHandler);
        UI.announce(`${title} dialog opened.`, 'polite');
    },

    closeModal: () => {
        const modalOverlay = document.getElementById('modalOverlay');
        if (modalOverlay) {
            modalOverlay.classList.remove('show');
            modalOverlay.setAttribute('aria-hidden', 'true');
        }

        if (UI.modalKeyHandler) {
            document.removeEventListener('keydown', UI.modalKeyHandler);
            UI.modalKeyHandler = null;
        }

        if (UI.modalLastFocused && typeof UI.modalLastFocused.focus === 'function') {
            UI.modalLastFocused.focus();
        }
        UI.modalLastFocused = null;
    },

    showAlert: (message, type = 'info') => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;

        const icon = document.createElement('i');
        icon.className = `fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'}`;
        alertDiv.appendChild(icon);
        alertDiv.appendChild(document.createTextNode(' ' + message));

        const content = document.getElementById('mainContent');
        if (content) {
            content.insertBefore(alertDiv, content.firstChild);
            setTimeout(() => alertDiv.remove(), 3000);
        }
        UI.announce(message, type === 'danger' ? 'assertive' : 'polite');
    },

    announce: (message, politeness = 'polite') => {
        const liveRegion = document.getElementById('appLiveRegion');
        if (!liveRegion) return;
        liveRegion.setAttribute('aria-live', politeness);
        liveRegion.textContent = '';
        window.setTimeout(() => {
            liveRegion.textContent = String(message || '');
        }, 30);
    },

    setPageTitle: (title) => {
        const pageTitle = document.getElementById('pageTitle');
        const titles = {
            dashboard: 'Dashboard',
            fish: 'Fish',
            fishCategories: 'Fish Categories',
            suppliers: 'Suppliers',
            buyers: 'Buyers',
            purchases: 'Purchases',
            sales: 'Sales',
            inventory: 'Inventory',
            payments: 'Payments',
            accounts: 'Accounts',
            reports: 'Reports',
            analytics: 'Analytics',
            subscription: 'Subscription',
            users: 'Staff Management',
            audit: 'Support Logs',
            platform: 'Companies',
            security: 'Security',
            settings: 'Settings',
        };
        if (pageTitle) {
            pageTitle.textContent = titles[title] || 'Dashboard';
        }
    },

    showPage: (pageId) => {
        document.querySelectorAll('.page-content').forEach((page) => page.classList.add('hidden'));
        const pageElement = document.getElementById(`${pageId}Page`);
        if (pageElement) {
            pageElement.classList.remove('hidden');
        }

        const sidebar = document.getElementById('sidebar');
        if (sidebar && window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    },

    updateNavigation: (activePage) => {
        document.querySelectorAll('.nav-item[data-page]').forEach((nav) => nav.classList.remove('active'));
        document.querySelector(`.nav-item[data-page="${activePage}"]`)?.classList.add('active');
    },

    setupUserInfo: () => {
        const user = window.Auth?.getUser?.() || {
            username: localStorage.getItem('username') || 'User',
            role: localStorage.getItem('userRole') || 'tenant_admin'
        };

        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        const userRole = document.getElementById('userRole');
        const companyTag = document.getElementById('currentCompany');

        if (userName) userName.textContent = user.username;
        if (userAvatar) userAvatar.textContent = user.username.charAt(0).toUpperCase();
        if (userRole) userRole.textContent = window.Auth?.getRoleName ? window.Auth.getRoleName(user.role) : (user.role || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (companyTag) {
            companyTag.textContent = localStorage.getItem('company_name') || localStorage.getItem('tenant_slug') || 'Company Workspace';
        }

        const settingsUsername = document.getElementById('settingsUsername');
        const settingsRole = document.getElementById('settingsRole');
        if (settingsUsername) settingsUsername.value = user.username;
        if (settingsRole) settingsRole.value = window.Auth.getRoleName(user.role);
    },

    renderTable: (tableId, data, columns, emptyMessage = 'No data available') => {
        const tbody = document.getElementById(tableId);
        if (!tbody) return;
        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${columns.length}" class="text-center">${emptyMessage}</td></tr>`;
            return;
        }

        tbody.innerHTML = data
            .map((row) => {
                return (
                    '<tr>' +
                    columns
                        .map((col) => {
                            let value = col.field.split('.').reduce((obj, key) => obj?.[key], row);
                            value = value ?? col.default ?? '-';
                            if (col.format) value = col.format(value, row);
                            return `<td>${value}</td>`;
                        })
                        .join('') +
                    '</tr>'
                );
            })
            .join('');
    },

    renderChart: (canvasId, type, data, options = {}) => {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;
        if (UI.charts[canvasId]) UI.charts[canvasId].destroy();

        UI.charts[canvasId] = new Chart(ctx, {
            type,
            data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                ...options,
            },
        });
        return UI.charts[canvasId];
    },

    destroyChart: (canvasId) => {
        if (UI.charts[canvasId]) {
            UI.charts[canvasId].destroy();
            delete UI.charts[canvasId];
        }
    },

    setLoading: (elementId, loading) => {
        const element = document.getElementById(elementId);
        if (!element) return;
        if (loading) {
            element.classList.add('loading');
            element.setAttribute('disabled', 'true');
            return;
        }
        element.classList.remove('loading');
        element.removeAttribute('disabled');
    },

    setActiveNav: (page) => {
        document.querySelectorAll('.nav-item[data-page]').forEach((item) => {
            item.classList.toggle('active', item.getAttribute('data-page') === page);
        });
    },
};

window.UI = UI;
