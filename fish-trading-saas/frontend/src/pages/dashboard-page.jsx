import { memo, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
  DollarSign,
  ChevronRight,
  TrendingDown,
  Layers,
  Inbox
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

const DELIVERY_CLS = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50",
  shipped: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50",
  delivered: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50 dark:border-green-900/50",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50 dark:border-red-900/50",
};

// ---- Interactive SVG Chart Components ----

// 1. Line Chart Component
function SalesTrendChart({ data = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  
  if (!data || data.length === 0) return null;

  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;

  const maxVal = Math.max(...data.map(d => d.value)) * 1.1;
  const minVal = 0;

  const getX = (idx) => paddingX + (idx / (data.length - 1)) * (width - paddingX * 2);
  const getY = (val) => height - paddingY - ((val - minVal) / (maxVal - minVal)) * (height - paddingY * 2);

  // Generate path points
  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.value), ...d }));
  
  // Line path
  const linePath = points.reduce((acc, p, i) => 
    i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, ""
  );

  // Gradient area path
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : "";

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const val = maxVal * p;
          const y = getY(val);
          return (
            <g key={i} className="opacity-15">
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="var(--text-secondary)" strokeWidth="1" strokeDasharray="3 3" />
              <text x={paddingX - 8} y={y + 4} textAnchor="end" className="text-[9px] fill-current font-bold">
                {val > 100000 ? `${(val/100000).toFixed(0)}L` : val}
              </text>
            </g>
          );
        })}

        {/* Chart Line Path */}
        <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Gradient Area */}
        <path d={areaPath} fill="url(#lineGrad)" />

        {/* Y Axis labels */}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={height - 4} textAnchor="middle" className="text-[9px] fill-current opacity-70 font-bold">
            {p.label}
          </text>
        ))}

        {/* Interactive hover points */}
        {points.map((p, i) => (
          <g key={i} className="cursor-pointer" 
             onMouseEnter={() => setHoveredPoint({ ...p, idx: i })}
             onMouseLeave={() => setHoveredPoint(null)}>
            <circle cx={p.x} cy={p.y} r={hoveredPoint?.idx === i ? "6" : "4"} fill="var(--surface)" stroke="var(--primary)" strokeWidth="2.5" className="transition-all" />
            <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
          </g>
        ))}
      </svg>

      {/* Floating Tooltip */}
      {hoveredPoint && (
        <div 
          className="absolute z-10 rounded-lg border border-border bg-surface px-2.5 py-1.5 shadow-md text-xs font-bold transition-all duration-75"
          style={{ 
            left: `${(hoveredPoint.idx / (data.length - 1)) * 75 + 10}%`,
            top: `${(hoveredPoint.y / height) * 75 - 15}%` 
          }}
        >
          <p className="text-[9px] text-textSecondary uppercase tracking-wider">{hoveredPoint.label}</p>
          <p className="text-primary">{formatINR(hoveredPoint.value)}</p>
        </div>
      )}
    </div>
  );
}

