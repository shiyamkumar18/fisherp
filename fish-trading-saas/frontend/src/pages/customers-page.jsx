import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Users, User, Plus, Search, Phone, Mail, MapPin,
  Briefcase, CreditCard, AlertCircle, ChevronRight, X,
  TrendingUp, TrendingDown, Building2, ShieldCheck,
  MoreVertical, Edit2, Trash2, Eye, AlertTriangle,
  CheckCircle, RefreshCw, Banknote, BarChart3, Clock
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer } from "@/services/customerService";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/components/shared/toast-provider";
import { motion, AnimatePresence } from "framer-motion";

const INR = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const BUYER_TYPE_LABELS = {
  retail:    "Retailer",
  wholesale: "Wholesaler",
  export:    "Exporter",
  other:     "Other",
};

const BUYER_ICONS = {
  retail:    "🏪",
  wholesale: "🏬",
  export:    "🚢",
  other:     "🏢",
};

function creditRisk(pending, limit) {
  if (!limit) return "unknown";
  const pct = (pending / limit) * 100;
  if (pct >= 90) return "critical";
  if (pct >= 60) return "warning";
  return "healthy";
}

function CreditBar({ pending, limit }) {
  if (!limit) return <span className="text-xs font-bold text-textSecondary">No Limit Set</span>;
  const pct = Math.min(100, Math.round((pending / limit) * 100));
  const color = pct >= 90 ? "bg-danger" : pct >= 60 ? "bg-warning" : "bg-success";
  const textColor = pct >= 90 ? "text-danger" : pct >= 60 ? "text-warning" : "text-success";
  return (
    <div className="min-w-[130px]">
      <div className="flex justify-between text-[10px] font-bold mb-1">
        <span className="text-textSecondary">{INR(pending)} used</span>
        <span className={`font-black ${textColor}`}>{pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-border/60 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[9px] text-textSecondary font-bold uppercase tracking-wide mt-1">Limit: {INR(limit)}</p>
    </div>
  );
}

function RowMenu({ cust, onEdit, onDelete, isEditable }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-textSecondary hover:bg-hover hover:text-textPrimary transition-all"
      >
        <MoreVertical size={14} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-10 z-50 w-52 bg-modal border border-border rounded-xl shadow-2xl overflow-hidden py-1"
          >
            {[
              { icon: <Eye size={13} />, label: "View Profile", always: true, action: null },
              ...(isEditable ? [
                { icon: <Edit2 size={13} />, label: "Edit Customer", action: () => { setOpen(false); onEdit(cust); } },
                { icon: <Trash2 size={13} />, label: "Delete", danger: true, action: () => { setOpen(false); onDelete(cust.id); } },
              ] : []),
            ].map((item) => item && (
              <button
                key={item.label}
                onClick={() => item.action?.()}
                className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center gap-2.5 hover:bg-hover transition-colors
                  ${item.danger ? "text-danger hover:bg-danger/10" : "text-textPrimary"}`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FormSection({ icon, title, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">{icon}</div>
        <h3 className="text-sm font-black text-textPrimary uppercase tracking-wide">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div className={`space-y-1.5 ${full ? "col-span-2" : ""}`}>
      <label className="text-[10px] font-black text-textSecondary uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "h-11 w-full rounded-lg border border-border bg-card px-3 text-sm font-semibold text-textPrimary outline-none focus:border-primary transition-all placeholder:text-textSecondary/50";
const selectCls = inputCls;

export default function CustomersPage() {
  const [customers, setCustomers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [modalOpen, setModalOpen]   = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const { push: toast }             = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting]     = useState(false);
  const { canEditForm }                 = usePermission();
  const isEditable = canEditForm("customers");

  // Form fields
  const [name, setName]               = useState("");
  const [phone, setPhone]             = useState("");
  const [email, setEmail]             = useState("");
  const [address, setAddress]         = useState("");
  const [buyerType, setBuyerType]     = useState("retail");
  const [businessName, setBusinessName] = useState("");
  const [gstNumber, setGstNumber]     = useState("");
  const [creditLimit, setCreditLimit] = useState(0);
  const [creditDays, setCreditDays]   = useState(30);
  const [paymentPref, setPaymentPref] = useState("cash");

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await fetchCustomers();
      setCustomers(data);
    } catch (e) {
      toast({ message: e?.message || "Failed to load customers.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCustomers(); }, []);

  const resetForm = () => {
    setName(""); setPhone(""); setEmail(""); setAddress("");
    setBuyerType("retail"); setBusinessName(""); setGstNumber("");
    setCreditLimit(0); setCreditDays(30); setPaymentPref("cash");
  };

  const openAddModal    = () => { setEditingCustomer(null); resetForm(); setModalOpen(true); };
  const openEditModal   = (c) => {
    setEditingCustomer(c);
    setName(c.name || ""); setPhone(c.phone || ""); setEmail(c.email || "");
    setAddress(c.address || ""); setBuyerType(c.buyer_type || "retail");
    setBusinessName(c.business_name || ""); setGstNumber(c.gst_number || "");
    setCreditLimit(c.credit_limit || 0); setCreditDays(c.credit_days || 30);
    setPaymentPref(c.payment_preference || "cash");
    setModalOpen(true);
  };
  const openDrawer      = (c) => { setSelectedCustomer(c); setDrawerOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast({ message: "Name and Phone are required.", variant: "error" }); return;
    }
    setIsSubmitting(true);
    const payload = {
      name, phone, email, address, buyer_type: buyerType,
      business_name: businessName, gst_number: gstNumber,
      credit_limit: Number(creditLimit) || 0,
      credit_days: Number(creditDays) || 30,
      payment_preference: paymentPref,
    };
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload);
        toast({ message: "Customer profile updated successfully!" });
      } else {
        await createCustomer(payload);
        toast({ message: "Customer profile registered successfully!" });
      }
      setModalOpen(false); loadCustomers();
    } catch (err) {
      toast({ message: err?.message || "Error saving customer details.", variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this customer profile?")) return;
    setIsDeleting(true);
    try {
      await deleteCustomer(id); toast({ message: "Customer deleted." }); loadCustomers();
    } catch (e) {
      toast({ message: e?.message || "Failed to delete.", variant: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  // KPI
  const totalOutstanding  = customers.reduce((s, c) => s + (Number(c.total_pending) || 0), 0);
  const totalCreditLimit  = customers.reduce((s, c) => s + (Number(c.credit_limit) || 0), 0);
  const totalOrders       = customers.reduce((s, c) => s + (c.total_orders || 0), 0);
  const overallUtilization = totalCreditLimit > 0 ? Math.round((totalOutstanding / totalCreditLimit) * 100) : 0;
  const criticalCreditCustomers = customers.filter(c => creditRisk(c.total_pending, c.credit_limit) === "critical").length;

  const filteredCustomers = useMemo(() => customers.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = (c.name || "").toLowerCase().includes(q) ||
      (c.business_name || "").toLowerCase().includes(q) || (c.phone || "").includes(q);
    if (!matchSearch) return false;
    if (typeFilter !== "all" && c.buyer_type !== typeFilter) return false;
    return true;
  }), [customers, search, typeFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-textPrimary flex items-center gap-3">
            <span className="p-2 rounded-xl bg-primary/10 text-primary"><Users size={20} /></span>
            Customer Intelligence
          </h2>
          <p className="text-sm text-textSecondary font-medium mt-1 ml-11">
            Buyer accounts, credit exposure & financial relationship management
          </p>
        </div>
        {isEditable && (
          <Button onClick={openAddModal} className="gap-2 shrink-0">
            <Plus size={16} /> Add Customer
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-textSecondary">Total Buyers</p>
            <div className="p-2 rounded-lg bg-primary/10 text-primary"><Users className="h-5 w-5" /></div>
          </div>
          <div>
            <span className="text-3xl font-black text-textPrimary tracking-tight">{customers.length}</span>
            <p className="text-[10px] text-textSecondary font-bold uppercase tracking-wider mt-1">{customers.length} registered clients</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-success">
              <TrendingUp size={13} /><span>+2 new buyers this month</span>
            </div>
          </div>
        </Card>

        <Card className={`flex flex-col justify-between border ${criticalCreditCustomers > 0 ? "border-danger/40 bg-danger/[0.03]" : "border-border"}`}>
          <div className="flex items-center justify-between mb-4">
            <p className={`text-xs font-bold uppercase tracking-wider ${criticalCreditCustomers > 0 ? "text-danger" : "text-textSecondary"}`}>Active Exposure</p>
            <div className={`p-2 rounded-lg ${criticalCreditCustomers > 0 ? "bg-danger/20 text-danger" : "bg-warning/10 text-warning"}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div>
            <span className={`text-2xl font-black tracking-tight ${totalOutstanding > 200000 ? "text-danger" : totalOutstanding > 0 ? "text-warning" : "text-success"}`}>
              {INR(totalOutstanding)}
            </span>
            <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${criticalCreditCustomers > 0 ? "text-danger" : "text-textSecondary"}`}>
              {criticalCreditCustomers > 0 ? `${criticalCreditCustomers} near credit limit` : "All exposures safe"}
            </p>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-textSecondary">Total Credit Allowed</p>
            <div className="p-2 rounded-lg bg-info/10 text-info"><CreditCard className="h-5 w-5" /></div>
          </div>
          <div>
            <span className="text-2xl font-black text-textPrimary tracking-tight">{INR(totalCreditLimit)}</span>
            <div className="mt-2">
              <div className="h-1.5 w-full bg-border/60 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${overallUtilization >= 80 ? "bg-danger" : overallUtilization >= 60 ? "bg-warning" : "bg-success"}`}
                  style={{ width: `${overallUtilization}%` }} />
              </div>
              <p className="text-[10px] text-textSecondary font-bold mt-1">{overallUtilization}% utilized across all clients</p>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-textSecondary">Gross Trades</p>
            <div className="p-2 rounded-lg bg-success/10 text-success"><BarChart3 className="h-5 w-5" /></div>
          </div>
          <div>
            <span className="text-3xl font-black text-textPrimary tracking-tight">{totalOrders}</span>
            <p className="text-[10px] text-textSecondary font-bold uppercase tracking-wider mt-1">Logged orders total</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-textSecondary">
              <TrendingUp size={13} className="text-success" /><span>+18 this month</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" size={16} />
          <Input type="text" placeholder="Search by name, business, phone..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11 text-sm bg-card" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary"><X size={14} /></button>}
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="h-11 px-3 rounded-lg border border-border bg-card text-sm font-semibold text-textPrimary focus:outline-none focus:border-primary cursor-pointer shrink-0">
          <option value="all">All Types</option>
          <option value="retail">Retailer</option>
          <option value="wholesale">Wholesaler</option>
          <option value="export">Exporter</option>
          <option value="other">Other</option>
        </select>
        <span className="text-xs font-bold text-textSecondary self-center shrink-0">{filteredCustomers.length} of {customers.length}</span>
      </div>

      {/* Table */}
      {loading ? (
        <Card className="py-24 flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="font-bold text-textSecondary text-sm">Loading customer registry...</p>
        </Card>
      ) : filteredCustomers.length === 0 ? (
        <Card className="py-24 text-center flex flex-col items-center border-dashed">
          <AlertCircle className="mx-auto h-10 w-10 mb-3 text-textSecondary/30" />
          <h3 className="text-lg font-extrabold text-textPrimary">No customers found</h3>
          <p className="text-sm text-textSecondary mt-1">Try adjusting your search or filter.</p>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <Card className="p-0 overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-tableHeader border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary">Customer</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary">Contact</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary">Business</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary">Credit Utilization</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary text-right">Outstanding</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredCustomers.map((cust) => {
                    const outstanding = Number(cust.total_pending) || 0;
                    const limit       = Number(cust.credit_limit) || 0;
                    const risk        = creditRisk(outstanding, limit);
                    return (
                      <tr key={cust.id} onClick={() => openDrawer(cust)}
                        className="group hover:bg-hover transition-all duration-150 cursor-pointer">
                        {/* Customer */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-bg border border-border flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
                              {BUYER_ICONS[cust.buyer_type] || "🏢"}
                            </div>
                            <div>
                              <p className="font-bold text-textPrimary text-[15px]">{cust.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-black text-textSecondary uppercase tracking-wider">
                                  {BUYER_TYPE_LABELS[cust.buyer_type] || cust.buyer_type}
                                </span>
                                {(cust.total_orders || 0) > 10 && (
                                  <span className="text-[9px] font-black text-success flex items-center gap-0.5">
                                    <ShieldCheck size={9} /> TRUSTED CLIENT
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        {/* Contact */}
                        <td className="px-6 py-4">
                          <div className="space-y-1 text-xs text-textSecondary">
                            <p className="flex items-center gap-1.5 font-bold text-textPrimary"><Phone size={11} className="text-textSecondary" /> {cust.phone}</p>
                            {cust.email && <p className="flex items-center gap-1.5"><Mail size={11} /> {cust.email}</p>}
                          </div>
                        </td>
                        {/* Business */}
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-textPrimary">{cust.business_name || "—"}</p>
                          {cust.gst_number && (
                            <p className="text-[10px] text-textSecondary font-bold font-mono uppercase mt-0.5">GST: {cust.gst_number}</p>
                          )}
                        </td>
                        {/* Credit Bar */}
                        <td className="px-6 py-4">
                          <CreditBar pending={outstanding} limit={limit} />
                        </td>
                        {/* Outstanding */}
                        <td className="px-6 py-4 text-right">
                          <p className={`font-black text-sm ${risk === "critical" ? "text-danger" : risk === "warning" ? "text-warning" : outstanding > 0 ? "text-warning" : "text-success"}`}>
                            {INR(outstanding)}
                          </p>
                          <p className={`text-[10px] font-bold uppercase mt-0.5 ${risk === "critical" ? "text-danger" : outstanding > 0 ? "text-warning" : "text-textSecondary"}`}>
                            {risk === "critical" ? "⚠ Near Credit Limit" : outstanding > 0 ? "Pending" : "✓ Cleared"}
                          </p>
                        </td>
                        {/* Actions */}
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <RowMenu cust={cust} onEdit={openEditModal} onDelete={handleDelete} isEditable={isEditable} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredCustomers.map((cust) => {
              const outstanding = Number(cust.total_pending) || 0;
              const limit       = Number(cust.credit_limit) || 0;
              const risk        = creditRisk(outstanding, limit);
              return (
                <Card key={cust.id} className="p-4 cursor-pointer" onClick={() => openDrawer(cust)}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-bg border border-border flex items-center justify-center text-xl shrink-0">
                        {BUYER_ICONS[cust.buyer_type] || "🏢"}
                      </div>
                      <div>
                        <p className="font-bold text-textPrimary">{cust.name}</p>
                        <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold">{BUYER_TYPE_LABELS[cust.buyer_type] || cust.buyer_type}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-black ${risk === "critical" ? "text-danger" : outstanding > 0 ? "text-warning" : "text-success"}`}>
                      {INR(outstanding)}
                    </p>
                  </div>
                  <div className="p-3 bg-bg rounded-xl border border-border mb-3">
                    <CreditBar pending={outstanding} limit={limit} />
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-border">
                    <p className="text-xs font-bold text-textPrimary flex items-center gap-1.5"><Phone size={12} className="text-textSecondary" />{cust.phone}</p>
                    {isEditable && (
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={(e) => { e.stopPropagation(); openEditModal(cust); }}>
                        <Edit2 size={11} /> Edit
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ═══════ CUSTOMER DETAIL DRAWER ═══════ */}
      <AnimatePresence>
        {drawerOpen && selectedCustomer && (() => {
          const outstanding = Number(selectedCustomer.total_pending) || 0;
          const limit       = Number(selectedCustomer.credit_limit) || 0;
          const risk        = creditRisk(outstanding, limit);
          const pct         = limit > 0 ? Math.round((outstanding / limit) * 100) : 0;
          return (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setDrawerOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
              <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 220 }}
                className="fixed right-0 top-0 bottom-0 w-full sm:w-[460px] bg-card border-l border-border shadow-2xl z-50 flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-border bg-surface flex items-center gap-4 shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-bg border border-border flex items-center justify-center text-2xl shrink-0 shadow">
                    {BUYER_ICONS[selectedCustomer.buyer_type] || "🏢"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black text-textPrimary truncate">{selectedCustomer.name}</h3>
                    <p className="text-[10px] font-black text-textSecondary uppercase tracking-widest mt-0.5">
                      {BUYER_TYPE_LABELS[selectedCustomer.buyer_type] || selectedCustomer.buyer_type}
                      {selectedCustomer.business_name ? ` · ${selectedCustomer.business_name}` : ""}
                    </p>
                  </div>
                  <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-border text-textSecondary shrink-0"><X size={18} /></button>
                </div>

                {/* Credit Risk Banner */}
                {risk === "critical" && (
                  <div className="px-5 py-3 bg-danger/10 border-b border-danger/20 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-danger shrink-0" />
                    <p className="text-xs font-bold text-danger">Credit limit nearly exhausted — review before next sale</p>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Overview */}
                  <section>
                    <h4 className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-3 flex items-center gap-2"><User size={12} /> Overview</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Phone", value: selectedCustomer.phone, icon: <Phone size={11} /> },
                        { label: "Email", value: selectedCustomer.email || "—", icon: <Mail size={11} /> },
                        { label: "Business", value: selectedCustomer.business_name || "—" },
                        { label: "GST Number", value: selectedCustomer.gst_number || "—", mono: true },
                        { label: "Address", value: selectedCustomer.address || "—", full: true },
                      ].map(({ label, value, icon, mono, full }) => (
                        <div key={label} className={`bg-bg rounded-xl border border-border p-3 ${full ? "col-span-2" : ""}`}>
                          <p className="text-[9px] font-bold text-textSecondary uppercase tracking-wide mb-1 flex items-center gap-1">{icon}{label}</p>
                          <p className={`text-sm font-black text-textPrimary ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Financial Health */}
                  <section>
                    <h4 className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-3 flex items-center gap-2"><BarChart3 size={12} /> Financial Health</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Outstanding", value: INR(outstanding), cls: outstanding > 0 ? "text-warning" : "text-success" },
                        { label: "Total Orders", value: selectedCustomer.total_orders || 0 },
                      ].map(({ label, value, cls }) => (
                        <div key={label} className="bg-bg rounded-xl border border-border p-3">
                          <p className="text-[9px] font-bold text-textSecondary uppercase mb-1">{label}</p>
                          <p className={`text-xl font-black text-textPrimary ${cls || ""}`}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Credit Exposure */}
                  <section>
                    <h4 className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-3 flex items-center gap-2"><CreditCard size={12} /> Credit Exposure</h4>
                    <div className={`rounded-xl border p-4 ${risk === "critical" ? "bg-danger/10 border-danger/20" : risk === "warning" ? "bg-warning/10 border-warning/20" : "bg-bg border-border"}`}>
                      <div className="flex justify-between mb-2">
                        <div>
                          <p className="text-[9px] font-bold text-textSecondary uppercase mb-1">Credit Limit</p>
                          <p className="text-xl font-black text-textPrimary">{INR(limit)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold text-textSecondary uppercase mb-1">Utilized</p>
                          <p className={`text-xl font-black ${risk === "critical" ? "text-danger" : risk === "warning" ? "text-warning" : "text-success"}`}>{pct}%</p>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-border/60 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct >= 90 ? "bg-danger" : pct >= 60 ? "bg-warning" : "bg-success"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </section>
                </div>

                <div className="p-5 border-t border-border bg-surface flex gap-3 shrink-0">
                  <Button variant="outline" className="flex-1" onClick={() => setDrawerOpen(false)}>Close</Button>
                  {isEditable && (
                    <Button className="flex-1 gap-2" onClick={() => { setDrawerOpen(false); openEditModal(selectedCustomer); }}>
                      <Edit2 size={14} /> Edit Profile
                    </Button>
                  )}
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* ═══════ CUSTOMER CREDIT ONBOARDING MODAL ═══════ */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 py-5 border-b border-border bg-surface shrink-0">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary"><Users size={20} /></div>
              <div>
                <p>{editingCustomer ? "Edit Customer Profile" : "Register New Customer"}</p>
                <p className="text-xs font-semibold text-textSecondary mt-0.5 tracking-normal">
                  {editingCustomer ? "Update buyer profile and credit terms" : "Onboard a buyer for credit and trade management"}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-bg">
            {/* Section 1: Basic */}
            <FormSection icon={<User size={14} />} title="Basic Information">
              <Field label="Full Name / Contact Person *">
                <Input disabled={!isEditable} className="h-11 bg-card" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh Kumar" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Mobile Number *">
                  <Input disabled={!isEditable} className="h-11 bg-card" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
                </Field>
                <Field label="Email Address">
                  <Input disabled={!isEditable} type="email" className="h-11 bg-card" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="buyer@email.com" />
                </Field>
              </div>
              <Field label="Billing / Delivery Address">
                <textarea disabled={!isEditable} value={address} onChange={(e) => setAddress(e.target.value)} rows={2}
                  placeholder="Complete address..." className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-semibold text-textPrimary outline-none focus:border-primary transition-all resize-none" />
              </Field>
            </FormSection>

            {/* Section 2: Business */}
            <FormSection icon={<Briefcase size={14} />} title="Business Profile">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Customer Category">
                  <select disabled={!isEditable} value={buyerType} onChange={(e) => setBuyerType(e.target.value)} className={selectCls}>
                    <option value="retail">Retailer</option>
                    <option value="wholesale">Wholesaler</option>
                    <option value="export">Exporter</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Company / Entity Name">
                  <Input disabled={!isEditable} className="h-11 bg-card" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. OceanView Restaurant" />
                </Field>
              </div>
              <Field label="GST / Tax ID Number">
                <Input disabled={!isEditable} className="h-11 bg-card font-mono" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="29AAAAA0000A1Z1" />
              </Field>
            </FormSection>

            {/* Section 3: Credit Terms */}
            <FormSection icon={<CreditCard size={14} />} title="Credit Terms & Payment">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Credit Limit (INR)">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary font-bold text-sm">₹</span>
                    <Input disabled={!isEditable} type="number" className="h-11 bg-card pl-7" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="150000" />
                  </div>
                </Field>
                <Field label="Credit Days">
                  <Input disabled={!isEditable} type="number" className="h-11 bg-card" value={creditDays} onChange={(e) => setCreditDays(e.target.value)} placeholder="30" />
                </Field>
                <Field label="Payment Preference">
                  <select disabled={!isEditable} value={paymentPref} onChange={(e) => setPaymentPref(e.target.value)} className={selectCls}>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </Field>
              </div>
              <div className="p-3 bg-warning/5 border border-warning/20 rounded-xl text-xs font-bold text-warning flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Outstanding balance alerts trigger automatically when exposure reaches 90% of the credit limit.
              </div>
            </FormSection>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-surface shrink-0">
            <div className="flex w-full justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                {isEditable ? "Cancel" : "Close"}
              </Button>
              {isEditable && (
                <Button onClick={handleSubmit} loading={isSubmitting} disabled={!name.trim() || !phone.trim()} className="px-8">
                  {editingCustomer ? "Save Changes" : "Register Customer"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
