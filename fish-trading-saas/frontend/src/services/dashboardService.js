import { apiClient } from "@/services/apiClient";
import { config } from "@/config";
import { dashboardOverviewMock } from "@/services/mocks/dashboardMock";

const toNum = (v) => parseFloat(v) || 0;

// Returns: { metrics, topFish, recentOrders, riskAlerts }
export const fetchDashboardOverview = async () => {
  if (config.useMocks) return dashboardOverviewMock;

  const [financial, operational, topFishRes, salesRes, alertsRes] = await Promise.all([
    apiClient.get("/dashboard/financial-overview/"),
    apiClient.get("/dashboard/operational/"),
    apiClient.get("/dashboard/top-fish/"),
    apiClient.get("/sales/", { params: { page: 1, page_size: 5, ordering: "-created_at" } }),
    apiClient.get("/dashboard/risk-alerts/"),
  ]);

  const fd = financial.data || {};
  const od = operational.data || {};

  return {
    metrics: {
      totalRevenue: toNum(fd.today_sales),
      totalPurchases: toNum(fd.today_purchases),
      todayProfit: toNum(fd.today_profit),
      outstandingReceivables: toNum(fd.outstanding_receivables),
      outstandingPayables: toNum(fd.outstanding_payables),
      netCashPosition: toNum(fd.net_cash_position),
      inventoryValue: toNum(fd.inventory_value),
      revenueTrend: fd.revenue_growth_percent != null ? toNum(fd.revenue_growth_percent) : null,
      activeOrders: od.active_orders ?? 0,
      stockAlerts: od.low_stock_items ?? 0,
      onTimeDeliveryRate: toNum(od.on_time_delivery_rate),
      deliveryTrend: od.delivery_trend != null ? toNum(od.delivery_trend) : null,
      activeBuyers: od.active_buyers_count ?? 0,
      activeSuppliers: od.active_suppliers_count ?? 0,
    },
    topFish: (topFishRes.data || []).slice(0, 5).map((item) => ({
      name: item.fish_name || item.name,
      revenue: toNum(item.total_revenue ?? item.revenue),
    })),
    recentOrders: (salesRes.data?.results || salesRes.data || []).map((s) => ({
      ...s,
      final_amount: toNum(s.final_amount),
      total_revenue: toNum(s.total_revenue),
      profit: toNum(s.profit),
      amount_received: toNum(s.amount_received),
      pending_amount: toNum(s.pending_amount),
    })),
    riskAlerts: alertsRes.data || [],
  };
};

// ERP Command Center — role-aware parallel fetch
// Uses Promise.allSettled so individual API failures don't crash the dashboard
const settle = (p) => p.then((r) => ({ ok: true, data: r.data })).catch(() => ({ ok: false, data: null }));

export const fetchFishSalesTrend = async (days = 14) => {
  if (config.useMocks) return [];
  const res = await apiClient.get("/dashboard/fish-sales-trend/", { params: { days, limit: 5 } });
  return res.data || [];
};

export const fetchOutstandingCollections = async (limit = 10) => {
  if (config.useMocks) return [];
  const res = await apiClient.get("/dashboard/outstanding-collections/", { params: { limit } });
  return res.data || [];
};

export const fetchERPDashboard = async () => {
  const [financial, operational, alerts, topFish, recentSales, inventory, creditCustomers] =
    await Promise.allSettled([
      apiClient.get("/dashboard/financial-overview/"),
      apiClient.get("/dashboard/operational/"),
      apiClient.get("/dashboard/risk-alerts/"),
      apiClient.get("/dashboard/top-fish/?limit=5"),
      apiClient.get("/sales/", { params: { page: 1, page_size: 6, ordering: "-created_at" } }),
      apiClient.get("/dashboard/inventory-overview/"),
      apiClient.get("/dashboard/credit-customers/?limit=5"),
    ]);

  const fd = financial.status === "fulfilled" ? (financial.value?.data || {}) : {};
  const od = operational.status === "fulfilled" ? (operational.value?.data || {}) : {};
  const rawAlerts = alerts.status === "fulfilled" ? (alerts.value?.data || []) : [];
  const rawTopFish = topFish.status === "fulfilled" ? (topFish.value?.data || []) : [];
  const rawSales = recentSales.status === "fulfilled"
    ? (recentSales.value?.data?.results || recentSales.value?.data || [])
    : [];
  const invData = inventory.status === "fulfilled" ? (inventory.value?.data || {}) : {};
  const creditData = creditCustomers.status === "fulfilled" ? (creditCustomers.value?.data || []) : [];

  return {
    financial: {
      todaySales: toNum(fd.today_sales || fd.total_sales_amount),
      todayPurchases: toNum(fd.today_purchases || fd.total_purchase_amount),
      todayProfit: toNum(fd.today_profit),
      outstandingReceivables: toNum(fd.outstanding_receivables),
      outstandingPayables: toNum(fd.outstanding_payables),
      netCashPosition: toNum(fd.net_cash_position),
      inventoryValue: toNum(fd.inventory_value),
      pendingSalesAmount: toNum(fd.pending_sales_amount),
      saleCount: fd.sale_count || 0,
      purchaseCount: fd.purchase_count || 0,
    },
    operational: {
      activeOrders: od.active_orders || 0,
      lowStockItems: od.low_stock_items || 0,
      activeBuyers: od.active_buyers_count || 0,
      activeSuppliers: od.active_suppliers_count || 0,
      onTimeDeliveryRate: toNum(od.on_time_delivery_rate),
    },
    alerts: rawAlerts,
    topFish: rawTopFish.slice(0, 5).map((f) => ({
      name: f.fish_name || f.name,
      revenue: toNum(f.total_revenue ?? f.revenue),
    })),
    recentSales: rawSales.map((s) => ({
      ...s,
      final_amount: toNum(s.final_amount),
      total_revenue: toNum(s.total_revenue),
      profit: toNum(s.profit),
      amount_received: toNum(s.amount_received),
      pending_amount: toNum(s.pending_amount),
    })),
    inventory: invData,
    creditCustomers: Array.isArray(creditData) ? creditData : [],
  };
};
