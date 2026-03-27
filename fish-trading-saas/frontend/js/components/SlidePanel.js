/**
 * SlidePanel - Phase 3 UX: Right-slide panels replace modals
 * Features: Context-visible CRUD, 35% width, sticky footer, ESC/close
 */

class SlidePanel {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'slide-panel-overlay';
        this.container.innerHTML = `
            <div class="slide-panel">
                <div class="slide-panel-header">
                    <h3 id="panel-title" class="panel-title"></h3>
                    <button class="panel-close" onclick="SlidePanel.close()">&times;</button>
                </div>
                <div class="slide-panel-body" id="panel-body"></div>
                <div class="slide-panel-footer">
                    <button class="btn-secondary" onclick="SlidePanel.close()">Cancel</button>
                    <button class="btn-primary" id="panel-save">Save</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.container);
        this.titleEl = document.getElementById('panel-title');
        this.bodyEl = document.getElementById('panel-body');
        this.saveEl = document.getElementById('panel-save');
        this.attachGlobalEvents();
    }

    static instance = null;
    static getInstance() {
        if (!SlidePanel.instance) SlidePanel.instance = new SlidePanel();
        return SlidePanel.instance;
    }

    static open(title, content, options = {}) {
        const panel = SlidePanel.getInstance();
        panel.titleEl.textContent = title;
        panel.bodyEl.innerHTML = content;
        panel.saveEl.onclick = options.onSave || (() => console.log('Save'));
        panel.container.classList.add('show');
        // Focus management
        setTimeout(() => panel.bodyEl.querySelector('input')?.focus(), 200);
    }

    static close() {
        if (SlidePanel.instance) SlidePanel.instance.container.classList.remove('show');
    }

    attachGlobalEvents() {
        // ESC close
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && this.container.classList.contains('show')) {
                SlidePanel.close();
            }
        });
        // Outside click close
        this.container.addEventListener('click', e => {
            if (e.target === this.container) SlidePanel.close();
        });
    }
}

// Helpers
const Forms = {
    showAddSaleModal() {
        // Demo form
        const formHTML = `
            <form id="sale-form" class="form-grid">
                <div class="form-group">
                    <label>Buyer</label>
                    <select class="form-control"><option>ABC Retail</option></select>
                </div>
                <div class="form-group">
                    <label>Fish</label>
                    <select class="form-control"><option>Salmon</option></select>
                </div>
                <div class="form-group">
                    <label>Quantity</label>
                    <input type="number" class="form-control">
                </div>
                <div class="form-group">
                    <label>Price/kg</label>
                    <input type="number" class="form-control" step="0.01">
                </div>
                <div class="form-group">
                    <label>Total <span id="total-calc"></span></label>
                    <input type="number" class="form-control" readonly>
                </div>
            </form>
        `;
        SlidePanel.open('Add Sale', formHTML, {
            onSave: () => {
                console.log('Save sale form');
                SlidePanel.close();
            }
        });
    },
    // Add buyer/supplier/purchase similar...
};

// Export
window.SlidePanel = SlidePanel;
window.Forms = Forms;

