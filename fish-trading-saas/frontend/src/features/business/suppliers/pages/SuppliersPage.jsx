import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Users, User, Plus, Search, Phone, Mail, MapPin,
  Briefcase, Percent, Star, CreditCard, AlertCircle,
  ChevronRight, X, TrendingUp, Building2, Anchor,
  ShieldCheck, MoreVertical, Edit2, Trash2, Eye,
  Clock, AlertTriangle, CheckCircle, RefreshCw, Banknote
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fetchSuppliers, createSupplier, updateSupplier, deleteSupplier } from "@/services/supplierService";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/components/shared/toast-provider";
import { motion, AnimatePresence } from "framer-motion";

const INR = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const SUPPLIER_TYPE_LABELS = {
  distributor: "Distributor",
  boat_owner:  "Boat Owner",
  cooperative: "Cooperative",
  agent:       "Broker / Agent",
};

const TYPE_ICONS = {
  distributor: "🏭",
  boat_owner:  "⛵",
  cooperative: "🤝",
  agent:       "🧑‍💼",
};

function RowMenu({ sup, onEdit, onDelete, onView, isEditable }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="iconSm"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="text-textSecondary hover:text-textPrimary border-border bg-card hover:bg-hover shadow-sm hover:border-primary/30"
      >
        <MoreVertical size={14} />
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-10 z-50 w-48 bg-modal border border-border rounded-xl shadow-2xl overflow-hidden py-1"
          >
            {[
              { icon: <Eye size={13} />, label: "View Profile", always: true, action: () => { setOpen(false); onView(sup); } },
              ...(isEditable ? [
                { icon: <Edit2 size={13} />, label: "Edit Supplier", always: true, action: () => { setOpen(false); onEdit(sup); } },
                { icon: <Trash2 size={13} />, label: "Delete", danger: true, always: true, action: () => { setOpen(false); onDelete(sup.id); } },
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

function FieldRow({ children }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-textSecondary uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "h-11 w-full rounded-lg border border-border bg-input px-3 text-sm font-semibold text-textPrimary outline-none focus:border-primary transition-all placeholder:text-textSecondary/50";
const selectCls = inputCls;

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const { push: toast }           = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting]     = useState(false);
  const { canEditForm, canDelete }      = usePermission();
  const isEditable = canEditForm("suppliers");

  // Form fields
  const [name, setName]                   = useState("");
  const [phone, setPhone]                 = useState("");
  const [email, setEmail]                 = useState("");
  const [address, setAddress]             = useState("");
  const [origin, setOrigin]               = useState("");
  const [supplierType, setSupplierType]   = useState("distributor");
  const [commissionRate, setCommissionRate] = useState(0);
  const [bankName, setBankName]           = useState("");
  const [bankAccount, setBankAccount]     = useState("");
  const [bankIfsc, setBankIfsc]           = useState("");
  const [upiId, setUpiId]                 = useState("");

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await fetchSuppliers();
      setSuppliers(data);
    } catch (e) {
      toast({ message: e?.message || "Failed to load suppliers.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSuppliers(); }, []);

  const resetForm = () => {
    setName(""); setPhone(""); setEmail(""); setAddress(""); setOrigin("");
    setSupplierType("distributor"); setCommissionRate(0);
    setBankName(""); setBankAccount(""); setBankIfsc(""); setUpiId("");
  };

  const openAddModal = () => { setEditingSupplier(null); resetForm(); setModalOpen(true); };

  const openEditModal = (sup) => {
    setEditingSupplier(sup);
    setName(sup.name || ""); setPhone(sup.phone || ""); setEmail(sup.email || "");
    setAddress(sup.address || ""); setOrigin(sup.place_of_origin || "");
    setSupplierType(sup.supplier_type || "distributor");
    setCommissionRate(sup.commission_rate || 0);
    setBankName(sup.bank_name || ""); setBankAccount(sup.bank_account || "");
    setBankIfsc(sup.bank_ifsc || ""); setUpiId(sup.upi_id || "");
    setModalOpen(true);
  };

  const openDrawer = (sup) => { setSelectedSupplier(sup); setDrawerOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast({ message: "Name and Phone are required fields.", variant: "error" }); return;
    }
    setIsSubmitting(true);
    const payload = {
      name, phone, email, address, place_of_origin: origin,
      supplier_type: supplierType, commission_rate: Number(commissionRate) || 0,
      bank_name: bankName, bank_account: bankAccount, bank_ifsc: bankIfsc, upi_id: upiId,
    };
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, payload);
        toast({ message: "Supplier details updated successfully!" });
      } else {
        await createSupplier(payload);
        toast({ message: "Supplier registered successfully!" });
      }
      setModalOpen(false); loadSuppliers();
    } catch (err) {
      toast({ message: err?.message || "Error saving supplier details.", variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) return;
    setIsDeleting(true);
    try {
      await deleteSupplier(id); toast({ message: "Supplier deleted." }); loadSuppliers();
    } catch (e) {
      toast({ message: e?.message || "Failed to delete supplier.", variant: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  // KPI computations
  const totalOutstanding = suppliers.reduce((s, i) => s + (Number(i.outstanding_amount) || 0), 0);
  const ratedSuppliers   = suppliers.filter(s => s.rating > 0);
  const avgRating        = ratedSuppliers.length
    ? (ratedSuppliers.reduce((s, i) => s + (i.rating || 0), 0) / ratedSuppliers.length).toFixed(1)
    : null;
  const totalDeliveries  = suppliers.reduce((s, i) => s + (i.total_deliveries || 0), 0);
  const criticalPayables = suppliers.filter(s => Number(s.outstanding_amount) > 50000).length;

  const filteredSuppliers = useMemo(() => suppliers.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = (s.name || "").toLowerCase().includes(q) ||
      (s.place_of_origin || "").toLowerCase().includes(q) ||
      (s.phone || "").includes(q) || (s.supplier_type || "").toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (typeFilter !== "all" && s.supplier_type !== typeFilter) return false;
    return true;
  }), [suppliers, search, typeFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-textPrimary flex items-center gap-3">
            <span className="p-2 rounded-xl bg-primary/10 text-primary"><Building2 size={20} /></span>
            Supplier Management
          </h2>
          <p className="text-sm text-textSecondary font-medium mt-1 ml-11">
            Vendor accounts, procurement, commission & payout management
          </p>
        </div>
        {isEditable && (
          <Button onClick={openAddModal} className="gap-2 shrink-0">
            <Plus size={16} /> Register Supplier
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-textSecondary">Total Suppliers</p>
            <div className="p-2 rounded-lg bg-primary/10 text-primary"><Users className="h-5 w-5" /></div>
          </div>
          <div>
            <span className="text-3xl font-black text-textPrimary tracking-tight">{suppliers.length}</span>
            <p className="text-[10px] text-textSecondary font-bold uppercase tracking-wider mt-1">{suppliers.length} active vendors</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-success">
              <TrendingUp size={13} /><span>+3 onboarded this month</span>
            </div>
          </div>
        </Card>

        <Card className={`flex flex-col justify-between border ${criticalPayables > 0 ? "border-warning/40 bg-warning/[0.03]" : "border-border"}`}>
          <div className="flex items-center justify-between mb-4">
            <p className={`text-xs font-bold uppercase tracking-wider ${criticalPayables > 0 ? "text-warning" : "text-textSecondary"}`}>Total Outstanding</p>
            <div className={`p-2 rounded-lg ${criticalPayables > 0 ? "bg-warning/20 text-warning" : "bg-success/10 text-success"}`}>
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div>
            <span className={`text-2xl font-black tracking-tight ${totalOutstanding > 100000 ? "text-danger" : totalOutstanding > 0 ? "text-warning" : "text-success"}`}>
              {INR(totalOutstanding)}
            </span>
            <p className="text-[10px] text-textSecondary font-bold uppercase tracking-wider mt-1">
              {criticalPayables > 0 ? `${criticalPayables} vendors above ₹50k` : "All payables healthy"}
            </p>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-textSecondary">Avg Vendor Rating</p>
            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500"><Star className="h-5 w-5" /></div>
          </div>
          <div>
            {avgRating ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-textPrimary tracking-tight">{avgRating}</span>
                  <span className="text-yellow-400 text-lg">★</span>
                </div>
                <p className="text-[10px] text-success font-bold uppercase tracking-wider mt-1">Reliable Vendor Network</p>
              </>
            ) : (
              <>
                <span className="text-3xl font-black text-textSecondary tracking-tight">—</span>
                <p className="text-[10px] text-textSecondary font-bold uppercase tracking-wider mt-1">Not yet rated</p>
              </>
            )}
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-textSecondary">Active Deliveries</p>
            <div className="p-2 rounded-lg bg-info/10 text-info"><Anchor className="h-5 w-5" /></div>
          </div>
          <div>
            <span className="text-3xl font-black text-textPrimary tracking-tight">{totalDeliveries}</span>
            <p className="text-[10px] text-textSecondary font-bold uppercase tracking-wider mt-1">In transit & pending unload</p>
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" size={16} />
          <Input type="text" placeholder="Search by name, phone, harbor, supplier type..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11 text-sm bg-card" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary"><X size={14} /></button>}
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="h-11 px-3 rounded-lg border border-border bg-card text-sm font-semibold text-textPrimary focus:outline-none focus:border-primary cursor-pointer shrink-0">
          <option value="all">All Types</option>
          <option value="distributor">Distributor</option>
          <option value="boat_owner">Boat Owner</option>
          <option value="cooperative">Cooperative</option>
          <option value="agent">Broker / Agent</option>
        </select>
        <span className="text-xs font-bold text-textSecondary self-center shrink-0">{filteredSuppliers.length} of {suppliers.length}</span>
      </div>

      {/* Table */}
      {loading ? (
        <Card className="py-24 flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="font-bold text-textSecondary text-sm">Loading supplier registry...</p>
        </Card>
      ) : filteredSuppliers.length === 0 ? (
        <Card className="py-24 text-center flex flex-col items-center border-dashed">
          <AlertCircle className="mx-auto h-10 w-10 mb-3 text-textSecondary/30" />
          <h3 className="text-lg font-extrabold text-textPrimary">No suppliers found</h3>
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
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary">Supplier</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary">Contact</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary">Harbor / Origin</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary text-center">Commission</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary text-right">Outstanding</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredSuppliers.map((sup) => {
                    const outstanding = Number(sup.outstanding_amount) || 0;
                    const risk = outstanding > 100000 ? "critical" : outstanding > 50000 ? "warning" : "healthy";
                    return (
                      <tr key={sup.id} onClick={() => openDrawer(sup)}
                        className="group hover:bg-hover transition-all duration-150 cursor-pointer">
                        {/* Supplier Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-bg border border-border flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
                              {TYPE_ICONS[sup.supplier_type] || "🏭"}
                            </div>
                            <div>
                              <p className="font-bold text-textPrimary text-[15px] leading-snug">{sup.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-black text-textSecondary uppercase tracking-wider">
                                  {SUPPLIER_TYPE_LABELS[sup.supplier_type] || sup.supplier_type}
                                </span>
                                {sup.rating >= 4 && (
                                  <span className="text-[9px] font-black text-yellow-500 flex items-center gap-0.5">
                                    <ShieldCheck size={10} /> TRUSTED
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        {/* Contact */}
                        <td className="px-6 py-4">
                          <div className="space-y-1 text-xs text-textSecondary">
                            <p className="flex items-center gap-1.5 font-bold text-textPrimary"><Phone size={11} className="text-textSecondary" /> {sup.phone}</p>
                            {sup.email && <p className="flex items-center gap-1.5"><Mail size={11} /> {sup.email}</p>}
                          </div>
                        </td>
                        {/* Harbor */}
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-1.5">
                            <Anchor size={13} className="text-textSecondary mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-bold text-textPrimary">{sup.place_of_origin || "—"}</p>
                              <p className="text-[10px] text-textSecondary font-bold uppercase tracking-wide">Daily Supply</p>
                            </div>
                          </div>
                        </td>
                        {/* Commission */}
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-0.5 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-black border border-primary/20">
                            {sup.commission_rate || 0}%
                          </span>
                        </td>
                        {/* Outstanding */}
                        <td className="px-6 py-4 text-right">
                          <div>
                            <p className={`font-black text-sm ${risk === "critical" ? "text-danger" : risk === "warning" ? "text-warning" : "text-success"}`}>
                              {INR(outstanding)}
                            </p>
                            <p className={`text-[10px] font-bold uppercase mt-0.5 ${risk === "critical" ? "text-danger" : risk === "warning" ? "text-warning" : "text-textSecondary"}`}>
                              {risk === "critical" ? "⚠ Critical Overdue" : risk === "warning" ? "⚠ Due Soon" : "✓ Settled"}
                            </p>
                          </div>
                        </td>
                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <RowMenu sup={sup} onEdit={openEditModal} onDelete={handleDelete} onView={openDrawer} isEditable={isEditable} />
                          </div>
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
            {filteredSuppliers.map((sup) => {
              const outstanding = Number(sup.outstanding_amount) || 0;
              const risk = outstanding > 100000 ? "critical" : outstanding > 50000 ? "warning" : "healthy";
              return (
                <Card key={sup.id} className="p-4 cursor-pointer" onClick={() => openDrawer(sup)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-bg border border-border flex items-center justify-center text-xl shrink-0">
                        {TYPE_ICONS[sup.supplier_type] || "🏭"}
                      </div>
                      <div>
                        <p className="font-bold text-textPrimary">{sup.name}</p>
                        <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold">{SUPPLIER_TYPE_LABELS[sup.supplier_type] || sup.supplier_type}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-black ${risk === "critical" ? "text-danger" : risk === "warning" ? "text-warning" : "text-success"}`}>
                      {INR(outstanding)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-bg rounded-xl border border-border text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-textPrimary"><Phone size={11} className="text-textSecondary" />{sup.phone}</div>
                    <div className="flex items-center gap-1.5 font-bold text-textSecondary"><Anchor size={11} />{sup.place_of_origin || "—"}</div>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                    <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full">{sup.commission_rate || 0}% commission</span>
                    {isEditable && (
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={(e) => { e.stopPropagation(); openEditModal(sup); }}>
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

      {/* ═══════ SUPPLIER DETAIL DRAWER ═══════ */}
      <AnimatePresence>
        {drawerOpen && selectedSupplier && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[460px] bg-card border-l border-border shadow-2xl z-50 flex flex-col">
              {/* Drawer Header */}
              <div className="p-5 border-b border-border bg-surface flex items-center gap-4 shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-bg border border-border flex items-center justify-center text-2xl shrink-0 shadow">
                  {TYPE_ICONS[selectedSupplier.supplier_type] || "🏭"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-black text-textPrimary truncate">{selectedSupplier.name}</h3>
                  <p className="text-[10px] font-black text-textSecondary uppercase tracking-widest mt-0.5">
                    {SUPPLIER_TYPE_LABELS[selectedSupplier.supplier_type] || selectedSupplier.supplier_type}
                  </p>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-border text-textSecondary shrink-0">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Section 1: Profile */}
                <section>
                  <h4 className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-3 flex items-center gap-2"><User size={12} /> Profile</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Phone", value: selectedSupplier.phone, icon: <Phone size={11} /> },
                      { label: "Harbor / Origin", value: selectedSupplier.place_of_origin || "—", icon: <Anchor size={11} /> },
                      { label: "Email", value: selectedSupplier.email || "—", icon: <Mail size={11} />, full: true },
                      { label: "Commission Rate", value: `${selectedSupplier.commission_rate || 0}%`, icon: <Percent size={11} />, cls: "text-primary" },
                      { label: "Supplier Type", value: SUPPLIER_TYPE_LABELS[selectedSupplier.supplier_type] || "—" },
                    ].map(({ label, value, icon, full, cls }) => (
                      <div key={label} className={`bg-bg rounded-xl border border-border p-3 ${full ? "col-span-2" : ""}`}>
                        <p className="text-[9px] font-bold text-textSecondary uppercase tracking-wide mb-1 flex items-center gap-1">{icon}{label}</p>
                        <p className={`text-sm font-black text-textPrimary ${cls || ""}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Section 2: Financials */}
                <section>
                  <h4 className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-3 flex items-center gap-2"><CreditCard size={12} /> Financials</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Total Purchases", value: INR(selectedSupplier.total_purchases) },
                      { label: "Outstanding", value: INR(selectedSupplier.outstanding_amount), cls: Number(selectedSupplier.outstanding_amount) > 0 ? "text-warning" : "text-success" },
                    ].map(({ label, value, cls }) => (
                      <div key={label} className="bg-bg rounded-xl border border-border p-3">
                        <p className="text-[9px] font-bold text-textSecondary uppercase mb-1">{label}</p>
                        <p className={`text-lg font-black text-textPrimary ${cls || ""}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Section 3: Supply Performance */}
                <section>
                  <h4 className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-3 flex items-center gap-2"><Star size={12} /> Supply Performance</h4>
                  <div className="bg-bg rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-textSecondary">Vendor Rating</p>
                      <p className="text-sm font-black text-yellow-400">{selectedSupplier.rating ? `${selectedSupplier.rating} ★` : "Not Rated"}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-textSecondary">Total Deliveries</p>
                      <p className="text-sm font-black text-textPrimary">{selectedSupplier.total_deliveries || 0}</p>
                    </div>
                  </div>
                </section>

                {/* Section 4: Banking */}
                {(selectedSupplier.bank_name || selectedSupplier.bank_account) && (
                  <section>
                    <h4 className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-3 flex items-center gap-2"><Banknote size={12} /> Bank Details</h4>
                    <div className="bg-bg rounded-xl border border-border p-4 space-y-2 text-xs">
                      {selectedSupplier.bank_name && <div className="flex justify-between"><span className="text-textSecondary font-bold">Bank</span><span className="font-black text-textPrimary">{selectedSupplier.bank_name}</span></div>}
                      {selectedSupplier.bank_account && <div className="flex justify-between"><span className="text-textSecondary font-bold">Account</span><span className="font-black text-textPrimary font-mono">{selectedSupplier.bank_account}</span></div>}
                      {selectedSupplier.bank_ifsc && <div className="flex justify-between"><span className="text-textSecondary font-bold">IFSC</span><span className="font-black text-textPrimary font-mono">{selectedSupplier.bank_ifsc}</span></div>}
                    </div>
                  </section>
                )}
              </div>

              <div className="p-5 border-t border-border bg-surface flex gap-3 shrink-0">
                <Button variant="outline" className="flex-1" onClick={() => setDrawerOpen(false)}>Close</Button>
                {isEditable && (
                  <Button className="flex-1 gap-2" onClick={() => { setDrawerOpen(false); openEditModal(selectedSupplier); }}>
                    <Edit2 size={14} /> Edit Supplier
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════ PROCUREMENT ONBOARDING MODAL ═══════ */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 py-5 border-b border-border bg-surface shrink-0">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary"><Building2 size={20} /></div>
              <div>
                <p>{editingSupplier ? "Edit Supplier Account" : "Register New Supplier"}</p>
                <p className="text-xs font-semibold text-textSecondary mt-0.5 tracking-normal">
                  {editingSupplier ? "Update vendor profile and procurement settings" : "Onboard a vendor for procurement and payouts"}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-bg">
            {/* Section 1: Basic Details */}
            <FormSection icon={<User size={14} />} title="Basic Details">
              <Field label="Supplier / Vendor Name *">
                <Input disabled={!isEditable} className="h-11 bg-card" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Riverline Fisheries" />
              </Field>
              <FieldRow>
                <Field label="Mobile Number *">
                  <Input disabled={!isEditable} className="h-11 bg-card" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
                </Field>
                <Field label="Email Address">
                  <Input disabled={!isEditable} type="email" className="h-11 bg-card" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vendor@email.com" />
                </Field>
              </FieldRow>
              <Field label="Harbor / Business Address">
                <textarea disabled={!isEditable} value={address} onChange={(e) => setAddress(e.target.value)} rows={2}
                  placeholder="Harbor address, dock details..." className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-semibold text-textPrimary outline-none focus:border-primary transition-all resize-none" />
              </Field>
            </FormSection>

            {/* Section 2: Business Operations */}
            <FormSection icon={<Briefcase size={14} />} title="Business Operations">
              <FieldRow>
                <Field label="Supplier Type">
                  <select disabled={!isEditable} value={supplierType} onChange={(e) => setSupplierType(e.target.value)} className={selectCls}>
                    <option value="distributor">Distributor</option>
                    <option value="boat_owner">Boat Owner</option>
                    <option value="cooperative">Cooperative</option>
                    <option value="agent">Broker / Agent</option>
                  </select>
                </Field>
                <Field label="Place of Origin / Harbor">
                  <Input disabled={!isEditable} className="h-11 bg-card" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="e.g. Kasimedu Harbor" />
                </Field>
              </FieldRow>
              <Field label="Standard Commission Rate (%)">
                <div className="relative">
                  <Input disabled={!isEditable} type="number" step="0.1" className="h-11 bg-card pr-8" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} placeholder="2.5" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-primary font-black text-sm">%</span>
                </div>
              </Field>
            </FormSection>

            {/* Section 3: Banking */}
            <FormSection icon={<Banknote size={14} />} title="Banking & Payout Details">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Bank Name">
                  <Input disabled={!isEditable} className="h-11 bg-card" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="SBI / HDFC..." />
                </Field>
                <Field label="Account Number">
                  <Input disabled={!isEditable} className="h-11 bg-card font-mono" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="Account No." />
                </Field>
                <Field label="IFSC Code">
                  <Input disabled={!isEditable} className="h-11 bg-card font-mono uppercase" value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value.toUpperCase())} placeholder="SBIN0000001" />
                </Field>
              </div>
              <Field label="UPI ID (Optional)">
                <Input disabled={!isEditable} className="h-11 bg-card" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="vendor@upi" />
              </Field>
            </FormSection>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-surface shrink-0">
            <div className="flex w-full justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                {isEditable ? "Cancel" : "Close"}
              </Button>
              {isEditable && (
                <Button onClick={handleSubmit} loading={isSubmitting} disabled={!name.trim() || !phone.trim()} className="px-8">
                  {editingSupplier ? "Save Changes" : "Register Supplier"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
