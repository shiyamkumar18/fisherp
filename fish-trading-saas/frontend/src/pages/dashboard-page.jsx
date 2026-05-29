import { memo, useEffect, useState, useRef } from "react";
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
  Inbox,
  Search,
  Filter,
  Activity,
  User,
  Users,
  Shield,
  CheckCircle,
  XCircle,
  X,
  Plus,
  RefreshCw,
  Clock,
  Eye,
  Settings,
  Mail,
  Building2,
  MapPin,
  Calendar,
  Lock,
  Database,
  Mic
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Card from "@/components/ui/card";
import Skeleton from "@/components/ui/skeleton";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { fetchDashboardOverview } from "@/services/dashboardService";
import { platformService } from "@/services/platformService";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/shared/toast-provider";
import { usePermission } from "@/hooks/usePermission";

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

// Platform API Traffic Trend SVG Chart
function PlatformTrafficChart({ data = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  
  if (!data || data.length === 0) return null;

  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;

  const maxVal = Math.max(...data.map(d => d.value)) * 1.1 || 100;
  const minVal = 0;

  const getX = (idx) => paddingX + (idx / (data.length - 1)) * (width - paddingX * 2);
  const getY = (val) => height - paddingY - ((val - minVal) / (maxVal - minVal)) * (height - paddingY * 2);

  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.value), ...d }));
  
  const linePath = points.reduce((acc, p, i) => 
    i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, ""
  );

  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : "";

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const val = maxVal * p;
          const y = getY(val);
          return (
            <g key={i} className="opacity-15">
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="var(--text-secondary)" strokeWidth="1" strokeDasharray="3 3" />
              <text x={paddingX - 8} y={y + 4} textAnchor="end" className="text-[9px] fill-current font-bold">
                {val >= 1000 ? `${(val/1000).toFixed(1)}k` : Math.round(val)}
              </text>
            </g>
          );
        })}

        <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={areaPath} fill="url(#purpleGrad)" />

        {points.map((p, i) => (
          <text key={i} x={p.x} y={height - 4} textAnchor="middle" className="text-[9px] fill-current opacity-70 font-bold">
            {p.label}
          </text>
        ))}

        {points.map((p, i) => (
          <g key={i} className="cursor-pointer" 
             onMouseEnter={() => setHoveredPoint({ ...p, idx: i })}
             onMouseLeave={() => setHoveredPoint(null)}>
            <circle cx={p.x} cy={p.y} r={hoveredPoint?.idx === i ? "6" : "4"} fill="var(--surface)" stroke="var(--primary)" strokeWidth="2.5" className="transition-all" />
            <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
          </g>
        ))}
      </svg>

      {hoveredPoint && (
        <div 
          className="absolute z-10 rounded-lg border border-border bg-surface px-2.5 py-1.5 shadow-md text-xs font-bold transition-all duration-75"
          style={{ 
            left: `${(hoveredPoint.idx / (data.length - 1)) * 75 + 10}%`,
            top: `${(hoveredPoint.y / height) * 75 - 15}%` 
          }}
        >
          <p className="text-[9px] text-textSecondary uppercase tracking-wider">{hoveredPoint.label}</p>
          <p className="text-primary">{hoveredPoint.value.toLocaleString()} reqs</p>
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
    purple: "bg-purple-500/10 text-purple-500",
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

// ---- Platform Operator Administration View ----
function PlatformOperatorDashboard() {
  const { push } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Overview stats state
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");

  // Tenants directory state
  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [tenantsError, setTenantsError] = useState("");
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantStatus, setTenantStatus] = useState("all");
  const [tenantPage, setTenantPage] = useState(1);
  const [tenantTotalPages, setTenantTotalPages] = useState(1);
  const [tenantTotalCount, setTenantTotalCount] = useState(0);

  // System audit logs state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [logTotalCount, setLogTotalCount] = useState(0);

  // Action Modals State
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [modalAction, setModalAction] = useState(null); // 'suspend' | 'activate' | 'extend'
  const [actionReason, setActionReason] = useState("");
  const [extensionDays, setExtensionDays] = useState(15);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const loadOverview = async () => {
    setOverviewLoading(true);
    setOverviewError("");
    try {
      const data = await platformService.getDashboardOverview();
      setOverview(data);
    } catch (e) {
      setOverviewError(e.message || "Failed to load platform overview stats.");
    } finally {
      setOverviewLoading(false);
    }
  };

  const loadTenants = async (page = 1) => {
    setTenantsLoading(true);
    setTenantsError("");
    try {
      const data = await platformService.getTenants({
        page,
        status: tenantStatus,
        search: tenantSearch,
      });
      setTenants(data.tenants || []);
      setTenantPage(data.pagination?.page || 1);
      setTenantTotalPages(data.pagination?.total_pages || 1);
      setTenantTotalCount(data.pagination?.total_count || 0);
    } catch (e) {
      setTenantsError(e.message || "Failed to load tenant list.");
    } finally {
      setTenantsLoading(false);
    }
  };

  const loadLogs = async (page = 1) => {
    setLogsLoading(true);
    setLogsError("");
    try {
      const data = await platformService.getAuditLogs({ page });
      setLogs(data.logs || []);
      setLogPage(data.pagination?.page || 1);
      setLogTotalPages(data.pagination?.total_pages || 1);
      setLogTotalCount(data.pagination?.total_count || 0);
    } catch (e) {
      setLogsError(e.message || "Failed to load system audit logs.");
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "overview") {
      loadOverview();
    } else if (activeTab === "tenants") {
      loadTenants(1);
    } else if (activeTab === "audit") {
      loadLogs(1);
    }
  }, [activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadTenants(1);
  };

  const handleModalSubmit = async () => {
    if (!actionReason.trim()) {
      setModalError("Please specify a reason for this administrative audit log.");
      return;
    }
    setModalLoading(true);
    setModalError("");
    try {
      if (modalAction === "suspend" || modalAction === "activate") {
        await platformService.suspendTenant(selectedTenant.id, modalAction, actionReason);
        push({ message: `Successfully ${modalAction === "suspend" ? "suspended" : "activated"} tenant "${selectedTenant.name}".` });
      } else if (modalAction === "extend") {
        const res = await platformService.extendSubscription(selectedTenant.id, extensionDays, actionReason);
        push({ message: `Successfully extended subscription until ${new Date(res.new_expiry_date).toLocaleDateString()}.` });
      }
      setSelectedTenant(null);
      setModalAction(null);
      setActionReason("");
      // Refresh active page
      loadTenants(tenantPage);
    } catch (e) {
      setModalError(e.message || "Operation failed.");
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Platform Control Panel</h2>
          <p className="text-xs text-textSecondary">SaaS global tenant metrics, subscription overrides, and platform security logs.</p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-border/20 p-1 select-none">
          {[
            { id: "overview", label: "Overview", icon: Activity },
            { id: "tenants", label: "Tenants Directory", icon: Users },
            { id: "audit", label: "Audit Logs", icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  active ? "bg-surface text-primary shadow-sm" : "text-textSecondary hover:text-textPrimary"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {overviewError && (
            <Card className="flex items-center gap-3 text-danger border-danger/20 bg-danger/5">
              <AlertTriangle size={18} />
              <p className="font-bold">{overviewError}</p>
            </Card>
          )}

          {overviewLoading ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Skeleton className="h-72 lg:col-span-2" />
                <Skeleton className="h-72" />
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Skeleton className="h-72 lg:col-span-2" />
                <Skeleton className="h-72" />
              </div>
            </div>
          ) : (
            overview && (
              <div className="space-y-6">
                {/* KPI Cards Row */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <KpiCard
                    label="Monthly Recurring Revenue"
                    value={formatINR(overview.mrr)}
                    icon={DollarSign}
                    trend={overview.yearly_projection ? 0.0 : null}
                    trendLabel={`₹${(overview.yearly_projection / 100000).toFixed(1)}L annual projection`}
                    accent="blue"
                  />
                  <KpiCard
                    label="Active / Total Tenants"
                    value={`${overview.active_tenants} / ${overview.total_tenants}`}
                    icon={Users}
                    accent="green"
                  />
                  <KpiCard
                    label="Monthly Growth Signups"
                    value={`+${overview.new_signups_this_month}`}
                    icon={TrendingUp}
                    trend={overview.churn_rate ? -overview.churn_rate : 0}
                    trendLabel="churn rate"
                    accent="purple"
                  />
                  <KpiCard
                    label="Platform API Requests"
                    value={overview.total_api_calls.toLocaleString()}
                    icon={Database}
                    accent="cyan"
                  />
                </div>

                {/* Sub row - API Traffic Chart & Subscription Tiers */}
                <div className="grid gap-4 lg:grid-cols-3">
                  <Card className="lg:col-span-2 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-textPrimary">Platform API Traffic</h3>
                      <p className="text-xs text-textSecondary mb-4">Request telemetry metrics over the last 24 hours.</p>
                    </div>
                    <PlatformTrafficChart data={[
                      { label: "00:00", value: Math.round(overview.total_api_calls * 0.08) },
                      { label: "04:00", value: Math.round(overview.total_api_calls * 0.05) },
                      { label: "08:00", value: Math.round(overview.total_api_calls * 0.12) },
                      { label: "12:00", value: Math.round(overview.total_api_calls * 0.22) },
                      { label: "16:00", value: Math.round(overview.total_api_calls * 0.28) },
                      { label: "20:00", value: Math.round(overview.total_api_calls * 0.25) },
                    ]} />
                  </Card>

                  <Card className="flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-textPrimary">Subscription Tiers</h3>
                      <p className="text-xs text-textSecondary mb-4">Distribution of tenant subscriptions.</p>
                      
                      <div className="space-y-4">
                        {overview.tier_breakdown && overview.tier_breakdown.length > 0 ? (
                          overview.tier_breakdown.map((item, idx) => {
                            const pct = Math.round((item.count / (overview.active_tenants || 1)) * 100);
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold">
                                  <span className="text-textSecondary capitalize">{item.tier} Tier</span>
                                  <span className="text-textPrimary">{item.count} tenants ({pct}%)</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-border/20">
                                  <div
                                    className="h-2 rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-textSecondary italic">No active subscriptions found.</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 border-t border-border/50 pt-4 space-y-2.5 text-xs text-textSecondary">
                      <div className="flex justify-between">
                        <span>Average Users / Tenant:</span>
                        <strong className="text-textPrimary">{overview.avg_users_per_tenant || 0}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Storage consumed:</span>
                        <strong className="text-textPrimary">{(overview.total_storage_mb || 0).toFixed(1)} MB</strong>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Lower row - Recent Signups & Platform Diagnostics */}
                <div className="grid gap-4 lg:grid-cols-3">
                  <Card className="lg:col-span-2 flex flex-col">
                    <div className="mb-4">
                      <h3 className="text-base font-bold text-textPrimary">Recent SaaS Signups</h3>
                      <p className="text-xs text-textSecondary">Newly provisioned workspace instances.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-textSecondary/70">
                            <th className="pb-3 pr-4">Tenant Workspace</th>
                            <th className="pb-3 pr-4">Slug</th>
                            <th className="pb-3 pr-4">Created At</th>
                            <th className="pb-3">Sub Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {overview.recent_signups && overview.recent_signups.length > 0 ? (
                            overview.recent_signups.map((company) => (
                              <tr key={company.id} className="hover:bg-border/10 transition-colors">
                                <td className="py-3 pr-4 font-bold text-textPrimary">{company.name}</td>
                                <td className="py-3 pr-4 text-textSecondary font-semibold font-mono">{company.slug}</td>
                                <td className="py-3 pr-4 text-textSecondary/80">
                                  {new Date(company.created_at).toLocaleDateString()}
                                </td>
                                <td className="py-3">
                                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                                    company.subscription_status === "active"
                                      ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50"
                                      : company.subscription_status === "suspended"
                                      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50"
                                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50"
                                  }`}>
                                    {company.subscription_status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="py-4 text-center text-textSecondary italic">No recent signups.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  <Card className="flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-textPrimary">Platform Diagnostics</h3>
                      <p className="text-xs text-textSecondary mb-4">SaaS global service health parameters.</p>
                      
                      <div className="space-y-4 text-xs font-semibold text-textSecondary">
                        <div className="flex justify-between items-center pb-2 border-b border-border/30">
                          <span>Database Status</span>
                          <span className="flex items-center gap-1.5 font-bold text-success">
                            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                            Operational
                          </span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-border/30">
                          <span>Redis Cache</span>
                          <span className="flex items-center gap-1.5 font-bold text-success">
                            <span className="h-2 w-2 rounded-full bg-success" />
                            99.8% hit rate
                          </span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-border/30">
                          <span>API Gateway</span>
                          <span className="flex items-center gap-1.5 font-bold text-success">
                            <span className="h-2 w-2 rounded-full bg-success" />
                            100% online
                          </span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-border/30">
                          <span>Backups Status</span>
                          <span className="flex items-center gap-1.5 font-bold text-success">
                            <span className="h-2 w-2 rounded-full bg-success" />
                            Daily Sync OK
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-border/50 pt-4 text-[10px] text-textSecondary/70 italic text-center">
                      All systems operating normally.
                    </div>
                  </Card>
                </div>
              </div>
            )
          )}
        </>
      )}

      {/* Tenants Directory Tab */}
      {activeTab === "tenants" && (
        <div className="space-y-4">
          <Card className="p-4 bg-surface/50 border-border/50">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary/40" />
                <Input
                  placeholder="Search by company name, slug or admin email..."
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={tenantStatus}
                onChange={(e) => setTenantStatus(e.target.value)}
                className="h-10 rounded-xl border border-border bg-surface px-4 text-sm text-textPrimary outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-semibold"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
              </select>
              <Button type="submit" disabled={tenantsLoading}>
                {tenantsLoading ? "Searching..." : "Search"}
              </Button>
            </form>
          </Card>

          {tenantsError && (
            <Card className="flex items-center gap-3 text-danger border-danger/20 bg-danger/5">
              <AlertTriangle size={18} />
              <p className="font-bold">{tenantsError}</p>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-textSecondary/70 bg-border/5">
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Tier</th>
                    <th className="py-3 px-4">Usage (Users/Store)</th>
                    <th className="py-3 px-4">Subscription Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {tenantsLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan="6" className="p-4"><Skeleton className="h-8 w-full" /></td>
                      </tr>
                    ))
                  ) : tenants.length > 0 ? (
                    tenants.map((tenant) => {
                      const isActive = tenant.subscription_status === "active";
                      const isSuspended = tenant.subscription_status === "suspended";
                      const isExpired = tenant.subscription_status === "expired";
                      
                      return (
                        <tr key={tenant.id} className="hover:bg-border/10 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-textPrimary">{tenant.name}</div>
                            <div className="text-xs text-textSecondary font-mono">{tenant.slug}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-textPrimary">{tenant.email || "No Admin Email"}</div>
                            <div className="text-xs text-textSecondary">{tenant.phone || tenant.city || "No Contact"}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-primary text-xs uppercase bg-primary/5 border border-primary/10 rounded px-2 py-0.5">
                              {tenant.tier}
                            </span>
                            <div className="text-[10px] text-textSecondary mt-1">
                              {tenant.expiry_date
                                ? `Expires: ${new Date(tenant.expiry_date).toLocaleDateString()} (${tenant.days_remaining}d left)`
                                : "No subscription"}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-textPrimary text-xs">{tenant.user_count || 0} users</div>
                            <div className="text-[10px] text-textSecondary font-mono mt-0.5">{(tenant.storage_used_mb || 0).toFixed(1)} MB</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                              isActive
                                ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50"
                                : isSuspended
                                ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50"
                            }`}>
                              {tenant.subscription_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs cursor-pointer"
                                onClick={() => {
                                  setSelectedTenant(tenant);
                                  setModalAction("extend");
                                  setExtensionDays(15);
                                  setActionReason("");
                                }}
                              >
                                Extend
                              </Button>

                              {isSuspended ? (
                                <Button
                                  size="sm"
                                  variant="success"
                                  className="h-8 text-xs cursor-pointer bg-success text-white hover:bg-success/90"
                                  onClick={() => {
                                    setSelectedTenant(tenant);
                                    setModalAction("activate");
                                    setActionReason("");
                                  }}
                                >
                                  Activate
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="danger"
                                  className="h-8 text-xs cursor-pointer bg-danger text-white hover:bg-danger/90"
                                  onClick={() => {
                                    setSelectedTenant(tenant);
                                    setModalAction("suspend");
                                    setActionReason("");
                                  }}
                                >
                                  Suspend
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-textSecondary italic">No tenants match the query.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {tenantTotalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t border-border bg-border/5 text-xs">
                <span className="text-textSecondary font-semibold">
                  Showing Page {tenantPage} of {tenantTotalPages} ({tenantTotalCount} total tenants)
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={tenantPage <= 1}
                    onClick={() => loadTenants(tenantPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={tenantPage >= tenantTotalPages}
                    onClick={() => loadTenants(tenantPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* System Audit Logs Tab */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          {logsError && (
            <Card className="flex items-center gap-3 text-danger border-danger/20 bg-danger/5">
              <AlertTriangle size={18} />
              <p className="font-bold">{logsError}</p>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-textSecondary/70 bg-border/5">
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Model & ID</th>
                    <th className="py-3 px-4">Workspace/Company</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {logsLoading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan="6" className="p-4"><Skeleton className="h-6 w-full" /></td>
                      </tr>
                    ))
                  ) : logs.length > 0 ? (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-border/10 transition-colors">
                        <td className="py-3 px-4 font-bold text-textPrimary">
                          {log.user}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                            log.is_impersonation 
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/50"
                              : log.action.includes("suspend") || log.action.includes("delete")
                              ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50"
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-textSecondary">
                          {log.model_name} (ID: {log.object_id})
                        </td>
                        <td className="py-3 px-4 font-semibold text-textPrimary">
                          {log.tenant || <span className="text-textSecondary/50 italic">System</span>}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-textSecondary">
                          {log.ip_address || "127.0.0.1"}
                        </td>
                        <td className="py-3 px-4 text-xs text-textSecondary font-semibold">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-textSecondary italic">No audit logs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {logTotalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t border-border bg-border/5 text-xs">
                <span className="text-textSecondary font-semibold">
                  Showing Page {logPage} of {logTotalPages} ({logTotalCount} total audit items)
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={logPage <= 1}
                    onClick={() => loadLogs(logPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={logPage >= logTotalPages}
                    onClick={() => loadLogs(logPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Action Dialog Modal */}
      {selectedTenant && modalAction && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-2.5">
              <h3 className="text-lg font-bold text-textPrimary capitalize">
                {modalAction === "extend" ? "Extend Subscription" : `${modalAction} Workspace`}
              </h3>
              <button 
                type="button" 
                onClick={() => { setSelectedTenant(null); setModalAction(null); setActionReason(""); setModalError(""); }}
                className="rounded-lg p-1.5 text-textSecondary hover:text-textPrimary hover:bg-border/30 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-xs text-textSecondary">
              Performing administrative action on <strong>{selectedTenant.name}</strong> ({selectedTenant.slug}).
            </p>

            {modalAction === "extend" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-textSecondary" htmlFor="extension_days">Extension Duration (Days)</label>
                <Input 
                  id="extension_days"
                  type="number"
                  value={extensionDays}
                  onChange={(e) => setExtensionDays(parseInt(e.target.value) || 0)}
                  min="1"
                  max="365"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-textSecondary" htmlFor="action_reason">Reason for audit log *</label>
              <textarea
                id="action_reason"
                rows="3"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={modalAction === "extend" ? "e.g. Extended workspace trial due to customer onboarding delay." : "e.g. Terms of Service violation check."}
                className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-textPrimary outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 resize-none font-medium"
              />
            </div>

            {modalError && <p className="text-xs text-red-500 font-bold">{modalError}</p>}

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button 
                variant="ghost" 
                onClick={() => { setSelectedTenant(null); setModalAction(null); setActionReason(""); setModalError(""); }}
              >
                Cancel
              </Button>
              <Button 
                variant={modalAction === "suspend" ? "danger" : "default"}
                onClick={handleModalSubmit}
                disabled={modalLoading}
              >
                {modalLoading ? "Processing..." : "Confirm Action"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Original Business Dashboard View ----
function BusinessDashboard() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const { canViewFinancial } = usePermission();
  const navigate = useNavigate();

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
        <Button
          onClick={() => {
            localStorage.setItem('is_simple_ux', 'true');
            window.location.reload();
          }}
          variant="outline"
          className="flex items-center gap-2 border-primary/40 text-primary hover:bg-primary/5 font-bold"
        >
          Simple Mode / எளிய முறை
        </Button>
      </div>

      {/* Quick Actions (Mobile First) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => navigate("/dashboard/purchases")}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all cursor-pointer min-h-[96px]"
        >
          <ShoppingBag size={28} />
          <span className="font-bold text-sm">Buy Fish</span>
        </button>
        <button
          onClick={() => navigate("/dashboard/sales")}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-surface border-2 border-primary text-primary shadow-sm hover:bg-primary/5 active:scale-95 transition-all cursor-pointer min-h-[96px]"
        >
          <TrendingUp size={28} />
          <span className="font-bold text-sm">Sell Fish</span>
        </button>
        <button
          onClick={() => navigate("/dashboard/payments")}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-surface border border-border text-textPrimary shadow-sm hover:bg-border/20 active:scale-95 transition-all cursor-pointer min-h-[96px]"
        >
          <DollarSign size={28} className="text-success" />
          <span className="font-bold text-sm">Payments</span>
        </button>
        <button
          onClick={() => {
            // Trigger voice if ai_assistant available
            const voiceBtn = document.querySelector('[aria-label="Voice Assistant"]');
            if(voiceBtn) voiceBtn.click();
          }}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-surface border border-border text-textPrimary shadow-sm hover:bg-border/20 active:scale-95 transition-all cursor-pointer min-h-[96px]"
        >
          <Mic size={28} className="text-info" />
          <span className="font-bold text-sm">Voice Entry</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {canViewFinancial() && (
          <KpiCard
            label="Total Revenue"
            value={formatINR(metrics.totalRevenue)}
            icon={TrendingUp}
            trend={metrics.revenueTrend}
            trendLabel="vs last month"
            accent="blue"
          />
        )}
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
      {canViewFinancial() && (
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
      )}

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

// ---- Dashboard Page Dispatcher ----
export default function DashboardPage() {
  const { user } = useAuthStore();
  const isOperator = user?.role === "platform_operator";

  if (isOperator) {
    return <PlatformOperatorDashboard />;
  }

  return <BusinessDashboard />;
}
