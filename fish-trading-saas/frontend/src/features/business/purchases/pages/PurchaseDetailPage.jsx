import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { 
  ArrowLeft, Save, ShieldCheck, Clock, FileText, 
  MapPin, CheckCircle, XCircle, RefreshCw, AlertCircle, Sparkles, Building
} from "lucide-react";
import { useToast } from "@/components/shared/toast-provider";
import { usePermission } from "@/hooks/usePermission";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import Input from "@/components/ui/input";
import { 
  getPurchaseBatch, 
  createPurchaseBatch, 
  updatePurchaseBatch, 
  changePurchaseState 
} from "@/services/purchaseService";
import { fetchSuppliers } from "@/services/supplierService";
import { fetchFishTypes } from "@/services/productService";
import ActivityTimeline from "@/components/shared/audit/ActivityTimeline";

const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

export default function PurchaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { push: toast } = useToast();
  const { canEditForm, canViewFinancial, isTenantAdmin } = usePermission();
  
  const isNew = !id || id === "new";
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [batchData, setBatchData] = useState(null);
  
  const [suppliers, setSuppliers] = useState([]);
  const [fishTypes, setFishTypes] = useState([]);

  // Form State
  const [formState, setFormState] = useState({
    supplier: "",
    fish: "",
    purchase_type: "outright",
    fisherman_name: "",
    place_of_buying: "",
    date: new Date().toISOString().split("T")[0],
    number_of_packages: 0,
    package_weight: 0,
    price_per_kg: 0,
    labour_cost: 0,
    ice_cost: 0,
    transport_cost: 0,
    commission_cost: 0,
    other_cost: 0,
    amount_paid: 0,
    quality_grade: "A",
    transport_vehicle_number: "",
    transport_driver_name: "",
    notes: ""
  });

  const loadDependencies = async () => {
    try {
      const [sData, fData] = await Promise.all([
        fetchSuppliers(),
        fetchFishTypes()
      ]);
      setSuppliers(sData);
      setFishTypes(fData);
      
      // If voice data exists, prefill
      if (isNew && location.state?.voiceData) {
        const v = location.state.voiceData;
        setFormState(prev => ({
          ...prev,
          supplier: v.supplier_id || (sData[0]?.id || ""),
          fish: v.fish_id || (fData[0]?.id || ""),
          number_of_packages: v.packages || 0,
          package_weight: v.package_weight || 0,
          price_per_kg: v.price_per_kg || 0,
          labour_cost: v.labour_cost || 0,
          ice_cost: v.ice_cost || 0,
          transport_cost: v.transport_cost || 0,
          commission_cost: v.commission_cost || 0,
          other_cost: v.other_cost || 0,
        }));
      } else if (isNew) {
        setFormState(prev => ({
          ...prev,
          supplier: sData[0]?.id || "",
          fish: fData[0]?.id || ""
        }));
      }
    } catch (e) {
      toast({ message: "Failed to load dependencies.", variant: "error" });
    }
  };

  const loadBatchData = async () => {
    if (isNew) return;
    try {
      setLoading(true);
      const data = await getPurchaseBatch(id);
      setBatchData(data);
      setFormState({
        supplier: data.supplier || "",
        fish: data.fish || "",
        purchase_type: data.purchase_type || "outright",
        fisherman_name: data.fisherman_name || "",
        place_of_buying: data.place_of_buying || "",
        date: data.date || new Date().toISOString().split("T")[0],
        number_of_packages: data.number_of_packages || 0,
        package_weight: data.package_weight || 0,
        price_per_kg: data.price_per_kg || 0,
        labour_cost: data.labour_cost || 0,
        ice_cost: data.ice_cost || 0,
        transport_cost: data.transport_cost || 0,
        commission_cost: data.commission_cost || 0,
        other_cost: data.other_cost || 0,
        amount_paid: data.amount_paid || 0,
        quality_grade: data.quality_grade || "A",
        transport_vehicle_number: data.transport_vehicle_number || "",
        transport_driver_name: data.transport_driver_name || "",
        notes: data.notes || ""
      });
    } catch (e) {
      toast({ message: "Failed to load purchase batch.", variant: "error" });
      navigate("/dashboard/purchases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDependencies();
    loadBatchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew]);

  const handleInputChange = (field, value) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  // Real-time calculations
  const calcTotalWeight = formState.number_of_packages * formState.package_weight;
  const calcFishCost = calcTotalWeight * formState.price_per_kg;
  const calcTotalExpense = 
    Number(formState.labour_cost) + Number(formState.ice_cost) + 
    Number(formState.transport_cost) + Number(formState.commission_cost) + 
    Number(formState.other_cost);
  const calcTotalCost = calcFishCost + calcTotalExpense;
  const calcActualCostPerKg = calcTotalWeight > 0 ? (calcTotalCost / calcTotalWeight).toFixed(2) : "0.00";
  const calcCostPerPackage = formState.number_of_packages > 0 ? (calcTotalCost / formState.number_of_packages).toFixed(2) : "0.00";
  const calcPendingAmount = calcTotalCost - formState.amount_paid;

  // Lock logic
  const isPosted = batchData?.workflow_state === "stock_posted" || batchData?.workflow_state === "financially_posted";
  const isApproved = batchData?.workflow_state === "approved";
  const isCancelled = batchData?.workflow_state === "cancelled";
  
  // Can we edit at all?
  const canEditOverall = canEditForm('purchases') && !isPosted && !isCancelled;
  const isAdminOverride = isTenantAdmin();

  // Certain fields lock earlier (e.g. qty locks if approved, unless admin)
  const canEditQuantity = (canEditOverall && !isApproved) || isAdminOverride;
  const canEditExpenses = canEditOverall || isAdminOverride;
  
  const handleSave = async () => {
    if (!formState.supplier || !formState.fish) {
      toast({ message: "Supplier and Fish are required.", variant: "error" });
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const payload = {
          ...formState,
          supplier: Number(formState.supplier),
          fish: Number(formState.fish),
          number_of_packages: Number(formState.number_of_packages),
          package_weight: Number(formState.package_weight),
          price_per_kg: Number(formState.price_per_kg),
          labour_cost: Number(formState.labour_cost),
          ice_cost: Number(formState.ice_cost),
          transport_cost: Number(formState.transport_cost),
          commission_cost: Number(formState.commission_cost),
          other_cost: Number(formState.other_cost),
          amount_paid: Number(formState.amount_paid),
        };
        const newBatch = await createPurchaseBatch(payload);
        toast({ message: "Purchase batch created!" });
        navigate(`/dashboard/purchases/${newBatch.id}`);
      } else {
        const payload = { ...formState };
        await updatePurchaseBatch(id, payload);
        toast({ message: "Purchase batch updated!" });
        loadBatchData();
      }
    } catch (e) {
      toast({ message: e?.message || "Failed to save batch.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleStateChange = async (newState) => {
    if (!window.confirm(`Transition batch to ${newState}?`)) return;
    try {
      await changePurchaseState(id, newState);
      toast({ message: `Batch state changed to ${newState}` });
      loadBatchData();
    } catch (e) {
      toast({ message: e?.message || "Failed to change state.", variant: "error" });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-textSecondary animate-pulse">Loading batch data...</div>;
  }

  const stateColors = {
    draft: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    submitted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    approved: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    stock_posted: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    financially_posted: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    cancelled: "bg-danger/10 text-danger border-danger/20",
    reopened: "bg-orange-500/10 text-orange-500 border-orange-500/20"
  };

  const currentStateClass = batchData?.workflow_state ? stateColors[batchData.workflow_state] : stateColors.draft;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="p-2" onClick={() => navigate("/dashboard/purchases")}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold tracking-tight">
                {isNew ? "New Purchase Batch" : batchData?.batch_number}
              </h2>
              {!isNew && (
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${currentStateClass}`}>
                  {batchData?.workflow_state_display || batchData?.workflow_state}
                </span>
              )}
            </div>
            <p className="text-xs text-textSecondary mt-1">
              {isNew ? "Draft a new purchase entry" : `Logged on ${batchData?.date} by ${batchData?.supplier_name}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {!isNew && !isCancelled && batchData?.workflow_state !== 'financially_posted' && (
            <Button variant="outline" className="border-danger/20 text-danger hover:bg-danger/10" onClick={() => handleStateChange('cancelled')}>
              <XCircle size={16} className="mr-2" /> Cancel Batch
            </Button>
          )}
          {!isNew && batchData?.workflow_state === 'draft' && (
            <Button variant="outline" className="border-blue-500/20 text-blue-500 hover:bg-blue-500/10" onClick={() => handleStateChange('submitted')}>
              Submit for Approval
            </Button>
          )}
          {!isNew && batchData?.workflow_state === 'submitted' && canEditForm('purchases') && (
            <Button variant="outline" className="border-indigo-500/20 text-indigo-500 hover:bg-indigo-500/10" onClick={() => handleStateChange('approved')}>
              Approve Batch
            </Button>
          )}
          {!isNew && batchData?.workflow_state === 'approved' && canEditForm('purchases') && (
            <Button variant="outline" className="border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10" onClick={() => handleStateChange('stock_posted')}>
              Post to Stock
            </Button>
          )}
          {!isNew && batchData?.workflow_state === 'stock_posted' && isTenantAdmin() && (
            <Button variant="outline" className="border-purple-500/20 text-purple-500 hover:bg-purple-500/10" onClick={() => handleStateChange('financially_posted')}>
              Post to Finance
            </Button>
          )}
          {!isNew && isPosted && isTenantAdmin() && (
            <Button variant="outline" className="border-orange-500/20 text-orange-500 hover:bg-orange-500/10" onClick={() => handleStateChange('reopened')}>
              <RefreshCw size={16} className="mr-2" /> Reopen Batch
            </Button>
          )}

          {(canEditOverall || isNew || isAdminOverride) && (
            <Button onClick={handleSave} loading={saving} className="flex items-center gap-2">
              <Save size={16} /> {isNew ? "Create Batch" : "Save Changes"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT SECTION (70%) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Supplier & Product Config */}
          <Card className="p-5">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-textPrimary">
              <Building size={16} className="text-primary" /> Vendor & Origin Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Supplier *</label>
                <select disabled={!canEditOverall && !isNew} 
                  value={formState.supplier}
                  onChange={(e) => handleInputChange("supplier", e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary disabled:opacity-50"
                >
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Fish Species / Product *</label>
                <select disabled={!canEditOverall && !isNew} 
                  value={formState.fish}
                  onChange={(e) => handleInputChange("fish", e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary disabled:opacity-50"
                >
                  {fishTypes.map(f => <option key={f.id} value={f.id}>{f.name} ({f.unit_type_display || f.unit_type})</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Batch Date</label>
                <Input disabled={!canEditOverall && !isNew} className="h-11" type="date" value={formState.date} onChange={(e) => handleInputChange("date", e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Fisherman Name</label>
                <Input disabled={!canEditOverall && !isNew} className="h-11" value={formState.fisherman_name} onChange={(e) => handleInputChange("fisherman_name", e.target.value)} placeholder="If unregistered..." />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-textSecondary">Place of Buying (Dock/Market)</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
                  <Input disabled={!canEditOverall && !isNew} className="h-11 pl-9" value={formState.place_of_buying} onChange={(e) => handleInputChange("place_of_buying", e.target.value)} placeholder="e.g. Mangalore Jetty" />
                </div>
              </div>
            </div>
          </Card>

          {/* Pricing & Quantities */}
          <Card className="p-0 overflow-hidden">
            <div className="bg-primary/5 dark:bg-primary/10 border-b border-primary/10 p-4">
              <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                <Sparkles size={16} /> Quantity & Base Cost Pricing
              </h3>
            </div>
            <div className="p-5">
              {!canEditQuantity && !isNew && (
                <div className="mb-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-lg p-3 text-xs flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <p>Quantities and Base Rates are locked because this batch has been approved or posted. Only Admins can override this via Reopen.</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">Packages *</label>
                  <Input disabled={!canEditQuantity && !isNew} className="h-12 text-lg font-bold" type="number" value={formState.number_of_packages} onChange={(e) => handleInputChange("number_of_packages", e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">Wt / Pkg (kg) *</label>
                  <Input disabled={!canEditQuantity && !isNew} className="h-12 text-lg font-bold" type="number" value={formState.package_weight} onChange={(e) => handleInputChange("package_weight", e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">Base Rate/Kg (INR) *</label>
                  <Input disabled={!canEditQuantity && !isNew} className="h-12 text-lg font-bold text-primary" type="number" value={formState.price_per_kg} onChange={(e) => handleInputChange("price_per_kg", e.target.value)} required />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-6 mt-5 pt-5 border-t border-border/50 text-sm">
                <div>Total Weight: <span className="font-extrabold text-textPrimary text-lg ml-2">{calcTotalWeight} kg</span></div>
                <div>Fish Cost: <span className="font-extrabold text-textPrimary text-lg ml-2">{formatINR(calcFishCost)}</span></div>
              </div>
            </div>
          </Card>

          {/* Expenses Breakdown */}
          {canViewFinancial() && (
            <Card className="p-5">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-textPrimary">
                <FileText size={16} className="text-textSecondary" /> Overhead Expenses (INR)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary">Labour</label>
                  <Input disabled={!canEditExpenses && !isNew} className="h-11" type="number" value={formState.labour_cost} onChange={(e) => handleInputChange("labour_cost", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary">Ice</label>
                  <Input disabled={!canEditExpenses && !isNew} className="h-11" type="number" value={formState.ice_cost} onChange={(e) => handleInputChange("ice_cost", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary">Transport</label>
                  <Input disabled={!canEditExpenses && !isNew} className="h-11" type="number" value={formState.transport_cost} onChange={(e) => handleInputChange("transport_cost", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary">Commission</label>
                  <Input disabled={!canEditExpenses && !isNew} className="h-11" type="number" value={formState.commission_cost} onChange={(e) => handleInputChange("commission_cost", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary">Other</label>
                  <Input disabled={!canEditExpenses && !isNew} className="h-11" type="number" value={formState.other_cost} onChange={(e) => handleInputChange("other_cost", e.target.value)} />
                </div>
              </div>
            </Card>
          )}

          {/* Logistics & Notes */}
          <Card className="p-5">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-textPrimary">
              <ShieldCheck size={16} className="text-success" /> Logistics & Quality Control
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-textSecondary">Quality Grade</label>
                <select disabled={!canEditOverall && !isNew}
                  value={formState.quality_grade}
                  onChange={(e) => handleInputChange("quality_grade", e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary"
                >
                  <option value="A+">A+ Grade</option>
                  <option value="A">A Grade</option>
                  <option value="B">B Grade</option>
                  <option value="C">C Grade</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-textSecondary">Vehicle Plate</label>
                <Input disabled={!canEditOverall && !isNew} className="h-11" value={formState.transport_vehicle_number} onChange={(e) => handleInputChange("transport_vehicle_number", e.target.value)} placeholder="TN-..." />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-textSecondary">Driver Name</label>
                <Input disabled={!canEditOverall && !isNew} className="h-11" value={formState.transport_driver_name} onChange={(e) => handleInputChange("transport_driver_name", e.target.value)} placeholder="Driver Name" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">Internal Notes & Audit Comments</label>
              <textarea disabled={!canEditOverall && !isNew} 
                value={formState.notes} 
                onChange={(e) => handleInputChange("notes", e.target.value)} 
                rows="3" 
                placeholder="Log cold-chain integrity comments, adjustments, or expiry alerts here..."
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
          </Card>

        </div>

        {/* RIGHT SECTION (30%) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Financial Summary */}
          {canViewFinancial() && (
            <Card className="p-0 overflow-hidden sticky top-6">
              <div className="bg-surface border-b border-border p-4">
                <h3 className="text-sm font-bold text-textPrimary">Financial Summary</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Fish Cost</span>
                  <span className="font-semibold">{formatINR(calcFishCost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Overhead Expenses</span>
                  <span className="font-semibold">{formatINR(calcTotalExpense)}</span>
                </div>
                <div className="pt-3 border-t border-border flex justify-between text-base">
                  <span className="font-bold">Total Cost</span>
                  <span className="font-extrabold">{formatINR(calcTotalCost)}</span>
                </div>

                <div className="bg-surface border border-border rounded-xl p-3 mt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-textSecondary">Actual Cost / Kg</span>
                    <span className="font-bold text-primary">{formatINR(calcActualCostPerKg)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-textSecondary">Landed Cost / Package</span>
                    <span className="font-bold text-primary">{formatINR(calcCostPerPackage)}</span>
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-border">
                  <div className="space-y-1 mb-3">
                    <label className="text-xs font-bold text-textSecondary">Advance Paid to Supplier (INR)</label>
                    <Input disabled={!canEditOverall && !isNew} className="h-11 font-bold text-emerald-500" type="number" value={formState.amount_paid} onChange={(e) => handleInputChange("amount_paid", e.target.value)} />
                  </div>
                  <div className="flex justify-between items-center bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-500">Pending Pay:</span>
                    <span className={`font-extrabold text-lg ${calcPendingAmount > 0 ? "text-amber-600 dark:text-amber-500" : "text-success"}`}>
                      {formatINR(calcPendingAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Audit History Timeline */}
          {!isNew && (
            <Card className="p-0 overflow-hidden">
              <div className="bg-surface border-b border-border p-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                  <Clock size={16} /> Enterprise Audit Trail
                </h3>
              </div>
              <div className="p-4 max-h-[400px] overflow-y-auto">
                <ActivityTimeline entityType="PurchaseBatch" entityId={id} />
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
