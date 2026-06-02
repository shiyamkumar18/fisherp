import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CreditCard, Plus, Search, Calendar, User, DollarSign, 
  ArrowUpRight, ArrowDownLeft, FileText, File, AlertCircle, Edit, ListFilter, Activity, CheckCircle
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fetchPayments, createPayment } from "@/services/paymentService";
import { fetchSuppliers } from "@/services/supplierService";
import { fetchCustomers } from "@/services/customerService";
import { fetchPurchaseBatches } from "@/services/purchaseService";
import { fetchSales } from "@/services/salesService";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/components/shared/toast-provider";

const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n || 0);

export default function PaymentsPage() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all"); 
  const [modalOpen, setModalOpen] = useState(false);
  const { push: toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { canEditForm } = usePermission();
  const isEditable = canEditForm("payments");

  // Form states
  const [paymentType, setPaymentType] = useState("inbound"); 
  const [paymentMode, setPaymentMode] = useState("bank_transfer");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [refNo, setRefNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [accNo, setAccNo] = useState("");
  const [notes, setNotes] = useState("");
  
  // Linkages
  const [linkedPartyId, setLinkedPartyId] = useState("");
  const [linkedDocId, setLinkedDocId] = useState("");

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
      toast({ message: e?.message || "Failed to load payment transaction assets.", variant: "error" });
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
    setLinkedPartyId("");
    setLinkedDocId("");
    setModalOpen(true);
  };

  const handleTypeChange = (type) => {
    setPaymentType(type);
    setLinkedPartyId("");
    setLinkedDocId("");
  };

  // Smart Linkage Logic
  const pendingDocs = useMemo(() => {
    if (!linkedPartyId) return [];
    if (paymentType === "inbound") {
      return sales.filter(s => s.buyer === Number(linkedPartyId) && parseFloat(s.pending_amount) > 0);
    } else {
      return batches.filter(b => b.supplier === Number(linkedPartyId) && parseFloat(b.pending_amount) > 0);
    }
  }, [linkedPartyId, paymentType, sales, batches]);

  useEffect(() => {
    if (pendingDocs.length === 1) {
      setLinkedDocId(String(pendingDocs[0].id));
      setAmount(parseFloat(pendingDocs[0].pending_amount));
    }
  }, [pendingDocs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (amount <= 0) {
      toast({ message: "Amount must be greater than zero.", variant: "error" });
      return;
    }
    
    // Validation: amount exceeds due
    if (linkedDocId) {
      const doc = pendingDocs.find(d => String(d.id) === linkedDocId);
      if (doc && amount > parseFloat(doc.pending_amount)) {
        toast({ message: "Amount cannot exceed the pending balance.", variant: "error" });
        return;
      }
    }
    
    // Validation: refNo required for non-cash
    if (paymentMode !== 'cash' && !refNo.trim()) {
      toast({ message: "Reference ID is required for non-cash transactions.", variant: "error" });
      return;
    }

    if (!linkedPartyId) {
      toast({ message: "Please select a party.", variant: "error" });
      return;
    }
    setIsSubmitting(true);

    const payload = {
      payment_type: paymentType,
      payment_mode: paymentMode,
      amount: Number(amount),
      date,
      reference_number: refNo,
      bank_name: bankName,
      account_number: accNo,
      notes,
      status: "draft", 
      allocated_amount: linkedDocId ? Number(amount) : 0,
      unallocated_balance: linkedDocId ? 0 : Number(amount)
    };

    if (paymentType === "inbound") {
      payload.buyer = Number(linkedPartyId);
      if (linkedDocId) payload.sale = Number(linkedDocId);
    } else {
      payload.supplier = Number(linkedPartyId);
      if (linkedDocId) payload.purchase_batch = Number(linkedDocId);
    }

    try {
      await createPayment(payload);
      toast({ message: "Payment draft created successfully! Awaiting processing." });
      setModalOpen(false);
      loadData();
    } catch (e) {
      toast({ message: e?.message || "Failed to record payment.", variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filters
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
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
  }, [payments, search, activeTab]);

  const totalInbound = payments.filter(p => p.payment_type === "inbound" && p.status === 'paid').reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const totalOutbound = payments.filter(p => p.payment_type === "outbound" && p.status === 'paid').reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const netCashFlow = totalInbound - totalOutbound;

  const renderStatusBadge = (status) => {
    const maps = {
      'draft': 'bg-gray-100 text-gray-700 border-gray-200',
      'pending_approval': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'approved': 'bg-blue-100 text-blue-700 border-blue-200',
      'paid': 'bg-green-100 text-green-700 border-green-200',
      'partially_paid': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'cancelled': 'bg-red-100 text-red-700 border-red-200',
      'reversed': 'bg-purple-100 text-purple-700 border-purple-200',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${maps[status] || maps['draft']}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-textPrimary">Financial Payments</h2>
          <p className="text-sm text-textSecondary mt-1">Manage accounts receivable, payables, and journal entries.</p>
        </div>
        {isEditable && (
        <Button onClick={handleOpenAdd} className="flex items-center gap-2 px-6 shadow-sm">
          <Plus size={16} />
          Create Payment
        </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-success">
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Total Paid In (Collections)</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-success">{formatINR(totalInbound)}</span>
            <ArrowDownLeft className="h-8 w-8 text-success bg-success/10 rounded-full p-1.5" />
          </div>
        </Card>
        <Card className="border-l-4 border-l-danger">
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Total Paid Out (Payouts)</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-danger">{formatINR(totalOutbound)}</span>
            <ArrowUpRight className="h-8 w-8 text-danger bg-danger/10 rounded-full p-1.5" />
          </div>
        </Card>
        <Card className={`border-l-4 ${netCashFlow >= 0 ? "border-l-primary" : "border-l-warning"}`}>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Net Cash Position</p>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-extrabold ${netCashFlow >= 0 ? "text-primary" : "text-warning"}`}>
              {formatINR(netCashFlow)}
            </span>
          </div>
        </Card>
      </div>

      <Card hoverEffect={false} className="overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-border bg-surface/30">
          <div className="flex bg-border/40 p-1 rounded-lg gap-1">
            {['all', 'inbound', 'outbound'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-xs font-bold rounded-md capitalize transition-all ${
                  activeTab === tab ? "bg-white shadow-sm text-primary" : "text-textSecondary hover:text-textPrimary"
                }`}
              >
                {tab === 'inbound' ? 'Collections' : tab === 'outbound' ? 'Payouts' : 'All Payments'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-0 max-w-xs w-full bg-white border border-border rounded-lg px-3 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
            <Search size={16} className="text-textSecondary" />
            <input
              type="text"
              placeholder="Search reference, party..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-textSecondary/70"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-textSecondary font-medium">Loading ledger records...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="bg-surface p-4 rounded-full mb-4">
              <FileText className="h-8 w-8 text-textSecondary/50" />
            </div>
            <h3 className="text-lg font-bold text-textPrimary mb-1">No payments found</h3>
            <p className="text-sm text-textSecondary max-w-sm">No transaction records match your current filters. Adjust your search or create a new payment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface/50 border-b border-border text-xs font-bold text-textSecondary uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4">Transaction Details</th>
                  <th className="px-5 py-4">Party & Linkage</th>
                  <th className="px-5 py-4 text-right">Amount</th>
                  <th className="px-5 py-4 text-right">Unallocated</th>
                  <th className="px-5 py-4 text-center">Status</th>
                  <th className="px-5 py-4 text-center">Reconciliation</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-surface/30 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${p.payment_type === 'inbound' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                          {p.payment_type === 'inbound' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div>
                          <p className="font-bold text-textPrimary flex items-center gap-2">
                            {p.reference_number || `PAY-${p.id.toString().padStart(5, '0')}`}
                          </p>
                          <p className="text-xs text-textSecondary mt-0.5 flex items-center gap-1">
                            <Calendar size={12} /> {p.date} • {p.payment_mode_display}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-textPrimary">{p.buyer_name || p.supplier_name}</p>
                      {p.sale_invoice_number && (
                        <p className="text-[11px] text-textSecondary mt-0.5 px-2 py-0.5 bg-surface inline-block rounded border border-border">
                          Inv: {p.sale_invoice_number}
                        </p>
                      )}
                      {p.purchase_batch_number && (
                        <p className="text-[11px] text-textSecondary mt-0.5 px-2 py-0.5 bg-surface inline-block rounded border border-border">
                          Batch: {p.purchase_batch_number}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-extrabold text-base">
                      {formatINR(p.amount)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={`text-sm font-semibold ${parseFloat(p.unallocated_balance) > 0 ? 'text-warning' : 'text-textSecondary'}`}>
                        {formatINR(p.unallocated_balance)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {renderStatusBadge(p.status)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {p.reconciliation_status === 'matched' ? (
                        <span className="text-success text-xs font-bold flex items-center justify-center gap-1">
                          <CheckCircle size={14} /> Matched
                        </span>
                      ) : (
                        <span className="text-textSecondary text-xs font-semibold">Pending</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs py-1 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => navigate(`/dashboard/payments/${p.id}`)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Premium Create Payment Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[1100px] h-[85vh] p-0 flex flex-col sm:flex-row overflow-hidden rounded-2xl shadow-2xl border-0 bg-transparent">
          
          {/* Left Side 65%: Form */}
          <div className="w-full sm:w-[65%] flex flex-col bg-white">
            <DialogHeader className="px-8 py-6 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3 text-slate-800">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <CreditCard size={22} strokeWidth={2.5} />
                </div>
                Log Financial Transaction
              </DialogTitle>
              <p className="text-sm font-medium text-slate-500 mt-2 pl-14">Draft a new collection or payout, allocate to pending invoices, and process securely.</p>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              
              {/* Type Toggle - Premium Segmented Control */}
              <div className="space-y-4">
                <div className="flex bg-slate-100/80 p-1.5 rounded-2xl max-w-md w-full relative isolation">
                  <button
                    type="button"
                    onClick={() => handleTypeChange("inbound")}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 relative z-10 ${paymentType === "inbound" ? "text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {paymentType === "inbound" && <div className="absolute inset-0 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] -z-10"></div>}
                    <ArrowDownLeft size={18} className="inline mr-2 opacity-80" strokeWidth={2.5} /> Inbound Collection
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange("outbound")}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 relative z-10 ${paymentType === "outbound" ? "text-rose-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {paymentType === "outbound" && <div className="absolute inset-0 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] -z-10"></div>}
                    <ArrowUpRight size={18} className="inline mr-2 opacity-80" strokeWidth={2.5} /> Outbound Payout
                  </button>
                </div>
                <p className="text-xs font-semibold text-slate-500 pl-2">
                  {paymentType === "inbound" ? "Inbound: Collect customer money" : "Outbound: Supplier payout"}
                </p>
              </div>

              {/* Step 1: Party Linkage */}
              <div className="space-y-5">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span> 
                  Select Counterparty
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-8">
                  <div className="space-y-2 relative group">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                      {paymentType === 'inbound' ? 'Customer' : 'Supplier'} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                      <select 
                        value={linkedPartyId}
                        onChange={(e) => setLinkedPartyId(e.target.value)}
                        className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">-- Choose Profile --</option>
                        {(paymentType === 'inbound' ? buyers : suppliers).map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                    </div>
                  </div>
                  
                  {linkedPartyId && (
                    <div className="space-y-2 relative group animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Smart Document Link</label>
                      <div className="relative">
                        <File className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <select 
                          value={linkedDocId}
                          onChange={(e) => {
                            setLinkedDocId(e.target.value);
                            if(e.target.value) {
                              const doc = pendingDocs.find(d => String(d.id) === e.target.value);
                              if(doc) setAmount(parseFloat(doc.pending_amount));
                            }
                          }}
                          className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer"
                        >
                          <option value="">-- Leave Unallocated (Advance) --</option>
                          {pendingDocs.map(d => (
                            <option key={d.id} value={d.id}>
                              {paymentType === 'inbound' ? `Inv: ${d.invoice_number}` : `Batch: ${d.batch_number}`} - Pending {formatINR(d.pending_amount)}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Financial Details */}
              <div className="space-y-5">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span> 
                  Payment Specifics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-6 pl-8">
                  <div className="space-y-3 group md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Amount (INR) <span className="text-rose-500">*</span></label>
                    <div className="relative max-w-md">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-xl group-focus-within:text-indigo-500">₹</span>
                      <Input 
                        className={`h-16 pl-10 bg-slate-50/50 border-slate-200 font-black text-3xl text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl transition-all ${linkedDocId && amount > parseFloat(pendingDocs.find(d => String(d.id) === linkedDocId)?.pending_amount || Infinity) ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20 text-rose-600' : ''}`} 
                        type="number" step="0.01" value={amount} onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))} required 
                      />
                    </div>
                    {linkedDocId && amount > parseFloat(pendingDocs.find(d => String(d.id) === linkedDocId)?.pending_amount || Infinity) && (
                      <p className="text-xs font-bold text-rose-500 flex items-center gap-1"><AlertCircle size={14}/> Amount exceeds the outstanding balance.</p>
                    )}
                    {linkedPartyId && pendingDocs.length > 0 && (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setAmount(pendingDocs.reduce((sum, d) => sum + parseFloat(d.pending_amount), 0))} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors">Full Due</button>
                        <button type="button" onClick={() => setAmount(pendingDocs.reduce((sum, d) => sum + parseFloat(d.pending_amount), 0) / 2)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors">50%</button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3 group md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Method <span className="text-rose-500">*</span></label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { id: 'bank_transfer', label: 'Bank Transfer' },
                        { id: 'cash', label: 'Cash' },
                        { id: 'upi', label: 'UPI' },
                        { id: 'cheque', label: 'Cheque' },
                        { id: 'wallet', label: 'Wallet' }
                      ].map(method => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPaymentMode(method.id)}
                          className={`px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${paymentMode === method.id ? 'bg-indigo-50 border-indigo-600 text-indigo-700 ring-1 ring-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-300'}`}
                        >
                          {method.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 group">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Value Date <span className="text-rose-500">*</span></label>
                    <Input className="h-14 bg-slate-50/50 border-slate-200 font-bold text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl transition-all px-4" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  
                  <div className="space-y-2 group">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Reference ID {paymentMode !== 'cash' && <span className="text-rose-500">*</span>}</label>
                    <Input 
                      className={`h-14 bg-slate-50/50 border-slate-200 font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl transition-all px-4 ${paymentMode !== 'cash' && !refNo.trim() ? 'border-amber-300 focus:border-amber-500' : ''}`} 
                      value={refNo} 
                      onChange={(e) => setRefNo(e.target.value)} 
                      placeholder="UTR, Cheque #, Txn ID..." 
                    />
                    {paymentMode !== 'cash' && !refNo.trim() && (
                      <p className="text-xs font-bold text-amber-600 flex items-center gap-1"><AlertCircle size={14}/> Required for this payment method.</p>
                    )}
                  </div>
                  
                  <div className="space-y-2 md:col-span-2 group">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Internal Notes</label>
                    <textarea 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      rows="2" 
                      placeholder="Add audit tracking details or billing contexts here..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-4 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 shrink-0 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><AlertCircle size={14}/> Fields marked with * are required.</span>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="px-6 h-12 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting || amount <= 0 || !linkedPartyId}
                  className="px-8 h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_14px_rgba(79,70,229,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Processing</span>
                  ) : "Create Draft Record"}
                </Button>
              </div>
            </DialogFooter>
          </div>
          
          {/* Right Side 35%: Premium Summary Pane */}
          <div className="hidden sm:flex sm:w-[35%] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex-col text-white relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>
            
            <div className="p-8 border-b border-white/10 shrink-0 relative z-10">
              <h3 className="font-black text-xl flex items-center gap-3">
                <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Activity size={20} className="text-indigo-300" />
                </div>
                Financial Impact
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 relative z-10 custom-scrollbar-dark">
              {/* Grand Total Hero */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Transaction Value</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${paymentType === 'inbound' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-rose-500/20 text-rose-300'}`}>
                    {paymentType === 'inbound' ? 'Collection' : 'Payout'}
                  </span>
                </div>
                <p className="text-4xl font-black text-white tracking-tight drop-shadow-sm">{formatINR(amount)}</p>
                
                {linkedPartyId && (
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-300">Party</span>
                    <span className="text-sm font-bold text-white truncate max-w-[150px]">
                      {(paymentType === 'inbound' ? buyers : suppliers).find(p => String(p.id) === String(linkedPartyId))?.name || "Unknown"}
                    </span>
                  </div>
                )}
                
                <div className="mt-4 space-y-3 text-sm font-medium">
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-slate-400 flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-400"/> Allocated Amount</span>
                    <span className="font-bold text-white bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300">{formatINR(linkedDocId ? amount : 0)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-400 flex items-center gap-1.5"><AlertCircle size={14} className="text-amber-400"/> Unallocated (Advance)</span>
                    <span className={`font-bold px-2 py-0.5 rounded ${!linkedDocId && amount > 0 ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500'}`}>{formatINR(linkedDocId ? 0 : amount)}</span>
                  </div>
                </div>
              </div>

              {pendingDocs.length > 0 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 delay-150 fill-mode-both">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Pending Liabilities</p>
                    <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full font-bold">{pendingDocs.length} Docs</span>
                  </div>
                  
                  <div className="space-y-3">
                    {pendingDocs.map(d => {
                      const isSelected = linkedDocId === String(d.id);
                      const outstandingBefore = parseFloat(d.pending_amount);
                      const outstandingAfter = isSelected ? Math.max(0, outstandingBefore - amount) : outstandingBefore;
                      
                      return (
                        <div 
                          key={d.id} 
                          className={`p-4 rounded-xl border text-sm transition-all duration-300 cursor-pointer relative overflow-hidden group ${
                            isSelected 
                              ? 'bg-indigo-500/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                              : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                          }`} 
                          onClick={() => { setLinkedDocId(String(d.id)); setAmount(parseFloat(d.pending_amount)); }}
                        >
                          {isSelected && <div className="absolute top-0 right-0 w-8 h-8 bg-indigo-500/20 blur-md rounded-full -mt-2 -mr-2"></div>}
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-black tracking-tight text-white">{paymentType === 'inbound' ? `Inv: ${d.invoice_number}` : `Batch: ${d.batch_number}`}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase bg-black/20 px-2 py-0.5 rounded">{d.date}</span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-400">Current Due</span>
                              <span className="text-rose-400 font-bold tracking-tight">{formatINR(outstandingBefore)}</span>
                            </div>
                            {isSelected && (
                              <div className="flex items-center justify-between animate-in fade-in duration-300 pt-1 border-t border-white/10 mt-1">
                                <span className="text-xs font-medium text-slate-300">After Payment</span>
                                <span className="text-emerald-400 font-black tracking-tight">{formatINR(outstandingAfter)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Risk & Summary Footer */}
                  {linkedDocId && (
                    <div className="mt-6 bg-white/5 p-4 rounded-xl border border-white/10 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-400">Risk Assessment</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          (amount / parseFloat(pendingDocs.find(d => String(d.id) === linkedDocId)?.pending_amount || 1)) >= 1 
                            ? 'bg-emerald-500/20 text-emerald-300' 
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {(amount / parseFloat(pendingDocs.find(d => String(d.id) === linkedDocId)?.pending_amount || 1)) >= 1 ? 'Low Risk' : 'Medium Risk'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">Payment covers {Math.min(100, Math.round((amount / parseFloat(pendingDocs.find(d => String(d.id) === linkedDocId)?.pending_amount || 1)) * 100))}% of the selected document's outstanding balance.</p>
                    </div>
                  )}
                </div>
              )}
              
              {!linkedPartyId && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50 mt-10">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <User size={24} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-white mb-1">No Party Selected</p>
                  <p className="text-xs font-medium text-slate-400 max-w-[200px]">Select a customer or supplier to view their outstanding balances.</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
