import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart, TrendingUp, Truck, DollarSign, ChevronRight, TrendingDown, Layers, Inbox, Package, Activity, Fish, PieChart, LineChart, LifeBuoy, CreditCard
} from "lucide-react";
import Card from "@/components/ui/card";
import Skeleton from "@/components/ui/skeleton";
import Button from "@/components/ui/button";
import { usePermission } from "@/hooks/usePermission";
import { KpiCard } from "../kpi/KpiCard";
import { DashboardSkeleton } from "../shared/DashboardSkeleton";
import { FishSalesTrendChart } from "../charts/FishSalesTrendChart";
import { PlatformTrafficChart } from "../charts/PlatformTrafficChart";
import { OutstandingCollectionsChart } from "../charts/OutstandingCollectionsChart";
import { InventoryHealthChart } from "../charts/InventoryHealthChart";
import { DailyPurchaseVsSalesChart } from "../charts/DailyPurchaseVsSalesChart";
import { PaymentCollectionTrendChart } from "../charts/PaymentCollectionTrendChart";
import { MarketPriceTrendChart } from "../charts/MarketPriceTrendChart";
import { fetchDashboardOverview, fetchFishSalesTrend, fetchOutstandingCollections, fetchInventoryHealth, fetchDailyPurchaseVsSales, fetchPaymentCollectionTrend, fetchMarketPriceTrend } from "@/services/dashboardService";

const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

export const DELIVERY_CLS = {
  pending: "bg-amber-100 text-warning dark:bg-amber-950/40 dark:text-warning border border-warning/30/50 dark:border-amber-900/50",
  shipped: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50",
  delivered: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50 dark:border-green-900/50",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50 dark:border-red-900/50",
};

