/**
 * Command Palette (Ctrl+K) - Spec #1: VS Code/Notion style
 * Features: Fuzzy search, actions, pages, recent items
 */

class CommandPalette {
    constructor() {
        this.isOpen = false;
        this.commands = [];
        this.input = null;
        this.results = null;
        this.container = null;
        this.initCommands();
        this.attachGlobalHotkey();
    }

    initCommands() {
        // Pages
        Object.keys(window.App.pages || {}).forEach(page => {
            this.commands.push({
                id: `page-${page}`,
                type: 'page',
                title: page.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                icon: 'fas fa-th-large',
                execute: () => window.App.loadPage(page)
            });
        });

        // Actions (top priority)
        this.commands.push(
            { id: 'add-sale', type: 'action', title: 'Add Sale', icon: 'fas fa-shopping-cart', keywords: ['sale', 'add sale', 'new sale'], execute: () => window.Forms?.showAddSaleModal() || window.SlidePanel.open('Add Sale', 'Form here') },
            { id: 'add-purchase', type: 'action', title: 'Add Purchase', icon: 'fas fa-truck', keywords: ['purchase', 'add purchase'], execute: () => window.SlidePanel.open('Add Purchase', 'Form here') },
            { id: 'add-buyer', type: 'action', title: 'Add Buyer', icon: 'fas fa-user-plus', keywords: ['buyer', 'add buyer'], execute: () => window.SlidePanel.open('Add Buyer', buyerFormHtml()) },
            { id: 'add-supplier', type: 'action', title: 'Add Supplier', icon: 'fas fa-user-plus', keywords: ['supplier'], execute: () => window.SlidePanel.open('Add Supplier', supplierFormHtml()) }
        );

        // Recent (stub - from localStorage)
        this.commands.push({ id: 'recent-sales', type: 'recent', title: 'Recent Sales', icon: 'fas fa-clock', execute: () => window.App.loadPage('sales') });
    }

    // Simple fuzzy match
    score(query, title, keywords = []) {
        const q = query.toLowerCase();
        let score = 0;
        if (title.toLowerCase().includes(q)) score += 10;
        keywords.forEach(kw => { if (kw.includes(q)) score += 15; });
        return score;
    }

    filter(query) {
        return this.commands
            .map(cmd => ({ ...cmd, matchScore: this.score(query, cmd.title, cmd.keywords || []) }))
            .filter(cmd => cmd.matchScore > 0)
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 8);
    }

    open() {
        if (this.isOpen) return;
        this.container = document.createElement('div');
        this.container.className = 'command-palette-overlay';
        this.container.innerHTML = `
            <div class="command-palette">
                <div class="cp-header">
                    <i class="fas fa-magnifying-glass"></i>
                    <input id="cp-input" placeholder="Search pages, actions... (↓↑ Enter ESC)" autofocus>
                    <div id="cp-results" class="cp-results"></div>
                </div>
            </div>
        `;
        document.body.appendChild(this.container);

        this.input = document.getElementById('cp-input');
        this.results = document.getElementById('cp-results');
        this.attachEvents();
        this.isOpen = true;
        this.input.focus();
    }

    close() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.isOpen = false;
    }

    attachEvents() {
        this.input.addEventListener('input', (e) => this.renderResults(e.target.value));
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
            if (e.key === 'Enter' && this.results.firstElementChild) {
                this.results.firstElementChild.click();
            }
            // Arrow keys (future: selection)
        });

        this.results.addEventListener('click', (e) => {
            const item = e.target.closest('.cp-result');
            if (item) {
                const cmd = JSON.parse(item.dataset.cmd);
                cmd.execute();
                this.close();
            }
        });
    }

    renderResults(query) {
        const matches = this.filter(query);
        this.results.innerHTML = matches.map(cmd => `
            <div class="cp-result" data-cmd='${JSON.stringify(cmd)}'>
                <i class="${cmd.icon}"></i>
                <span>${cmd.title}</span>
                <small>${cmd.type}</small>
            </div>
        `).join('') || '<div class="cp-empty">No results</div>';
    }

    attachGlobalHotkey() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                this.isOpen ? this.close() : this.open();
            }
        });
    }
}

// HTML helpers (stub)
function buyerFormHtml() {
    return `<form><!-- buyer form --></form>`;
}
function supplierFormHtml() {
    return `<form><!-- supplier form --></form>`;
}

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    window.CommandPalette = new CommandPalette();
});

