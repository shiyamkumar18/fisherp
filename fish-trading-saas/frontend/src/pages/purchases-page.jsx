import React, { useEffect, useState } from "react";
import { 
  ShoppingBag, Plus, Search, Calendar, User, MapPin, 
  Package, Weight, DollarSign, AlertCircle, Info, Sparkles, Trash2, ShieldCheck
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fetchPurchaseBatches, createPurchaseBatch, updatePurchaseBatch, deletePurchaseBatch } from "@/services/purchaseService";
import { fetchSuppliers } from "@/services/supplierService";
import { fetchFishTypes } from "@/services/productService";
import { useToast } from "@/components/shared/toast-provider";

const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

export default function PurchasesPage() {
  const [batches, setBatches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [fishTypes, setFishTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const { push: toast } = useToast();

  // Form fields
  const [supplierId, setSupplierId] = useState("");
  const [fishId, setFishId] = useState("");
  const [purchaseType, setPurchaseType] = useState("outright");
  const [fishermanName, setFishermanName] = useState("");
  const [placeOfBuying, setPlaceOfBuying] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [packages, setPackages] = useState(0);
  const [packageWeight, setPackageWeight] = useState(0);
  const [pricePerKg, setPricePerKg] = useState(0);
  
  // Expenses
  const [labourCost, setLabourCost] = useState(0);
  const [iceCost, setIceCost] = useState(0);
  const [transportCost, setTransportCost] = useState(0);
  const [commissionCost, setCommissionCost] = useState(0);
  const [otherCost, setOtherCost] = useState(0);
  
  const [amountPaid, setAmountPaid] = useState(0);
  const [qualityGrade, setQualityGrade] = useState("A");
  const [vehicleNo, setVehicleNo] = useState("");
  const [driverName, setDriverName] = useState("");
  const [notes, setNotes] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [bData, sData, fData] = await Promise.all([
        fetchPurchaseBatches(),
        fetchSuppliers(),
        fetchFishTypes()
      ]);
      setBatches(bData);
      setSuppliers(sData);
      setFishTypes(fData);
    } catch (e) {
      toast({ message: "Failed to load purchases workflow assets.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time calculations
  const totalWeight = packages * packageWeight;
  const fishCost = totalWeight * pricePerKg;
  const totalExpense = 
    Number(labourCost) + Number(iceCost) + 
    Number(transportCost) + Number(commissionCost) + 
    Number(otherCost);
  const totalCost = fishCost + totalExpense;
  const actualCostPerKg = totalWeight > 0 ? (totalCost / totalWeight).toFixed(2) : "0.00";
  const costPerPackage = packages > 0 ? (totalCost / packages).toFixed(2) : "0.00";
  const pendingAmount = totalCost - amountPaid;

  const handleOpenAdd = () => {
    if (suppliers.length === 0) {
      toast({ message: "Please register a supplier first under the Suppliers tab.", variant: "error" });
      return;
    }
    if (fishTypes.length === 0) {
      toast({ message: "Please configure product kinds under the Products tab.", variant: "error" });
      return;
    }
    setSupplierId(suppliers[0]?.id || "");
    setFishId(fishTypes[0]?.id || "");
    setPurchaseType("outright");
    setFishermanName("");
    setPlaceOfBuying("");
    setDate(new Date().toISOString().split("T")[0]);
    setPackages(0);
    setPackageWeight(0);
    setPricePerKg(0);
    setLabourCost(0);
    setIceCost(0);
    setTransportCost(0);
    setCommissionCost(0);
    setOtherCost(0);
    setAmountPaid(0);
    setQualityGrade("A");
    setVehicleNo("");
    setDriverName("");
    setNotes("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierId || !fishId || packages <= 0 || packageWeight <= 0 || pricePerKg <= 0) {
      toast({ message: "Please fill in all required batch details.", variant: "error" });
      return;
    }

    const payload = {
      supplier: Number(supplierId),
      fish: Number(fishId),
      purchase_type: purchaseType,
      fisherman_name: fishermanName,
      place_of_buying: placeOfBuying,
      date,
      number_of_packages: Number(packages),
      package_weight: Number(packageWeight),
      price_per_kg: Number(pricePerKg),
      labour_cost: Number(labourCost),
      ice_cost: Number(iceCost),
      transport_cost: Number(transportCost),
      commission_cost: Number(commissionCost),
      other_cost: Number(otherCost),
      amount_paid: Number(amountPaid),
      quality_grade: qualityGrade,
      transport_vehicle_number: vehicleNo,
      transport_driver_name: driverName,
      notes
    };

    try {
      await createPurchaseBatch(payload);
      toast({ message: "Purchase batch created and added to inventory!" });
      setModalOpen(false);
      loadData();
    } catch (e) {
      toast({ message: "Failed to save purchase batch.", variant: "error" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this purchase batch?")) return;
    try {
      await deletePurchaseBatch(id);
      toast({ message: "Batch record removed." });
      loadData();
    } catch (e) {
      toast({ message: "Failed to delete batch record.", variant: "error" });
    }
  };

  const filteredBatches = batches.filter(b => 
    b.batch_number?.toLowerCase().includes(search.toLowerCase()) ||
    b.fisherman_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.place_of_buying?.toLowerCase().includes(search.toLowerCase()) ||
    b.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.fish_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Purchase Batches</h2>
          <p className="text-xs text-textSecondary">Log inbound shipments, calculate package expenses, and update stock.</p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center gap-2">
          <Plus size={16} />
          Log Purchase Batch
        </Button>
      </div>

      {/* Overview stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Inbound Batches</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary">{batches.length}</span>
            <ShoppingBag className="h-5 w-5 text-primary opacity-65" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">In Stock (Packages)</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary">
              {batches.reduce((sum, b) => sum + (b.remaining_packages || 0), 0)}
            </span>
            <Package className="h-5 w-5 text-cyan-500 opacity-65" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Total Tonnage</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary">
              {((batches.reduce((sum, b) => sum + (Number(b.total_weight) || 0), 0)) / 1000).toFixed(1)} MT
            </span>
            <Weight className="h-5 w-5 text-emerald-500 opacity-65" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Pending Payouts</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary text-amber-500">
              {formatINR(batches.reduce((sum, b) => sum + (Number(b.pending_amount) || 0), 0))}
            </span>
          </div>
        </Card>
      </div>

      {/* Main Table */}
      <Card hoverEffect={false}>
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-surface/50 px-3 py-1.5 max-w-md">
          <Search size={16} className="text-textSecondary" />
          <input
            type="text"
            placeholder="Search batches by number, fish, fisherman, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-textPrimary outline-none"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-textSecondary">Loading purchase registers...</div>
        ) : filteredBatches.length === 0 ? (
          <div className="py-12 text-center text-textSecondary">
            <AlertCircle className="mx-auto h-8 w-8 mb-2 text-textSecondary/40" />
            No purchase records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border text-xs font-bold uppercase tracking-wider text-textSecondary/70">
                  <th className="pb-3 pr-4">Batch Info</th>
                  <th className="pb-3 pr-4">Vendor & Buying Place</th>
                  <th className="pb-3 pr-4">Weight & Vol</th>
                  <th className="pb-3 pr-4 text-right">Actual Cost/Kg</th>
                  <th className="pb-3 pr-4 text-right">Total Expense</th>
                  <th className="pb-3 pr-4 text-right">Pending Pay</th>
                  <th className="pb-3 text-center">Grade</th>
                  <th className="pb-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-semibold text-textPrimary">
                {filteredBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-border/10 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div>
                        <p className="font-bold text-textPrimary">{b.batch_number}</p>
                        <p className="text-xs text-primary">{b.fish_name}</p>
                        <div className="flex items-center gap-1 text-[10px] text-textSecondary mt-0.5">
                          <Calendar size={10} />
                          <span>{b.date}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <div>
                        <p className="text-xs font-bold text-textPrimary">{b.supplier_name}</p>
                        {b.fisherman_name && (
                          <p className="text-[10px] text-textSecondary flex items-center gap-0.5 mt-0.5">
                            <User size={10} /> {b.fisherman_name}
                          </p>
                        )}
                        {b.place_of_buying && (
                          <p className="text-[10px] text-textSecondary flex items-center gap-0.5">
                            <MapPin size={10} /> {b.place_of_buying}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-xs">
                      <div>
                        <p className="font-bold">{b.remaining_packages} / {b.number_of_packages} pkg</p>
                        <p className="text-textSecondary text-[10px]">{b.total_weight} kg ({b.package_weight}kg/pkg)</p>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <div>
                        <p className="font-bold text-textPrimary">{formatINR(b.actual_cost_per_kg || b.price_per_kg)}/kg</p>
                        <p className="text-[10px] text-textSecondary">Base: {formatINR(b.price_per_kg)}</p>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <div>
                        <p className="font-bold text-textPrimary">{formatINR(Number(b.total_expense) || 0)}</p>
                        <p className="text-[10px] text-textSecondary">Exp: {formatINR(Math.max(0, Number(b.total_expense || 0) - Number(b.fish_cost || 0)))}</p>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <span className={Number(b.pending_amount) > 0 ? "text-amber-500" : "text-success"}>
                        {formatINR(b.pending_amount || 0)}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <span className="inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                        {b.quality_grade}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="rounded-lg p-1.5 text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                        title="Delete Batch"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Inbound Booking Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Log Purchase Batch</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Supplier *</label>
                <select 
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary"
                >
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Fish Species / Product *</label>
                <select 
                  value={fishId}
                  onChange={(e) => setFishId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary"
                >
                  {fishTypes.map(f => <option key={f.id} value={f.id}>{f.name} ({f.unit_type_display || f.unit_type})</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Purchase Type</label>
                <select 
                  value={purchaseType}
                  onChange={(e) => setPurchaseType(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary"
                >
                  <option value="outright">Outright Purchase</option>
                  <option value="consignment">Consignment basis</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Log Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Fisherman Name</label>
                <Input value={fishermanName} onChange={(e) => setFishermanName(e.target.value)} placeholder="e.g. Ramesh" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Place of Buying (Dock/Market)</label>
                <Input value={placeOfBuying} onChange={(e) => setPlaceOfBuying(e.target.value)} placeholder="e.g. Mangalore Jetty" />
              </div>
            </div>

            {/* Calculations Row */}
            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/10 rounded-2xl p-4 mt-2">
              <div className="flex items-center gap-1 text-primary text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles size={13} />
                <span>Quantity & Cost Pricing</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-textSecondary uppercase">No. of Packages *</label>
                  <Input type="number" value={packages} onChange={(e) => setPackages(Math.max(0, parseInt(e.target.value) || 0))} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-textSecondary uppercase">Kg per Package *</label>
                  <Input type="number" step="0.01" value={packageWeight} onChange={(e) => setPackageWeight(Math.max(0, parseFloat(e.target.value) || 0))} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-textSecondary uppercase">Price/Kg (INR) *</label>
                  <Input type="number" step="0.01" value={pricePerKg} onChange={(e) => setPricePerKg(Math.max(0, parseFloat(e.target.value) || 0))} required />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-primary/10 text-xs font-bold text-textSecondary">
                <div>Weight: <span className="text-textPrimary">{totalWeight} kg</span></div>
                <div>Fish Cost: <span className="text-textPrimary">{formatINR(fishCost)}</span></div>
              </div>
            </div>

            {/* Expenses Row */}
            <div className="border border-border rounded-2xl p-4">
              <p className="text-xs font-bold text-textPrimary mb-3">Overhead Expenses (INR)</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary">Labour</label>
                  <Input type="number" value={labourCost} onChange={(e) => setLabourCost(Math.max(0, parseFloat(e.target.value) || 0))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary">Ice Cost</label>
                  <Input type="number" value={iceCost} onChange={(e) => setIceCost(Math.max(0, parseFloat(e.target.value) || 0))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary">Transport</label>
                  <Input type="number" value={transportCost} onChange={(e) => setTransportCost(Math.max(0, parseFloat(e.target.value) || 0))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary">Commission</label>
                  <Input type="number" value={commissionCost} onChange={(e) => setCommissionCost(Math.max(0, parseFloat(e.target.value) || 0))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary">Others</label>
                  <Input type="number" value={otherCost} onChange={(e) => setOtherCost(Math.max(0, parseFloat(e.target.value) || 0))} />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-border/60 text-xs font-bold text-textSecondary">
                <div>Expense Sum: <span className="text-textPrimary">{formatINR(totalExpense)}</span></div>
                <div>Actual Cost/Kg: <span className="text-primary">{formatINR(actualCostPerKg)}</span></div>
                <div>Cost/Package: <span className="text-primary">{formatINR(costPerPackage)}</span></div>
              </div>
            </div>

            {/* Payout & Logistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 rounded-2xl p-4">
                <p className="text-xs font-bold text-success mb-3">Billing & Payment</p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-textSecondary">Amount Paid *</label>
                    <Input type="number" value={amountPaid} onChange={(e) => setAmountPaid(Math.max(0, parseFloat(e.target.value) || 0))} />
                  </div>
                  <div className="flex justify-between text-xs font-bold text-textSecondary pt-1">
                    <span>Remaining Balance:</span>
                    <span className={pendingAmount > 0 ? "text-amber-500 font-extrabold" : "text-success font-extrabold"}>{formatINR(pendingAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="border border-border rounded-2xl p-4">
                <p className="text-xs font-bold text-textPrimary mb-3 flex items-center gap-1">
                  <ShieldCheck size={14} className="text-primary" /> Logistical Info & Quality
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-bold text-textSecondary">Quality Grade</label>
                    <select
                      value={qualityGrade}
                      onChange={(e) => setQualityGrade(e.target.value)}
                      className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary"
                    >
                      <option value="A+">A+ Grade</option>
                      <option value="A">A Grade</option>
                      <option value="B">B Grade</option>
                      <option value="C">C Grade</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-textSecondary">Vehicle Number</label>
                    <Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="KA-19-F-1234" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-textSecondary">Driver Name</label>
                    <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Driver Name" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-textSecondary">Special Notes</label>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                rows="2" 
                placeholder="Log cold-chain integrity comments or expiry alerts here..."
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-textPrimary outline-none focus:border-primary"
              />
            </div>

            <DialogFooter className="border-t border-border pt-4">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit">Complete Log</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
