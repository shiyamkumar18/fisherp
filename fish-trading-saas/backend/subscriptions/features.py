"""
Standard Feature Registry for Subscription Entitlements.
Contains string constants representing every gated feature in the system,
as well as mappings from the legacy SubscriptionTier boolean flags.
"""

# ==========================================
# Core Operations
# ==========================================
FEATURE_PURCHASE = "purchase"
FEATURE_SALES = "sales"
FEATURE_INVENTORY = "inventory"
FEATURE_PAYMENT_TRACKING = "payment_tracking"

# ==========================================
# Dashboards & Analytics
# ==========================================
FEATURE_DASHBOARD_BASIC = "dashboard_basic"
FEATURE_ANALYTICS = "analytics"
FEATURE_PROFIT_BY_FISH = "profit_by_fish"
FEATURE_PROFIT_BY_SUPPLIER = "profit_by_supplier"
FEATURE_MONTHLY_COMPARISON = "monthly_comparison"

# ==========================================
# Advanced Features
# ==========================================
FEATURE_VOICE_AI = "voice_ai"
FEATURE_CREDIT_RISK = "credit_risk"
FEATURE_MARKET_PRICE = "market_price"
FEATURE_WHATSAPP = "whatsapp"
FEATURE_ADVANCED_REPORTS = "advanced_reports"
FEATURE_SPOILAGE_TRACKING = "spoilage_tracking"
FEATURE_QUALITY_GRADING = "quality_grading"
FEATURE_COMMISSION_TRACKING = "commission_tracking"

# ==========================================
# AI & Prediction
# ==========================================
FEATURE_AI_ALERTS = "ai_alerts"
FEATURE_DEMAND_PREDICTION = "demand_prediction"
FEATURE_MARKET_PREDICTION = "market_prediction"

# ==========================================
# Enterprise
# ==========================================
FEATURE_MULTI_LOCATION = "multi_location"
FEATURE_MULTI_LANGUAGE = "multi_language"
FEATURE_API_ACCESS = "api_access"

# ==========================================
# Legacy Field Mapping
# Maps the standard feature constants to the legacy boolean fields 
# existing on the SubscriptionTier model.
# ==========================================
LEGACY_TIER_MAPPING = {
    FEATURE_PURCHASE: "allow_purchase_entry",
    FEATURE_SALES: "allow_sale_entry",
    FEATURE_INVENTORY: "allow_inventory",
    FEATURE_PAYMENT_TRACKING: "allow_payment_tracking",
    
    FEATURE_DASHBOARD_BASIC: "allow_today_sales",
    FEATURE_ANALYTICS: "allow_advanced_analytics",
    FEATURE_PROFIT_BY_FISH: "allow_profit_by_fish",
    FEATURE_PROFIT_BY_SUPPLIER: "allow_profit_by_supplier",
    FEATURE_MONTHLY_COMPARISON: "allow_monthly_comparison",
    
    FEATURE_VOICE_AI: "allow_voice_commands",  # Need to check if this field exists
    FEATURE_CREDIT_RISK: "allow_credit_risk_alert",
    FEATURE_ADVANCED_REPORTS: "allow_advanced_reporting",
    FEATURE_QUALITY_GRADING: "allow_quality_grading",
    FEATURE_COMMISSION_TRACKING: "allow_commission_tracking",
    
    FEATURE_AI_ALERTS: "allow_ai_alerts",
    FEATURE_DEMAND_PREDICTION: "allow_demand_prediction",
    
    FEATURE_MULTI_LOCATION: "allow_multi_location",
    FEATURE_API_ACCESS: "allow_api_access",
}

# ==========================================
# Quota Constants
# ==========================================
QUOTA_MAX_USERS = "max_users"
QUOTA_MAX_STORAGE_GB = "max_storage_gb"
QUOTA_MONTHLY_TRANSACTIONS = "monthly_transactions"
QUOTA_VOICE_MINUTES = "voice_minutes"
QUOTA_WHATSAPP_MESSAGES = "whatsapp_messages"
