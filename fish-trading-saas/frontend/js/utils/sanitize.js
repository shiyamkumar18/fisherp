/**
 * Safe DOM Rendering Utilities
 * Prevents XSS attacks by avoiding innerHTML with unsanitized content
 */

// Escape HTML special characters
function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Create a safe table cell
function createTableCell(content, type = 'text', attributes = {}) {
    const cell = document.createElement('td');
    
    if (type === 'currency' && typeof content === 'number') {
        cell.textContent = '₹' + content.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    } else if (type === 'date' && content) {
        try {
            const date = new Date(content);
            cell.textContent = date.toLocaleDateString('en-IN');
        } catch {
            cell.textContent = String(content);
        }
    } else if (type === 'badge') {
        const span = document.createElement('span');
        span.className = `status-badge ${sanitizeHTML(content)}`;
        span.textContent = String(content).toUpperCase();
        cell.appendChild(span);
        return cell;
    } else if (type === 'html') {
        const rawHtml = String(content || '');
        const safeContent = (window && window.DOMPurify && typeof window.DOMPurify.sanitize === 'function')
            ? window.DOMPurify.sanitize(rawHtml)
            : sanitizeHTML(rawHtml);
        cell.innerHTML = safeContent;
    } else {
        cell.textContent = String(content || '');
    }
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'class') {
            cell.className = value;
        } else if (!key.startsWith('on')) {
            cell.setAttribute(key, value);
        }
    });
    
    return cell;
}

// Create a safe table row from data
function createTableRow(data, columnDefs) {
    const row = document.createElement('tr');
    
    columnDefs.forEach(col => {
        let value = data[col.key];
        const cell = createTableCell(value, col.type || 'text', col.attributes);
        row.appendChild(cell);
    });
    
    return row;
}

// Safe way to set loading state in a table
function setTableLoading(tableElement, colCount = 7) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = colCount;
    cell.className = 'text-center';
    
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.textContent = 'Loading...';
    cell.appendChild(spinner);
    row.appendChild(cell);
    
    tableElement.innerHTML = '';
    tableElement.appendChild(row);
}

// Safe way to set empty state in a table
function setTableEmpty(tableElement, colCount = 7, message = 'No data found') {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = colCount;
    cell.className = 'text-center text-muted p-4';
    cell.textContent = message;
    row.appendChild(cell);
    
    tableElement.innerHTML = '';
    tableElement.appendChild(row);
}

// Safe way to set error state in a table
function setTableError(tableElement, colCount = 7, error = 'Error loading data') {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = colCount;
    cell.className = 'text-center text-danger p-4';
    cell.textContent = String(error || 'Error loading data');
    row.appendChild(cell);
    
    tableElement.innerHTML = '';
    tableElement.appendChild(row);
}

// Create action button
function createActionButton(icon, onClick, title = '', isDisabled = false) {
    const button = document.createElement('button');
    const isDanger = typeof onClick === 'function'
        ? title.toLowerCase().includes('delete')
        : false;
    button.className = `btn-icon ${isDanger ? 'danger' : ''}`;
    button.title = title;
    button.disabled = isDisabled;
    
    const i = document.createElement('i');
    i.className = `fas fa-${icon}`;
    button.appendChild(i);
    
    if (typeof onClick === 'function') {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            onClick(e);
        });
    }
    
    return button;
}

// Export for use in other modules
window.SafeDOM = {
    sanitizeHTML,
    createTableCell,
    createTableRow,
    setTableLoading,
    setTableEmpty,
    setTableError,
    createActionButton
};
