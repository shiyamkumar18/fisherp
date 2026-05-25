import React, { useEffect, useState } from "react";
import { 
  CreditCard, Plus, Search, Calendar, User, DollarSign, 
  ArrowUpRight, ArrowDownLeft, CheckCircle, AlertCircle, FileText, Trash2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fetchPayments, createPayment, deletePayment } from "@/services/paymentService";
import { fetchSuppliers } from "@/services/supplierService";
import { fetchCustomers } from "@/services/customerService";
import { fetchPurchaseBatches } from "@/services/purchaseService";
import { fetchSales } from "@/services/salesService";
import { useToast } from "@/components/shared/toast-provider";

const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all, inbound, outbound
  const [modalOpen, setModalOpen] = useState(false);
  const { push: toast } = useToast();

  // Form states
  const [paymentType, setPaymentType] = useState("inbound"); // inbound or outbound
  const [paymentMode, setPaymentMode] = useState("bank_transfer");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [refNo, setRefNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [accNo, setAccNo] = useState("");
  const [notes, setNotes] = useState("");
  
  // Linkages
  const [linkedBuyerId, setLinkedBuyerId] = useState("");
  const [linkedSaleId, setLinkedSaleId] = useState("");
  const [linkedSupplierId, setLinkedSupplierId] = useState("");
  const [linkedBatchId, setLinkedBatchId] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [payData, supData, buyData, batData, saleData] = await Promise.all([
        fetchPayments(),
        fetchSuppliers(),
        fetchCustomers(),
        fetchPurchaseBatches(),
        fetchSales()
      ]);
      setPayments(payData);
      setSuppliers(supData);
      setBuyers(buyData);
      setBatches(batData);
      setSales(saleData);
    } catch (e) {
      toast({ message: "Failed to load payment transaction assets.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setPaymentType("inbound");
    setPaymentMode("bank_transfer");
    setAmount(0);
    setDate(new Date().toISOString().split("T")[0]);
    setRefNo("");
    setBankName("");
    setAccNo("");
    setNotes("");
    setLinkedBuyerId(buyers[0]?.id || "");
    setLinkedSaleId(sales[0]?.id || "");
    setLinkedSupplierId(suppliers[0]?.id || "");
    setLinkedBatchId(batches[0]?.id || "");
    setModalOpen(true);
  };

  const handleTypeChange = (type) => {
    setPaymentType(type);
    if (type === "inbound") {
      setLinkedBuyerId(buyers[0]?.id || "");
      setLinkedSaleId(sales[0]?.id || "");
    } else {
      setLinkedSupplierId(suppliers[0]?.id || "");
      setLinkedBatchId(batches[0]?.id || "");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (amount <= 0) {
      toast({ message: "Amount must be greater than zero.", variant: "error" });
      return;
    }

    const payload = {
      payment_type: paymentType,
      payment_mode: paymentMode,
      amount: Number(amount),
      date,
      reference_number: refNo,
      bank_name: bankName,
      account_number: accNo,
      notes,
    };

    if (paymentType === "inbound") {
      payload.buyer = Number(linkedBuyerId) || null;
      payload.sale = Number(linkedSaleId) || null;
      
      const buyerObj = buyers.find(b => b.id === payload.buyer);
      payload.buyer_name = buyerObj?.name || null;
      
      const saleObj = sales.find(s => s.id === payload.sale);
      payload.sale_invoice_number = saleObj?.invoice_number || null;
    } else {
      payload.supplier = Number(linkedSupplierId) || null;
      payload.purchase_batch = Number(linkedBatchId) || null;
      
      const supObj = suppliers.find(s => s.id === payload.supplier);
      payload.supplier_name = supObj?.name || null;
      
      const batObj = batches.find(b => b.id === payload.purchase_batch);
      payload.purchase_batch_number = batObj?.batch_number || null;
    }

    try {
      await createPayment(payload);
      toast({ message: "Payment entry logged successfully!" });
      setModalOpen(false);
      loadData();
    } catch (e) {
      toast({ message: "Failed to record payment.", variant: "error" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payment entry?")) return;
    try {
      await deletePayment(id);
      toast({ message: "Payment record deleted." });
      loadData();
    } catch (e) {
      toast({ message: "Failed to delete payment entry.", variant: "error" });
    }
  };

  // Filters
  const filteredPayments = payments.filter(p => {
    const matchesSearch = 
      p.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.buyer_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sale_invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.purchase_batch_number?.toLowerCase().includes(search.toLowerCase());
      
    if (activeTab === "inbound") return matchesSearch && p.payment_type === "inbound";
    if (activeTab === "outbound") return matchesSearch && p.payment_type === "outbound";
    return matchesSearch;
  });

  const totalInbound = payments.filter(p => p.payment_type === "inbound").reduce((sum, p) => sum + p.amount, 0);
  const totalOutbound = payments.filter(p => p.payment_type === "outbound").reduce((sum, p) => sum + p.amount, 0);
  const netCashFlow = totalInbound - totalOutbound;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Payments Log</h2>
          <p className="text-xs text-textSecondary">Audit incoming client collections and outgoing vendor payouts.</p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center gap-2">
          <Plus size={16} />
          Record Payment Transaction
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Total Inflow (Collections)</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-success">{formatINR(totalInbound)}</span>
            <ArrowDownLeft className="h-6 w-6 text-success bg-success/10 rounded-full p-0.5" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Total Outflow (Payouts)</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-danger">{formatINR(totalOutbound)}</span>
            <ArrowUpRight className="h-6 w-6 text-danger bg-danger/10 rounded-full p-0.5" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Net Cash Position</p>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-extrabold ${netCashFlow >= 0 ? "text-primary" : "text-danger"}`}>
              {formatINR(netCashFlow)}
            </span>
          </div>
        </Card>
      </div>

      {/* Tab Selectors & Filter */}
      <Card hoverEffect={false}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-border/60 pb-4">
          {/* Tabs */}
          <div className="flex bg-border/20 rounded-xl p-1 gap-0.5 max-w-sm self-start">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === "all" ? "bg-surface text-textPrimary shadow-sm" : "text-textSecondary hover:text-textPrimary"}`}
            >
              All Bookings
            </button>
            <button
              onClick={() => setActiveTab("inbound")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === "inbound" ? "bg-surface text-textPrimary shadow-sm" : "text-textSecondary hover:text-textPrimary"}`}
            >
              Collections
            </button>
            <button
              onClick={() => setActiveTab("outbound")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === "outbound" ? "bg-surface text-textPrimary shadow-sm" : "text-textSecondary hover:text-textPrimary"}`}
            >
              Payouts
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface/50 px-3 py-1.5 w-full sm:max-w-xs">
            <Search size={15} className="text-textSecondary" />
            <input
              type="text"
              placeholder="Search reference or links..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-textPrimary outline-none font-semibold"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-textSecondary">Loading financial statements...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-12 text-center text-textSecondary">
            <AlertCircle className="mx-auto h-8 w-8 mb-2 text-textSecondary/40" />
            No transaction records found matching active filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border text-xs font-bold uppercase tracking-wider text-textSecondary/70">
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Linked Party / Reference</th>
                  <th className="pb-3 pr-4">Payment Mode</th>
                  <th className="pb-3 pr-4 text-right">Reference No.</th>
                  <th className="pb-3 pr-4 text-right">Amount</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-semibold text-textPrimary">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-border/10 transition-colors">
                    <td className="py-3.5 pr-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${p.payment_type === "inbound" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
                        {p.payment_type === "inbound" ? "Collection" : "Payout"}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-xs text-textSecondary">
                      <div className="flex items-center gap-1"><Calendar size={10} /> {p.date}</div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <div>
                        <p className="font-bold">{p.buyer_name || p.supplier_name}</p>
                        {p.sale_invoice_number && <p className="text-[10px] text-textSecondary">Invoice: {p.sale_invoice_number}</p>}
                        {p.purchase_batch_number && <p className="text-[10px] text-textSecondary">Batch: {p.purchase_batch_number}</p>}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-xs text-textSecondary capitalize">{p.payment_mode_display || p.payment_mode}</span>
                    </td>
                    <td className="py-3.5 pr-4 text-right text-xs font-bold text-textPrimary">
                      {p.reference_number || "—"}
                    </td>
                    <td className="py-3.5 pr-4 text-right font-extrabold">
                      <span className={p.payment_type === "inbound" ? "text-success" : "text-danger"}>
                        {p.payment_type === "inbound" ? "+" : "-"}{formatINR(p.amount)}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <span className="inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-xs font-bold bg-success/10 text-success border border-success/20">
                        Cleared
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="rounded-lg p-1.5 text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                        title="Void Transaction"
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

      {/* Log Payment Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Log Payment Transaction</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 bg-border/20 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => handleTypeChange("inbound")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${paymentType === "inbound" ? "bg-surface text-textPrimary shadow-sm" : "text-textSecondary hover:text-textPrimary"}`}
              >
                Inbound Collection
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("outbound")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${paymentType === "outbound" ? "bg-surface text-textPrimary shadow-sm" : "text-textSecondary hover:text-textPrimary"}`}
              >
                Outbound Payout
              </button>
            </div>

            {paymentType === "inbound" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-textSecondary">Select Buyer *</label>
                  <select 
                    value={linkedBuyerId}
                    onChange={(e) => setLinkedBuyerId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary"
                  >
                    {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-textSecondary">Link Sales Invoice *</label>
                  <select 
                    value={linkedSaleId}
                    onChange={(e) => setLinkedSaleId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary"
                  >
                    {sales.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.invoice_number} ({s.buyer_name} - Due: {formatINR(s.pending_amount)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-textSecondary">Select Supplier *</label>
                  <select 
                    value={linkedSupplierId}
                    onChange={(e) => setLinkedSupplierId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary"
                  >
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-textSecondary">Link Purchase Batch *</label>
                  <select 
                    value={linkedBatchId}
                    onChange={(e) => setLinkedBatchId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary"
                  >
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.batch_number} - {b.fish_name} (Due: {formatINR(b.pending_amount)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Amount (INR) *</label>
                <Input type="number" value={amount} onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Payment Mode</label>
                <select 
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI / QR Code</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Payment Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Transaction Ref. Number</label>
                <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="UTR or Txn ID" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Sender/Recipient Bank</label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. ICICI Bank" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Account Number</label>
                <Input value={accNo} onChange={(e) => setAccNo(e.target.value)} placeholder="Acc. Number" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-textSecondary">Internal Audit Notes</label>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                rows="2" 
                placeholder="Log internal billing notations, verification details, or check clearing alerts..."
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-textPrimary outline-none focus:border-primary"
              />
            </div>

            <DialogFooter className="border-t border-border pt-4">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit">Log Transaction</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
