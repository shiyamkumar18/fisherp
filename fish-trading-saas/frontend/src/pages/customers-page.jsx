import React, { useEffect, useState } from "react";
import {
  Users, User, Plus, Search, Phone, Mail, MapPin,
  Briefcase, Star, CreditCard, Trash2, Edit2, AlertCircle
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer } from "@/services/customerService";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/components/shared/toast-provider";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const { push: toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { canEditForm, canViewFinancial, canDelete } = usePermission();
  const isEditable = canEditForm("customers");
  const [isDeleting, setIsDeleting] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [buyerType, setBuyerType] = useState("retail");
  const [businessName, setBusinessName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [creditLimit, setCreditLimit] = useState(0);

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

  useEffect(() => {
    loadCustomers();
  }, []);

  const openAddModal = () => {
    setEditingCustomer(null);
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setBuyerType("retail");
    setBusinessName("");
    setGstNumber("");
    setCreditLimit(0);
    setModalOpen(true);
  };

  const openEditModal = (cust) => {
    setEditingCustomer(cust);
    setName(cust.name || "");
    setPhone(cust.phone || "");
    setEmail(cust.email || "");
    setAddress(cust.address || "");
    setBuyerType(cust.buyer_type || "retail");
    setBusinessName(cust.business_name || "");
    setGstNumber(cust.gst_number || "");
    setCreditLimit(cust.credit_limit || 0);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast({ message: "Name and Phone are required fields.", variant: "error" });
      return;
    }
    setIsSubmitting(true);

    const payload = {
      name,
      phone,
      email,
      address,
      buyer_type: buyerType,
      business_name: businessName,
      gst_number: gstNumber,
      credit_limit: Number(creditLimit) || 0,
    };

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload);
        toast({ message: "Customer profile updated successfully!" });
      } else {
        await createCustomer(payload);
        toast({ message: "Customer profile registered successfully!" });
      }
      setModalOpen(false);
      loadCustomers();
    } catch (err) {
      toast({ message: err?.message || "Error saving customer details.", variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this customer profile?")) return;
    setIsDeleting(true);
    try {
      await deleteCustomer(id);
      toast({ message: "Customer profile deleted." });
      loadCustomers();
    } catch (e) {
      toast({ message: e?.message || "Failed to delete customer profile.", variant: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const totalOutstanding = customers.reduce((sum, c) => sum + (Number(c.total_pending) || 0), 0);
  const totalCreditLimit = customers.reduce((sum, c) => sum + (Number(c.credit_limit) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Customers / Buyers</h2>
          <p className="text-xs text-textSecondary">Manage client accounts, credit exposure, and billing registries.</p>
        </div>
        <Button onClick={openAddModal} className="flex items-center gap-2">
          <Plus size={16} />
          Add Customer Profile
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Total Buyers</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary">{customers.length}</span>
            <Users className="h-5 w-5 text-primary opacity-65" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Active Exposure</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-amber-500">
              {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalOutstanding)}
            </span>
            <CreditCard className="h-5 w-5 text-amber-500 opacity-65" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Total Credit Allowed</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary">
              {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalCreditLimit)}
            </span>
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Gross Trades logged</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary">
              {customers.reduce((sum, c) => sum + (c.total_orders || 0), 0)}
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
            placeholder="Search customers by name, business or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-textPrimary outline-none"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-textSecondary">Loading customer registry...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-12 text-center text-textSecondary">
            <AlertCircle className="mx-auto h-8 w-8 mb-2 text-textSecondary/40" />
            No customer profiles match your search query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border text-xs font-bold uppercase tracking-wider text-textSecondary/70">
                  <th className="pb-3 pr-4">Buyer Details</th>
                  <th className="pb-3 pr-4">Contact</th>
                  <th className="pb-3 pr-4">Business Info</th>
                  <th className="pb-3 pr-4 text-right">Credit Limit</th>
                  <th className="pb-3 pr-4 text-right">Outstanding Receivables</th>
                  <th className="pb-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-semibold text-textPrimary">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-border/10 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div>
                        <p className="font-bold text-textPrimary">{cust.name}</p>
                        <p className="text-[10px] text-textSecondary uppercase tracking-wider font-extrabold">{cust.buyer_type_display || cust.buyer_type}</p>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="space-y-0.5 text-xs text-textSecondary">
                        <p className="flex items-center gap-1"><Phone size={11} /> {cust.phone}</p>
                        {cust.email && <p className="flex items-center gap-1"><Mail size={11} /> {cust.email}</p>}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <div>
                        <p className="text-xs font-bold text-textPrimary">{cust.business_name || "—"}</p>
                        {cust.gst_number && <p className="text-[10px] text-textSecondary uppercase tracking-wider font-bold">GST: {cust.gst_number}</p>}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <span className="text-textPrimary">
                        {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(cust.credit_limit || 0)}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-right font-bold">
                      <span className={Number(cust.total_pending) > 0 ? "text-amber-500" : "text-success"}>
                        {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(cust.total_pending || 0)}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(cust)}
                          className="rounded-lg p-1.5 text-textSecondary hover:bg-border/30 hover:text-textPrimary transition-colors cursor-pointer"
                          title="Edit Customer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(cust.id)} disabled={isDeleting}
                          className="rounded-lg p-1.5 text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                          title="Delete Customer"
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
      
      {/* Add/Edit Modal - Enterprise UI */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b border-border bg-surface/50">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
              <Users size={20} className="text-primary" />
              {editingCustomer ? "Edit Customer Profile" : "Register New Customer"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 bg-background space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Section 1: Basic Information */}
              <Card className="p-5 shadow-sm border-border/60">
                <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 mb-4">
                  <User size={16} className="text-primary" /> Basic Information
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-textSecondary uppercase tracking-wider">Full Name / Contact Person *</label>
                    <Input disabled={!isEditable} className="h-11 bg-surface" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh Kumar" required />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-textSecondary uppercase tracking-wider">Mobile Number *</label>
                      <Input disabled={!isEditable} className="h-11 bg-surface" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876500111" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-textSecondary uppercase tracking-wider">Email Address</label>
                      <Input disabled={!isEditable} type="email" className="h-11 bg-surface" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. contact@buyer.com" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-textSecondary uppercase tracking-wider">Base Delivery Address</label>
                    <textarea disabled={!isEditable} 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      rows="2"
                      placeholder="Complete billing/shipping address..." 
                      className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none focus:border-primary transition-all min-h-[60px]"
                    />
                  </div>
                </div>
              </Card>

              {/* Section 2: Business & Financials */}
              <Card className="p-5 shadow-sm border-border/60">
                <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 mb-4">
                  <Briefcase size={16} className="text-primary" /> Business Profile & Credit
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-textSecondary uppercase tracking-wider">Client Category</label>
                      <select disabled={!isEditable} 
                        value={buyerType} 
                        onChange={(e) => setBuyerType(e.target.value)}
                        className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary transition-all"
                      >
                        <option value="retail">Retailer</option>
                        <option value="wholesale">Wholesaler</option>
                        <option value="export">Exporter</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-textSecondary uppercase tracking-wider">Company / Entity Name</label>
                      <Input disabled={!isEditable} className="h-11 bg-surface" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Harbor Retail Ltd." />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-textSecondary uppercase tracking-wider">GST / Tax ID Number</label>
                    <Input disabled={!isEditable} className="h-11 bg-surface font-mono text-sm" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="e.g. 29AAAAA0000A1Z1" />
                  </div>

                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 mt-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-amber-600 dark:text-amber-500 uppercase tracking-wider flex items-center gap-1">
                        <CreditCard size={12} /> Credit Exposure Limit (INR)
                      </label>
                      <Input disabled={!isEditable} type="number" className="h-11 bg-surface border-amber-500/30 focus:border-amber-500" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="e.g. 150000" />
                      <p className="text-[10px] text-textSecondary mt-1">Set the maximum allowable outstanding balance before alerts trigger.</p>
                    </div>
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
                <Button onClick={handleSubmit} loading={isSubmitting} disabled={!name.trim() || !phone.trim()} className="px-8 shadow-sm">
                  {editingCustomer ? "Save Changes" : "Register Profile"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
