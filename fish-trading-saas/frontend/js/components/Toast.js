/**
 * Toast System - Phase 4 Feedback (Spec 11,12)
 */

class Toast {
    static container = null;
    static timeout = null;

    static init() {
        if (Toast.container) return;
        Toast.container = document.createElement('div');
        Toast.container.className = 'toast-container';
        document.body.appendChild(Toast.container);
    }

    static show(message, type = 'success', duration = 4000) {
        Toast.init();
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="toast-close" onclick="this.remove()">&times;</button>
        `;
        Toast.container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        
        clearTimeout(Toast.timeout);
        Toast.timeout = setTimeout(() => Toast.remove(toast), duration);
    }

    static success(msg) { Toast.show(msg, 'success'); }
    static error(msg) { Toast.show(msg, 'error'); }
    static info(msg) { Toast.show(msg, 'info'); }

    static remove(toast) {
        toast = toast || Toast.container.lastElementChild;
        if (toast) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    }
}

// Global: window.Toast.success('Sale saved!');
// Init auto
document.addEventListener('DOMContentLoaded', Toast.init);

window.Toast = Toast;

