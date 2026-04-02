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
        if (!tbody) return;
        const actionsColIndex = this.columns.findIndex(col => col.key === 'actions' || col.type === 'actions');
        const skeletonColumns = actionsColIndex !== -1 ? this.columns.slice(0, actionsColIndex) : this.columns;
        tbody.innerHTML = Array(5).fill().map(() => `
            <tr class="skeleton-row">
                ${skeletonColumns.map(col => `<td style="width:${col.width}"><div class="skeleton" style="height:16px"></div></td>`).join('')}
                ${actionsColIndex !== -1 ? '<td></td>' : ''}
            </tr>
        `).join('');
    }

    async loadData() {
        const tbody = this.container.querySelector('tbody');
        if (!tbody) return;
        const actionsColIndex = this.columns.findIndex(col => col.key === 'actions' || col.type === 'actions');
        const skeletonColumns = actionsColIndex !== -1 ? this.columns.slice(0, actionsColIndex) : this.columns;
        const skeletonRow = document.createElement('tr');
        skeletonRow.className = 'skeleton-row';
        skeletonColumns.forEach(col => {
            const td = document.createElement('td');
            td.style.width = col.width;
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton';
            skeleton.style.height = '16px';
            td.appendChild(skeleton);
            skeletonRow.appendChild(td);
        });
        if (actionsColIndex !== -1) {
            skeletonRow.appendChild(document.createElement('td'));
        }
        tbody.innerHTML = '';
        tbody.appendChild(skeletonRow);
        
        try {
            this.data = await this.dataFn();
            this.renderRows();
        } catch (e) {
            tbody.innerHTML = '';
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = this.columns.length;
            cell.className = 'text-center text-danger p-4';
            cell.textContent = 'Error: ' + (e.message || 'Failed to load');
            row.appendChild(cell);
            tbody.appendChild(row);
            window.Toast?.error?.('Load failed');
        }
    }

    renderRows() {
        const tbody = this.container.querySelector('tbody');
        if (!this.data.length) {
            tbody.innerHTML = '';
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = this.columns.length;
            cell.className = 'text-center p-4 py-8 text-muted';
            cell.textContent = this.options.emptyCTA || 'No data yet';
            row.appendChild(cell);
            tbody.appendChild(row);
            return;
        }
        
        tbody.innerHTML = '';
        this.data.forEach((row, idx) => {
            const tr = document.createElement('tr');
            this.columns.forEach(col => {
                const cell = document.createElement('td');
                
                if (col.key === 'actions') {
                    const editBtn = document.createElement('button');
                    editBtn.className = 'btn-icon';
                    editBtn.title = 'Edit';
                    editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                    editBtn.onclick = () => this.editRow(idx);
                    cell.appendChild(editBtn);
                    
                    const delBtn = document.createElement('button');
                    delBtn.className = 'btn-icon danger';
                    delBtn.title = 'Delete';
                    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
                    delBtn.onclick = () => this.deleteRow(idx);
                    cell.appendChild(delBtn);
                    
                    cell.className = 'actions';
                } else {
                    const value = row[col.key] ?? '';
                    const editable = this.options.editable && col.editable;
                    cell.className = editable ? 'editable' : '';
                    cell.dataset.row = idx;
                    cell.dataset.col = col.key;
                    cell.textContent = String(value);
                    
                    if (editable) {
                        cell.ondblclick = (e) => this.startEdit(e);
                    }
                }
                
                tr.appendChild(cell);
            });
            tbody.appendChild(tr);
        });
        window.currentTable = this;
    }

    async startEdit(e) {
        if (this.editingCell) return; // One at a time
        const td = e.target.closest('td');
        const rowIdx = parseInt(td.dataset.row);
        const colKey = td.dataset.col;
        const oldValue = this.data[rowIdx][colKey];

        const input = document.createElement('input');
        input.className = 'inline-edit-input';
        input.type = 'text';
        input.value = String(oldValue || '');
        
        input.onkeydown = (event) => {
            if (event.key === 'Enter') this.saveEdit();
            if (event.key === 'Escape') this.cancelEdit();
        };
        
        td.innerHTML = '';
        td.appendChild(input);
        this.editingCell = input;
        input.select();
        input.focus();
    }

    saveEdit() {
        if (!this.editingCell) return;
        const td = this.editingCell.closest('td');
        const rowIdx = parseInt(td.dataset.row);
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

