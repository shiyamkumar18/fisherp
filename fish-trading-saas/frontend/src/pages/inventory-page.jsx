import React, { useEffect, useState } from "react";
import { 
  Warehouse, Search, Edit2, Thermometer, ShieldAlert, 
  Layers, Package, AlertTriangle, Calendar, MapPin, ClipboardCheck
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fetchInventory, updateInventoryItem } from "@/services/inventoryService";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/components/shared/toast-provider";

const STATUS_CLS = {
  in_stock: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50 dark:border-green-900/50",
  low_stock: "bg-amber-100 text-warning dark:bg-amber-950/40 dark:text-warning border border-warning/30/50 dark:border-amber-900/50",
  out_of_stock: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50 dark:border-red-900/50 border-red-200/50",
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const { push: toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { canEditForm, canViewFinancial, canDelete } = usePermission();
  const isEditable = canEditForm("inventory");
  const [isDeleting, setIsDeleting] = useState(false);

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

  const openEditModal = (item) => {
    setSelectedItem(item);
    setStorageLocation(item.storage_location || "");
    setBinNumber(item.bin_number || "");
    setRackNumber(item.rack_number || "");
    setCurrentTemperature(item.current_temperature || 0);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    const payload = {
      storage_location: storageLocation,
      bin_number: binNumber,
      rack_number: rackNumber,
      current_temperature: Number(currentTemperature),
    };

    try {
      await updateInventoryItem(selectedItem.id, payload);
      toast({ message: "Cold-storage telemetry updated successfully!" });
      setModalOpen(false);
      loadInventory();
    } catch (err) {
      toast({ message: err?.message || "Failed to update storage telemetry.", variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.fish_name?.toLowerCase().includes(search.toLowerCase()) ||
    item.batch_number?.toLowerCase().includes(search.toLowerCase()) ||
    item.storage_location?.toLowerCase().includes(search.toLowerCase())
  );

  // Compute stats
  const totalPackages = inventory.reduce((sum, item) => sum + (item.remaining_packages || 0), 0);
  const totalWeight = inventory.reduce((sum, item) => sum + (Number(item.remaining_weight_kg) || 0), 0);
  
  // Critical temp is defined as warmer than -5°C (seafood must be deeply frozen)
  const tempAlerts = inventory.filter(item => item.remaining_packages > 0 && item.current_temperature > -10).length;
  const expiryAlerts = inventory.filter(item => item.remaining_packages > 0 && item.expiry_alert).length;

  const getTempColorClass = (temp) => {
    if (temp <= -18) return "text-green-500 font-extrabold";
    if (temp <= -10) return "text-primary font-bold";
    if (temp <= -5) return "text-warning font-bold animate-pulse";
    return "text-danger font-extrabold animate-pulse";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Inventory Tracking</h2>
          <p className="text-xs text-textSecondary">Audit sub-zero cold room storage, bin locations, and expiry levels.</p>
        </div>
      </div>

      {/* KPI summaries */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Stock Packages</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary">{totalPackages} pkg</span>
            <Package className="h-5 w-5 text-primary opacity-65" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Stock Weight (Tons)</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary">{(totalWeight / 1000).toFixed(2)} MT</span>
            <Layers className="h-5 w-5 text-cyan-500 opacity-65" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Cold Chain Warnings</p>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-extrabold ${tempAlerts > 0 ? "text-danger" : "text-success"}`}>
              {tempAlerts}
            </span>
            <Thermometer className={`h-5 w-5 ${tempAlerts > 0 ? "text-danger animate-bounce" : "text-success"} opacity-65`} />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Expiry Alerts</p>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-extrabold ${expiryAlerts > 0 ? "text-warning" : "text-success"}`}>
              {expiryAlerts}
            </span>
            <Calendar className="h-5 w-5 text-warning opacity-65" />
          </div>
        </Card>
      </div>

      {/* Search and grid */}
      <Card hoverEffect={false}>
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-surface/50 px-3 py-1.5 max-w-md">
          <Search size={16} className="text-textSecondary" />
          <input
            type="text"
            placeholder="Search stock by fish species, batch number, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-textPrimary outline-none font-semibold"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-textSecondary">Loading cold room stock list...</div>
        ) : filteredInventory.length === 0 ? (
          <div className="py-12 text-center text-textSecondary">
            <AlertTriangle className="mx-auto h-8 w-8 mb-2 text-textSecondary/40" />
            No inventory holdings match the search filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border text-xs font-bold uppercase tracking-wider text-textSecondary/70">
                  <th className="pb-3 pr-4">Fish & Batch No.</th>
                  <th className="pb-3 pr-4">Cold-Chain Storage Location</th>
                  <th className="pb-3 pr-4">Stock Levels</th>
                  <th className="pb-3 pr-4 text-center">Freezer Temp</th>
                  <th className="pb-3 pr-4 text-center font-bold">Expiry Date</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-center">Telemetry Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-semibold text-textPrimary">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-border/10 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div>
                        <p className="font-bold text-textPrimary">{item.fish_name}</p>
                        <p className="text-xs text-primary font-bold">{item.batch_number}</p>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-start gap-1 text-xs text-textSecondary">
                        <MapPin size={13} className="mt-0.5 shrink-0 text-textSecondary/80" />
                        <div>
                          <p className="text-textPrimary">{item.storage_location || "Not assigned"}</p>
                          {(item.bin_number || item.rack_number) && (
                            <p className="text-[10px] text-textSecondary font-bold">
                              {item.bin_number && `Bin: ${item.bin_number}`} {item.rack_number && `· Rack: ${item.rack_number}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-xs">
                      <div>
                        <p className="font-bold text-textPrimary">{item.remaining_packages} / {item.initial_packages} packages</p>
                        <p className="text-textSecondary text-[10px]">{item.remaining_weight_kg} kg left</p>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-center text-xs">
                      <div className="inline-flex flex-col items-center">
                        <span className={getTempColorClass(item.current_temperature)}>
                          {item.current_temperature?.toFixed(1)}°C
                        </span>
                        {item.temperature_last_checked && (
                          <span className="text-[8px] text-textSecondary font-bold uppercase mt-0.5">
                            Checked {new Date(item.temperature_last_checked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-center text-xs">
                      <span className={item.expiry_alert ? "text-danger font-extrabold flex items-center gap-1 justify-center" : "text-textSecondary"}>
                        {item.expiry_alert && <ShieldAlert size={12} />}
                        {item.expiry_date || "—"}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${STATUS_CLS[item.status] || STATUS_CLS.in_stock}`}>
                        {item.status_display || item.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <button
                        onClick={() => openEditModal(item)}
                        className="rounded-lg p-1.5 text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        title="Update Log"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Storage Log Modal */}
      
      {/* Edit Storage Log Modal - Enterprise UI */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b border-border bg-surface/50">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
              <Thermometer size={20} className="text-primary" />
              Update Storage Telemetry
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 bg-background space-y-6">
            
            {selectedItem && (
              <div className="mb-2 bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extrabold text-textSecondary uppercase tracking-wider">Target Batch</p>
                  <p className="font-black text-textPrimary text-lg">{selectedItem.fish_name} <span className="text-primary">({selectedItem.batch_number})</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-extrabold text-textSecondary uppercase tracking-wider">Current Stock</p>
                  <p className="font-bold text-textPrimary">{selectedItem.remaining_packages} pkg / {selectedItem.remaining_weight_kg} kg</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Section 1: Location & Bins */}
              <Card className="p-5 shadow-sm border-border/60">
                <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 mb-4">
                  <MapPin size={16} className="text-primary" /> Physical Storage Location
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-textSecondary uppercase tracking-wider">Storage Location / Cold Room</label>
                    <Input disabled={!isEditable} className="h-11 bg-surface" value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} placeholder="e.g. Cold Room A" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-textSecondary uppercase tracking-wider">Bin Number</label>
                      <Input disabled={!isEditable} className="h-11 bg-surface" value={binNumber} onChange={(e) => setBinNumber(e.target.value)} placeholder="e.g. Bin-04" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-textSecondary uppercase tracking-wider">Rack Number</label>
                      <Input disabled={!isEditable} className="h-11 bg-surface" value={rackNumber} onChange={(e) => setRackNumber(e.target.value)} placeholder="e.g. Rack-B2" />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Section 2: Telemetry & Quality */}
              <Card className="p-5 shadow-sm border-border/60">
                <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 mb-4">
                  <Thermometer size={16} className="text-primary" /> Temperature Control
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-textSecondary uppercase tracking-wider flex items-center justify-between">
                      <span>Freezer Temperature (°C)</span>
                      {currentTemperature > -10 && (
                        <span className="text-[10px] text-danger font-extrabold flex items-center gap-0.5 animate-pulse">
                          <AlertTriangle size={11} /> Warm Temp Warning!
                        </span>
                      )}
                    </label>
                    <Input disabled={!isEditable} className={`h-11 text-lg font-black ${currentTemperature > -10 ? "bg-danger/5 border-danger/30 text-danger focus:border-danger" : "bg-surface text-primary"}`} type="number" step="0.1" value={currentTemperature} onChange={(e) => setCurrentTemperature(parseFloat(e.target.value) || 0)} placeholder="-18.0" />
                  </div>
                  
                  <div className="p-3 bg-surface border border-border/50 rounded-lg text-[11px] text-textSecondary">
                    <p className="font-bold text-textPrimary mb-1">Cold Chain Guidelines:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>Target: <span className="text-success font-bold">-18°C or lower</span></li>
                      <li>Warning: <span className="text-warning font-bold">-10°C to -17°C</span></li>
                      <li>Critical: <span className="text-danger font-bold">-9°C and above</span></li>
                    </ul>
                  </div>
                </div>
              </Card>
              
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-surface/50">
            <div className="flex w-full justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                {isEditable ? "Cancel" : "Close"}
              </Button>
              {isEditable && (
                <Button onClick={handleSubmit} loading={isSubmitting} className="px-8 shadow-sm">
                  Log Changes
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
