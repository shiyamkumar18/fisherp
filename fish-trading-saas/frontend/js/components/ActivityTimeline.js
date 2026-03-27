/**
 * Activity Timeline - Spec #7: Dashboard recent events
 * Last 10 sales/purchases with timestamps
 */

class ActivityTimeline {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.init();
    }

    async init() {
        this.renderTimeline();
        await this.loadRecentActivity();
    }

    renderTimeline() {
        this.container.innerHTML = `
            <div class="timeline-header">
                <h3>Recent Activity <span id="activity-count">(0)</span></h3>
                <button class="btn-sm" onclick="this.parentElement.parentElement.querySelector('.timeline-list').classList.toggle('expanded')">See All</button>
            </div>
            <div class="timeline-list">
                <div class="timeline-empty">
                    <i class="fas fa-clock"></i>
                    <p>No recent activity. Start by adding your first sale or purchase!</p>
                    <button class="btn-primary btn-sm" onclick="QuickActions.toggleMenu()">+ Add Sale/Purchase</button>
                </div>
            </div>
        `;
    }

    async loadRecentActivity() {
        try {
            const [sales, purchases] = await Promise.all([
                window.App.apiCall('/trading/sales/?page_size=5&ordering=-created_at'),
                window.App.apiCall('/trading/purchase-batches/?page_size=5&ordering=-created_at')
            ]);

            const activities = [];
            
            // Recent sales
            (sales?.results || sales || []).slice(0, 5).forEach(sale => {
                activities.push({
                    type: 'sale',
                    title: `Sale ₹${window.App.formatCurrency(sale.total_revenue)}`,
                    subtitle: `to ${sale.buyer_name} (${sale.fish_name})`,
                    time: window.App.formatDate(sale.created_at),
                    icon: 'fas fa-shopping-cart success'
                });
            });

            // Recent purchases  
            (purchases?.results || purchases || []).slice(0, 5).forEach(purchase => {
                activities.push({
                    type: 'purchase',
                    title: `Purchase ₹${window.App.formatCurrency(purchase.total_cost)}`,
                    subtitle: `from ${purchase.supplier_name}`,
                    time: window.App.formatDate(purchase.created_at),
                    icon: 'fas fa-truck warning'
                });
            });

            // Sort by date
            activities.sort((a, b) => new Date(b.time) - new Date(a.time));
            activities.slice(0, 10); // Last 10

            this.renderActivities(activities);
        } catch (error) {
            console.error('Activity load failed:', error);
            this.container.querySelector('.timeline-empty').innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <p>Unable to load recent activity</p>
            `;
        }
    }

    renderActivities(activities) {
        const list = this.container.querySelector('.timeline-list');
        const countEl = document.getElementById('activity-count');
        
        if (!activities.length) {
            list.innerHTML = `
                <div class="timeline-empty">
                    <i class="far fa-clock"></i>
                    <p>No recent activity yet. Get started!</p>
                    <button class="btn-primary btn-sm" onclick="window.App.loadPage('sales')">View Sales</button>
                </div>
            `;
            if (countEl) countEl.textContent = '(0)';
            return;
        }

        list.innerHTML = activities.map(activity => `
            <div class="timeline-item ${activity.type}">
                <div class="timeline-icon">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-title">${activity.title}</div>
                    <div class="timeline-subtitle">${activity.subtitle}</div>
                    <div class="timeline-time">${activity.time}</div>
                </div>
            </div>
        `).join('');

        if (countEl) countEl.textContent = `(${activities.length})`;
    }
}

// Usage in dashboard: new ActivityTimeline('activity-timeline');
window.ActivityTimeline = ActivityTimeline;

