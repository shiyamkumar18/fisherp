/**
 * DataTable Core - Modular Smart Tables (Phase 2)
 * Base rendering + plugin system
 */

class DataTableCore {
    constructor(containerId, columns, dataFn, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.columns = columns;
        this.dataFn = dataFn;
        this.options = { 
            editable: true, 
            pagination: false, 
            ...options 
        };
        this.data = [];
        this.plugins = new Map();
        this.init();
    }

    init() {
        this.render();
        this.loadPlugins();
        this.loadData();
    }

    render() {
        this.container.innerHTML = `
            <div class="table-controls">
                <span>${this.options.title || 'Data'}</span>
                <div class="table-actions">
                    <button class="btn-sm" onclick="this.parentTable.toggleColumns()">Columns</button>
                    ${this.options.addBtn ? `<button class="btn-primary btn-sm add-btn" data-action="${this.options.addBtn}"><i class="fas fa-plus"></i> Add</button>` : ''}
                </div>
            </div>
            <div class="table-wrapper">
                <table class="smart-table">
                    <thead id="${this.containerId}-thead"></thead>
                    <tbody id="${this.containerId}-tbody"></tbody>
                    <tfoot id="${this.containerId}-tfoot"></tfoot>
                </table>
            </div>
        `;
        window[this.containerId.replace('-', '') + 'Table'] = this; // Global ref
    }

    renderHeader() {
        const thead = document.getElementById(this.containerId + '-thead');
        thead.innerHTML = '<tr>' + this.columns.map(col => 
            `<th data-col="${col.key}" class="${col.sortable ? 'sortable' : ''}" style="width: ${col.width || 'auto'}">${col.label}</th>`
        ).join('') + '</tr>';
    }

    renderBody() {
        const tbody = document.getElementById(this.containerId + '-tbody');
        if (!this.data.length) {
            tbody.innerHTML = '<tr><td colspan="' + this.columns.length + '" class="empty-state">No data yet. <button class="btn-link">Add first record</button></td></tr>';
            return;
        }
        tbody.innerHTML = this.data.map((row, idx) => {
            const cells = this.columns.map(col => {
                if (col.key === 'actions') return this.renderActions(idx);
                const value = row[col.key] ?? '';
                return `<td data-row="${idx}" data-col="${col.key}" class="editable">${value}</td>`;
            }).join('');
            return '<tr>' + cells + '</tr>';
        }).join('');
    }

    renderActions(idx) {
        return `<td class="actions">
            <button class="btn-icon" onclick="this.parentTable.edit(${idx})" title="Edit"><i class="fas fa-edit"></i></button>
            <button class="btn-icon danger" onclick="this.parentTable.delete(${idx})" title="Delete"><i class="fas fa-trash"></i></button>
        </td>`;
    }

    async loadData() {
        this.showSkeleton();
        try {
            this.data = await this.dataFn();
            this.renderHeader();
            this.renderBody();
            this.plugins.forEach(plugin => plugin.onDataLoaded?.(this.data));
        } catch (e) {
            this.showError('Load failed: ' + e.message);
        }
    }

    showSkeleton() {
        document.getElementById(this.containerId + '-tbody').innerHTML = 
            Array(5).fill(0).map(() => '<tr class="skeleton"><td colspan="7"><div class="skeleton-line"></div></td></tr>').join('');
    }

    showError(msg) {
        document.getElementById(this.containerId + '-tbody').innerHTML = 
            '<tr><td colspan="' + this.columns.length + '"><div class="error-state">' + msg + '</div></td></tr>';
    }

    // Plugin system
    registerPlugin(name, plugin) {
        this.plugins.set(name, plugin);
        plugin.init?.(this);
    }

    loadPlugins() {
        // Auto-load available plugins
        if (window.DataTableFilters) this.registerPlugin('filters', new DataTableFilters());
        if (window.DataTableColumnMemory) this.registerPlugin('columnMemory', new DataTableColumnMemory());
        // etc.
    }

    edit(idx) { console.log('Edit row', idx); }
    delete(idx) { if (confirm('Delete?')) this.data.splice(idx, 1); this.renderBody(); }

    async refresh() { await this.loadData(); }
}

// Export
window.DataTableCore = DataTableCore;
window.DataTable = DataTableCore; // BC
