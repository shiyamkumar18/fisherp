import { apiClient } from "@/services/apiClient";
import { config } from "@/config";
import { dashboardOverviewMock } from "@/services/mocks/dashboardMock";

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

  return {
    metrics: {
      totalRevenue: financial.data.total_revenue ?? 0,
      revenueTrend: financial.data.revenue_growth_percent ?? null,
      activeOrders: operational.data.active_orders ?? 0,
      stockAlerts: operational.data.low_stock_items ?? 0,
      onTimeDeliveryRate: operational.data.on_time_delivery_rate ?? 0,
      deliveryTrend: operational.data.delivery_trend ?? null,
    },
    topFish: (topFishRes.data || []).slice(0, 5).map((item) => ({
      name: item.fish_name || item.name,
      revenue: item.total_revenue ?? item.revenue ?? 0,
    })),
    recentOrders: salesRes.data.results || [],
    riskAlerts: alertsRes.data || [],
  };
};
