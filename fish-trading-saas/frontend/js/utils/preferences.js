/**
 * User Preferences System - Spec #10
 * Default page, table columns, theme (future)
 */

class Preferences {
    constructor() {
        this.storage = window.Storage.prefs;
        this.init();
    }

    init() {
        // Set default page from prefs
        const defaultPage = this.get('defaultPage') || 'dashboard';
        if (window.App.loadPage && currentPage !== defaultPage) {
            window.App.loadPage(defaultPage);
        }
        
        // Apply theme
        this.applyTheme();
    }

    setDefaultPage(page) {
        this.storage.set('defaultPage', page);
        window.Toast.success('Default page set');
    }

    getDefaultPage() {
        return this.storage.get('defaultPage', 'dashboard');
    }

    toggleTheme() {
        const current = this.storage.get('theme', 'light');
        const next = current === 'light' ? 'dark' : 'light';
        this.setTheme(next);
    }

    setTheme(theme) {
        this.storage.set('theme', theme);
        this.applyTheme();
    }

    applyTheme() {
        const theme = this.storage.get('theme', 'light');
        document.body.className = theme === 'dark' ? 'dark-theme' : '';
        document.body.setAttribute('data-theme', theme);
    }

    // Table prefs proxy (delegate to Storage.tables)
    getTablePref(tableId, key) {
        return window.Storage.tables.get(`${tableId}_${key}`);
    }

    setTablePref(tableId, key, value) {
        window.Storage.tables.set(`${tableId}_${key}`, value);
    }

    // Reset all prefs
    reset() {
        this.storage.clear();
        window.Storage.tables.clear();
        window.location.reload();
    }

    // Export prefs (debug)
    export() {
        const allData = {
            prefs: this.storage.getAll ? this.storage.data : {},
            tables: window.Storage.tables.data || {}
        };
        console.log('Prefs export:', allData);
        return allData;
    }
}

// Global instance
window.Preferences = new Preferences();

// UI integration helpers
document.addEventListener('DOMContentLoaded', () => {
    // Default page selector in sidebar/footer
    const pageLinks = document.querySelectorAll('[data-page]');
    pageLinks.forEach(link => {
        link.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            window.Preferences.setDefaultPage(page);
        });
    });
});

