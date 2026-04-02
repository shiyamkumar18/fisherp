# Frontend Quick Fix Reference

## What Was Fixed

### 🔴 CRITICAL - XSS Security Vulnerabilities
All instances of `innerHTML` with unsanitized user data have been replaced with safe DOM methods.

**Don't:**
```javascript
tbody.innerHTML = data.map(item => `<tr><td>${item.name}</td></tr>`).join('');
```

**Do:**
```javascript
data.forEach(item => {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.textContent = item.name; // textContent escapes automatically
    row.appendChild(cell);
    tbody.appendChild(row);
});
```

---

### 🔴 CRITICAL - Token Security
Token refresh mechanism is now implemented. Tokens are automatically refreshed on 401 errors.

**Before:** Tokens expired silently
**After:** Auto-refresh with retry, then logout if truly unauthorized

---

### 🟡 HIGH - Error Handling
All DOM operations now check for null elements before access.

**Before:**
```javascript
document.getElementById('userName').textContent = name; // Could crash if not found
```

**After:**
```javascript
const el = document.getElementById('userName');
if (el) el.textContent = name;
```

---

## How to Use New Features

### Safe Table Rendering

When building tables from API data:

```javascript
// Create a row safely
const row = createTableRow(data, [
    { key: 'name', type: 'text' },
    { key: 'amount', type: 'currency' },
    { key: 'date', type: 'date' },
    { key: 'status', type: 'badge' }
]);
tbody.appendChild(row);
```

### Using SafeDOM Utilities

```javascript
// Import available at window.SafeDOM
SafeDOM.setTableLoading(tableElement, 5); // Show loading for 5 columns
SafeDOM.setTableEmpty(tableElement, 5, 'No records found');
SafeDOM.setTableError(tableElement, 5, 'Failed to load data');

const cell = SafeDOM.createTableCell('Active', 'badge');
```

---

## API Module Usage

### Token Management
```javascript
// Get current token
const token = TokenManager.getToken();

// Set token from login
TokenManager.setToken(data.token);
TokenManager.setRefreshToken(data.refresh);

// Refresh token (auto-called on 401)
const success = await TokenManager.refreshToken();

// Logout
TokenManager.removeToken();
```

### API Calls
```javascript
// Use window.API (centralized)
const data = await window.API.get('/trading/sales/');
const result = await window.API.post('/trading/sales/', { data });

// Check for errors
if (window.API.lastError) {
    console.error(window.API.lastError.detail);
}
```

---

## Common Patterns

### Loading Data with Error Handling
```javascript
const tableBody = document.getElementById('dataTable');
if (!tableBody) return; // Null check

SafeDOM.setTableLoading(tableBody, 6);

try {
    const data = await window.API.get('/endpoint/');
    if (!data || data.length === 0) {
        SafeDOM.setTableEmpty(tableBody, 6);
        return;
    }
    
    tableBody.innerHTML = ''; // Clear loading state
    data.forEach(item => {
        const row = createTableRow(item, columnDefs);
        tableBody.appendChild(row);
    });
} catch (error) {
    SafeDOM.setTableError(tableBody, 6, error.message);
}
```

### Safe Alert Display
```javascript
const alertDiv = document.createElement('div');
alertDiv.className = 'alert alert-success';

const icon = document.createElement('i');
icon.className = 'fas fa-check-circle';
alertDiv.appendChild(icon);

const text = document.createTextNode('Operation successful');
alertDiv.appendChild(text);

document.body.appendChild(alertDiv);
```

---

## What NOT to Do

❌ **Don't use innerHTML with user data**
```javascript
element.innerHTML = `<p>${userInput}</p>`; // XSS risk!
```

❌ **Don't use onclick attributes**
```javascript
<button onclick="deleteItem(123)">Delete</button> // Hard to track, security risk
```

❌ **Don't skip null checks**
```javascript
document.getElementById('missing').textContent = 'Hi'; // Crashes if not found
```

❌ **Don't handle 401 silently**
```javascript
if (response.status === 401) {
    // Old code did nothing useful here
    return null;
}
```

---

## Testing Your Changes

### Quick Test for XSS Prevention
Try injecting HTML in API responses:
```javascript
// Simulated API response with attempted XSS
const malicious = {
    name: '<img src=x onerror="alert(\'XSS\')">'
};

// Safe rendering (won't execute)
const cell = document.createElement('td');
cell.textContent = malicious.name; // Safe!
```

### Test Token Refresh
1. Set a breakpoint in `TokenManager.refreshToken()`
2. Make an API call
3. Manually trigger a 401 response
4. Token should auto-refresh

---

## Migration Checklist for Other Pages

If you're working on other pages, apply these patterns:

- [ ] Replace all `innerHTML` with user data using safe methods
- [ ] Add null checks for DOM element access
- [ ] Use event listeners instead of inline `onclick=`
- [ ] Wrap async operations in try-catch
- [ ] Use `textContent` instead of `innerHTML` when possible
- [ ] Use `SafeDOM` utilities for consistent patterns
- [ ] Remove hardcoded localStorage access (use TokenManager)

---

## Resources

- `js/utils/sanitize.js` - Safe DOM utilities
- `js/api.js` - Centralized API module with TokenManager
- `js/components/DataTable.js` - Reusable table component (fully safe)
- `FRONTEND_FIXES_SUMMARY.md` - Complete implementation details

---

## Questions?

See the comprehensive summary in `FRONTEND_FIXES_SUMMARY.md` for more details.
