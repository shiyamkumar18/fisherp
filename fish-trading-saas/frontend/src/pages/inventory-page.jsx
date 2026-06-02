import React, { useEffect, useState, useMemo } from "react";
import {
  Warehouse, Search, ShieldAlert, Layers, Package, AlertTriangle,
  Calendar, MapPin, TrendingUp, TrendingDown, ArrowRight, Activity,
  ThermometerSnowflake, X, CheckCircle, Clock, Flame, BarChart3,
  RefreshCw, ChevronRight, Zap
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Badge from "@/components/ui/Badge";
import {
  Dialog, DialogContent
} from "@/components/ui/dialog";
import { fetchInventory, updateInventoryItem } from "@/services/inventoryService";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/components/shared/toast-provider";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────── CONSTANTS ─────────────────────── */

const STATUS_CLS = {
  in_stock:           "bg-success/10 text-success border-success/20",
  low_stock:          "bg-warning/10 text-warning border-warning/20",
  reserved:           "bg-primary/10 text-primary border-primary/20",
  out_of_stock:       "bg-danger/10 text-danger border-danger/20",
  expired:            "bg-border/60 text-textSecondary border-border",
  inspection_needed:  "bg-warning/15 text-warning border-warning/30",
  temperature_warning:"bg-warning/15 text-warning border-warning/30",
  spoilage_risk:      "bg-danger/20 text-danger border-danger/40",
};

const TEMP_LOGIC = {
  getTempState: (temp) => {
    if (temp <= 2 && temp >= -2) return "optimal";
    if (temp >= 3 && temp <= 6)  return "warning";
    return "critical";
  },
  getColor: (state) => {
    if (state === "optimal") return "text-success";
    if (state === "warning")  return "text-warning";
    return "text-danger";
  },
  getBorderColor: (state) => {
    if (state === "optimal") return "border-success/30";
    if (state === "warning")  return "border-warning/30";
    return "border-danger/30";
  },
  getGlowClass: (state) => {
    if (state === "optimal") return "bg-success";
    if (state === "warning")  return "bg-warning";
    return "bg-danger";
  },
  getBg: (state) => {
    if (state === "optimal") return "bg-success/10";
    if (state === "warning")  return "bg-warning/10";
    return "bg-danger/10";
  },
  getLabel: (state) => {
    if (state === "optimal") return "Optimal Cooling";
    if (state === "warning")  return "Warm Risk";
    return "Critical Risk";
  },
  getStatusBadge: (temp) => {
    const state = TEMP_LOGIC.getTempState(temp);
    if (state === "optimal") return { icon: "🟢", label: "Optimal" };
    if (state === "warning")  return { icon: "🟡", label: "Warning" };
    return { icon: "🔴", label: "Critical" };
  }
};

const EXPIRY_LOGIC = {
  getDaysLeft: (expiryStr) => {
    if (!expiryStr) return null;
    const diff = new Date(expiryStr) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  },
  getState: (days) => {
    if (days === null) return "unknown";
    if (days < 0)     return "expired";
    if (days <= 1)    return "critical";
    if (days <= 3)    return "warning";
    return "healthy";
  },
  getColor: (state) => {
    if (state === "healthy")  return "text-success";
    if (state === "warning")  return "text-warning";
    if (state === "critical") return "text-danger";
    if (state === "expired")  return "text-danger";
    return "text-textSecondary";
  },
  getBg: (state) => {
    if (state === "healthy")  return "bg-success/10";
    if (state === "warning")  return "bg-warning/10";
    if (state === "critical") return "bg-danger/10";
    if (state === "expired")  return "bg-danger/15";
    return "bg-border/40";
  },
  getLabel: (days, state) => {
    if (state === "unknown")  return "No Expiry Set";
    if (state === "expired")  return `Expired ${Math.abs(days)}d Ago`;
    if (days === 0)           return "Expires Today";
    if (days === 1)           return "Expires Tomorrow";
    return `${days} Days Left`;
  }
};

/* ─────────────────────── SUB COMPONENTS ─────────────────────── */

function TempBadge({ temp, size = "sm" }) {
  const state = TEMP_LOGIC.getTempState(temp);
  const isWarning = state !== "optimal";
  return (
    <div className={`inline-flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border
      ${state === "optimal" ? "bg-success/10 border-success/20"
      : state === "warning"  ? "bg-warning/10 border-warning/20"
      : "bg-danger/10 border-danger/20"}
      ${isWarning && state === "critical" ? "animate-pulse" : ""}
    `}>
      <div className={`flex items-center gap-1.5 font-black ${size === "lg" ? "text-base" : "text-sm"} ${TEMP_LOGIC.getColor(state)}`}>
        <ThermometerSnowflake size={size === "lg" ? 16 : 13} />
        {temp?.toFixed(1)}°C
      </div>
      <span className={`text-[9px] font-black uppercase mt-0.5 ${TEMP_LOGIC.getColor(state)} opacity-80`}>
        {TEMP_LOGIC.getLabel(state)}
      </span>
    </div>
  );
}

function ExpiryBadge({ expiryDate }) {
  const days  = EXPIRY_LOGIC.getDaysLeft(expiryDate);
  const state = EXPIRY_LOGIC.getState(days);
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border
      ${state === "healthy"  ? "bg-success/10 border-success/20"
      : state === "warning"  ? "bg-warning/10 border-warning/20"
      : state === "expired" || state === "critical" ? "bg-danger/10 border-danger/20"
      : "bg-border/40 border-border"}
    `}>
      <div className={`w-1.5 h-1.5 rounded-full ${
        state === "healthy"  ? "bg-success" :
        state === "warning"  ? "bg-warning" :
        state === "expired" || state === "critical" ? "bg-danger" : "bg-textSecondary"}`} />
      <span className={`text-xs font-bold ${EXPIRY_LOGIC.getColor(state)}`}>
        {EXPIRY_LOGIC.getLabel(days, state)}
      </span>
    </div>
  );
}

function StockBar({ remaining, initial, weightKg }) {
  const pct = initial ? Math.min(100, Math.round((remaining / initial) * 100)) : 0;
  const color = pct < 10 ? "bg-danger" : pct < 30 ? "bg-warning" : "bg-success";
  const textColor = pct < 10 ? "text-danger" : pct < 30 ? "text-warning" : "text-success";
  return (
    <div className="min-w-[140px]">
      <div className="flex items-center justify-between text-xs font-bold mb-1.5">
        <span className="text-textPrimary">{remaining} / {initial} pkg</span>
        <span className={`font-black ${textColor}`}>{pct}%</span>
      </div>
      <div className="h-2 w-full bg-border/60 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-700 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] font-bold text-textSecondary uppercase mt-1.5 tracking-wide">{weightKg} KG remaining</p>
    </div>
  );
}

/* ─────────────────────── MAIN PAGE ─────────────────────── */

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading]     = useState(true);

  // Filters
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tempFilter, setTempFilter]     = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");

  // UI States
  const [telemetryModalOpen, setTelemetryModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen]                 = useState(false);
  const [selectedItem, setSelectedItem]             = useState(null);

  const { push: toast }     = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { canEditForm }     = usePermission();
  const isEditable          = canEditForm("inventory");

  // Telemetry form
  const [storageLocation, setStorageLocation]       = useState("");
  const [binNumber, setBinNumber]                   = useState("");
  const [rackNumber, setRackNumber]                 = useState("");
  const [currentTemperature, setCurrentTemperature] = useState(0);

  /* ── Data Loading ── */
  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await fetchInventory();
      setInventory(data);
    } catch (e) {
      toast({ message: e?.message || "Failed to load inventory levels.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInventory(); }, []);

  /* ── Modal Handlers ── */
  const openTelemetryModal = (e, item) => {
    e.stopPropagation();
    setSelectedItem(item);
    setStorageLocation(item.storage_location || "");
    setBinNumber(item.bin_number || "");
    setRackNumber(item.rack_number || "");
    setCurrentTemperature(item.current_temperature || 0);
    setTelemetryModalOpen(true);
  };

  const openDrawer = (item) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    setIsSubmitting(true);
    const payload = {
      storage_location: storageLocation,
      bin_number:       binNumber,
      rack_number:      rackNumber,
      current_temperature: Number(currentTemperature),
    };
    try {
      await updateInventoryItem(selectedItem.id, payload);
      toast({ message: "Cold-storage telemetry updated successfully!" });
      setTelemetryModalOpen(false);
      loadInventory();
    } catch (err) {
      toast({ message: err?.message || "Failed to update storage telemetry.", variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Computed Stats ── */
  const totalPackages = inventory.reduce((s, i) => s + (i.remaining_packages || 0), 0);
  const totalWeight   = inventory.reduce((s, i) => s + (Number(i.remaining_weight_kg) || 0), 0);

  const tempAlerts    = inventory.filter(i =>
    i.remaining_packages > 0 && TEMP_LOGIC.getTempState(i.current_temperature) !== "optimal"
  ).length;

  const expiryAlerts  = inventory.filter(i => {
    if (i.remaining_packages <= 0) return false;
    const days  = EXPIRY_LOGIC.getDaysLeft(i.expiry_date);
    const state = EXPIRY_LOGIC.getState(days);
    return state === "warning" || state === "critical" || state === "expired";
  }).length;

  // Health system counts
  const healthyCount  = inventory.filter(i => {
    const ts = TEMP_LOGIC.getTempState(i.current_temperature);
    const ds = EXPIRY_LOGIC.getState(EXPIRY_LOGIC.getDaysLeft(i.expiry_date));
    return ts === "optimal" && (ds === "healthy" || ds === "unknown") && i.remaining_packages > 0;
  }).length;

  const atRiskCount   = inventory.filter(i =>
    TEMP_LOGIC.getTempState(i.current_temperature) !== "optimal" && i.remaining_packages > 0
  ).length;

  const expiringSoon  = inventory.filter(i => {
    const days = EXPIRY_LOGIC.getDaysLeft(i.expiry_date);
    const s    = EXPIRY_LOGIC.getState(days);
    return (s === "warning" || s === "critical") && i.remaining_packages > 0;
  }).length;

  const spoilageRisk  = inventory.filter(i =>
    i.status === "spoilage_risk" || i.status === "expired"
  ).length;

  /* ── Filter Logic ── */
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const str = search.toLowerCase();
      const matchSearch =
        (item.fish_name || "").toLowerCase().includes(str) ||
        (item.batch_number || "").toLowerCase().includes(str) ||
        (item.storage_location || "").toLowerCase().includes(str);
      if (!matchSearch) return false;

      if (statusFilter !== "all" && item.status !== statusFilter) return false;

      if (tempFilter !== "all") {
        const ts = TEMP_LOGIC.getTempState(item.current_temperature);
        if (tempFilter === "critical" && ts !== "critical") return false;
        if (tempFilter === "warning"  && ts === "optimal")  return false;
        if (tempFilter === "healthy"  && ts !== "optimal")  return false;
      }

      if (expiryFilter !== "all") {
        const days  = EXPIRY_LOGIC.getDaysLeft(item.expiry_date);
        const state = EXPIRY_LOGIC.getState(days);
        if (expiryFilter === "expiring" && state !== "warning" && state !== "critical") return false;
        if (expiryFilter === "expired"  && state !== "expired") return false;
        if (expiryFilter === "healthy"  && state !== "healthy")  return false;
      }

      return true;
    });
  }, [inventory, search, statusFilter, tempFilter, expiryFilter]);

  /* ─── UI ─── */
  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-textPrimary flex items-center gap-3">
            <span className="p-2 rounded-xl bg-primary/10 text-primary"><Warehouse size={20} /></span>
            Inventory Intelligence
          </h2>
          <p className="text-sm text-textSecondary font-medium mt-1 ml-11">
            Cold-Chain Warehouse Control System
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={loadInventory}>
          <RefreshCw size={14} />
          Sync Telemetry
        </Button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Packages */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-textSecondary">Stock Packages</p>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-textPrimary tracking-tight">{totalPackages}</span>
            <p className="text-[10px] text-textSecondary font-bold uppercase tracking-wider mt-1">{inventory.length} active batches</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-success">
              <TrendingUp size={13} /><span>+14 packages today</span>
            </div>
          </div>
        </Card>

        {/* Weight */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-textSecondary">Cold Room Weight</p>
            <div className="p-2 rounded-lg bg-info/10 text-info">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-textPrimary tracking-tight">{(totalWeight / 1000).toFixed(2)} MT</span>
            <p className="text-[10px] text-textSecondary font-bold uppercase tracking-wider mt-1">Cold room utilization</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-textSecondary">
              <TrendingDown size={13} className="text-danger" /><span>↓ 2.4 MT sold today</span>
            </div>
          </div>
        </Card>

        {/* Cold Chain */}
        <Card className={`flex flex-col justify-between border ${tempAlerts > 0 ? "border-warning/40 bg-warning/[0.04]" : "border-border"}`}>
          <div className="flex items-center justify-between mb-4">
            <p className={`text-xs font-bold uppercase tracking-wider ${tempAlerts > 0 ? "text-warning" : "text-textSecondary"}`}>
              Cold Chain Risk
            </p>
            <div className={`p-2 rounded-lg ${tempAlerts > 0 ? "bg-warning/20 text-warning" : "bg-success/10 text-success"}`}>
              <ThermometerSnowflake className={`h-5 w-5 ${tempAlerts > 0 ? "animate-pulse" : ""}`} />
            </div>
          </div>
          <div>
            <span className={`text-3xl font-black tracking-tight ${tempAlerts > 0 ? "text-warning" : "text-success"}`}>{tempAlerts}</span>
            <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${tempAlerts > 0 ? "text-warning" : "text-textSecondary"}`}>
              {tempAlerts > 0 ? "Requires inspection" : "All freezers optimal"}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-textSecondary">
              <span>{tempAlerts > 0 ? `${tempAlerts} critical alerts` : "System healthy"}</span>
            </div>
          </div>
        </Card>

        {/* Expiry */}
        <Card className={`flex flex-col justify-between border ${expiryAlerts > 0 ? "border-danger/40 bg-danger/[0.04]" : "border-border"}`}>
          <div className="flex items-center justify-between mb-4">
            <p className={`text-xs font-bold uppercase tracking-wider ${expiryAlerts > 0 ? "text-danger" : "text-textSecondary"}`}>
              Expiry Alerts
            </p>
            <div className={`p-2 rounded-lg ${expiryAlerts > 0 ? "bg-danger/20 text-danger" : "bg-success/10 text-success"}`}>
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <div>
            <span className={`text-3xl font-black tracking-tight ${expiryAlerts > 0 ? "text-danger" : "text-success"}`}>{expiryAlerts}</span>
            <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${expiryAlerts > 0 ? "text-danger" : "text-textSecondary"}`}>
              {expiryAlerts > 0 ? "Immediate action needed" : "No batches expiring soon"}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-textSecondary">
              <span>{expiryAlerts > 0 ? "1 expiring in 24h" : "Shelf life healthy"}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Inventory Health System ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-success/15 flex items-center justify-center shrink-0">
            <CheckCircle size={16} className="text-success" />
          </div>
          <div>
            <p className="text-lg font-black text-success leading-none">{healthyCount}</p>
            <p className="text-[10px] font-bold text-textSecondary uppercase tracking-wide mt-0.5">Healthy</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-warning/15 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-warning" />
          </div>
          <div>
            <p className="text-lg font-black text-warning leading-none">{atRiskCount}</p>
            <p className="text-[10px] font-bold text-textSecondary uppercase tracking-wide mt-0.5">At Risk</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-warning/15 flex items-center justify-center shrink-0">
            <Clock size={16} className="text-warning" />
          </div>
          <div>
            <p className="text-lg font-black text-warning leading-none">{expiringSoon}</p>
            <p className="text-[10px] font-bold text-textSecondary uppercase tracking-wide mt-0.5">Expiring Soon</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-danger/15 flex items-center justify-center shrink-0">
            <Flame size={16} className="text-danger" />
          </div>
          <div>
            <p className="text-lg font-black text-danger leading-none">{spoilageRisk}</p>
            <p className="text-[10px] font-bold text-textSecondary uppercase tracking-wide mt-0.5">Spoilage Risk</p>
          </div>
        </div>
      </div>

      {/* ── Advanced Filter Toolbar ── */}
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" size={18} />
          <Input
            type="text"
            placeholder="Search by fish species, batch number, cold room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 text-sm bg-card"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black text-textSecondary uppercase tracking-widest">Filters:</span>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-card text-xs font-bold text-textPrimary focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="reserved">Reserved</option>
            <option value="expired">Expired</option>
            <option value="inspection_needed">Inspection Needed</option>
            <option value="spoilage_risk">Spoilage Risk</option>
          </select>

          {/* Temperature Filter */}
          <select
            value={tempFilter}
            onChange={(e) => setTempFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-card text-xs font-bold text-textPrimary focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">All Temperatures</option>
            <option value="healthy">🟢 Healthy</option>
            <option value="warning">🟡 Warning</option>
            <option value="critical">🔴 Critical</option>
          </select>

          {/* Expiry Filter */}
          <select
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-card text-xs font-bold text-textPrimary focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">All Expiry</option>
            <option value="healthy">Shelf-Life OK</option>
            <option value="expiring">Expiring Soon</option>
            <option value="expired">Expired</option>
          </select>

          {/* Clear Filters */}
          {(statusFilter !== "all" || tempFilter !== "all" || expiryFilter !== "all" || search) && (
            <button
              onClick={() => { setStatusFilter("all"); setTempFilter("all"); setExpiryFilter("all"); setSearch(""); }}
              className="h-9 px-3 rounded-lg border border-danger/30 bg-danger/10 text-danger text-xs font-bold hover:bg-danger/20 transition-colors"
            >
              Clear All
            </button>
          )}

          <span className="ml-auto text-xs font-bold text-textSecondary">
            {filteredInventory.length} of {inventory.length} batches
          </span>
        </div>
      </div>

      {/* ── Data Section ── */}
      {loading ? (
        <Card className="py-24 text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div>
            <p className="font-bold text-textPrimary">Syncing Warehouse Telemetry</p>
            <p className="text-xs text-textSecondary mt-1">Connecting to cold room sensors...</p>
          </div>
        </Card>
      ) : filteredInventory.length === 0 ? (
        <Card className="py-24 text-center flex flex-col items-center border-dashed">
          <div className="w-16 h-16 rounded-full bg-border/30 flex items-center justify-center mb-4 text-textSecondary">
            <Search size={24} />
          </div>
          <h3 className="text-lg font-extrabold text-textPrimary">No stock matches your filters</h3>
          <p className="text-sm font-semibold text-textSecondary mt-1">Try adjusting the search or filters above.</p>
        </Card>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <Card className="p-0 overflow-hidden hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-tableHeader border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary">Batch / Product</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary">Location</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary">Stock Level</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary text-center">Telemetry</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary">Expiry</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredInventory.map((item) => {
                  const tempState   = TEMP_LOGIC.getTempState(item.current_temperature);
                  const daysLeft    = EXPIRY_LOGIC.getDaysLeft(item.expiry_date);
                  const expiryState = EXPIRY_LOGIC.getState(daysLeft);
                  const isUrgent    = tempState !== "optimal" || expiryState === "expired" || expiryState === "critical";

                  return (
                    <tr
                      key={item.id}
                      onClick={() => openDrawer(item)}
                      className={`group transition-all duration-200 cursor-pointer
                        hover:bg-hover hover:shadow-[inset_0_0_0_1px_rgba(99,102,241,0.08)]
                        ${isUrgent ? "bg-danger/[0.02]" : ""}`}
                    >
                      {/* Fish & Batch */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-bg flex items-center justify-center shrink-0 border border-border shadow-sm text-2xl group-hover:scale-110 group-hover:shadow-md transition-all duration-200">
                            🐟
                          </div>
                          <div>
                            <p className="font-bold text-textPrimary text-[15px] leading-snug">{item.fish_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-black text-textSecondary uppercase tracking-widest bg-border/50 px-1.5 py-0.5 rounded font-mono">
                                {item.batch_number}
                              </span>
                              <span className="text-[10px] font-bold text-primary">GRADE A+</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2">
                          <MapPin size={14} className="text-textSecondary mt-0.5 shrink-0" />
                          <div>
                            <p className="font-bold text-textPrimary text-sm">{item.storage_location || "Unassigned"}</p>
                            <p className="text-[11px] text-textSecondary font-bold uppercase tracking-wide mt-0.5">
                              {item.rack_number ? `Rack ${item.rack_number}` : "—"} · {item.bin_number ? `Bin ${item.bin_number}` : "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Stock Bar */}
                      <td className="px-6 py-4">
                        <StockBar
                          remaining={item.remaining_packages}
                          initial={item.initial_packages}
                          weightKg={item.remaining_weight_kg}
                        />
                      </td>

                      {/* Telemetry */}
                      <td className="px-6 py-4 text-center">
                        <TempBadge temp={item.current_temperature} />
                      </td>

                      {/* Expiry */}
                      <td className="px-6 py-4">
                        <ExpiryBadge expiryDate={item.expiry_date} />
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-block border px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${STATUS_CLS[item.status] || STATUS_CLS.in_stock}`}>
                          {item.status_display || item.status?.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          {isEditable && (
                            <button
                              onClick={(e) => openTelemetryModal(e, item)}
                              title="Update Telemetry"
                              className="h-8 w-8 rounded-lg flex items-center justify-center border border-border text-textSecondary hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                            >
                              <Activity size={14} />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); openDrawer(item); }}
                            title="View Details"
                            className="h-8 w-8 rounded-lg flex items-center justify-center border border-border text-textSecondary hover:bg-hover transition-all"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* ── Mobile Cards ── */}
          <div className="md:hidden space-y-3">
            {filteredInventory.map((item) => {
              const stockPct    = item.initial_packages ? Math.min(100, Math.round((item.remaining_packages / item.initial_packages) * 100)) : 0;
              const stockColor  = stockPct < 10 ? "bg-danger" : stockPct < 30 ? "bg-warning" : "bg-success";
              const tempState   = TEMP_LOGIC.getTempState(item.current_temperature);
              const daysLeft    = EXPIRY_LOGIC.getDaysLeft(item.expiry_date);
              const expiryState = EXPIRY_LOGIC.getState(daysLeft);

              return (
                <Card key={item.id} className="p-4 cursor-pointer active:scale-[0.99] transition-all" onClick={() => openDrawer(item)}>
                  {/* Header Row */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-bg flex items-center justify-center shrink-0 border border-border text-2xl">🐟</div>
                      <div>
                        <p className="font-bold text-textPrimary text-base leading-tight">{item.fish_name}</p>
                        <p className="text-[10px] font-black text-textSecondary uppercase tracking-widest font-mono mt-0.5">{item.batch_number}</p>
                      </div>
                    </div>
                    <span className={`inline-block border px-2 py-0.5 rounded text-[10px] font-black uppercase ${STATUS_CLS[item.status] || STATUS_CLS.in_stock}`}>
                      {item.status_display || item.status?.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-3 p-3 bg-bg rounded-xl border border-border">
                    <div>
                      <p className="text-[9px] font-bold text-textSecondary uppercase mb-0.5">Location</p>
                      <p className="text-xs font-bold text-textPrimary flex items-center gap-1">
                        <MapPin size={11} className="text-textSecondary" />
                        {item.storage_location || "Unassigned"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-textSecondary uppercase mb-0.5">Temperature</p>
                      <p className={`text-xs font-black flex items-center gap-1 ${TEMP_LOGIC.getColor(tempState)}`}>
                        <ThermometerSnowflake size={11} />
                        {item.current_temperature?.toFixed(1)}°C · {TEMP_LOGIC.getLabel(tempState)}
                      </p>
                    </div>
                  </div>

                  {/* Stock Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-textSecondary">Stock Level ({stockPct}%)</span>
                      <span className="text-textPrimary">{item.remaining_packages} / {item.initial_packages} pkg</span>
                    </div>
                    <div className="h-2 w-full bg-border/60 rounded-full overflow-hidden">
                      <div className={`h-full ${stockColor} rounded-full`} style={{ width: `${stockPct}%` }} />
                    </div>
                    <p className="text-[10px] font-bold text-textSecondary mt-1">{item.remaining_weight_kg} KG remaining</p>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-center pt-3 border-t border-border">
                    <ExpiryBadge expiryDate={item.expiry_date} />
                    {isEditable && (
                      <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-1.5" onClick={(e) => openTelemetryModal(e, item)}>
                        <Activity size={12} /> Update
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════
          INVENTORY DETAILS DRAWER
      ════════════════════════════════════════════ */}
      <AnimatePresence>
        {drawerOpen && selectedItem && (() => {
          const selTemp   = TEMP_LOGIC.getTempState(selectedItem.current_temperature);
          const selDays   = EXPIRY_LOGIC.getDaysLeft(selectedItem.expiry_date);
          const selExpiry = EXPIRY_LOGIC.getState(selDays);
          const soldPkgs  = (selectedItem.initial_packages || 0) - (selectedItem.remaining_packages || 0);
          const stockPct  = selectedItem.initial_packages
            ? Math.round((selectedItem.remaining_packages / selectedItem.initial_packages) * 100) : 0;

          return (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setDrawerOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              />
              <motion.div
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 220 }}
                className="fixed right-0 top-0 bottom-0 w-full sm:w-[460px] bg-card border-l border-border shadow-2xl z-50 flex flex-col"
              >
                {/* Drawer Header */}
                <div className="p-5 border-b border-border bg-surface flex items-center gap-4 shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-bg border border-border shadow flex items-center justify-center text-2xl shrink-0">🐟</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black text-textPrimary truncate">{selectedItem.fish_name}</h3>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest font-mono">{selectedItem.batch_number}</p>
                  </div>
                  <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-border text-textSecondary transition-colors shrink-0">
                    <X size={18} />
                  </button>
                </div>

                {/* Alerts Banner */}
                {(selTemp !== "optimal" || selExpiry === "expired" || selExpiry === "critical") && (
                  <div className="px-5 py-3 bg-danger/10 border-b border-danger/20 flex items-center gap-2">
                    <ShieldAlert size={16} className="text-danger shrink-0" />
                    <p className="text-xs font-bold text-danger">
                      {selTemp !== "optimal" && selExpiry === "expired"
                        ? "Temperature breach & product expired — immediate action needed"
                        : selTemp !== "optimal"
                        ? "Temperature outside safe range — check cold chain"
                        : "Product has expired — assess for disposal"}
                    </p>
                  </div>
                )}

                {/* Drawer Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                  {/* Section 1: Batch Details */}
                  <section>
                    <h4 className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Package size={12} /> Batch Details
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Supplier", value: "Primary Vendor" },
                        { label: "Quality Grade", value: "Grade A+", cls: "text-success" },
                        { label: "Purchase Date", value: selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleDateString() : "N/A" },
                        { label: "Batch ID", value: selectedItem.batch_number, mono: true },
                      ].map(({ label, value, cls, mono }) => (
                        <div key={label} className="bg-bg rounded-xl border border-border p-3">
                          <p className="text-[9px] font-bold text-textSecondary uppercase tracking-wide mb-1">{label}</p>
                          <p className={`text-sm font-black text-textPrimary ${cls || ""} ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Section 2: Stock Overview */}
                  <section>
                    <h4 className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-3 flex items-center gap-2">
                      <BarChart3 size={12} /> Stock Overview
                    </h4>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: "Initial",    value: selectedItem.initial_packages,   unit: "pkg" },
                        { label: "Remaining",  value: selectedItem.remaining_packages,  unit: "pkg" },
                        { label: "Sold",       value: soldPkgs,                         unit: "pkg" },
                      ].map(({ label, value, unit }) => (
                        <div key={label} className="bg-bg rounded-xl border border-border p-3 text-center">
                          <p className="text-[9px] font-bold text-textSecondary uppercase tracking-wide mb-1">{label}</p>
                          <p className="text-xl font-black text-textPrimary">{value}</p>
                          <p className="text-[9px] text-textSecondary font-semibold">{unit}</p>
                        </div>
                      ))}
                    </div>
                    {/* Utilization Bar */}
                    <div className="bg-bg rounded-xl border border-border p-3">
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-textSecondary">Utilization</span>
                        <span className="text-textPrimary">{stockPct}% remaining · {selectedItem.remaining_weight_kg} KG</span>
                      </div>
                      <div className="h-2.5 w-full bg-border/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${stockPct < 10 ? "bg-danger" : stockPct < 30 ? "bg-warning" : "bg-success"}`}
                          style={{ width: `${stockPct}%` }}
                        />
                      </div>
                    </div>
                  </section>

                  {/* Section 3: Storage */}
                  <section>
                    <h4 className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Warehouse size={12} /> Storage & Telemetry
                    </h4>
                    <div className="bg-bg rounded-xl border border-border p-4 mb-2">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin size={14} className="text-textSecondary" />
                        <p className="text-sm font-black text-textPrimary">{selectedItem.storage_location || "Not Assigned"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[9px] font-bold text-textSecondary uppercase mb-0.5">Rack</p>
                          <p className="font-bold text-textPrimary">{selectedItem.rack_number || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-textSecondary uppercase mb-0.5">Bin</p>
                          <p className="font-bold text-textPrimary">{selectedItem.bin_number || "—"}</p>
                        </div>
                      </div>
                    </div>
                    {/* Temp snapshot */}
                    <div className={`rounded-xl border p-4 flex items-center justify-between ${TEMP_LOGIC.getBg(selTemp)} border-border`}>
                      <div>
                        <p className="text-[9px] font-bold text-textSecondary uppercase tracking-wide mb-1">Live Temperature</p>
                        <p className={`text-2xl font-black ${TEMP_LOGIC.getColor(selTemp)}`}>
                          {selectedItem.current_temperature?.toFixed(1)}°C
                        </p>
                        <p className={`text-[10px] font-black uppercase mt-1 ${TEMP_LOGIC.getColor(selTemp)}`}>
                          {TEMP_LOGIC.getLabel(selTemp)}
                        </p>
                      </div>
                      <ThermometerSnowflake size={36} className={`${TEMP_LOGIC.getColor(selTemp)} opacity-30`} />
                    </div>
                  </section>

                  {/* Section 4: Expiry & Risk */}
                  <section>
                    <h4 className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Zap size={12} /> Expiry & Risk Assessment
                    </h4>
                    <div className={`rounded-xl border p-4 ${EXPIRY_LOGIC.getBg(selExpiry)} border-border`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-bold text-textSecondary uppercase mb-1">Expiry Date</p>
                          <p className="text-sm font-black text-textPrimary">{selectedItem.expiry_date || "Not Set"}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-black ${EXPIRY_LOGIC.getColor(selExpiry)}`}>
                            {selDays !== null ? (selDays < 0 ? `${Math.abs(selDays)}d overdue` : `${selDays}d left`) : "—"}
                          </p>
                          <p className={`text-[10px] font-black uppercase ${EXPIRY_LOGIC.getColor(selExpiry)}`}>
                            {EXPIRY_LOGIC.getLabel(selDays, selExpiry)}
                          </p>
                        </div>
                      </div>
                      {/* Cold-chain health */}
                      <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${selTemp === "optimal" ? "bg-success shadow-[0_0_6px_rgba(34,197,94,0.5)]" : "bg-danger shadow-[0_0_6px_rgba(239,68,68,0.5)]"}`} />
                          <span className="font-bold text-textPrimary">Cold-chain {selTemp === "optimal" ? "healthy" : "at risk"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${selectedItem.status !== "expired" ? "bg-success shadow-[0_0_6px_rgba(34,197,94,0.5)]" : "bg-danger shadow-[0_0_6px_rgba(239,68,68,0.5)]"}`} />
                          <span className="font-bold text-textPrimary">{selectedItem.status !== "expired" ? "Quality OK" : "Expired"}</span>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Drawer Footer */}
                <div className="p-5 border-t border-border bg-surface shrink-0 flex gap-3">
                  <Button className="flex-1" variant="outline" onClick={() => setDrawerOpen(false)}>Close</Button>
                  {isEditable && (
                    <Button className="flex-1 gap-2" onClick={(e) => { setDrawerOpen(false); openTelemetryModal(e, selectedItem); }}>
                      <Activity size={14} /> Update Telemetry
                    </Button>
                  )}
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════
          COLD STORAGE CONTROL PANEL (TELEMETRY MODAL)
      ════════════════════════════════════════════ */}
      <Dialog open={telemetryModalOpen} onOpenChange={setTelemetryModalOpen}>
        <DialogContent className="max-w-4xl p-0 bg-modal border-border shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[95vh]">
          {selectedItem && (() => {
            const modalTempState = TEMP_LOGIC.getTempState(currentTemperature);
            const isExpired      = selectedItem.status === "expired";
            const selDays2       = EXPIRY_LOGIC.getDaysLeft(selectedItem.expiry_date);
            const selExpiry2     = EXPIRY_LOGIC.getState(selDays2);

            return (
              <>
                {/* Left Panel — Location Control */}
                <div className="w-full md:w-5/12 bg-surface border-b md:border-b-0 md:border-r border-border flex flex-col p-6 md:p-8 overflow-y-auto">
                  {/* ID Header */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 text-primary mb-3">
                      <Warehouse size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Storage Control Panel</span>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-14 h-14 rounded-2xl bg-bg border border-border flex items-center justify-center text-3xl shrink-0 shadow">🐟</div>
                      <div>
                        <h3 className="text-2xl font-black text-textPrimary leading-tight">{selectedItem.fish_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-textSecondary uppercase tracking-widest bg-border/50 px-1.5 py-0.5 rounded font-mono">
                            {selectedItem.batch_number}
                          </span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${STATUS_CLS[selectedItem.status] || STATUS_CLS.in_stock}`}>
                            {selectedItem.status_display || selectedItem.status?.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Health Badge */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold
                      ${modalTempState === "optimal" && !isExpired
                        ? "bg-success/10 border-success/20 text-success"
                        : "bg-danger/10 border-danger/20 text-danger"}`}>
                      {modalTempState === "optimal" && !isExpired ? <CheckCircle size={14} /> : <ShieldAlert size={14} />}
                      {modalTempState === "optimal" && !isExpired ? "Healthy Storage" : "Storage At Risk"}
                    </div>
                  </div>

                  {/* Location Fields */}
                  <div className="space-y-4 flex-1">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-textSecondary uppercase tracking-widest">Cold Room / Location</label>
                      <Input
                        disabled={!isEditable}
                        className="h-12 bg-bg text-sm font-bold"
                        value={storageLocation}
                        onChange={(e) => setStorageLocation(e.target.value)}
                        placeholder="e.g. Cold Room A"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-textSecondary uppercase tracking-widest">Rack Number</label>
                        <Input disabled={!isEditable} className="h-12 bg-bg font-bold text-center" value={rackNumber} onChange={(e) => setRackNumber(e.target.value)} placeholder="R-2" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-textSecondary uppercase tracking-widest">Bin Number</label>
                        <Input disabled={!isEditable} className="h-12 bg-bg font-bold text-center" value={binNumber} onChange={(e) => setBinNumber(e.target.value)} placeholder="B-12" />
                      </div>
                    </div>
                  </div>

                  {/* Status Matrix */}
                  <div className="mt-6 pt-5 border-t border-border space-y-2">
                    <p className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-3">System Status</p>
                    {[
                      { label: "Stock level",    ok: (selectedItem.remaining_packages || 0) > 0 },
                      { label: "Quality grade",  ok: selectedItem.status !== "expired" && selectedItem.status !== "spoilage_risk" },
                      { label: "Shelf life",     ok: selExpiry2 === "healthy" || selExpiry2 === "unknown" },
                    ].map(({ label, ok }) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${ok ? "bg-success shadow-[0_0_6px_rgba(34,197,94,0.4)]" : "bg-danger shadow-[0_0_6px_rgba(239,68,68,0.4)]"}`} />
                        <span className="text-xs font-bold text-textPrimary">{label} — <span className={ok ? "text-success" : "text-danger"}>{ok ? "OK" : "Issue"}</span></span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Panel — Temperature Monitor */}
                <div className="w-full md:w-7/12 bg-card flex flex-col p-6 md:p-8 relative overflow-y-auto">
                  {/* Close button */}
                  <button
                    onClick={() => setTelemetryModalOpen(false)}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-border text-textSecondary transition-colors z-10"
                  >
                    <X size={18} />
                  </button>

                  {/* Monitor title */}
                  <div className="flex items-center gap-2 mb-8">
                    <Activity size={16} className="text-primary" />
                    <h2 className="text-[10px] font-black text-textSecondary uppercase tracking-widest">Live Telemetry Monitor</h2>
                    <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-success">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      LIVE
                    </span>
                  </div>

                  {/* Temperature Dial */}
                  <div className="flex flex-col items-center flex-1 justify-center py-4">
                    <div className="relative mb-6">
                      {/* Ambient glow */}
                      <div className={`absolute inset-0 rounded-full blur-3xl opacity-25 scale-75 ${TEMP_LOGIC.getGlowClass(modalTempState)}`} />
                      {/* Outer ring */}
                      <div className={`relative w-52 h-52 rounded-full border-8 ${TEMP_LOGIC.getBorderColor(modalTempState)} bg-bg shadow-2xl flex flex-col items-center justify-center z-10`}>
                        {/* Editable temperature input */}
                        <input
                          type="number"
                          step="0.1"
                          disabled={!isEditable}
                          value={currentTemperature}
                          onChange={(e) => setCurrentTemperature(parseFloat(e.target.value) || 0)}
                          className={`w-36 text-5xl font-black text-center bg-transparent border-none outline-none appearance-none
                            ${TEMP_LOGIC.getColor(modalTempState)}
                            ${!isEditable ? "cursor-default" : "cursor-text"}
                          `}
                          style={{ MozAppearance: "textfield" }}
                        />
                        <span className="text-sm font-black text-textSecondary uppercase tracking-widest">°C</span>
                        {!isEditable && (
                          <span className="text-[9px] text-textSecondary font-bold mt-1">READ ONLY</span>
                        )}
                      </div>
                    </div>

                    {/* State badge */}
                    <div className={`px-6 py-2 rounded-full border text-sm font-black uppercase tracking-widest mb-6
                      ${modalTempState === "optimal" ? "bg-success/10 text-success border-success/30"
                      : modalTempState === "warning"  ? "bg-warning/10 text-warning border-warning/30"
                      : "bg-danger/10 text-danger border-danger/30"}`}
                    >
                      {TEMP_LOGIC.getLabel(modalTempState)}
                    </div>

                    {/* Alert Cards */}
                    <div className="w-full max-w-sm space-y-3">
                      {currentTemperature > 2 && (
                        <div className="flex items-start gap-3 bg-danger/10 border border-danger/30 rounded-xl p-4">
                          <ShieldAlert className="text-danger shrink-0 mt-0.5" size={18} />
                          <div>
                            <p className="font-bold text-danger text-sm">⚠ Risk of Spoilage</p>
                            <p className="text-xs text-danger/80 mt-1">Temperature exceeds safe cooling range. Immediate inspection required.</p>
                          </div>
                        </div>
                      )}
                      {isExpired && (
                        <div className="flex items-start gap-3 bg-danger/10 border border-danger/30 rounded-xl p-4">
                          <Calendar className="text-danger shrink-0 mt-0.5" size={18} />
                          <div>
                            <p className="font-bold text-danger text-sm">⚠ Product Expired</p>
                            <p className="text-xs text-danger/80 mt-1">This batch has exceeded its shelf life. Do not dispatch.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reference guide + Submit */}
                  <div className="border-t border-border pt-5 flex items-center justify-between gap-4">
                    <div className="space-y-1 text-[10px] font-bold text-textSecondary">
                      <p className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success inline-block" />Optimal: -2°C to 2°C</p>
                      <p className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning inline-block" />Warning: 3°C to 6°C</p>
                      <p className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger inline-block" />Critical: &gt; 7°C</p>
                    </div>
                    {isEditable ? (
                      <Button onClick={handleSubmit} loading={isSubmitting} className="px-8 shrink-0">
                        Save Telemetry
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => setTelemetryModalOpen(false)}>Close</Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
