/**
 * Reusable Advanced DataTable - Phase 2 UX Overhaul
 * Features: Sticky headers, inline edit, hover actions, column toggle
 */

class DataTable {
    constructor(containerId, columns, dataFn, options = {}) {
        this.container = document.getElementById(containerId);
        this.columns = columns; // [{key, label, editable, width}]
        this.dataFn = dataFn; // async () => [{...}]
        this.options = {
            editable: true,
            actions: ['edit', 'delete'],
            pagination: false,
            ...options
        };
        this.data = [];
        this.editingCell = null;
        this.init();
    }

    async init() {
        this.renderHeader();
        this.renderColumnToggle();
        await this.loadData();
        this.attachEvents();
    }

    renderHeader() {
        this.container.innerHTML = `
            <div class="table-header">
                <span>${this.options.title || 'Data'}</span>
                <div class="table-actions">
                    <button class="btn-sm column-toggle" onclick="this.toggleColumns()">Columns</button>
                    ${this.options.addBtn ? `<button class="btn-primary btn-sm" onclick="${this.options.addBtn}">+ Add</button>` : ''}
                </div>
            </div>
            <div class="table-body">
                <table class="data-table-advanced">
                    <thead><tr>${this.columns.map(col => `<th data-col="${col.key}" style="width: ${col.width || 'auto'}">${col.label}</th>`).join('')}</tr></thead>
                    <tbody></tbody>
                </table>
            </div>
        `;
    }

    renderColumnToggle() {
        // Dropdown for visible columns (Phase 2.5)
        console.log('Column toggle ready');
    }

    async loadData() {
        this.container.querySelector('tbody').innerHTML = '<tr><td colspan="' + this.columns.length + '">Loading...</td></tr>';
        try {
            this.data = await this.dataFn();
            this.renderRows();
        } catch (e) {
            this.container.querySelector('tbody').innerHTML = '<tr><td colspan="' + this.columns.length + '" class="text-danger text-center">Error loading data</td></tr>';
        }
    }

    renderSkeleton() {
        const tbody = this.container.querySelector('tbody');
        tbody.innerHTML = Array(5).fill().map(() => `
            <tr class="skeleton-row">
                ${this.columns.slice(0,-1).map(col => `<td style="width:${col.width}"><div class="skeleton" style="height:16px"></div></td>`).join('')}
                <td></td>
            </tr>
        `).join('');
    }

    async loadData() {
        this.renderSkeleton(); // Phase 4: Skeleton not spinner
        try {
            this.data = await this.dataFn();
            this.renderRows();
        } catch (e) {
            const tbody = this.container.querySelector('tbody');
            tbody.innerHTML = '<tr><td colspan="' + this.columns.length + '" class="text-center text-danger p-4">Error: ' + (e.message || 'Failed to load') + '<br><button onclick="this.reload()">Retry</button></td></tr>';
            window.Toast.error('Load failed');
        }
    }

    renderRows() {
        const tbody = this.container.querySelector('tbody');
        if (!this.data.length) {
            tbody.innerHTML = '<tr><td colspan="' + this.columns.length + '" class="text-center p-4 py-8 text-muted">' + (this.options.emptyCTA || 'No data yet') + '</td></tr>';
            return;
        }
        tbody.innerHTML = this.data.map((row, idx) => {
            const cells = this.columns.map(col => {
                if (col.key === 'actions') {
                    return `<td class="actions">
                        <button class="btn-icon" onclick="window.currentTable.editRow(${idx})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon danger" onclick="window.currentTable.deleteRow(${idx})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>`;
                }
                const value = row[col.key] ?? '';
                const editable = this.options.editable && col.editable;
                return editable 
                    ? `<td class="editable" data-row="${idx}" data-col="${col.key}" ondblclick="window.currentTable.startEdit(event)">${value}</td>`
                    : `<td>${value}</td>`;
            }).join('');
            return `<tr>${cells.join('')}</tr>`;
        }).join('');
        window.currentTable = this;
    }

    async startEdit(e) {
        if (this.editingCell) return; // One at a time
        const td = e.target.closest('td');
        const rowIdx = td.dataset.row;
        const colKey = td.dataset.col;
        const oldValue = this.data[rowIdx][colKey];

        td.innerHTML = `<input class="inline-edit-input" value="${oldValue}" onkeydown="if(event.key==='Enter') this.saveEdit(); if(event.key==='Escape') this.cancelEdit();" autofocus>`;
        this.editingCell = td.querySelector('input');
        this.editingCell.select();
    }

    saveEdit() {
        if (!this.editingCell) return;
        const td = this.editingCell.closest('td');
        const rowIdx = td.dataset.row;
        const colKey = td.dataset.col;
        const newValue = this.editingCell.value;
        this.data[rowIdx][colKey] = newValue;
        td.textContent = newValue;
        this.editingCell = null;
        // Optimistic, then API save
        this.saveRowOptimistic(rowIdx);
    }

    cancelEdit() {
        if (!this.editingCell) return;
        const td = this.editingCell.closest('td');
        td.textContent = this.data[td.dataset.row][td.dataset.col];
        this.editingCell = null;
    }

    async saveRowOptimistic(idx) {
        // TODO: API patch row
        console.log('Saved:', this.data[idx]);
    }

    editRow(idx) { /* Panel */ console.log('Edit', idx); }
    deleteRow(idx) { if(confirm('Delete?')) { this.data.splice(idx,1); this.renderRows(); } }

    toggleColumns() { /* Dropdown */ alert('Columns toggle'); }
    attachEvents() {
        this.container.addEventListener('click', e => {
            if (e.target.matches('.btn-icon')) e.stopPropagation();
        });
    }
}

// Usage example:
// new DataTable('sales-container', salesColumns, () => TradingAPI.sales.list(), {title: 'Sales', addBtn: 'Trading.showAddSaleModal()'});

// Export
window.DataTable = DataTable;

