/**
 * DataTable Inline Filters Plugin
 * Per-column search + global filter
 */

class DataTableFilters {
    constructor() {
        this.filteredData = [];
    }

    init(table) {
        this.table = table;
        this.renderFilterRow();
        this.attachFilterEvents();
    }

    renderFilterRow() {
        const thead = document.getElementById(this.table.containerId + '-thead');
        const filterRow = document.createElement('tr');
        filterRow.className = 'filter-row';
        filterRow.innerHTML = this.table.columns.map(col => 
            col.filterable !== false ? `<th><input type="text" data-col="${col.key}" placeholder="Filter ${col.label}..." class="filter-input"></th>` : '<th></th>'
        ).join('');
        thead.parentNode.insertBefore(filterRow, thead.nextSibling);
    }

    attachFilterEvents() {
        this.table.container.addEventListener('input', (e) => {
            if (e.target.classList.contains('filter-input')) {
                this.applyFilters();
            }
        });
    }

    applyFilters() {
        const filters = {};
        this.table.container.querySelectorAll('.filter-input').forEach(input => {
            if (input.value.trim()) {
                filters[input.dataset.col] = input.value.toLowerCase();
            }
        });

        this.filteredData = this.table.data.filter(row => {
            return Object.entries(filters).every(([key, value]) => {
                const cellValue = String(row[key] || '').toLowerCase();
                return cellValue.includes(value);
            });
        });

        // Re-render filtered data
        const tbody = document.getElementById(this.table.containerId + '-tbody');
        tbody.innerHTML = this.filteredData.map((row, idx) => {
            // Map filtered index back to original for actions
            const origIdx = this.table.data.indexOf(row);
            const cells = this.table.columns.map(col => col.key === 'actions' ? 
                this.table.renderActions(origIdx) : `<td>${row[col.key]}</td>`).join('');
            return '<tr>' + cells + '</tr>';
        }).join('');

        // Update summary if available
        if (this.table.plugins.has('summary')) {
            this.table.plugins.get('summary').updateSummary(this.filteredData);
        }
    }

    getVisibleCount() {
        return this.filteredData.length;
    }
}

window.DataTableFilters = DataTableFilters;

