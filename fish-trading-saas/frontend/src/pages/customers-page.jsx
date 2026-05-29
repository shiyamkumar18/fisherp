import React, { useEffect, useState } from "react";
import { 
  Users, Plus, Search, Phone, Mail, MapPin, 
  Briefcase, Star, CreditCard, Trash2, Edit2, AlertCircle 
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer } from "@/services/customerService";
import { useToast } from "@/components/shared/toast-provider";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const { push: toast } = useToast();

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
      toast({ message: "Failed to load customers.", variant: "error" });
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
      toast({ message: "Error saving customer details.", variant: "error" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this customer profile?")) return;
    try {
      await deleteCustomer(id);
      toast({ message: "Customer profile deleted." });
      loadCustomers();
    } catch (e) {
      toast({ message: "Failed to delete customer profile.", variant: "error" });
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
                          onClick={() => handleDelete(cust.id)}
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
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Edit Customer Details" : "Add Customer Profile"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Buyer / Customer Name *</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh Kumar" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Mobile Number *</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876500111" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Email Address</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. contact@buyer.com" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Client Type</label>
                <select 
                  value={buyerType} 
                  onChange={(e) => setBuyerType(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary"
                >
                  <option value="retail">Retailer</option>
                  <option value="wholesale">Wholesaler</option>
                  <option value="export">Exporter</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Company / Business Name</label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Harbor Retail Ltd." />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">GST Identification Number</label>
                <Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="e.g. 29AAAAA0000A1Z1" />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-bold text-textSecondary">Credit Exposure Limit (INR)</label>
                <Input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="e.g. 150000" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-textSecondary">Base Delivery Address</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Complete billing/shipping address..." />
            </div>

            <DialogFooter className="mt-6 border-t border-border pt-4">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit">{editingCustomer ? "Save Changes" : "Register Profile"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
