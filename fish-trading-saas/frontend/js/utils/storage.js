/**
 * Safe Storage - Structured localStorage wrapper
 * Prevents corruption, auto-migrate, versioning
 */

const STORAGE_VERSION = '1.0';
const STORAGE_PREFIX = 'fisherp_';

class SafeStorage {
    constructor(namespace = 'global') {
        this.namespace = namespace;
        this.versionKey = `${STORAGE_PREFIX}${namespace}_v`;
        this.dataKey = `${STORAGE_PREFIX}${namespace}_data`;
        
        this.migrateIfNeeded();
    }

    migrateIfNeeded() {
        const currentVersion = localStorage.getItem(this.versionKey);
        if (currentVersion !== STORAGE_VERSION) {
            // Clear old data on version change
            localStorage.removeItem(this.dataKey);
            localStorage.setItem(this.versionKey, STORAGE_VERSION);
        }
    }

    get(key, defaultValue = null) {
        try {
            const data = JSON.parse(localStorage.getItem(this.dataKey) || '{}');
            return data[key] ?? defaultValue;
        } catch (e) {
            console.warn('Storage read failed:', e);
            return defaultValue;
        }
    }

    set(key, value) {
        try {
            const data = JSON.parse(localStorage.getItem(this.dataKey) || '{}');
            data[key] = value;
            localStorage.setItem(this.dataKey, JSON.stringify(data));
        } catch (e) {
            console.error('Storage write failed:', e);
        }
    }

    remove(key) {
        try {
            const data = JSON.parse(localStorage.getItem(this.dataKey) || '{}');
            delete data[key];
            localStorage.setItem(this.dataKey, JSON.stringify(data));
        } catch (e) {
            console.error('Storage remove failed:', e);
        }
    }

    clear() {
        localStorage.removeItem(this.dataKey);
    }
}

// Global instances
window.Storage = {
    tables: new SafeStorage('tables'),      // table views/columns
    prefs: new SafeStorage('prefs'),        // user preferences
    ui: new SafeStorage('ui'),              // ui state
};

// Export
window.SafeStorage = SafeStorage;