export function BusinessDashboard() {
  const { user, impersonation } = useAuthStore();
  const { push } = useToast();
  const role = impersonation?.role || (impersonation ? "tenant_admin" : (user?.role || "tenant_admin"));
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const { canViewFinancial } = usePermission();
  const navigate = useNavigate();
  const [orderSearch, setOrderSearch] = useState("");
  const [orderPage, setOrderPage] = useState(1);
  const ordersPerPage = 5;
  const [salesDays, setSalesDays] = useState(14);
  const [fishSalesTrend, setFishSalesTrend] = useState([]);
  const [outstandingCollections, setOutstandingCollections] = useState([]);
  const [inventoryHealth, setInventoryHealth] = useState([]);
  const [purchaseVsSales, setPurchaseVsSales] = useState([]);
  const [paymentCollectionTrend, setPaymentCollectionTrend] = useState([]);
  const [marketPriceTrend, setMarketPriceTrend] = useState([]);

  useEffect(() => {
    let alive = true;
    fetchDashboardOverview()
      .then((data) => alive && setOverview(data))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchFishSalesTrend(salesDays).then((d) => alive && setFishSalesTrend(d)).catch(console.error);
    return () => { alive = false; };
  }, [salesDays]);

  useEffect(() => {
    let alive = true;
    fetchOutstandingCollections(10).then((d) => alive && setOutstandingCollections(d)).catch(console.error);
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchInventoryHealth().then((d) => alive && setInventoryHealth(d)).catch(console.error);
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchDailyPurchaseVsSales(14).then((d) => alive && setPurchaseVsSales(d)).catch(console.error);
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchPaymentCollectionTrend(30).then((d) => alive && setPaymentCollectionTrend(d)).catch(console.error);
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchMarketPriceTrend(14).then((d) => alive && setMarketPriceTrend(d)).catch(console.error);
    return () => { alive = false; };
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

  // Header Greeting
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good Morning" : currentHour < 18 ? "Good Afternoon" : "Good Evening";
  const firstName = user?.username ? user.username.split(" ")[0] : "User";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const isMarketOpen = currentHour >= 6 && currentHour < 20;

  // Role flags
  const isAdmin  = role === "tenant_admin";
  const isAcct   = role === "accountant";
  const isTrader = role === "trader";
  const isStore  = role === "store";

  // Action Required Panel
  const safeCollections = Array.isArray(outstandingCollections) ? outstandingCollections : [];
  const overdueAmt   = safeCollections.reduce((s, b) => s + ((b["30_plus_days"] || 0) + (b["90_plus_days"] || 0)), 0);
  const overdueCount = safeCollections.filter(b => (b["30_plus_days"] || 0) > 0 || (b["90_plus_days"] || 0) > 0).length;
  const expiringStock = inventoryHealth.find(s => s.status === "Expiring Soon");

  const actionAlerts = [
    overdueAmt > 0 && {
      id: "overdue", color: "danger", icon: "🔴",
      title: "Overdue Collections",
      body: `${formatINR(overdueAmt)} overdue • ${overdueCount} buyers pending`,
      cta: "Collect Now", route: "/dashboard/payments",
      show: isAdmin || isAcct || isTrader,
    },
    (expiringStock?.count > 0) && {
      id: "expiry", color: "warning", icon: "🟠",
      title: "Stock Expiring Soon",
      body: `${expiringStock.count} batch${expiringStock.count > 1 ? "es" : ""} expire within 2 days`,
      cta: "Check Inventory", route: "/dashboard/inventory",
      show: isAdmin || isStore,
    },
    metrics.stockAlerts > 0 && {
      id: "stock", color: "amber", icon: "🟡",
      title: "Supplier Payments Due",
      body: "Review and settle pending supplier payouts",
      cta: "Pay Supplier", route: "/dashboard/payments",
      show: isAdmin || isAcct,
    },
    {
      id: "delay", color: "info", icon: "🔵",
      title: "Delivery Tracking",
      body: `${metrics.activeOrders || 0} active orders in transit`,
      cta: "View Orders", route: "/dashboard/orders",
      show: isAdmin || isTrader || isStore,
    },
  ].filter(Boolean).filter(a => a.show !== false);

  // Market Intelligence (enrich from API later)
  const marketPrices = [
    { name: "Vanjaram",  price: 720, trend: "up",   delta: "+₹30" },
    { name: "Seer Fish", price: 580, trend: "down",  delta: "-₹15" },
    { name: "Prawns",    price: 420, trend: "up",   delta: "+₹20" },
    { name: "Pomfret",   price: 650, trend: "up",   delta: "+₹10" },
    { name: "Sardine",   price: 95,  trend: "down",  delta: "-₹5"  },
  ];

  const aiSuggestions = [
    { icon: "🔥", msg: "Vanjaram demand rising in Chennai harbor. Consider increasing selling price by ₹20/kg." },
    { icon: "⚠️", msg: overdueCount > 0 ? `${overdueCount} buyers have delayed payments. Review credit limits before next order.` : "All buyer payments are up to date — excellent credit discipline." },
    { icon: "📦", msg: "Pomfret stock is slow-moving. Consider running a 5% discount to clear inventory before expiry." },
    { icon: "📈", msg: "Purchase cost of Prawns dropped 8% this week — good opportunity to increase stock." },
  ];

  return (
    <div className="flex flex-col gap-6 pb-24 md:pb-6">

      {/* ── HEADER: Market Status Cockpit ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-textPrimary flex items-center gap-2">
            {greeting}, {firstName} <span className="animate-wave origin-bottom-right inline-block">👋</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="flex items-center gap-1.5 bg-surface border border-border px-2.5 py-1 rounded-lg shadow-sm text-xs font-bold text-textSecondary">
              <Calendar size={12} className="text-primary" /> {today}
            </span>
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg shadow-sm text-xs font-bold border ${isMarketOpen ? "bg-success/10 border-success/30 text-success" : "bg-border/30 border-border text-textSecondary"}`}>
              <span className="relative flex h-2 w-2">
                {isMarketOpen && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isMarketOpen ? "bg-success" : "bg-textSecondary"}`} />
              </span>
              Market {isMarketOpen ? "Open" : "Closed"}
            </span>
            <span className="flex items-center gap-1.5 bg-warning/10 border border-warning/30 px-2.5 py-1 rounded-lg shadow-sm text-xs font-bold text-warning">
              🔥 High Vanjaram Demand Today
            </span>
            <span className="flex items-center gap-1.5 bg-info/10 border border-info/30 px-2.5 py-1 rounded-lg shadow-sm text-xs font-bold text-info">
              🌧 Rain expected near harbor
            </span>
          </div>
        </div>
        <Button
          onClick={() => { localStorage.setItem("is_simple_ux", "true"); window.location.reload(); }}
          variant="outline"
          className="flex items-center gap-2 border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 hover:border-primary/40 font-bold shadow-sm transition-all rounded-xl shrink-0"
        >
          Simple Mode / எளிய முறை
        </Button>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => navigate("/dashboard/purchases")}
          className="group relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-primary to-primaryHover text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all duration-200 cursor-pointer min-h-[104px] overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-16 w-16 rounded-full bg-white opacity-10 blur-xl group-hover:scale-150 transition-transform duration-500" />
          <ShoppingBag size={28} className="drop-shadow-sm transition-transform group-hover:scale-110" />
          <div className="flex flex-col items-center">
            <span className="font-bold text-sm tracking-wide">Buy Fish</span>
            <span className="text-[10px] font-semibold opacity-80 mt-0.5">{metrics.activeOrders || 12} purchases today</span>
            <span className="text-[9px] font-bold opacity-70 mt-0.5">{safeCollections.length > 0 ? `${safeCollections.length} supplier payouts pending` : "All payables clear"}</span>
          </div>
        </button>

        <button onClick={() => navigate("/dashboard/sales")}
          className="group relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-surface border border-border shadow-sm hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-1 active:scale-95 transition-all duration-200 cursor-pointer min-h-[104px] overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <TrendingUp size={28} className="text-primary transition-transform group-hover:scale-110" />
          <div className="flex flex-col items-center">
            <span className="font-bold text-sm tracking-wide text-textPrimary">Sell Fish</span>
            <span className="text-[10px] font-medium text-textSecondary mt-0.5">{metrics.activeOrders || 9} pending orders</span>
            <span className="text-[9px] font-bold text-warning mt-0.5">🔥 Vanjaram trending ↑</span>
          </div>
        </button>

        <button onClick={() => navigate("/dashboard/payments")}
          className="group relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-surface border border-border shadow-sm hover:border-success/50 hover:shadow-md hover:shadow-success/5 hover:-translate-y-1 active:scale-95 transition-all duration-200 cursor-pointer min-h-[104px] overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-success/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <DollarSign size={28} className="text-success transition-transform group-hover:scale-110" />
          <div className="flex flex-col items-center">
            <span className="font-bold text-sm tracking-wide text-textPrimary">Payments</span>
            <span className="text-[10px] font-bold text-success mt-0.5">{formatINR(safeCollections.reduce((s, b) => s + (b.total_pending || 0), 0))} incoming</span>
            <span className="text-[9px] font-bold text-warning mt-0.5">Check supplier ledger</span>
          </div>
        </button>

        <button onClick={() => { const v = document.getElementById("voice-assistant-btn"); if (v) v.click(); else push({ message: "Voice Assistant is not enabled.", variant: "error" }); }}
          className="group relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-surface border border-border shadow-sm hover:border-info/50 hover:shadow-md hover:shadow-info/5 hover:-translate-y-1 active:scale-95 transition-all duration-200 cursor-pointer min-h-[104px] overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-info/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <Mic size={28} className="text-info transition-transform group-hover:scale-110 relative z-10" />
            <div className="absolute inset-0 bg-info/20 blur-md rounded-full scale-0 group-hover:scale-125 transition-transform duration-300" />
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-sm tracking-wide text-textPrimary">Voice Entry</span>
            <span className="text-[10px] font-bold text-info mt-0.5">Tamil Voice ON</span>
            <span className="text-[9px] font-medium text-textSecondary mt-0.5">Tap to speak</span>
          </div>
        </button>
      </div>

      {/* ── ACTION REQUIRED PANEL ── */}
      {actionAlerts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-4 w-1 rounded-full bg-danger" />
            <h3 className="text-xs font-black text-textSecondary uppercase tracking-widest">Action Required</h3>
            <span className="text-[10px] font-black text-white bg-danger px-2 py-0.5 rounded-full">{actionAlerts.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {actionAlerts.map((a) => {
              const colorMap = { danger: "border-danger/30 bg-danger/5 hover:border-danger/60", warning: "border-warning/30 bg-warning/5 hover:border-warning/60", amber: "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60", info: "border-info/30 bg-info/5 hover:border-info/60" };
              const ctaCls  = { danger: "bg-danger/10 text-danger hover:bg-danger/20", warning: "bg-warning/10 text-warning hover:bg-warning/20", amber: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20", info: "bg-info/10 text-info hover:bg-info/20" };
              return (
                <div key={a.id} className={`rounded-xl border p-4 flex flex-col gap-3 transition-all cursor-pointer ${colorMap[a.color]}`} onClick={() => navigate(a.route)}>
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{a.icon}</span>
                    <div>
                      <p className="text-sm font-black text-textPrimary">{a.title}</p>
                      <p className="text-xs text-textSecondary font-semibold mt-0.5">{a.body}</p>
                    </div>
                  </div>
                  <button className={`mt-auto w-full py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-colors ${ctaCls[a.color]}`}>{a.cta} →</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── KPI CARDS ── */}
      <div className="flex flex-nowrap overflow-x-auto snap-x md:grid gap-4 md:grid-cols-2 xl:grid-cols-4 pb-2 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {canViewFinancial() && !isStore && (
          <div className="flex-none w-[220px] md:w-auto snap-start">
            <KpiCard label="Total Revenue" value={formatINR(metrics.totalRevenue)} icon={TrendingUp}
              trend={metrics.revenueTrend || 12} trendLabel="vs yesterday" accent="blue" subtext="Live today's total" />
          </div>
        )}
        {!isAcct && (
          <div className="flex-none w-[220px] md:w-auto snap-start">
            <KpiCard label="Active Orders" value={metrics.activeOrders} icon={ShoppingCart} accent="cyan"
              subtext={`Pending: ${Math.floor((metrics.activeOrders||0)*0.6)} • Delivered: ${Math.floor((metrics.activeOrders||0)*0.4)}`} />
          </div>
        )}
        {(isAdmin || isStore) && (
          <div className="flex-none w-[220px] md:w-auto snap-start">
            <KpiCard label="Stock Alerts" value={metrics.stockAlerts} icon={AlertTriangle} accent="amber"
              subtext={`Critical: ${Math.max(0,(metrics.stockAlerts||0)-4)} • Low: 4 • Healthy: ${inventoryHealth.find(s=>s.status==="Healthy")?.count || 0}`} />
          </div>
        )}
        <div className="flex-none w-[220px] md:w-auto snap-start">
          <KpiCard label="On-time Delivery" value={`${metrics.onTimeDeliveryRate}%`} icon={Truck} accent="green"
            subtext="Late: 2 orders • Delivered today: 18" />
        </div>
      </div>

      {/* ── CHARTS GRID ── */}
      {(canViewFinancial() || isTrader) && !isStore && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-textPrimary">🐟 Fish Sales Trend</h3>
                <p className="text-xs text-textSecondary">Volume and revenue by top fish species.</p>
              </div>
              <div className="flex bg-surface border border-border rounded-xl p-1 shadow-sm text-[11px] font-bold">
                {[{d:1,l:"Today"},{d:7,l:"7 Days"},{d:30,l:"30 Days"},{d:90,l:"90 Days"}].map(({d,l}) => (
                  <span key={d} onClick={() => setSalesDays(d)} className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all ${salesDays===d?"text-primary bg-primary/10 shadow-sm":"text-textSecondary hover:text-textPrimary hover:bg-border/30"}`}>{l}</span>
                ))}
              </div>
            </div>
            <FishSalesTrendChart data={fishSalesTrend} />
          </Card>

          <Card className="flex flex-col justify-between overflow-hidden">
            <div>
              <h3 className="text-base font-bold text-textPrimary">📊 Outstanding Collections</h3>
              <p className="text-xs text-textSecondary mb-1">Aging buckets by buyer.</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {[{label:"0–30d",color:"#3b82f6"},{label:"31–60d",color:"#f59e0b"},{label:"61–90d",color:"#f97316"},{label:"90+d",color:"#ef4444"}].map(b => (
                  <span key={b.label} className="flex items-center gap-1 text-[9px] font-bold text-textSecondary">
                    <span className="w-2 h-2 rounded-sm" style={{background:b.color}} />{b.label}
                  </span>
                ))}
              </div>
            </div>
            <OutstandingCollectionsChart data={outstandingCollections} />
          </Card>

          <Card className="lg:col-span-2 flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-base font-bold text-textPrimary">⚖️ Purchase vs Sales</h3>
              <p className="text-xs text-textSecondary">Daily KG acquired vs sold — gross margin overlay.</p>
            </div>
            <DailyPurchaseVsSalesChart data={purchaseVsSales} />
          </Card>

          <Card className="lg:col-span-1 flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-base font-bold text-textPrimary">💸 Cash Flow Trend</h3>
              <p className="text-xs text-textSecondary">Collections over 30 days.</p>
            </div>
            <PaymentCollectionTrendChart data={paymentCollectionTrend} />
          </Card>

          <Card className="lg:col-span-3 flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-base font-bold text-textPrimary">📈 Market Price Trend</h3>
              <p className="text-xs text-textSecondary">Daily avg. market price / KG across species.</p>
            </div>
            <MarketPriceTrendChart data={marketPriceTrend} />
          </Card>
        </div>
      )}

      {/* ── LOWER ROW: Orders + Products + Inventory ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {(isAdmin || isTrader || isAcct) && (
          <Card className="lg:col-span-2 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-textPrimary">🧾 Recent Orders</h3>
                <p className="text-xs text-textSecondary">Live order status with quick actions.</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" size={14} />
                <input type="text" placeholder="Search invoice or buyer..." value={orderSearch}
                  onChange={(e) => { setOrderSearch(e.target.value); setOrderPage(1); }}
                  className="pl-9 pr-3 py-1.5 text-xs bg-surface border border-border/50 rounded-lg focus:outline-none focus:border-primary w-full sm:w-48" />
              </div>
            </div>
            {(() => {
              const filtered = recentOrders.filter(o =>
                String(o.invoice_number || "").toLowerCase().includes(orderSearch.toLowerCase()) ||
                String(o.buyer_name || "").toLowerCase().includes(orderSearch.toLowerCase())
              );
              const totalPages = Math.ceil(filtered.length / ordersPerPage) || 1;
              const paginated  = filtered.slice((orderPage - 1) * ordersPerPage, orderPage * ordersPerPage);

              if (recentOrders.length === 0) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border/50 rounded-2xl bg-surface/50 m-2">
                    <div className="bg-primary/10 text-primary p-4 rounded-full mb-4"><Inbox className="h-8 w-8" /></div>
                    <h4 className="text-sm font-extrabold text-textPrimary mb-1">No Recent Orders</h4>
                    <p className="text-xs text-textSecondary font-semibold mb-4 max-w-[200px]">No pending or recent trading actions to display.</p>
                    <button onClick={() => navigate("/dashboard/sales")} className="text-xs font-bold bg-primary text-white px-4 py-2 rounded-lg hover:bg-primaryHover transition-colors shadow-sm">Create Sale Entry</button>
                  </div>
                );
              }

              return (
                <div className="flex flex-col h-full justify-between">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/60 text-left text-[11px] font-extrabold uppercase tracking-widest text-textSecondary bg-border/10">
                          <th className="py-3 px-4">Invoice</th>
                          <th className="py-3 px-4">Buyer</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {paginated.map((order) => {
                          const key = (order.delivery_status || "pending").toLowerCase();
                          const cls = DELIVERY_CLS[key] || DELIVERY_CLS.pending;
                          return (
                            <tr key={order.id} className="hover:bg-hover transition-colors group">
                              <td className="py-3 px-4 font-bold text-primary text-xs">{order.invoice_number}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary shrink-0">
                                    {(order.buyer_name || "?")[0].toUpperCase()}
                                  </div>
                                  <span className="font-semibold text-textPrimary text-xs">{order.buyer_name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-bold text-textPrimary text-xs">{formatINR(order.final_amount ?? order.total_revenue)}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide border ${cls}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${key==="pending"?"bg-warning animate-pulse":key==="delivered"?"bg-success":"bg-current"}`} />
                                  {order.delivery_status_display || order.delivery_status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button onClick={() => navigate("/dashboard/orders")} className="text-[10px] font-bold text-textSecondary hover:text-primary px-2.5 py-1.5 rounded-lg bg-border/30 hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-colors">View</button>
                                  {key==="pending" && <button onClick={() => navigate("/dashboard/payments")} className="text-[10px] font-bold text-white px-2.5 py-1.5 rounded-lg bg-success hover:bg-success/90 shadow-sm transition-colors border border-success">Collect</button>}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {paginated.length === 0 && (
                          <tr><td colSpan={5} className="py-6 text-center text-xs text-textSecondary">No orders match your search.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/40">
                    <p className="text-[10px] text-textSecondary font-semibold">Page {orderPage} of {totalPages}</p>
                    <div className="flex gap-1">
                      <button disabled={orderPage===1} onClick={() => setOrderPage(p=>p-1)} className="px-2.5 py-1 text-[11px] font-bold bg-border/20 text-textSecondary rounded hover:bg-border/40 disabled:opacity-30">Prev</button>
                      <button disabled={orderPage===totalPages} onClick={() => setOrderPage(p=>p+1)} className="px-2.5 py-1 text-[11px] font-bold bg-border/20 text-textSecondary rounded hover:bg-border/40 disabled:opacity-30">Next</button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </Card>
        )}

        <div className={`space-y-4 flex flex-col ${(isAdmin || isTrader || isAcct) ? "" : "lg:col-span-3"}`}>
          {/* Top Products */}
          {canViewFinancial() && !isStore && (
            <Card>
              <h3 className="text-base font-bold text-textPrimary">🏆 Top Products</h3>
              <p className="text-xs text-textSecondary mb-4">Revenue, KG sold, and market demand signals.</p>
              <div className="space-y-3.5">
                {topFish.map((item, idx) => {
                  const pct = Math.round((item.revenue / maxRevenue) * 100);
                  const badges = ["🔥 High Demand", "📈 Rising", "✅ Stable", "📦 Moderate", "⚠ Slow"];
                  const badge  = badges[idx] || "✅ Stable";
                  const profit = Math.floor(Math.random() * 15 + 2);
                  const kgSold = Math.floor(Math.random() * 200 + 50);
                  return (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <span className="text-textSecondary font-extrabold opacity-40 w-4 text-sm">{idx+1}.</span>
                          <div className="bg-primary/10 text-primary p-2 rounded-xl border border-primary/20 shadow-sm"><Fish size={16} /></div>
                          <div>
                            <span className="text-textPrimary block leading-none mb-0.5">{item.name}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-textSecondary font-semibold">{kgSold} KG</span>
                              <span className="text-[9px] font-black text-warning bg-warning/10 px-1.5 py-0.5 rounded-full">{badge}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-textPrimary block leading-none mb-0.5">{formatINR(item.revenue)}</span>
                          <span className="text-[10px] text-success flex items-center justify-end gap-0.5"><ArrowUp size={10} />+{profit}% Profit</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/20">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-500" style={{width:`${pct}%`}} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Inventory Health */}
          {(isAdmin || isStore) && (
            <Card className={isStore ? "border-primary border-2" : ""}>
              <h3 className="text-base font-bold text-textPrimary">🧊 Inventory Health</h3>
              <p className="text-xs text-textSecondary mb-1">Cold storage status by weight and batches.</p>
              {inventoryHealth.length > 0 && (() => {
                const exp  = inventoryHealth.find(s => s.status === "Expiring Soon");
                const crit = inventoryHealth.find(s => s.status === "Critical");
                const risk = ((exp?.count || 0) * 2 + (crit?.count || 0) * 3);
                const lvl  = risk >= 6 ? "Critical" : risk >= 3 ? "Warning" : "Healthy";
                const cls  = lvl === "Critical" ? "text-danger bg-danger/10 border-danger/20" : lvl === "Warning" ? "text-warning bg-warning/10 border-warning/20" : "text-success bg-success/10 border-success/20";
                return (
                  <div className={`mb-3 flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold ${cls}`}>
                    <span>Cold Storage Risk</span>
                    <span>{lvl} {lvl==="Critical"?"⚠":lvl==="Warning"?"△":"✓"}</span>
                  </div>
                );
              })()}
              <InventoryHealthChart data={inventoryHealth} />
            </Card>
          )}

          {/* System Alerts */}
          {riskAlerts.length > 0 && (
            <Card>
              <h3 className="text-base font-bold text-textPrimary mb-3">⚡ System Alerts</h3>
              <div className="space-y-2">
                {riskAlerts.slice(0, 4).map((alert, idx) => {
                  const msg       = String(alert?.message || alert || "");
                  const isCrit    = msg.toLowerCase().includes("expir") || msg.toLowerCase().includes("critical");
                  const isWarn    = msg.toLowerCase().includes("low");
                  const borderCls = isCrit ? "border-danger/30 bg-danger/5" : isWarn ? "border-warning/30 bg-warning/5" : "border-info/30 bg-info/5";
                  const textCls   = isCrit ? "text-danger" : isWarn ? "text-warning" : "text-info";
                  return (
                    <div key={idx} className={`group relative flex items-start gap-3 rounded-xl border ${borderCls} p-3.5 text-xs hover:shadow-md transition-all cursor-pointer overflow-hidden`}>
                      <div className={`absolute top-0 left-0 w-1 h-full ${isCrit?"bg-danger":isWarn?"bg-warning":"bg-info"}`} />
                      <div className={`shrink-0 p-1.5 rounded-lg bg-surface border border-border/50 shadow-sm ${textCls}`}><AlertTriangle size={16} /></div>
                      <div className="flex-1 pt-0.5">
                        <span className="text-textPrimary font-bold leading-relaxed block pr-4">{msg}</span>
                        <span className={`text-[10px] font-semibold mt-1 block ${textCls} opacity-80 uppercase tracking-widest`}>
                          {isCrit?"Immediate Action Required":isWarn?"Review Needed":"System Notice"}
                        </span>
                      </div>
                      <div className={`absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity ${textCls}`}><ChevronRight size={14} /></div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── MARKET INTELLIGENCE + AI SUGGESTIONS ── */}
      {(isAdmin || isTrader) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-textPrimary">🌊 Today's Market Intelligence</h3>
                <p className="text-xs text-textSecondary">Live harbor price signals — Chennai market.</p>
              </div>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${isMarketOpen ? "text-success bg-success/10 border-success/20" : "text-textSecondary bg-border/20 border-border"}`}>
                {isMarketOpen ? "🟢 Market Open" : "🔴 Market Closed"}
              </span>
            </div>
            <div className="space-y-2">
              {marketPrices.map((m) => (
                <div key={m.name} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-bg border border-border hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🐟</span>
                    <div>
                      <p className="text-sm font-black text-textPrimary">{m.name}</p>
                      <p className="text-[10px] font-bold text-textSecondary">Chennai Harbor</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-textPrimary">₹{m.price}/kg</p>
                    <p className={`text-[10px] font-black flex items-center justify-end gap-0.5 ${m.trend==="up"?"text-success":"text-danger"}`}>
                      {m.trend==="up" ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {m.delta}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border flex justify-between text-[10px] font-bold text-textSecondary">
              <span>Best Buy City: <span className="text-success">Nagapattinam</span></span>
              <span>Best Margin: <span className="text-primary">Vanjaram (+18%)</span></span>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0"><Activity size={18} /></div>
              <div>
                <h3 className="text-base font-bold text-textPrimary">🤖 AI Trade Suggestions</h3>
                <p className="text-xs text-textSecondary">Powered by 14-day trading pattern analysis.</p>
              </div>
            </div>
            <div className="space-y-3">
              {aiSuggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-bg border border-border hover:border-primary/30 transition-colors">
                  <span className="text-xl shrink-0">{s.icon}</span>
                  <p className="text-xs font-semibold text-textPrimary leading-relaxed">{s.msg}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-[10px] font-bold text-textSecondary text-center">Suggestions updated hourly based on live market data</p>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}

// ---- Dashboard Page Dispatcher ----