import React, { useEffect, useState } from "react";
import { 
  Users, Plus, Search, Phone, Mail, MapPin, 
  Percent, Star, CreditCard, ArrowRight, Trash2, Edit2, AlertCircle 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fetchSuppliers, createSupplier, updateSupplier, deleteSupplier } from "@/services/supplierService";
import { useToast } from "@/components/shared/toast-provider";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const { push: toast } = useToast();

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [origin, setOrigin] = useState("");
  const [supplierType, setSupplierType] = useState("distributor");
  const [commissionRate, setCommissionRate] = useState(0);
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await fetchSuppliers();
      setSuppliers(data);
    } catch (e) {
      toast({ message: "Failed to load suppliers.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const openAddModal = () => {
    setEditingSupplier(null);
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setOrigin("");
    setSupplierType("distributor");
    setCommissionRate(0);
    setBankName("");
    setBankAccount("");
    setBankIfsc("");
    setModalOpen(true);
  };

  const openEditModal = (sup) => {
    setEditingSupplier(sup);
    setName(sup.name || "");
    setPhone(sup.phone || "");
    setEmail(sup.email || "");
    setAddress(sup.address || "");
    setOrigin(sup.place_of_origin || "");
    setSupplierType(sup.supplier_type || "distributor");
    setCommissionRate(sup.commission_rate || 0);
    setBankName(sup.bank_name || "");
    setBankAccount(sup.bank_account || "");
    setBankIfsc(sup.bank_ifsc || "");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast({ message: "Name and Phone are required fields.", variant: "error" });
      return;
    }

    const payload = {
      name,
      phone,
      email,
      address,
      place_of_origin: origin,
      supplier_type: supplierType,
      commission_rate: Number(commissionRate) || 0,
      bank_name: bankName,
      bank_account: bankAccount,
      bank_ifsc: bankIfsc,
    };

    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, payload);
        toast({ message: "Supplier details updated successfully!" });
      } else {
        await createSupplier(payload);
        toast({ message: "Supplier registered successfully!" });
      }
      setModalOpen(false);
      loadSuppliers();
    } catch (err) {
      toast({ message: "Error saving supplier details.", variant: "error" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) return;
    try {
      await deleteSupplier(id);
      toast({ message: "Supplier deleted." });
      loadSuppliers();
    } catch (e) {
      toast({ message: "Failed to delete supplier.", variant: "error" });
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.place_of_origin?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search)
  );

  // Compute KPI summaries
  const totalOutstanding = suppliers.reduce((sum, s) => sum + (Number(s.outstanding_amount) || 0), 0);
  const avgRating = suppliers.length 
    ? (suppliers.reduce((sum, s) => sum + (s.rating || 0), 0) / suppliers.length).toFixed(1) 
    : "0";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Suppliers</h2>
          <p className="text-xs text-textSecondary">Manage vendor accounts, commission rates, and payouts.</p>
        </div>
        <Button onClick={openAddModal} className="flex items-center gap-2">
          <Plus size={16} />
          Register Supplier
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Total Suppliers</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary">{suppliers.length}</span>
            <Users className="h-5 w-5 text-primary opacity-65" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Total Outstanding</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalOutstanding)}</span>
            <CreditCard className="h-5 w-5 text-amber-500 opacity-65" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Avg Vendor Rating</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary flex items-center gap-1">
              {avgRating} <Star className="h-4.5 w-4.5 fill-yellow-400 text-yellow-400" />
            </span>
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Active Deliveries</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary">
              {suppliers.reduce((sum, s) => sum + (s.total_deliveries || 0), 0)}
            </span>
          </div>
        </Card>
      </div>

      {/* Search and Table */}
      <Card hoverEffect={false}>
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-surface/50 px-3 py-1.5 max-w-md">
          <Search size={16} className="text-textSecondary" />
          <input
            type="text"
            placeholder="Search suppliers by name, phone or origin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-textPrimary outline-none"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-textSecondary">Loading suppliers catalog...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="py-12 text-center text-textSecondary">
            <AlertCircle className="mx-auto h-8 w-8 mb-2 text-textSecondary/40" />
            No suppliers match your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border text-xs font-bold uppercase tracking-wider text-textSecondary/70">
                  <th className="pb-3 pr-4">Supplier Name</th>
                  <th className="pb-3 pr-4">Contact</th>
                  <th className="pb-3 pr-4">Origin / Type</th>
                  <th className="pb-3 pr-4 text-center">Comm. Rate</th>
                  <th className="pb-3 pr-4 text-right">Outstanding</th>
                  <th className="pb-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-semibold text-textPrimary">
                {filteredSuppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-border/10 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div>
                        <p className="font-bold text-textPrimary">{sup.name}</p>
                        <p className="text-[10px] text-textSecondary uppercase tracking-wider font-extrabold">{sup.supplier_type_display || sup.supplier_type}</p>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="space-y-0.5 text-xs text-textSecondary">
                        <p className="flex items-center gap-1"><Phone size={11} /> {sup.phone}</p>
                        {sup.email && <p className="flex items-center gap-1"><Mail size={11} /> {sup.email}</p>}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-1 text-xs text-textSecondary">
                        <MapPin size={12} />
                        <span>{sup.place_of_origin || "Unknown"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-center">
                      <span className="inline-flex items-center gap-0.5 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                        {sup.commission_rate}%
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-right font-bold">
                      <span className={Number(sup.outstanding_amount) > 0 ? "text-amber-500" : "text-success"}>
                        {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(sup.outstanding_amount || 0)}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(sup)}
                          className="rounded-lg p-1.5 text-textSecondary hover:bg-border/30 hover:text-textPrimary transition-colors cursor-pointer"
                          title="Edit Supplier"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(sup.id)}
                          className="rounded-lg p-1.5 text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                          title="Delete Supplier"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Edit Supplier Account" : "Register New Supplier"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Supplier / Vendor Name *</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mangalore Fisheries" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Mobile Number *</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876543210" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Email Address</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. contact@supplier.com" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Place of Origin / Harbor</label>
                <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="e.g. Kochi Jetty" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Supplier Type</label>
                <select 
                  value={supplierType} 
                  onChange={(e) => setSupplierType(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary"
                >
                  <option value="distributor">Distributor</option>
                  <option value="boat_owner">Boat Owner</option>
                  <option value="cooperative">Cooperative</option>
                  <option value="agent">Broker/Agent</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Commission Rate (%)</label>
                <Input type="number" step="0.1" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} placeholder="e.g. 2.5" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-textSecondary">Harbor Address / Base Office</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Complete harbor details..." />
            </div>

            {/* Bank details section */}
            <div className="border-t border-border pt-3 mt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Payout Bank Details</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-textSecondary">Bank Name</label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. SBI" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-textSecondary">Account Number</label>
                  <Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="Account Number" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-textSecondary">Bank IFSC Code</label>
                  <Input value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value)} placeholder="IFSC Code" />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 border-t border-border pt-4">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit">{editingSupplier ? "Save Changes" : "Create Supplier"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
