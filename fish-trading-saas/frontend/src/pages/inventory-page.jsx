import React, { useEffect, useState, useMemo } from "react";
import { 
  Warehouse, Search, Edit2, Thermometer, ShieldAlert, 
  Layers, Package, AlertTriangle, Calendar, MapPin, ClipboardCheck,
  TrendingUp, TrendingDown, Eye, Filter, ArrowRight, Activity, ThermometerSnowflake, X
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Badge from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fetchInventory, updateInventoryItem } from "@/services/inventoryService";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/components/shared/toast-provider";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_CLS = {
  in_stock: "bg-success/10 text-success border-success/20",
  low_stock: "bg-warning/10 text-warning border-warning/20",
  reserved: "bg-primary/10 text-primary border-primary/20",
  out_of_stock: "bg-danger/10 text-danger border-danger/20",
  expired: "bg-border text-textSecondary border-border/50",
  spoilage_risk: "bg-danger/20 text-danger border-danger/40 animate-pulse",
};

const TEMP_LOGIC = {
  getTempState: (temp) => {
    if (temp <= 2 && temp >= -2) return "optimal";
    if (temp >= 3 && temp <= 6) return "warning";
    return "critical";
  },
  getColor: (state) => {
    if (state === "optimal") return "text-success";
    if (state === "warning") return "text-warning";
    return "text-danger";
  },
  getBg: (state) => {
    if (state === "optimal") return "bg-success/10";
    if (state === "warning") return "bg-warning/10";
    return "bg-danger/10";
  },
  getLabel: (state) => {
    if (state === "optimal") return "Optimal Cooling";
    if (state === "warning") return "Warm Risk";
    return "Critical Risk";
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
    if (days < 0) return "expired";
    if (days <= 3) return "warning";
    return "healthy";
  },
  getColor: (state) => {
    if (state === "healthy") return "text-success";
    if (state === "warning") return "text-warning";
    if (state === "expired") return "text-danger";
    return "text-textSecondary";
  },
  getLabel: (days, state) => {
    if (state === "unknown") return "—";
    if (state === "expired") return `Expired ${Math.abs(days)} Days Ago`;
    if (days === 0) return "Expires Today";
    if (days === 1) return "Expires Tomorrow";
    return `${days} Days Left`;
  }
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tempFilter, setTempFilter] = useState("all");
  
  // UI States
  const [telemetryModalOpen, setTelemetryModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  const { push: toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { canEditForm } = usePermission();
  const isEditable = canEditForm("inventory");

  // Form states
  const [storageLocation, setStorageLocation] = useState("");
  const [binNumber, setBinNumber] = useState("");
  const [rackNumber, setRackNumber] = useState("");
  const [currentTemperature, setCurrentTemperature] = useState(0);

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

  useEffect(() => {
    loadInventory();
  }, []);

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
      bin_number: binNumber,
      rack_number: rackNumber,
      current_temperature: Number(currentTemperature),
    };

    try {
      await updateInventoryItem(selectedItem.id, payload);
      toast({ message: "Cold-storage telemetry updated successfully!" });
      setTelemetryModalOpen(false);
      loadInventory();
      if(selectedItem && drawerOpen) {
         setSelectedItem({...selectedItem, ...payload});
      }
    } catch (err) {
      toast({ message: err?.message || "Failed to update storage telemetry.", variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Logic
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      // Search
      const searchStr = search.toLowerCase();
      const matchesSearch = 
        (item.fish_name || "").toLowerCase().includes(searchStr) ||
        (item.batch_number || "").toLowerCase().includes(searchStr) ||
        (item.storage_location || "").toLowerCase().includes(searchStr);
      if(!matchesSearch) return false;

      // Status Filter
      if(statusFilter !== "all") {
        if(item.status !== statusFilter) return false;
      }

      // Temp Filter
      if(tempFilter !== "all") {
        const tempState = TEMP_LOGIC.getTempState(item.current_temperature);
        if(tempFilter === "critical" && tempState !== "critical") return false;
        if(tempFilter === "warning" && tempState !== "warning" && tempState !== "critical") return false;
      }

      return true;
    });
  }, [inventory, search, statusFilter, tempFilter]);

  // Compute stats
  const totalPackages = inventory.reduce((sum, item) => sum + (item.remaining_packages || 0), 0);
  const totalWeight = inventory.reduce((sum, item) => sum + (Number(item.remaining_weight_kg) || 0), 0);
  
  const tempAlerts = inventory.filter(item => item.remaining_packages > 0 && TEMP_LOGIC.getTempState(item.current_temperature) !== "optimal").length;
  const expiryAlerts = inventory.filter(item => {
      if(item.remaining_packages <= 0) return false;
      const days = EXPIRY_LOGIC.getDaysLeft(item.expiry_date);
      const state = EXPIRY_LOGIC.getState(days);
      return state === "warning" || state === "expired";
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-textPrimary">Inventory Intelligence</h2>
        <p className="text-sm text-textSecondary font-medium">Warehouse Control System & Cold-Chain Monitoring</p>
      </div>

      {/* KPI summaries */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-textSecondary">Stock Packages</p>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-textPrimary tracking-tight">{totalPackages}</span>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-success">
              <TrendingUp size={14} /> <span>+14 packages today</span>
            </div>
          </div>
        </Card>
        
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-textSecondary">Stock Weight (Tons)</p>
            <div className="p-2 rounded-lg bg-info/10 text-info">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-textPrimary tracking-tight">{(totalWeight / 1000).toFixed(2)} MT</span>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-danger">
              <TrendingDown size={14} /> <span className="text-textSecondary">↓ 2.4 MT sold today</span>
            </div>
          </div>
        </Card>
        
        <Card className={`flex flex-col justify-between border ${tempAlerts > 0 ? "border-warning/30 bg-warning/5" : "border-border"}`}>
          <div className="flex items-center justify-between mb-4">
            <p className={`text-xs font-bold uppercase tracking-wider ${tempAlerts > 0 ? "text-warning" : "text-textSecondary"}`}>Cold Chain Risk</p>
            <div className={`p-2 rounded-lg ${tempAlerts > 0 ? "bg-warning/20 text-warning" : "bg-success/10 text-success"}`}>
              <ThermometerSnowflake className={`h-5 w-5 ${tempAlerts > 0 ? "animate-pulse" : ""}`} />
            </div>
          </div>
          <div>
            <span className={`text-3xl font-black tracking-tight ${tempAlerts > 0 ? "text-warning" : "text-success"}`}>
              {tempAlerts}
            </span>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-textSecondary">
              <span>{tempAlerts > 0 ? "Requires immediate inspection" : "All freezers optimal"}</span>
            </div>
          </div>
        </Card>
        
        <Card className={`flex flex-col justify-between border ${expiryAlerts > 0 ? "border-danger/30 bg-danger/5" : "border-border"}`}>
          <div className="flex items-center justify-between mb-4">
            <p className={`text-xs font-bold uppercase tracking-wider ${expiryAlerts > 0 ? "text-danger" : "text-textSecondary"}`}>Expiry Alerts</p>
            <div className={`p-2 rounded-lg ${expiryAlerts > 0 ? "bg-danger/20 text-danger" : "bg-success/10 text-success"}`}>
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <div>
            <span className={`text-3xl font-black tracking-tight ${expiryAlerts > 0 ? "text-danger" : "text-success"}`}>
              {expiryAlerts}
            </span>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-textSecondary">
              <span>{expiryAlerts > 0 ? "Critical shelf-life warning" : "No batches expiring soon"}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" size={18} />
          <Input
            type="text"
            placeholder="Search batch, fish, cold room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 text-sm bg-card"
          />
        </div>
        <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 px-3 rounded-lg border border-border bg-card text-sm font-semibold text-textPrimary focus:outline-none focus:border-primary shrink-0 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="expired">Expired</option>
          </select>
          <select 
            value={tempFilter} 
            onChange={(e) => setTempFilter(e.target.value)}
            className="h-11 px-3 rounded-lg border border-border bg-card text-sm font-semibold text-textPrimary focus:outline-none focus:border-primary shrink-0 cursor-pointer"
          >
            <option value="all">All Temperatures</option>
            <option value="warning">Warning Risks</option>
            <option value="critical">Critical Risks</option>
          </select>
        </div>
      </div>

      {/* Data Section */}
      {loading ? (
        <Card className="py-20 text-center flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
          <p className="font-bold text-textSecondary">Syncing warehouse telemetry...</p>
        </Card>
      ) : filteredInventory.length === 0 ? (
        <Card className="py-20 text-center flex flex-col items-center border-dashed">
          <div className="w-16 h-16 rounded-full bg-border/50 flex items-center justify-center mb-4 text-textSecondary">
            <Search size={24} />
          </div>
          <h3 className="text-lg font-extrabold text-textPrimary">No stock matches filters</h3>
          <p className="text-sm font-semibold text-textSecondary mt-1">Try adjusting your search or filters.</p>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <Card className="p-0 overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-tableHeader border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-textSecondary">Batch / Product</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-textSecondary">Location</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-textSecondary">Stock Level</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-textSecondary text-center">Telemetry</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-textSecondary">Health</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-textSecondary text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredInventory.map((item) => {
                    // Logic
                    const stockPct = item.initial_packages ? Math.min(100, Math.round((item.remaining_packages / item.initial_packages) * 100)) : 0;
                    let stockColor = "bg-success";
                    if(stockPct < 30) stockColor = "bg-warning";
                    if(stockPct < 10) stockColor = "bg-danger";

                    const tempState = TEMP_LOGIC.getTempState(item.current_temperature);
                    const daysLeft = EXPIRY_LOGIC.getDaysLeft(item.expiry_date);
                    const expiryState = EXPIRY_LOGIC.getState(daysLeft);

                    return (
                      <tr 
                        key={item.id} 
                        onClick={() => openDrawer(item)}
                        className="group hover:bg-hover transition-colors cursor-pointer"
                      >
                        {/* Fish & Batch */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-bg flex items-center justify-center shrink-0 border border-border shadow-sm text-2xl group-hover:scale-105 transition-transform">
                              🐟
                            </div>
                            <div>
                              <p className="font-bold text-textPrimary text-base">{item.fish_name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-black text-textSecondary uppercase tracking-widest bg-border/50 px-1.5 py-0.5 rounded">{item.batch_number}</span>
                                <span className="text-[10px] font-bold text-primary">GRADE A+</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2">
                            <MapPin size={16} className="text-textSecondary mt-0.5" />
                            <div>
                              <p className="font-bold text-textPrimary text-sm">{item.storage_location || "Unassigned"}</p>
                              <p className="text-[11px] font-bold text-textSecondary uppercase mt-0.5">
                                {item.rack_number ? `Rack ${item.rack_number}` : "No Rack"} · {item.bin_number ? `Bin ${item.bin_number}` : "No Bin"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Stock Bar */}
                        <td className="px-6 py-4 w-48">
                          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                            <span className="text-textPrimary">{item.remaining_packages} / {item.initial_packages} pkg</span>
                            <span className="text-textSecondary">{stockPct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                            <div className={`h-full ${stockColor} transition-all duration-500`} style={{ width: `${stockPct}%` }} />
                          </div>
                          <p className="text-[10px] font-bold text-textSecondary uppercase mt-1.5">{item.remaining_weight_kg} KG Remaining</p>
                        </td>

                        {/* Telemetry Badge */}
                        <td className="px-6 py-4 text-center">
                          <div className={`inline-flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border ${tempState === 'optimal' ? 'bg-success/10 border-success/20' : tempState === 'warning' ? 'bg-warning/10 border-warning/20' : 'bg-danger/10 border-danger/20 animate-pulse'}`}>
                            <div className={`flex items-center gap-1.5 font-black text-sm ${TEMP_LOGIC.getColor(tempState)}`}>
                              <ThermometerSnowflake size={14} />
                              {item.current_temperature?.toFixed(1)}°C
                            </div>
                            <span className={`text-[9px] font-black uppercase mt-0.5 ${TEMP_LOGIC.getColor(tempState)} opacity-80`}>
                              {TEMP_LOGIC.getLabel(tempState)}
                            </span>
                          </div>
                        </td>

                        {/* Expiry & Status */}
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${expiryState === 'healthy' ? 'bg-success' : expiryState === 'warning' ? 'bg-warning' : 'bg-danger'}`} />
                              <span className={`text-xs font-bold ${EXPIRY_LOGIC.getColor(expiryState)}`}>
                                {EXPIRY_LOGIC.getLabel(daysLeft, expiryState)}
                              </span>
                            </div>
                            <span className={`inline-block border px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${STATUS_CLS[item.status] || STATUS_CLS.in_stock}`}>
                              {item.status_display || item.status}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isEditable && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0" 
                                onClick={(e) => openTelemetryModal(e, item)}
                                title="Update Telemetry"
                              >
                                <Activity size={14} className="text-primary" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-textSecondary"
                            >
                              <ArrowRight size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-4">
            {filteredInventory.map((item) => {
               const stockPct = item.initial_packages ? Math.min(100, Math.round((item.remaining_packages / item.initial_packages) * 100)) : 0;
               let stockColor = "bg-success";
               if(stockPct < 30) stockColor = "bg-warning";
               if(stockPct < 10) stockColor = "bg-danger";

               const tempState = TEMP_LOGIC.getTempState(item.current_temperature);
               const daysLeft = EXPIRY_LOGIC.getDaysLeft(item.expiry_date);
               const expiryState = EXPIRY_LOGIC.getState(daysLeft);

               return (
                 <Card key={item.id} className="p-4" onClick={() => openDrawer(item)}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-lg bg-bg flex items-center justify-center shrink-0 border border-border shadow-sm text-2xl">🐟</div>
                         <div>
                           <p className="font-bold text-textPrimary text-base leading-tight">{item.fish_name}</p>
                           <p className="text-[10px] font-black text-textSecondary uppercase tracking-widest mt-0.5">{item.batch_number}</p>
                         </div>
                      </div>
                      <span className={`inline-block border px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${STATUS_CLS[item.status] || STATUS_CLS.in_stock}`}>
                        {item.status_display || item.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-bg rounded-xl border border-border">
                       <div>
                         <p className="text-[10px] font-bold text-textSecondary uppercase mb-0.5">Location</p>
                         <p className="text-xs font-bold text-textPrimary flex items-center gap-1"><MapPin size={12}/> {item.storage_location || "Unassigned"}</p>
                       </div>
                       <div>
                         <p className="text-[10px] font-bold text-textSecondary uppercase mb-0.5">Temp</p>
                         <p className={`text-xs font-black flex items-center gap-1 ${TEMP_LOGIC.getColor(tempState)}`}>
                           <ThermometerSnowflake size={12}/> {item.current_temperature?.toFixed(1)}°C
                         </p>
                       </div>
                    </div>

                    <div className="space-y-1.5 mb-4">
                       <div className="flex justify-between text-xs font-bold">
                         <span className="text-textSecondary">Stock ({stockPct}%)</span>
                         <span className="text-textPrimary">{item.remaining_packages} / {item.initial_packages}</span>
                       </div>
                       <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                          <div className={`h-full ${stockColor}`} style={{ width: `${stockPct}%` }} />
                       </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-border">
                       <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${expiryState === 'healthy' ? 'bg-success' : expiryState === 'warning' ? 'bg-warning' : 'bg-danger'}`} />
                          <span className={`text-[11px] font-bold ${EXPIRY_LOGIC.getColor(expiryState)}`}>
                            {EXPIRY_LOGIC.getLabel(daysLeft, expiryState)}
                          </span>
                       </div>
                       {isEditable && (
                          <Button variant="outline" size="sm" className="h-8 text-xs font-bold" onClick={(e) => openTelemetryModal(e, item)}>
                             Update
                          </Button>
                       )}
                    </div>
                 </Card>
               );
            })}
          </div>
        </>
      )}

      {/* Side Drawer: Inventory Details */}
      <AnimatePresence>
        {drawerOpen && selectedItem && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[450px] bg-card border-l border-border shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-border bg-surface flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-lg font-black text-textPrimary">Batch Details</h3>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mt-0.5">{selectedItem.batch_number}</p>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-border text-textSecondary transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Section 1: Overview */}
                <div>
                   <h4 className="text-xs font-black text-textSecondary uppercase tracking-widest mb-3 flex items-center gap-2"><Package size={14}/> Product Identity</h4>
                   <div className="bg-bg rounded-xl border border-border p-4 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-surface border border-border shadow-sm flex items-center justify-center text-3xl">🐟</div>
                      <div>
                         <p className="text-lg font-black text-textPrimary">{selectedItem.fish_name}</p>
                         <p className="text-xs font-bold text-textSecondary">Supplier: Primary Vendor (Mocked)</p>
                         <p className="text-[10px] font-bold text-success uppercase tracking-widest mt-1">Quality Grade A+</p>
                      </div>
                   </div>
                </div>

                {/* Section 2: Stock Overview */}
                <div>
                   <h4 className="text-xs font-black text-textSecondary uppercase tracking-widest mb-3 flex items-center gap-2"><Layers size={14}/> Stock Overview</h4>
                   <div className="grid grid-cols-2 gap-3">
                     <div className="bg-bg rounded-xl border border-border p-3">
                       <p className="text-[10px] font-bold text-textSecondary uppercase mb-1">Initial Stock</p>
                       <p className="text-lg font-black text-textPrimary">{selectedItem.initial_packages} <span className="text-xs text-textSecondary font-semibold">pkg</span></p>
                     </div>
                     <div className="bg-bg rounded-xl border border-border p-3">
                       <p className="text-[10px] font-bold text-textSecondary uppercase mb-1">Remaining Stock</p>
                       <p className="text-lg font-black text-textPrimary">{selectedItem.remaining_packages} <span className="text-xs text-textSecondary font-semibold">pkg</span></p>
                     </div>
                     <div className="bg-bg rounded-xl border border-border p-3 col-span-2 flex justify-between items-center">
                       <div>
                         <p className="text-[10px] font-bold text-textSecondary uppercase mb-1">Total Weight</p>
                         <p className="text-lg font-black text-textPrimary">{selectedItem.remaining_weight_kg} <span className="text-xs text-textSecondary font-semibold">kg</span></p>
                       </div>
                       <div className="text-right">
                         <p className="text-[10px] font-bold text-textSecondary uppercase mb-1">Utilization</p>
                         <p className="text-lg font-black text-primary">{Math.round((selectedItem.remaining_packages/selectedItem.initial_packages)*100)}%</p>
                       </div>
                     </div>
                   </div>
                </div>

                {/* Section 3: Storage & Health */}
                <div>
                   <h4 className="text-xs font-black text-textSecondary uppercase tracking-widest mb-3 flex items-center gap-2"><MapPin size={14}/> Storage & Health</h4>
                   <div className="space-y-3">
                     <div className="bg-bg rounded-xl border border-border p-4 flex items-center justify-between">
                       <div>
                         <p className="text-[10px] font-bold text-textSecondary uppercase mb-1">Location Hierarchy</p>
                         <p className="text-sm font-black text-textPrimary">{selectedItem.storage_location || "Not assigned"}</p>
                         <p className="text-xs font-bold text-textSecondary mt-0.5">Rack {selectedItem.rack_number || "-"} · Bin {selectedItem.bin_number || "-"}</p>
                       </div>
                       <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                          <Warehouse size={18} />
                       </div>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-3">
                       <div className={`rounded-xl border p-3 ${TEMP_LOGIC.getBg(TEMP_LOGIC.getTempState(selectedItem.current_temperature))} border-border`}>
                         <p className="text-[10px] font-bold text-textSecondary uppercase mb-1">Temperature</p>
                         <p className={`text-lg font-black ${TEMP_LOGIC.getColor(TEMP_LOGIC.getTempState(selectedItem.current_temperature))}`}>{selectedItem.current_temperature?.toFixed(1)}°C</p>
                         <p className={`text-[9px] font-bold uppercase mt-1 ${TEMP_LOGIC.getColor(TEMP_LOGIC.getTempState(selectedItem.current_temperature))}`}>
                           {TEMP_LOGIC.getLabel(TEMP_LOGIC.getTempState(selectedItem.current_temperature))}
                         </p>
                       </div>
                       <div className={`rounded-xl border p-3 ${EXPIRY_LOGIC.getColor(EXPIRY_LOGIC.getState(EXPIRY_LOGIC.getDaysLeft(selectedItem.expiry_date))).replace('text-','bg-')}/10 border-border`}>
                         <p className="text-[10px] font-bold text-textSecondary uppercase mb-1">Expiry</p>
                         <p className="text-sm font-black text-textPrimary">{selectedItem.expiry_date || "N/A"}</p>
                         <p className={`text-[9px] font-bold uppercase mt-1 ${EXPIRY_LOGIC.getColor(EXPIRY_LOGIC.getState(EXPIRY_LOGIC.getDaysLeft(selectedItem.expiry_date)))}`}>
                           {EXPIRY_LOGIC.getLabel(EXPIRY_LOGIC.getDaysLeft(selectedItem.expiry_date), EXPIRY_LOGIC.getState(EXPIRY_LOGIC.getDaysLeft(selectedItem.expiry_date)))}
                         </p>
                       </div>
                     </div>
                   </div>
                </div>

              </div>
              
              {/* Drawer Footer */}
              <div className="p-6 border-t border-border bg-surface shrink-0 flex gap-3">
                <Button className="flex-1" variant="outline" onClick={() => setDrawerOpen(false)}>Close Panel</Button>
                {isEditable && (
                  <Button className="flex-1" onClick={(e) => { setDrawerOpen(false); openTelemetryModal(e, selectedItem); }}>Update Telemetry</Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Redesigned Telemetry Modal */}
      <Dialog open={telemetryModalOpen} onOpenChange={setTelemetryModalOpen}>
        <DialogContent className="max-w-4xl p-0 bg-modal border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
          {selectedItem && (
            <>
              {/* Left Panel: Location & Identification */}
              <div className="w-full md:w-5/12 bg-surface p-6 md:p-8 border-b md:border-b-0 md:border-r border-border flex flex-col">
                <div className="mb-8">
                   <div className="flex items-center gap-2 mb-2 text-primary">
                     <Warehouse size={18} />
                     <h2 className="font-extrabold uppercase tracking-widest text-xs">Storage Control</h2>
                   </div>
                   <h3 className="text-3xl font-black text-textPrimary leading-tight">{selectedItem.fish_name}</h3>
                   <Badge variant="outline" className="mt-2 text-[10px] font-black uppercase bg-primary/10 text-primary border-primary/20">
                     Batch #{selectedItem.batch_number}
                   </Badge>
                </div>
                
                <div className="space-y-5 flex-1">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-textSecondary uppercase tracking-widest">Cold Room Location</label>
                    <Input disabled={!isEditable} className="h-12 bg-bg text-base font-bold" value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} placeholder="Cold Room A" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-textSecondary uppercase tracking-widest">Rack</label>
                      <Input disabled={!isEditable} className="h-12 bg-bg font-bold text-center" value={rackNumber} onChange={(e) => setRackNumber(e.target.value)} placeholder="R-2" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-textSecondary uppercase tracking-widest">Bin</label>
                      <Input disabled={!isEditable} className="h-12 bg-bg font-bold text-center" value={binNumber} onChange={(e) => setBinNumber(e.target.value)} placeholder="B-12" />
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-border">
                     <p className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-3">Status Matrix</p>
                     <div className="flex items-center gap-2 mb-2">
                       <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                       <span className="text-xs font-bold text-textPrimary">Stock level healthy</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${selectedItem.status === 'expired' ? 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`} />
                       <span className="text-xs font-bold text-textPrimary">{selectedItem.status === 'expired' ? 'Product Expired' : 'Quality within limits'}</span>
                     </div>
                  </div>
                </div>
              </div>

              {/* Right Panel: Temperature Telemetry */}
              <div className="w-full md:w-7/12 bg-card p-6 md:p-8 flex flex-col relative">
                <button onClick={() => setTelemetryModalOpen(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-border text-textSecondary transition-colors">
                  <X size={18} />
                </button>
                
                <div className="mb-6">
                   <h2 className="font-extrabold uppercase tracking-widest text-xs text-textSecondary mb-1 flex items-center gap-2">
                     <Activity size={14} /> Telemetry Monitor
                   </h2>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center py-8">
                   <div className="relative mb-6">
                     <div className={`absolute inset-0 rounded-full blur-3xl opacity-20 ${currentTemperature > 2 ? (currentTemperature > 6 ? 'bg-danger' : 'bg-warning') : 'bg-success'}`} />
                     <div className={`w-48 h-48 rounded-full flex flex-col items-center justify-center border-8 relative z-10 bg-bg shadow-2xl ${currentTemperature > 2 ? (currentTemperature > 6 ? 'border-danger/30' : 'border-warning/30') : 'border-success/30'}`}>
                        <Input 
                          disabled={!isEditable} 
                          className="h-16 w-32 bg-transparent border-none text-5xl font-black text-center p-0 focus-visible:ring-0 text-textPrimary" 
                          type="number" 
                          step="0.1" 
                          value={currentTemperature} 
                          onChange={(e) => setCurrentTemperature(parseFloat(e.target.value) || 0)} 
                        />
                        <span className="text-sm font-black text-textSecondary uppercase tracking-widest mt-1">Celsius</span>
                     </div>
                   </div>

                   <Badge variant="outline" className={`px-4 py-1.5 text-sm font-black uppercase tracking-widest ${currentTemperature > 2 ? (currentTemperature > 6 ? 'bg-danger/10 text-danger border-danger/30' : 'bg-warning/10 text-warning border-warning/30') : 'bg-success/10 text-success border-success/30'}`}>
                     {currentTemperature > 2 ? (currentTemperature > 6 ? 'Critical Risk' : 'Warm Warning') : 'Optimal Cooling'}
                   </Badge>

                   {currentTemperature > 2 && (
                     <div className="mt-6 w-full max-w-sm bg-danger/10 border border-danger/30 rounded-xl p-4 flex items-start gap-3">
                       <ShieldAlert className="text-danger shrink-0 mt-0.5" size={20} />
                       <div>
                         <p className="font-bold text-danger">Risk of Spoilage</p>
                         <p className="text-xs font-semibold text-danger/80 mt-1">Temperature has exceeded safe limits. Immediate inspection of stock required to prevent inventory loss.</p>
                       </div>
                     </div>
                   )}
                </div>

                <div className="flex items-center justify-between mt-auto pt-6 border-t border-border">
                  <div className="text-[10px] font-bold text-textSecondary">
                    <p>Optimal: -2°C to 2°C</p>
                    <p>Warning: 3°C to 6°C</p>
                  </div>
                  {isEditable ? (
                    <Button onClick={handleSubmit} loading={isSubmitting} className="px-8 shadow-md hover:-translate-y-0.5 transition-all">
                      Save Telemetry Data
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => setTelemetryModalOpen(false)}>Close</Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
