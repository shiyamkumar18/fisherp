import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { 
  ArrowLeft, Save, Printer, Download, Truck, 
  User, Receipt, Tag, MapPin, CheckCircle, 
  Clock, AlertCircle, Sparkles, Building, 
  IndianRupee, CornerDownLeft, MessageCircle, FileText
} from "lucide-react";
import { useToast } from "@/components/shared/toast-provider";
import { usePermission } from "@/hooks/usePermission";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import Input from "@/components/ui/input";
import { apiClient } from "@/services/apiClient";
import { fetchCustomers } from "@/services/customerService";
import { fetchPurchaseBatches } from "@/services/purchaseService";
import clsx from "clsx";

const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

export default function SaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { push: toast } = useToast();
  
  const { canEditForm, canViewFinancial, isTenantAdmin, session, role } = usePermission();
  
  const isNew = !id || id === "new";
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saleData, setSaleData] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  
  const [buyers, setBuyers] = useState([]);
  const [batches, setBatches] = useState([]);

  // Form State
  const [formState, setFormState] = useState({
    buyer: "",
    batch: "",
    sale_type: "domestic",
    date: new Date().toISOString().split("T")[0],
    number_of_packages_sold: 0,
    selling_weight_per_package: 0, // Inferred from batch
    selling_price_per_kg: 0,
    discount_percent: 0,
    tax_percent: 5,
    amount_received: 0,
    delivery_address: "",
    notes: ""
  });

  const loadDependencies = async () => {
    try {
      const [bData, pData] = await Promise.all([
        fetchCustomers(),
        fetchPurchaseBatches()
      ]);
      setBuyers(bData);
      setBatches(pData);
      
      if (isNew) {
        setFormState(prev => ({
          ...prev,
          buyer: bData[0]?.id || "",
          batch: pData.find(b => b.remaining_packages > 0)?.id || "",
          delivery_address: bData[0]?.address || ""
        }));
      }
    } catch (e) {
      toast({ message: "Failed to load dependencies.", variant: "error" });
    }
  };

  const loadSaleData = async () => {
    if (isNew) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/sales/${id}/`);
      const data = res.data;
      setSaleData(data);
      setFormState({
        buyer: data.buyer || "",
        batch: data.batch || "",
        sale_type: data.sale_type || "domestic",
        date: data.date || new Date().toISOString().split("T")[0],
        number_of_packages_sold: data.number_of_packages_sold || 0,
        selling_weight_per_package: data.selling_weight_per_package || 0,
        selling_price_per_kg: data.selling_price_per_kg || 0,
        discount_percent: data.discount_percent || 0,
        tax_percent: data.tax_percent || 0,
        amount_received: data.amount_received || 0,
        delivery_address: data.delivery_address || "",
        notes: data.notes || ""
      });
    } catch (e) {
      toast({ message: "Failed to load sale invoice.", variant: "error" });
      navigate("/dashboard/sales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDependencies();
    loadSaleData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew]);

  const handleInputChange = (field, value) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleBuyerChange = (bId) => {
    const buyerObj = buyers.find(b => b.id === Number(bId));
    setFormState(prev => ({
      ...prev,
      buyer: bId,
      delivery_address: buyerObj?.address || prev.delivery_address
    }));
  };

  const handleBatchChange = (bId) => {
    const batchObj = batches.find(b => b.id === Number(bId));
    setFormState(prev => ({
      ...prev,
      batch: bId,
      selling_weight_per_package: batchObj?.package_weight || prev.selling_weight_per_package
    }));
  };

  // Dynamic calculations
  const selectedBatch = batches.find(b => b.id === Number(formState.batch));
  const maxPackages = selectedBatch?.remaining_packages || 0;
  // If editing an existing sale, the max is what they already took + what's remaining.
  const actualMaxPackages = isNew ? maxPackages : (maxPackages + (saleData?.number_of_packages_sold || 0));
  
  // Real-time invoice math
  const dynamicWeightPerPkg = isNew ? (selectedBatch?.package_weight || 0) : formState.selling_weight_per_package;
  const totalWeight = formState.number_of_packages_sold * dynamicWeightPerPkg;
  const subtotal = totalWeight * formState.selling_price_per_kg;
  const discountAmount = subtotal * (Number(formState.discount_percent) / 100);
  const taxAmount = (subtotal - discountAmount) * (Number(formState.tax_percent) / 100);
  const finalAmount = subtotal - discountAmount + taxAmount;
  const pendingAmount = finalAmount - formState.amount_received;

  const stockExceeded = formState.number_of_packages_sold > actualMaxPackages;

  // RBAC and Locking
  const isReadOnly = ["viewer", "store"].includes(role);
  const canProcessPayment = ["super_admin", "tenant_admin", "accountant", "finance_manager"].includes(role);
  const canApproveReturns = ["super_admin", "tenant_admin", "sales_manager", "branch_manager"].includes(role);
  
  const dKey = (saleData?.delivery_status || "pending").toLowerCase();
  const pKey = (saleData?.payment_status || "pending").toLowerCase();

  const isDelivered = dKey === "delivered";
  const isReturned = saleData?.is_returned;
  
  // Overall editing rules
  const canEditOverall = canEditForm('sales') && !isReturned;

  const handleSave = async () => {
    if (!formState.buyer || !formState.batch) {
      toast({ message: "Customer and Batch are required.", variant: "error" });
      return;
    }
    if (stockExceeded) {
      toast({ message: "Requested package amount exceeds active batch inventory.", variant: "error" });
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        buyer: Number(formState.buyer),
        batch: Number(formState.batch),
        sale_type: formState.sale_type,
        date: formState.date,
        number_of_packages_sold: Number(formState.number_of_packages_sold),
        selling_weight_per_package: dynamicWeightPerPkg,
        selling_price_per_kg: Number(formState.selling_price_per_kg),
        total_revenue: subtotal,
        discount_percent: Number(formState.discount_percent),
        discount_amount: discountAmount,
        tax_percent: Number(formState.tax_percent),
        tax_amount: taxAmount,
        final_amount: finalAmount,
        amount_received: Number(formState.amount_received),
        delivery_address: formState.delivery_address,
        notes: formState.notes
      };

      if (isNew) {
        const res = await apiClient.post('/sales/', payload);
        toast({ message: "Sales Invoice generated!" });
        navigate(`/dashboard/sales/${res.data.id}`);
      } else {
        await apiClient.patch(`/sales/${id}/`, payload);
        toast({ message: "Invoice updated successfully!" });
        loadSaleData();
      }
    } catch (e) {
      toast({ message: e?.response?.data?.error || e?.message || "Failed to save invoice.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAction = async (actionEndpoint, successMessage) => {
    if (isReadOnly) {
      toast({ message: "You don't have permission to perform this action.", variant: "error" });
      return;
    }
    setActionLoading(actionEndpoint);
    try {
      if (actionEndpoint === 'record_payment') {
        const amt = window.prompt("Enter payment amount:", pendingAmount);
        if (!amt) { setActionLoading(null); return; }
        await apiClient.post(`/sales/${id}/${actionEndpoint}/`, { amount: amt, payment_date: new Date().toISOString().split('T')[0] });
      } else if (actionEndpoint === 'process_return') {
        if (!window.confirm("Are you sure you want to process a return for this invoice? This will restore stock.")) { setActionLoading(null); return; }
        await apiClient.post(`/sales/${id}/${actionEndpoint}/`, { reason: "Customer initiated return" });
      } else {
        await apiClient.post(`/sales/${id}/${actionEndpoint}/`);
      }
      toast({ message: successMessage });
      loadSaleData();
    } catch (e) {
      toast({ message: e?.response?.data?.error || "Action failed.", variant: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "paid": case "delivered": return "bg-success/10 text-success border-success/20";
      case "pending": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "partial": case "partially_paid": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "cancelled": case "returned": return "bg-danger/10 text-danger border-danger/20";
      default: return "bg-surface text-textSecondary border-border";
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-textSecondary animate-pulse">Loading invoice details...</div>;
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="p-2" onClick={() => navigate("/dashboard/sales")}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
                <Receipt size={24} className="text-primary" />
                {isNew ? "New Sales Invoice" : saleData?.invoice_number}
              </h2>
              {!isNew && (
                <>
                  <span className={clsx("px-2.5 py-0.5 rounded-md text-xs font-bold capitalize flex items-center gap-1 border", getStatusColor(pKey))}>
                    {pKey === 'paid' && <CheckCircle size={14} />}
                    {pKey === 'pending' && <Clock size={14} />}
                    Payment: {saleData?.payment_status_display || saleData?.payment_status}
                  </span>
                  <span className={clsx("px-2.5 py-0.5 rounded-md text-xs font-bold border capitalize flex items-center gap-1", getStatusColor(dKey))}>
                    <Truck size={14} />
                    Delivery: {saleData?.delivery_status_display || saleData?.delivery_status}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-textSecondary mt-1">
              {isNew ? "Draft a new trade order" : `Invoiced on ${saleData?.date} to ${saleData?.buyer_name}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {!isNew && (
            <>
              <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 bg-surface hover:bg-surfaceHover">
                <Printer size={16} /> Print
              </Button>
              <Button variant="outline" size="sm" className="gap-2 bg-surface hover:bg-surfaceHover">
                <Download size={16} /> PDF
              </Button>
            </>
          )}

          {canEditOverall && (
            <Button onClick={handleSave} loading={saving} className="flex items-center gap-2">
              <Save size={16} /> {isNew ? "Generate Invoice" : "Save Changes"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT SECTION (70%) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Customer & Business Terms */}
          <Card className="p-5">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-textPrimary">
              <User size={16} className="text-primary" /> Customer & Delivery Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Customer/Buyer *</label>
                <select disabled={!canEditOverall && !isNew} 
                  value={formState.buyer}
                  onChange={(e) => handleBuyerChange(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary disabled:opacity-50"
                >
                  {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Sale Date</label>
                <Input disabled={!canEditOverall && !isNew} className="h-11" type="date" value={formState.date} onChange={(e) => handleInputChange("date", e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Sale Type</label>
                <select disabled={!canEditOverall && !isNew} 
                  value={formState.sale_type}
                  onChange={(e) => handleInputChange("sale_type", e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary disabled:opacity-50"
                >
                  <option value="domestic">Domestic Sale</option>
                  <option value="export">International Export</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Delivery Address</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
                  <Input disabled={!canEditOverall && !isNew} className="h-11 pl-9" value={formState.delivery_address} onChange={(e) => handleInputChange("delivery_address", e.target.value)} placeholder="Complete shipping address..." />
                </div>
              </div>
            </div>
          </Card>

          {/* Invoice Items & Pricing */}
          <Card className="p-0 overflow-hidden">
            <div className="bg-primary/5 dark:bg-primary/10 border-b border-primary/10 p-4">
              <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                <Sparkles size={16} /> Item Billing Details
              </h3>
            </div>
            <div className="p-5">
              <div className="mb-5 space-y-1">
                <label className="text-xs font-bold text-textSecondary">Select Source Batch *</label>
                <select disabled={(!canEditOverall && !isNew) || !isNew} 
                  value={formState.batch}
                  onChange={(e) => handleBatchChange(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary disabled:opacity-50"
                >
                  {isNew ? (
                    batches.filter(b => b.remaining_packages > 0).map(b => (
                      <option key={b.id} value={b.id}>
                        {b.batch_number} - {b.fish_name} ({b.remaining_packages} pkg remaining at {b.package_weight}kg/pkg)
                      </option>
                    ))
                  ) : (
                    <option value={saleData?.batch}>{saleData?.batch_number} - {saleData?.fish_name}</option>
                  )}
                </select>
                {isNew && selectedBatch && (
                  <p className="text-[10px] font-bold text-textSecondary flex justify-end mt-1">
                    Available Stock: <span className="text-textPrimary ml-1">{maxPackages} packages ({dynamicWeightPerPkg} kg each)</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">Packages Sold *</label>
                  <Input disabled={!canEditOverall && !isNew} className={`h-12 text-lg font-bold ${stockExceeded ? "border-danger focus:ring-danger/20" : ""}`} type="number" value={formState.number_of_packages_sold} onChange={(e) => handleInputChange("number_of_packages_sold", e.target.value)} required />
                  {stockExceeded && (
                    <p className="text-[10px] text-danger font-bold flex items-center gap-0.5 mt-0.5">
                      <AlertCircle size={10} /> Out of Stock (Max: {actualMaxPackages} pkg)
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">Selling Price / Kg (INR) *</label>
                  <Input disabled={!canEditOverall && !isNew} className="h-12 text-lg font-bold text-primary" type="number" step="0.01" value={formState.selling_price_per_kg} onChange={(e) => handleInputChange("selling_price_per_kg", e.target.value)} required />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-6 mt-5 pt-5 border-t border-border/50 text-sm">
                <div>Total Selling Weight: <span className="font-extrabold text-textPrimary text-lg ml-2">{totalWeight} kg</span></div>
                <div>Subtotal: <span className="font-extrabold text-textPrimary text-lg ml-2">{formatINR(subtotal)}</span></div>
              </div>
            </div>
          </Card>

          {/* Adjustments & Fees */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-textPrimary">
                <Tag size={16} className="text-textSecondary" /> Adjustments & Fees
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">Discount (%)</label>
                  <Input disabled={!canEditOverall && !isNew} className="h-11" type="number" min="0" max="100" value={formState.discount_percent} onChange={(e) => handleInputChange("discount_percent", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">Tax / GST (%)</label>
                  <Input disabled={!canEditOverall && !isNew} className="h-11" type="number" min="0" max="100" value={formState.tax_percent} onChange={(e) => handleInputChange("tax_percent", e.target.value)} />
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-textPrimary">
                <FileText size={16} className="text-textSecondary" /> Internal Notes
              </h3>
              <div className="space-y-1">
                <textarea disabled={!canEditOverall && !isNew} 
                  value={formState.notes} 
                  onChange={(e) => handleInputChange("notes", e.target.value)} 
                  rows="3" 
                  placeholder="Log special logistics remarks or customer delivery window notes..."
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none focus:border-primary disabled:opacity-50"
                />
              </div>
            </Card>
          </div>

        </div>

        {/* RIGHT SECTION (30%) */}
        <div className="lg:col-span-4 space-y-6">

          {/* QUICK ACTIONS PANEL */}
          {!isNew && !isReadOnly && (
            <Card className="p-5 bg-surface border border-border shadow-sm">
              <h3 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                {canProcessPayment && pKey !== "paid" && (
                  <Button 
                    onClick={() => handleQuickAction("record_payment", "Payment recorded successfully.")}
                    className="w-full bg-primary hover:bg-primaryHover text-white gap-2 h-11"
                    loading={actionLoading === "record_payment"}
                  >
                    <IndianRupee size={16} /> Pay
                  </Button>
                )}
                
                {dKey !== "delivered" && (
                  <Button 
                    variant="outline"
                    onClick={() => handleQuickAction("mark_delivered", "Invoice marked as delivered.")}
                    className="w-full gap-2 h-11 border-border/80 hover:bg-surfaceHover"
                    loading={actionLoading === "mark_delivered"}
                  >
                    <Truck size={16} /> Deliver
                  </Button>
                )}

                {canApproveReturns && !isReturned && (
                  <Button 
                    variant="outline"
                    onClick={() => handleQuickAction("process_return", "Return processed successfully.")}
                    className="w-full gap-2 h-11 text-danger border-danger/20 hover:bg-danger/10 hover:text-danger col-span-2"
                    loading={actionLoading === "process_return"}
                  >
                    <CornerDownLeft size={16} /> Process Return
                  </Button>
                )}
                
                <Button variant="outline" className="w-full gap-2 h-11 col-span-2">
                  <MessageCircle size={16} /> Send WhatsApp
                </Button>
              </div>
            </Card>
          )}
          
          {/* Financial Summary */}
          {canViewFinancial() && (
            <Card className="p-0 overflow-hidden sticky top-6">
              <div className="bg-surface border-b border-border p-4">
                <h3 className="text-sm font-bold text-textPrimary">Financial Summary</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Subtotal</span>
                  <span className="font-semibold">{formatINR(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-danger font-medium">
                    <span>Discount</span>
                    <span>-{formatINR(discountAmount)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-textSecondary">Tax</span>
                    <span className="font-semibold text-textPrimary">+{formatINR(taxAmount)}</span>
                  </div>
                )}
                
                <div className="pt-3 border-t border-border flex justify-between items-center text-base">
                  <span className="font-bold">Grand Total</span>
                  <span className="font-extrabold text-xl text-primary">{formatINR(finalAmount)}</span>
                </div>

                {/* Profit Margin if existing sale */}
                {!isNew && saleData?.profit && (
                  <div className="bg-success/5 border border-success/20 rounded-xl p-3 mt-4 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-textSecondary">Estimated Gross Profit</span>
                      <span className="font-bold text-success">{formatINR(saleData.profit)}</span>
                    </div>
                  </div>
                )}

                <div className="pt-4 mt-2 border-t border-border">
                  <div className="space-y-1 mb-3">
                    <label className="text-xs font-bold text-textSecondary">Amount Collected (INR)</label>
                    <Input disabled={!canEditOverall && !isNew} className="h-11 font-bold text-emerald-500" type="number" value={formState.amount_received} onChange={(e) => handleInputChange("amount_received", e.target.value)} />
                  </div>
                  <div className="flex justify-between items-center bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-500">Balance Due:</span>
                    <span className={`font-extrabold text-lg ${pendingAmount > 0 ? "text-amber-600 dark:text-amber-500" : "text-success"}`}>
                      {formatINR(pendingAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Activity Timeline */}
          {!isNew && (
            <Card className="p-0 overflow-hidden">
              <div className="bg-surface border-b border-border p-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                  <Clock size={16} /> Activity Timeline
                </h3>
              </div>
              <div className="p-4 max-h-[400px] overflow-y-auto">
                <div className="relative border-l-2 border-border ml-3 space-y-6 pb-2">
                  
                  {/* Invoice Created */}
                  <div className="relative pl-6">
                    <span className="absolute -left-[10px] top-1 h-5 w-5 rounded-full bg-primary ring-4 ring-background flex items-center justify-center">
                      <Receipt size={10} className="text-white" />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-textPrimary">Invoice Created</span>
                      <span className="text-[10px] text-textSecondary mt-0.5">
                        {new Date(saleData?.created_at || Date.now()).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Payment Received */}
                  {(saleData?.amount_received > 0) && (
                    <div className="relative pl-6">
                      <span className="absolute -left-[10px] top-1 h-5 w-5 rounded-full bg-success ring-4 ring-background flex items-center justify-center">
                        <IndianRupee size={10} className="text-white" />
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-textPrimary">Payment Collected</span>
                        <span className="text-[10px] text-textSecondary mt-0.5">
                          {formatINR(saleData.amount_received)} received
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Delivery Status */}
                  {isDelivered && (
                    <div className="relative pl-6">
                      <span className="absolute -left-[10px] top-1 h-5 w-5 rounded-full bg-blue-500 ring-4 ring-background flex items-center justify-center">
                        <Truck size={10} className="text-white" />
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-textPrimary">Marked as Delivered</span>
                        <span className="text-[10px] text-textSecondary mt-0.5">
                          {saleData.delivery_confirmed_at ? new Date(saleData.delivery_confirmed_at).toLocaleString() : "Confirmed"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Return Status */}
                  {isReturned && (
                    <div className="relative pl-6">
                      <span className="absolute -left-[10px] top-1 h-5 w-5 rounded-full bg-danger ring-4 ring-background flex items-center justify-center">
                        <CornerDownLeft size={10} className="text-white" />
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-danger">Return Processed</span>
                        <span className="text-[10px] text-textSecondary mt-0.5">
                          {saleData.return_reason || "Customer initiated return"}
                        </span>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
