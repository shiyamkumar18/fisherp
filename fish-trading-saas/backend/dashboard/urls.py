from django.urls import path
from .views import (
    # New Dashboard APIs
    FinancialOverviewView,
    SalesTrendView,
    MonthlyRevenueComparisonView,
    ProfitMarginTrendView,
    TopBuyersView,
    TopFishView,
    SalesByPaymentMethodView,
    InventoryOverviewView,
    InventoryByCategoryView,
    BatchProfitMarginView,
    PaymentCashflowView,
    PaymentSummaryView,
    CreditCustomersView,
    OperationalDashboardView,
    RiskAlertsView,
    AdminDashboardView,
    # Chart System MVP
    ProfitLossReceivableView,
    SoldVsRemainingView,
    FishDemandTrendView,
    # Legacy Views (for backward compatibility)
    TodaySummaryView,
    MonthlySummaryView,
    YearlySummaryView,
    ProfitByPurchaseTypeView,
    ProfitByPlaceView,
    ProfitByFishermanView,
    ProfitByFishTypeView,
    PendingPaymentsView,
    DashboardOverviewView,
    # New Role-based Visual Dashboard APIs
    TenantAdminDashboardView,
    BatchSpecificDashboardView,
    FilterOptionsView,
)

from .views import DashboardView

urlpatterns = [
    # ============================================================
    # NEW DASHBOARD APIs - PHASE 1 (MVP)
    # ============================================================
    
    # Financial Overview (KPI Cards)
    path("dashboard/financial-overview/", FinancialOverviewView.as_view(), name="dashboard-financial-overview"),
    
    # Sales Analytics
    path("dashboard/sales-trend/", SalesTrendView.as_view(), name="dashboard-sales-trend"),
    path("dashboard/monthly-revenue/", MonthlyRevenueComparisonView.as_view(), name="dashboard-monthly-revenue"),
    path("dashboard/profit-margin-trend/", ProfitMarginTrendView.as_view(), name="dashboard-profit-margin-trend"),
    path("dashboard/top-buyers/", TopBuyersView.as_view(), name="dashboard-top-buyers"),
    path("dashboard/top-fish/", TopFishView.as_view(), name="dashboard-top-fish"),
    path("dashboard/sales-by-payment/", SalesByPaymentMethodView.as_view(), name="dashboard-sales-by-payment"),
    
    # Chart System MVP
    path("dashboard/profit-loss-receivable/", ProfitLossReceivableView.as_view(), name="dashboard-profit-loss-receivable"),
    path("dashboard/sold-vs-remaining/", SoldVsRemainingView.as_view(), name="dashboard-sold-vs-remaining"),
    path("dashboard/fish-demand-trend/", FishDemandTrendView.as_view(), name="dashboard-fish-demand-trend"),
    
    # ============================================================
    # NEW DASHBOARD APIs - PHASE 2 (FULL)
    # ============================================================
    
    # Inventory Overview
    path("dashboard/inventory-overview/", InventoryOverviewView.as_view(), name="dashboard-inventory-overview"),
    path("dashboard/inventory-by-category/", InventoryByCategoryView.as_view(), name="dashboard-inventory-by-category"),
    path("dashboard/batch-profit-margin/", BatchProfitMarginView.as_view(), name="dashboard-batch-profit-margin"),
    
    # Payment & Cash Flow
    path("dashboard/payment-cashflow/", PaymentCashflowView.as_view(), name="dashboard-payment-cashflow"),
    path("dashboard/payment-summary/", PaymentSummaryView.as_view(), name="dashboard-payment-summary"),
    path("dashboard/credit-customers/", CreditCustomersView.as_view(), name="dashboard-credit-customers"),
    
    # Operational Dashboard
    path("dashboard/operational/", OperationalDashboardView.as_view(), name="dashboard-operational"),
    
    # Risk Alerts
    path("dashboard/risk-alerts/", RiskAlertsView.as_view(), name="dashboard-risk-alerts"),
    
    # ============================================================
    # NEW DASHBOARD APIs - PHASE 3 (ADMIN)
    # ============================================================
    
    # Admin Dashboard
    path("dashboard/admin/", AdminDashboardView.as_view(), name="dashboard-admin"),
    
    # ============================================================
    # LEGACY APIS (For backward compatibility)
    # ============================================================
    
    # Dashboard Overview (combines all key metrics)
    path("dashboard/overview/", DashboardOverviewView.as_view(), name="dashboard-overview"),
    
    # Time-based summaries
    path("dashboard/today/", TodaySummaryView.as_view(), name="dashboard-today"),
    path("dashboard/monthly/", MonthlySummaryView.as_view(), name="dashboard-monthly"),
    path("dashboard/yearly/", YearlySummaryView.as_view(), name="dashboard-yearly"),
    
    # Profit breakdowns
    path("dashboard/profit/by-purchase-type/", ProfitByPurchaseTypeView.as_view(), name="dashboard-profit-by-purchase-type"),
    path("dashboard/profit/by-place/", ProfitByPlaceView.as_view(), name="dashboard-profit-by-place"),
    path("dashboard/profit/by-fisherman/", ProfitByFishermanView.as_view(), name="dashboard-profit-by-fisherman"),
    path("dashboard/profit/by-fish-type/", ProfitByFishTypeView.as_view(), name="dashboard-profit-by-fish-type"),
    
    # Pending payments
    path("dashboard/pending-payments/", PendingPaymentsView.as_view(), name="dashboard-pending-payments"),
    
    # ============================================================
    # NEW ROLE-BASED VISUAL DASHBOARD APIs
    # ============================================================
    
    # Tenant Admin Visual Dashboard (all 5 charts + KPIs)
    path("dashboard/tenant/", TenantAdminDashboardView.as_view(), name="dashboard-tenant-admin"),
    
    # Batch-specific Dashboard (filter by purchase batch)
    path("dashboard/batch/", BatchSpecificDashboardView.as_view(), name="dashboard-batch-specific"),
    
    # Filter Options (for dropdowns)
    path("dashboard/filters/", FilterOptionsView.as_view(), name="dashboard-filter-options"),

    # Simple SaaS Dashboard API (for frontend quick stats)
    path("dashboard/", DashboardView.as_view(), name="dashboard-simple"),
]
