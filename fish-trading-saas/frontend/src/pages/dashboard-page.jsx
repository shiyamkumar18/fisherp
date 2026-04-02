import { memo, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchDashboardOverview } from "@/services/dashboardService";

const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const formatDate = (s) =>
  s
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(
        new Date(s)
      )
    : "—";

// Status badge colour map for delivery status
const DELIVERY_CLS = {
  pending: "bg-slate-100 text-slate-600",
  shipped: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

// ---- Sub-components ----

const KpiCard = memo(({ label, value, icon: Icon, trend, trendLabel, accent }) => {
  const iconCls = {
    blue: "bg-blue-50 text-primary",
    cyan: "bg-cyan-50 text-cyan-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
  }[accent] || "bg-blue-50 text-primary";

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <span className={`rounded-xl p-2 ${iconCls}`}>
          <Icon size={17} />
        </span>
      </div>
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      {trend !== null && trend !== undefined && (
        <p
          className={`flex items-center gap-1 text-xs ${
            trend >= 0 ? "text-green-600" : "text-red-500"
          }`}
        >
          {trend >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {Math.abs(trend).toFixed(1)}% {trendLabel}
        </p>
      )}
    </Card>
  );
});

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-8 w-40" />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      <Skeleton className="h-72 lg:col-span-2" />
      <Skeleton className="h-72" />
    </div>
  </div>
);

// ---- Page ----

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetchDashboardOverview()
      .then((data) => alive && setOverview(data))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl">Dashboard</h2>
        <Card className="flex items-center gap-2 text-red-600">
          <AlertTriangle size={16} />
          <p>{error}</p>
        </Card>
      </div>
    );
  }

  if (!overview) return <DashboardSkeleton />;

  const { metrics, topFish, recentOrders, riskAlerts } = overview;
  const maxRevenue = topFish[0]?.revenue || 1;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl">Dashboard</h2>

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Revenue"
          value={formatINR(metrics.totalRevenue)}
          icon={TrendingUp}
          trend={metrics.revenueTrend}
          trendLabel="vs last month"
          accent="blue"
        />
        <KpiCard
          label="Active Orders"
          value={metrics.activeOrders}
          icon={ShoppingCart}
          accent="cyan"
        />
        <KpiCard
          label="Stock Alerts"
          value={metrics.stockAlerts}
          icon={AlertTriangle}
          accent="amber"
        />
        <KpiCard
          label="On-time Delivery"
          value={`${metrics.onTimeDeliveryRate}%`}
          icon={Truck}
          trend={metrics.deliveryTrend}
          trendLabel="vs last month"
          accent="green"
        />
      </div>

      {/* Lower row: recent orders + top fish + alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-extrabold text-slate-800">Recent Orders</h3>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-slate-400">No recent orders.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pr-4">Invoice</th>
                    <th className="pb-2 pr-4">Buyer</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => {
                    const key = (order.delivery_status || "pending").toLowerCase();
                    const cls = DELIVERY_CLS[key] || DELIVERY_CLS.pending;
                    return (
                      <tr key={order.id} className="border-b border-slate-100">
                        <td className="py-2.5 pr-4 font-bold text-slate-800">
                          {order.invoice_number}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600">{order.buyer_name}</td>
                        <td className="py-2.5 pr-4 font-bold">
                          {formatINR(order.final_amount ?? order.total_revenue)}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}
                          >
                            {order.delivery_status_display || order.delivery_status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Right column: top fish + alerts */}
        <div className="space-y-4">
          {/* Top Products */}
          <Card>
            <h3 className="mb-3 font-extrabold text-slate-800">Top Products</h3>
            <div className="space-y-3">
              {topFish.map((item, idx) => {
                const pct = Math.round((item.revenue / maxRevenue) * 100);
                return (
                  <div key={item.name}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-slate-600">
                        {idx + 1}. {item.name}
                      </span>
                      <span className="font-bold text-slate-800">
                        {formatINR(item.revenue)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Risk Alerts */}
          {riskAlerts.length > 0 && (
            <Card>
              <h3 className="mb-3 font-extrabold text-slate-800">Alerts</h3>
              <div className="space-y-2">
                {riskAlerts.slice(0, 4).map((alert, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 rounded-xl bg-amber-50 p-2.5 text-xs"
                  >
                    <AlertTriangle
                      size={12}
                      className="mt-0.5 shrink-0 text-amber-600"
                    />
                    <span className="text-amber-800">
                      {alert.message || alert}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
