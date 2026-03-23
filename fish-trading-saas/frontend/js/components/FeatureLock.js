// Fish ERP - Feature Lock Component

const FeatureLock = {
    /**
     * Feature to required tier mapping
     */
    featureRequirements: {
        // Reports & Analytics - Premium
        'reports': { tier: 'premium', feature: 'allow_advanced_analytics' },
        'analytics': { tier: 'premium', feature: 'allow_advanced_analytics' },
        'allow_csv_export': { tier: 'premium', feature: 'allow_csv_export' },
        'allow_pdf_reports': { tier: 'premium', feature: 'allow_pdf_reports' },
        
        // Enterprise features
        'audit': { tier: 'enterprise', feature: 'allow_audit_logs' },
        'warehouses': { tier: 'enterprise', feature: 'allow_multi_location' },
        'temperature': { tier: 'enterprise', feature: 'allow_temperature_monitoring' },
        'transport': { tier: 'enterprise', feature: 'allow_transport_management' },
        
        // Premium analytics features
        'allow_profit_by_fish': { tier: 'premium', feature: 'allow_profit_by_fish' },
        'allow_profit_by_supplier': { tier: 'premium', feature: 'allow_profit_by_supplier' },
        'allow_batch_profit_analysis': { tier: 'premium', feature: 'allow_batch_profit_analysis' },
        'allow_monthly_comparison': { tier: 'premium', feature: 'allow_monthly_comparison' },
        'allow_credit_risk_alert': { tier: 'premium', feature: 'allow_credit_risk_alert' },
        'allow_quality_grading': { tier: 'premium', feature: 'allow_quality_grading' },
        'allow_commission_tracking': { tier: 'premium', feature: 'allow_commission_tracking' },
        'allow_ai_alerts': { tier: 'premium', feature: 'allow_ai_alerts' }
    },

    /**
     * Check if a feature is locked for current user
     */
    isLocked: (featureName) => {
        const requirement = FeatureLock.featureRequirements[featureName];
        if (!requirement) {
            // No specific requirement - not locked
            return false;
        }

        // Check tier level
        const tierLevels = { 'basic': 1, 'premium': 2, 'enterprise': 3 };
        const requiredLevel = tierLevels[requirement.tier] || 1;
        
        return window.useFeature.getCurrentTierLevel() < requiredLevel;
    },

    /**
     * Show feature locked modal
     */
    showLockedModal: (featureName, customMessage = null) => {
        const requirement = FeatureLock.featureRequirements[featureName] || { tier: 'premium', feature: featureName };
        
        const tierDisplay = requirement.tier.charAt(0).toUpperCase() + requirement.tier.slice(1);
        const currentTier = window.useFeature.getCurrentTierDisplayName();
        
        const modalContent = `
            <div class="feature-locked-modal">
                <div class="locked-icon">
                    <i class="fas fa-lock"></i>
                </div>
                <h3>Upgrade to Unlock</h3>
                <p>${customMessage || `This feature requires a ${tierDisplay} subscription.`}</p>
                <div class="plan-comparison">
                    <div class="current-plan-box">
                        <span class="label">Current Plan</span>
                        <span class="value">${currentTier}</span>
                    </div>
                    <div class="arrow">
                        <i class="fas fa-arrow-right"></i>
                    </div>
                    <div class="required-plan-box">
                        <span class="label">Required Plan</span>
                        <span class="value">${tierDisplay}</span>
                    </div>
                </div>
                <div class="feature-benefits">
                    <h4>With ${tierDisplay}, you get:</h4>
                    <ul>
                        ${FeatureLock.getFeatureBenefits(requirement.tier)}
                    </ul>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="UI.closeModal()">Maybe Later</button>
                    <button class="btn btn-primary" onclick="UI.closeModal(); App.loadPage('subscription');">
                        <i class="fas fa-crown"></i> Upgrade Now
                    </button>
                </div>
            </div>
        `;
        
        window.UI.showModal('Upgrade Required', modalContent);
    },

    /**
     * Get feature benefits for a tier
     */
    getFeatureBenefits: (tier) => {
        const benefits = {
            premium: [
                'Advanced Analytics & Reports',
                'Profit by Fish & Supplier Analysis',
                'Credit Risk & Overdue Alerts',
                'Quality Grading & Commission Tracking',
                'CSV Export & PDF Reports',
                'AI-Powered Alerts'
            ],
            enterprise: [
                'Multi-location & Warehouse Management',
                'Stock Transfers Between Locations',
                'Full Audit Logs & Activity History',
                'Temperature Monitoring',
                'Transport & Delivery Management',
                'Priority Support & API Access'
            ]
        };

        return (benefits[tier] || []).map(b => `<li><i class="fas fa-check"></i> ${b}</li>`).join('');
    },

    /**
     * Hide locked elements on the page
     */
    hideLockedElements: () => {
        // Hide elements with data-tier-required higher than current
        const tierLevel = window.useFeature.getCurrentTierLevel();
        const tierLevels = { 'basic': 1, 'premium': 2, 'enterprise': 3 };
        
        document.querySelectorAll('[data-tier-required]').forEach(el => {
            const requiredTier = el.getAttribute('data-tier-required');
            const requiredLevel = tierLevels[requiredTier] || 1;
            
            if (tierLevel < requiredLevel) {
                el.style.display = 'none';
            }
        });

        // Hide elements with data-feature-required that aren't enabled
        document.querySelectorAll('[data-feature-required]').forEach(el => {
            const feature = el.getAttribute('data-feature-required');
            if (!window.useFeature.canAccessFeature(feature)) {
                el.style.display = 'none';
            }
        });
    },

    /**
     * Show locked elements (for admin preview)
     */
    showLockedElements: () => {
        document.querySelectorAll('[data-tier-required]').forEach(el => {
            el.style.display = '';
        });

        document.querySelectorAll('[data-feature-required]').forEach(el => {
            el.style.display = '';
        });
    },

    /**
     * Wrap a callback to check feature access
     */
    withAccessCheck: (featureName, callback, onLocked = null) => {
        if (FeatureLock.isLocked(featureName)) {
            if (onLocked) {
                onLocked();
            } else {
                FeatureLock.showLockedModal(featureName);
            }
            return false;
        }
        
        if (callback) {
            callback();
        }
        return true;
    }
};

// Export to window
window.FeatureLock = FeatureLock;

