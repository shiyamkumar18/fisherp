/**
 * DataTable Summary Row Plugin
 * Inline totals bar (Spec 15: Total Sales ₹45k, Qty 320kg)
 */

class DataTableSummary {
    constructor() {
        this.numericColumns = [];
    }

    init(table) {
        this.table = table;
        // Auto-detect numeric columns (qty, revenue, profit)
        this.numericColumns = table.columns.filter(col => 
            col.key.match(/qty|amount|revenue|profit|cost|price/i)
        );
        this.renderSummaryRow();
    }

    renderSummaryRow() {
        const tfoot = document.getElementById(this.table.table.containerId + '-tfoot');
        tfoot.innerHTML = '<tr class="summary-row">' +
            this.table.columns.map(col => {
                if (this.isNumericColumn(col.key)) {
                    return `<td data-col="${col.key}" class="summary-cell numeric">0</td>`;
                }
                return col.key === 'actions' ? '<td></td>' : '<td></td>';
            }).join('') + '</tr>';
    }

    isNumericColumn(key) {
        return this.numericColumns.some(col => col.key === key);
    }

    updateSummary(data) {
        const dataForSummary = data || this.table.data;
        this.numericColumns.forEach(col => {
            const cell = document.querySelector(`#${this.table.containerId} .summary-cell[data-col="${col.key}"]`);
            if (cell) {
                const sum = dataForSummary.reduce((total, row) => total + (parseFloat(row[col.key]) || 0), 0);
                cell.textContent = window.App.formatCurrency ? window.App.formatCurrency(sum) : sum.toLocaleString();
            }
        });

        // Total records
        const recordsCell = document.querySelector(`#${this.table.containerId} .summary-cell:first-child`);
        if (recordsCell && !recordsCell.dataset.col) {
            recordsCell.textContent = `${dataForSummary.length} records`;
        }
    }

    onDataLoaded(data) {
        this.updateSummary(data);
    }
}

window.DataTableSummary = DataTableSummary;

