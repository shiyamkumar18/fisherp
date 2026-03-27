/**
 * DataTable Column Memory Plugin
 * Persists column visibility per user/table using SafeStorage
 */

class DataTableColumnMemory {
    constructor() {
        this.storage = window.Storage.tables;
    }

    init(table) {
        this.table = table;
        this.tableId = table.containerId;
        this.loadColumnState();
        this.attachToggleEvents();
    }

    loadColumnState() {
        const visibleCols = this.storage.get(`${this.tableId}_visible`, []);
        const allCols = this.table.columns.map(col => col.key);
        
        // Hide invisible columns
        this.table.columns.forEach(col => {
            if (!visibleCols.includes(col.key)) {
                const th = document.querySelector(`#${this.tableId} th[data-col="${col.key}"]`);
                const tds = document.querySelectorAll(`#${this.tableId} td[data-col="${col.key}"]`);
                if (th) th.style.display = 'none';
                tds.forEach(td => td.style.display = 'none');
            }
        });
    }

    attachToggleEvents() {
        // Column toggle button
        const toggleBtn = this.table.container.querySelector('.table-actions .btn-sm');
        if (toggleBtn) {
            toggleBtn.onclick = () => this.showColumnMenu();
        }
    }

    showColumnMenu() {
        const cols = this.table.columns.filter(col => col.key !== 'actions');
        const visibleCols = this.storage.get(`${this.tableId}_visible`, cols.map(c => c.key));
        
        window.SlidePanel.open('Column Visibility', `
            <div class="column-menu">
                ${cols.map(col => `
                    <label class="checkbox-item">
                        <input type="checkbox" ${visibleCols.includes(col.key) ? 'checked' : ''} value="${col.key}">
                        ${col.label}
                    </label>
                `).join('')}
                <div class="menu-actions">
                    <button class="btn-primary" onclick="this.saveColumns()">Apply</button>
                    <button class="btn-secondary" onclick="SlidePanel.close()">Cancel</button>
                </div>
            </div>
        `, { onSave: () => this.saveColumns() });
        
        // Apply button handler
        document.querySelector('.column-menu .btn-primary').onclick = () => this.saveColumns();
    }

    saveColumns() {
        const checkboxes = document.querySelectorAll('.column-menu input[type="checkbox"]:checked');
        const visibleCols = Array.from(checkboxes).map(cb => cb.value);
        this.storage.set(`${this.tableId}_visible`, visibleCols);
        
        // Re-render table with new visibility
        this.table.renderHeader();
        this.table.renderBody();
        window.Toast.success('Columns saved');
        SlidePanel.close();
    }

    onDataLoaded(data) {
        // Re-apply visibility after data load
        this.loadColumnState();
    }
}

// Auto-register
if (window.DataTableCore) {
    window.DataTableColumnMemory = DataTableColumnMemory;
}