// 2. Vertical Bar Chart Component
function DistributionBarChart({ data = [] }) {
  const [hoveredBar, setHoveredBar] = useState(null);
  
  if (!data || data.length === 0) return null;

  const width = 250;
  const height = 150;
  const paddingX = 30;
  const paddingY = 20;

  const maxVal = Math.max(...data.map(d => d.value)) * 1.1;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const barWidth = (chartWidth / data.length) * 0.6;
  const gap = (chartWidth / data.length) * 0.4;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        {/* Y Axis Grid lines */}
        {[0, 0.5, 1].map((p, i) => {
          const val = maxVal * p;
          const y = height - paddingY - p * chartHeight;
          return (
            <line key={i} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="var(--text-secondary)" strokeWidth="1" className="opacity-10" />
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = (d.value / maxVal) * chartHeight;
          const x = paddingX + i * (barWidth + gap) + gap / 2;
          const y = height - paddingY - barHeight;

          return (
            <g key={i} className="cursor-pointer"
               onMouseEnter={() => setHoveredBar({ ...d, idx: i, x, y })}
               onMouseLeave={() => setHoveredBar(null)}>
              {/* Shadow Overlay */}
              <rect x={x} y={y} width={barWidth} height={barHeight} fill={d.color || "var(--primary)"} rx="6" className="transition-all hover:brightness-110" />
              
              {/* Label */}
              <text x={x + barWidth / 2} y={height - 4} textAnchor="middle" className="text-[9px] fill-current opacity-70 font-bold">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredBar && (
        <div 
          className="absolute z-10 rounded-lg border border-border bg-surface px-2.5 py-1.5 shadow-md text-xs font-bold"
          style={{ 
            left: `${(hoveredBar.idx / data.length) * 65 + 15}%`,
            top: `${(hoveredBar.y / height) * 60}%` 
          }}
        >
          <p className="text-[9px] text-textSecondary uppercase tracking-wider">{hoveredBar.label}</p>
          <p style={{ color: hoveredBar.color }}>{formatINR(hoveredBar.value)}</p>
        </div>
      )}
    </div>
  );
}

// 3. Stacked Inventory Bar Chart Component
function StackedInventoryChart({ data = [] }) {
  return (
    <div className="space-y-4">
      {data.map((item, idx) => {
        const total = item.sold + item.remaining;
        const soldPct = Math.round((item.sold / total) * 100);
        const remPct = 100 - soldPct;

        return (
          <div key={idx} className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-textPrimary">{item.category}</span>
              <span className="text-textSecondary text-[11px]">
                {item.sold} sold / {item.remaining} remaining
              </span>
            </div>
            
            {/* Double Segmented Bar */}
            <div className="h-3 w-full flex rounded-full overflow-hidden bg-border/20">
              <div 
                className="h-full bg-gradient-to-r from-primary to-cyan-500 transition-all"
                style={{ width: `${soldPct}%` }}
                title={`Sold: ${soldPct}%`}
              />
              <div 
                className="h-full bg-emerald-500 dark:bg-emerald-600 transition-all"
                style={{ width: `${remPct}%` }}
                title={`Remaining: ${remPct}%`}
              />
            </div>
          </div>
        );
      })}
      
      {/* Legend */}
      <div className="flex gap-4 pt-1 justify-end text-[10px] font-bold">
        <div className="flex items-center gap-1.5 text-textSecondary">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span>Sold Stock</span>
        </div>
        <div className="flex items-center gap-1.5 text-textSecondary">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Remaining Inventory</span>
        </div>
      </div>
    </div>
  );
}

const KpiCard = memo(({ label, value, icon: Icon, trend, trendLabel, accent }) => {
  const iconCls = {
    blue: "bg-primary/10 text-primary",
    cyan: "bg-cyan-500/10 text-cyan-500",
    amber: "bg-warning/10 text-warning",
    green: "bg-success/10 text-success",
  }[accent] || "bg-primary/10 text-primary";

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-textSecondary">{label}</p>
        <span className={`rounded-xl p-2.5 ${iconCls}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="text-2xl font-extrabold text-textPrimary">{value}</p>
      {trend !== null && trend !== undefined && (
        <p
          className={`flex items-center gap-1 text-[11px] font-bold ${
            trend >= 0 ? "text-success" : "text-danger"
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
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-9 w-28" />
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      <Skeleton className="h-80 lg:col-span-2" />
      <Skeleton className="h-80" />
    </div>
  </div>
);

// ---- Page Component ----

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
        <Card className="flex items-center gap-3 text-danger border-danger/20 bg-danger/5">
          <AlertTriangle size={18} />
          <p className="font-bold">{error}</p>
        </Card>
      </div>
    );
  }

  if (!overview) return <DashboardSkeleton />;

  const { metrics, topFish, recentOrders, riskAlerts } = overview;
  const maxRevenue = topFish[0]?.revenue || 1;

  // Static/Mock details for the SVG telemetry charts. In production, these can be served by API endpoints.
  const salesTrendData = [
    { label: "Dec", value: 180000 },
    { label: "Jan", value: 240000 },
    { label: "Feb", value: 310000 },
    { label: "Mar", value: 290000 },
    { label: "Apr", value: 380000 },
    { label: "May", value: metrics.totalRevenue > 1000000 ? metrics.totalRevenue / 5 : metrics.totalRevenue },
  ];

  const distributionData = [
    { label: "Net Profit", value: metrics.totalRevenue * 0.42, color: "var(--success)" },
    { label: "Outstanding", value: metrics.totalRevenue * 0.18, color: "var(--info)" },
    { label: "Operational", value: metrics.totalRevenue * 0.4, color: "var(--warning)" },
  ];

  const inventoryBreakdown = [
    { category: "Pelagic (Sardine/Mackerel)", sold: 1650, remaining: 340 },
    { category: "Demersal (Snapper/Grouper)", sold: 880, remaining: 120 },
    { category: "Shellfish (Shrimp/Crabs)", sold: 490, remaining: 210 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Overview Dashboard</h2>
          <p className="text-xs text-textSecondary">Real-time trading telemetry and tenant analytics.</p>
        </div>
      </div>

      {/* KPI Cards Row */}
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

      {/* Charts Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Sales Trend Line Chart */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-textPrimary">Sales Trend</h3>
            <p className="text-xs text-textSecondary mb-4">Invoice volume over the past 6 months.</p>
          </div>
          <SalesTrendChart data={salesTrendData} />
        </Card>

        {/* Finance Distribution Bar Chart */}
        <Card className="flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-textPrimary">Revenue Allocation</h3>
            <p className="text-xs text-textSecondary mb-4">Breakdown of total revenue billing.</p>
          </div>
          <DistributionBarChart data={distributionData} />
        </Card>
      </div>

      {/* Lower Row: recent orders + top fish + alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Orders Card */}
        <Card className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-textPrimary">Recent Orders</h3>
              <p className="text-xs text-textSecondary">Latest trading actions executed.</p>
            </div>
          </div>
          {recentOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-textSecondary">
              <Inbox className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-semibold">No recent orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-textSecondary/70">
                    <th className="pb-3 pr-4">Invoice</th>
                    <th className="pb-3 pr-4">Buyer</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {recentOrders.map((order) => {
                    const key = (order.delivery_status || "pending").toLowerCase();
                    const cls = DELIVERY_CLS[key] || DELIVERY_CLS.pending;
                    return (
                      <tr key={order.id} className="hover:bg-border/10 transition-colors">
                        <td className="py-3 pr-4 font-bold text-textPrimary">
                          {order.invoice_number}
                        </td>
                        <td className="py-3 pr-4 text-textSecondary font-semibold">{order.buyer_name}</td>
                        <td className="py-3 pr-4 font-bold text-textPrimary">
                          {formatINR(order.final_amount ?? order.total_revenue)}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${cls}`}
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

        {/* Right Column: Top Products & Alerts */}
        <div className="space-y-4">
          {/* Top Products */}
          <Card>
            <h3 className="text-base font-bold text-textPrimary">Top Products</h3>
            <p className="text-xs text-textSecondary mb-4">Volume drivers in gross revenue.</p>
            <div className="space-y-3.5">
              {topFish.map((item, idx) => {
                const pct = Math.round((item.revenue / maxRevenue) * 100);
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-textSecondary">
                        {idx + 1}. {item.name}
                      </span>
                      <span className="text-textPrimary">
                        {formatINR(item.revenue)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-border/20">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Stacked Inventory Breakdown */}
          <Card>
            <h3 className="text-base font-bold text-textPrimary">Inventory Breakdown</h3>
            <p className="text-xs text-textSecondary mb-4">Ratio of sold batches vs active holdings.</p>
            <StackedInventoryChart data={inventoryBreakdown} />
          </Card>

          {/* Risk Alerts */}
          {riskAlerts.length > 0 && (
            <Card>
              <h3 className="text-base font-bold text-textPrimary mb-3">System Alerts</h3>
              <div className="space-y-2">
                {riskAlerts.slice(0, 4).map((alert, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-warning/20 bg-warning/5 p-3 text-xs"
                  >
                    <AlertTriangle
                      size={15}
                      className="shrink-0 text-warning"
                    />
                    <span className="text-textPrimary font-semibold leading-relaxed">
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
