import React, { useEffect, useState } from "react";
import { 
  TrendingUp, Plus, Search, Calendar, User, FileText, 
  Layers, DollarSign, Percent, AlertCircle, ShoppingCart, Truck, Trash2, Sparkles, CheckCircle2
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fetchSales, createSale, deleteSale } from "@/services/salesService";
import { fetchCustomers } from "@/services/customerService";
import { fetchPurchaseBatches } from "@/services/purchaseService";
import { useToast } from "@/components/shared/toast-provider";
import SaleDetailModal from "@/components/sales/sale-detail-modal";
import { usePermission } from "@/hooks/usePermission";

const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const PAYMENT_CLS = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50",
  partially_paid: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50",
  paid: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50 dark:border-green-900/50",
  overdue: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50 dark:border-red-900/50",
};

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const { push: toast } = useToast();
  const { canViewFinancial, canDelete } = usePermission();

  // Invoice Form states
  const [buyerId, setBuyerId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [saleType, setSaleType] = useState("domestic");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [packagesSold, setPackagesSold] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(5);
  const [amountReceived, setAmountReceived] = useState(0);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, bData, pData] = await Promise.all([
        fetchSales(),
        fetchCustomers(),
        fetchPurchaseBatches()
      ]);
      setSales(sData);
      setBuyers(bData);
      // Filter batches to those with remaining stock in inventory
      setBatches(pData);
    } catch (e) {
      toast({ message: "Failed to fetch sales assets.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Find selected batch details for constraints
  const selectedBatch = batches.find(b => b.id === Number(batchId));
  const maxPackages = selectedBatch?.remaining_packages || 0;
  const packageWeight = selectedBatch?.package_weight || 0;

  // Real-time invoice math
  const totalWeight = packagesSold * packageWeight;
  const subtotal = totalWeight * sellingPrice;
  const discountAmount = subtotal * (Number(discountPercent) / 100);
  const taxAmount = (subtotal - discountAmount) * (Number(taxPercent) / 100);
  const finalAmount = subtotal - discountAmount + taxAmount;
  const pendingAmount = finalAmount - amountReceived;

  // Stock warning status
  const stockExceeded = packagesSold > maxPackages;

  const handleOpenAdd = () => {
    if (buyers.length === 0) {
      toast({ message: "Please register a customer first under the Customers tab.", variant: "error" });
      return;
    }
    const activeStock = batches.filter(b => b.remaining_packages > 0);
    if (activeStock.length === 0) {
      toast({ message: "No active inventory available. Register a purchase batch first.", variant: "error" });
      return;
    }
    setBuyerId(buyers[0]?.id || "");
    setBatchId(activeStock[0]?.id || "");
    setSaleType("domestic");
    setDate(new Date().toISOString().split("T")[0]);
    setPackagesSold(0);
    setSellingPrice(0);
    setDiscountPercent(0);
    setTaxPercent(5);
    setAmountReceived(0);
    setAddress(buyers[0]?.address || "");
    setNotes("");
    setModalOpen(true);
  };

  const handleBuyerChange = (bId) => {
    setBuyerId(bId);
    const buyerObj = buyers.find(b => b.id === Number(bId));
    if (buyerObj?.address) {
      setAddress(buyerObj.address);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!buyerId || !batchId || packagesSold <= 0 || sellingPrice <= 0) {
      toast({ message: "Please enter all required billing items.", variant: "error" });
      return;
    }
    if (stockExceeded) {
      toast({ message: "Requested package amount exceeds active batch inventory.", variant: "error" });
      return;
    }

    const payload = {
      buyer: Number(buyerId),
      batch: Number(batchId),
      sale_type: saleType,
      date,
      number_of_packages_sold: Number(packagesSold),
      selling_weight_per_package: packageWeight,
      selling_price_per_kg: Number(sellingPrice),
      total_revenue: subtotal,
      discount_percent: Number(discountPercent),
      discount_amount: discountAmount,
      tax_percent: Number(taxPercent),
      tax_amount: taxAmount,
      final_amount: finalAmount,
      amount_received: Number(amountReceived),
      delivery_address: address,
      notes
    };

    try {
      await createSale(payload);
      toast({ message: "Sales Invoice generated and inventory updated!" });
      setModalOpen(false);
      loadData();
    } catch (e) {
      toast({ message: "Failed to record sale transaction.", variant: "error" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to void this sales invoice?")) return;
    try {
      await deleteSale(id);
      toast({ message: "Invoice record voided." });
      loadData();
    } catch (e) {
      toast({ message: "Failed to delete sales record.", variant: "error" });
    }
  };

  const filteredSales = sales.filter(s =>
    s.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.buyer_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.batch_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Sales & Billing</h2>
          <p className="text-xs text-textSecondary">Record customer trades, invoice orders, and track pending receivables.</p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center gap-2">
          <Plus size={16} />
          Create Invoice
        </Button>
      </div>

      {/* Overview stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Invoiced Sum</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary">
              {formatINR(sales.reduce((sum, s) => sum + (s.final_amount || 0), 0))}
            </span>
            <TrendingUp className="h-5 w-5 text-primary opacity-65" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Total Received</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-success">
              {formatINR(sales.reduce((sum, s) => sum + (s.amount_received || 0), 0))}
            </span>
            <CheckCircle2 className="h-5 w-5 text-success opacity-65" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Outstanding Balance</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-amber-500">
              {formatINR(sales.reduce((sum, s) => sum + (s.pending_amount || 0), 0))}
            </span>
            <DollarSign className="h-5 w-5 text-amber-500 opacity-65" />
          </div>
        </Card>
        {canViewFinancial() && (
          <Card>
            <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Estimated Profits</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-extrabold text-textPrimary">
                {formatINR(sales.reduce((sum, s) => sum + (s.profit || 0), 0))}
              </span>
            </div>
          </Card>
        )}
      </div>

      {/* Main Grid */}
      <Card hoverEffect={false}>
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-surface/50 px-3 py-1.5 max-w-md">
          <Search size={16} className="text-textSecondary" />
          <input
            type="text"
            placeholder="Search invoices by buyer name, invoice number, batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-textPrimary outline-none"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-textSecondary">Loading invoice history...</div>
        ) : filteredSales.length === 0 ? (
          <div className="py-12 text-center text-textSecondary">
            <AlertCircle className="mx-auto h-8 w-8 mb-2 text-textSecondary/40" />
            No sales invoices created.
          </div>
        ) : (
          <div className="w-full">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border text-xs font-bold uppercase tracking-wider text-textSecondary/70">
                  <th className="pb-3 pr-4">Invoice Details</th>
                  <th className="pb-3 pr-4">Customer Name</th>
                  <th className="pb-3 pr-4">Batch Link</th>
                  <th className="pb-3 pr-4">Volume / Quantity</th>
                  <th className="pb-3 pr-4 text-right">Selling Price</th>
                  <th className="pb-3 pr-4 text-right">Grand Total</th>
                  <th className="pb-3 pr-4 text-right">Payment Status</th>
                  <th className="pb-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-semibold text-textPrimary">
                {filteredSales.map((s) => {
                  const pKey = (s.payment_status || "pending").toLowerCase();
                  const pCls = PAYMENT_CLS[pKey] || PAYMENT_CLS.pending;
                  return (
                    <tr 
                      key={s.id} 
                      className="hover:bg-border/10 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedSale(s);
                        setDetailModalOpen(true);
                      }}
                    >
                      <td className="py-3.5 pr-4">
                        <div>
                          <p className="font-bold text-textPrimary">{s.invoice_number}</p>
                          <p className="text-[10px] text-textSecondary uppercase tracking-wider font-extrabold">{s.sale_type_display || s.sale_type}</p>
                          <div className="flex items-center gap-1 text-[10px] text-textSecondary mt-0.5">
                            <Calendar size={10} />
                            <span>{s.date}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="text-textSecondary">{s.buyer_name}</span>
                      </td>
                      <td className="py-3.5 pr-4 text-xs">
                        <span className="font-bold text-primary">{s.batch_number}</span>
                      </td>
                      <td className="py-3.5 pr-4 text-xs text-textSecondary">
                        <p className="font-bold text-textPrimary">{s.number_of_packages_sold} packages</p>
                        <p className="text-[10px]">{s.number_of_packages_sold * s.selling_weight_per_package} kg ({s.selling_weight_per_package}kg/pkg)</p>
                      </td>
                      <td className="py-3.5 pr-4 text-right">
                        <span className="text-textPrimary">{formatINR(s.selling_price_per_kg)}/kg</span>
                      </td>
                      <td className="py-3.5 pr-4 text-right">
                        <span className="font-bold text-textPrimary">{formatINR(s.final_amount)}</span>
                      </td>
                      <td className="py-3.5 pr-4 text-right">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${pCls}`}>
                          {s.payment_status_display || s.payment_status}
                        </span>
                      </td>
                      <td className="py-3.5 text-center">
                        {canDelete() && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(s.id);
                            }}
                            className="rounded-lg p-1.5 text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                            title="Void Invoice"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden flex flex-col gap-4">
              {filteredSales.map((s) => {
                const pKey = (s.payment_status || "pending").toLowerCase();
                const pCls = PAYMENT_CLS[pKey] || PAYMENT_CLS.pending;
                return (
                  <div 
                    key={s.id} 
                    className="bg-surface border border-border rounded-xl p-4 shadow-sm space-y-3 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => {
                      setSelectedSale(s);
                      setDetailModalOpen(true);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-extrabold text-textPrimary text-base">{s.invoice_number}</p>
                        <p className="text-[10px] text-textSecondary uppercase tracking-wider font-extrabold">{s.sale_type_display || s.sale_type}</p>
                        <div className="flex items-center gap-1 text-[11px] text-textSecondary mt-1">
                          <Calendar size={12} />
                          <span>{s.date}</span>
                        </div>
                      </div>
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${pCls}`}>
                        {s.payment_status_display || s.payment_status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase tracking-wider font-bold">Buyer</p>
                        <p className="text-sm font-bold text-textPrimary">{s.buyer_name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase tracking-wider font-bold">Volume</p>
                        <p className="text-sm font-bold text-textPrimary">{s.number_of_packages_sold} pkg</p>
                        <p className="text-[11px] text-textSecondary">{s.number_of_packages_sold * s.selling_weight_per_package} kg</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase tracking-wider font-bold">Sell Price/Kg</p>
                        <p className="text-sm font-bold text-textPrimary">{formatINR(s.selling_price_per_kg)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase tracking-wider font-bold">Grand Total</p>
                        <p className="text-sm font-extrabold text-textPrimary">
                          {formatINR(s.final_amount)}
                        </p>
                      </div>
                    </div>

                    {canDelete() && (
                      <div className="pt-3 border-t border-border/50 flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(s.id);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-danger/10 text-danger border border-danger/20 rounded-lg text-xs font-bold active:scale-95 transition-all"
                        >
                          <Trash2 size={14} /> Void Invoice
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Invoice creation modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Generate Sales Invoice</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                  <label className="text-xs font-bold text-textSecondary">Customer/Buyer</label>
                  <select 
                    value={buyerId}
                    onChange={(e) => setBuyerId(e.target.value)}
                    className="h-12 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary"
                  >
                  {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                  <label className="text-xs font-bold text-textSecondary">Batch</label>
                  <select 
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    className="h-12 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary"
                  >
                  {batches.filter(b => b.remaining_packages > 0).map(b => (
                    <option key={b.id} value={b.id}>
                      {b.batch_number} - {b.fish_name} ({b.remaining_packages} pkg remaining)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                  <label className="text-xs font-bold text-textSecondary">Sale Type</label>
                  <select 
                    value={saleType}
                    onChange={(e) => setSaleType(e.target.value)}
                    className="h-12 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary"
                  >
                  <option value="domestic">Domestic Sale</option>
                  <option value="export">International Export</option>
                </select>
              </div>

              <div className="space-y-1">
                  <label className="text-xs font-bold text-textSecondary">Sale Date</label>
                  <Input className="h-12" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            {/* Calculations Box */}
            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/10 rounded-2xl p-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1 text-primary text-xs font-bold uppercase tracking-wider">
                  <ShoppingCart size={13} />
                  <span>Item Billing details</span>
                </div>
                {selectedBatch && (
                  <span className="text-[11px] font-bold text-textSecondary">
                    Available: <span className="text-textPrimary">{maxPackages} packages ({packageWeight} kg each)</span>
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-textSecondary uppercase">Packages Sold *</label>
                  <Input 
                    type="number" 
                    value={packagesSold} 
                    onChange={(e) => setPackagesSold(Math.max(0, parseInt(e.target.value) || 0))} 
                    className={stockExceeded ? "border-danger focus:ring-danger/20" : ""}
                    required 
                  />
                  {stockExceeded && (
                    <p className="text-[10px] text-danger font-bold flex items-center gap-0.5 mt-0.5">
                      <AlertCircle size={10} /> Out of Stock (Max: {maxPackages} pkg)
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-textSecondary uppercase">Packages Sold *</label>
                    <Input className="h-12" type="number" value={packagesSold} onChange={(e) => setPackagesSold(Math.max(0, parseInt(e.target.value) || 0))} required />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-primary/10 text-xs font-bold text-textSecondary">
                <div>Total Selling Weight: <span className="text-textPrimary">{totalWeight} kg</span></div>
                <div>Subtotal: <span className="text-textPrimary">{formatINR(subtotal)}</span></div>
              </div>
            </div>

            {/* Taxes & Discounts */}
            <div className="border border-border rounded-2xl p-4">
              <p className="text-xs font-bold text-textPrimary mb-3">Adjustments & Fees</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary">Discount (%)</label>
                  <Input type="number" min="0" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary">Tax / GST (%)</label>
                  <Input type="number" min="0" max="100" value={taxPercent} onChange={(e) => setTaxPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-border/60 text-xs font-bold text-textSecondary">
                <div>Discount Amt: <span className="text-danger">-{formatINR(discountAmount)}</span></div>
                <div>GST Tax Amt: <span className="text-textPrimary">+{formatINR(taxAmount)}</span></div>
                <div>Grand Total: <span className="text-primary font-extrabold">{formatINR(finalAmount)}</span></div>
              </div>
            </div>

            {/* Collection & Shipping */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 rounded-2xl p-4">
                <p className="text-xs font-bold text-success mb-3">Payment Collection</p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-textSecondary">Amount Received</label>
                    <Input className="h-12" type="number" step="1" value={amountReceived} onChange={(e) => setAmountReceived(Math.max(0, parseFloat(e.target.value) || 0))} />
                  </div>
                  <div className="flex justify-between text-xs font-bold text-textSecondary pt-1">
                    <span>Outstanding Due:</span>
                    <span className={pendingAmount > 0 ? "text-amber-500 font-extrabold" : "text-success font-extrabold"}>{formatINR(pendingAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="border border-border rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-textPrimary flex items-center gap-1">
                  <Truck size={14} className="text-primary" /> Delivery Logistics
                </p>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary">Delivery Address</label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Complete shipping address..." />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-textSecondary">Notes / Invoice Comments</label>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                rows="2" 
                placeholder="Log special logistics remarks or customer delivery window notes..."
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-textPrimary outline-none focus:border-primary"
              />
            </div>

              <DialogFooter className="border-t border-border pt-4">
                <Button type="button" variant="ghost" className="h-12 w-full sm:w-auto" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="h-12 w-full sm:w-auto">Finalize Invoice</Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Sale Detail Modal */}
      <SaleDetailModal
        sale={selectedSale}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onUpdate={() => {
          loadData();
        }}
      />
    </div>
  );
}
