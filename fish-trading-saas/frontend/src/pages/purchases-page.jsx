import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  ShoppingBag, Plus, Search, Calendar, User, MapPin, 
  Package, Weight, DollarSign, AlertCircle, Info, Sparkles, Trash2, ShieldCheck
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { fetchPurchaseBatches, deletePurchaseBatch } from "@/services/purchaseService";
import { fetchSuppliers } from "@/services/supplierService";
import { fetchFishTypes } from "@/services/productService";
import { useToast } from "@/components/shared/toast-provider";
import { usePermission } from "@/hooks/usePermission";

const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

export default function PurchasesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { push: toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const { canEditForm, canDelete, canViewFinancial } = usePermission();
  const isEditable = canEditForm('purchases');

  const loadData = async () => {
    setLoading(true);
    try {
      const bData = await fetchPurchaseBatches();
      setBatches(bData);
    } catch (e) {
      toast({ message: e?.message || "Failed to load purchases.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle voice pre-fill
  useEffect(() => {
    if (location.state?.voiceData) {
      navigate('/dashboard/purchases/new', { state: { voiceData: location.state.voiceData } });
    }
  }, [location.state, navigate]);

  const handleOpenAdd = () => {
    navigate('/dashboard/purchases/new');
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this purchase batch?")) return;
    setIsDeleting(true);
    try {
      await deletePurchaseBatch(id);
      toast({ message: "Batch record removed." });
      loadData();
    } catch (e) {
      toast({ message: e?.message || "Failed to delete batch record.", variant: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredBatches = batches.filter(b => 
    b.batch_number?.toLowerCase().includes(search.toLowerCase()) ||
    b.fisherman_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.place_of_buying?.toLowerCase().includes(search.toLowerCase()) ||
    b.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.fish_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Purchase Batches</h2>
          <p className="text-xs text-textSecondary">Log inbound shipments, calculate package expenses, and update stock.</p>
        </div>
        {isEditable && (
        <Button onClick={handleOpenAdd} className="flex items-center gap-2">
          <Plus size={16} />
          Log Purchase Batch
        </Button>
        )}
      </div>

      {/* Overview stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Inbound Batches</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary">{batches.length}</span>
            <ShoppingBag className="h-5 w-5 text-primary opacity-65" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">In Stock (Packages)</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary">
              {batches.reduce((sum, b) => sum + (b.remaining_packages || 0), 0)}
            </span>
            <Package className="h-5 w-5 text-cyan-500 opacity-65" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Total Tonnage</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary">
              {((batches.reduce((sum, b) => sum + (Number(b.total_weight) || 0), 0)) / 1000).toFixed(1)} MT
            </span>
            <Weight className="h-5 w-5 text-emerald-500 opacity-65" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Pending Payouts</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary text-amber-500">
              {formatINR(batches.reduce((sum, b) => sum + (Number(b.pending_amount) || 0), 0))}
            </span>
          </div>
        </Card>
      </div>

      {/* Main Table */}
      <Card hoverEffect={false}>
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-surface/50 px-3 py-1.5 max-w-md">
          <Search size={16} className="text-textSecondary" />
          <input
            type="text"
            placeholder="Search batches by number, fish, fisherman, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-textPrimary outline-none"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-textSecondary">Loading purchase registers...</div>
        ) : filteredBatches.length === 0 ? (
          <div className="py-12 text-center text-textSecondary">
            <AlertCircle className="mx-auto h-8 w-8 mb-2 text-textSecondary/40" />
            No purchase records found.
          </div>
        ) : (
          <div className="w-full">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border text-xs font-bold uppercase tracking-wider text-textSecondary/70">
                  <th className="pb-3 pr-4">Batch Info</th>
                  <th className="pb-3 pr-4">Vendor & Buying Place</th>
                  <th className="pb-3 pr-4">Weight & Vol</th>
                  {canViewFinancial() && (
                    <>
                      <th className="pb-3 pr-4 text-right">Actual Cost/Kg</th>
                      <th className="pb-3 pr-4 text-right">Total Expense</th>
                      <th className="pb-3 pr-4 text-right">Pending Pay</th>
                    </>
                  )}
                  <th className="pb-3 text-center">Grade</th>
                  <th className="pb-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-semibold text-textPrimary">
                {filteredBatches.map((b) => (
                  <tr key={b.id} onClick={() => navigate(`/dashboard/purchases/${b.id}`)} className="hover:bg-border/10 transition-colors cursor-pointer">
                    <td className="py-3.5 pr-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-textPrimary">{b.batch_number}</p>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            b.workflow_state === 'draft' ? 'bg-amber-500/10 text-amber-500' :
                            b.workflow_state === 'approved' ? 'bg-blue-500/10 text-blue-500' :
                            b.workflow_state === 'stock_posted' ? 'bg-emerald-500/10 text-emerald-500' :
                            b.workflow_state === 'financially_posted' ? 'bg-purple-500/10 text-purple-500' :
                            'bg-border text-textSecondary'
                          }`}>
                            {b.workflow_state_display || b.workflow_state}
                          </span>
                        </div>
                        <p className="text-xs text-primary mt-0.5">{b.fish_name}</p>
                        <div className="flex items-center gap-1 text-[10px] text-textSecondary mt-0.5">
                          <Calendar size={10} />
                          <span>{b.date}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <div>
                        <p className="text-xs font-bold text-textPrimary">{b.supplier_name}</p>
                        {b.fisherman_name && (
                          <p className="text-[10px] text-textSecondary flex items-center gap-0.5 mt-0.5">
                            <User size={10} /> {b.fisherman_name}
                          </p>
                        )}
                        {b.place_of_buying && (
                          <p className="text-[10px] text-textSecondary flex items-center gap-0.5">
                            <MapPin size={10} /> {b.place_of_buying}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-xs">
                      <div>
                        <p className="font-bold">{b.remaining_packages} / {b.number_of_packages} pkg</p>
                        <p className="text-textSecondary text-[10px]">{b.total_weight} kg ({b.package_weight}kg/pkg)</p>
                      </div>
                    </td>
                    {canViewFinancial() && (
                      <>
                        <td className="py-3.5 pr-4 text-right">
                          <p className="font-bold text-textPrimary">{formatINR(b.actual_cost_per_kg || b.price_per_kg)}/kg</p>
                          <p className="text-[10px] text-textSecondary">Base: {formatINR(b.price_per_kg)}</p>
                        </td>
                        <td className="py-3.5 pr-4 text-right">
                          <p className="font-bold text-textPrimary">{formatINR(Number(b.total_expense) || 0)}</p>
                          <p className="text-[10px] text-textSecondary">Exp: {formatINR(Math.max(0, Number(b.total_expense || 0) - Number(b.fish_cost || 0)))}</p>
                        </td>
                        <td className="py-3.5 pr-4 text-right">
                          <span className={Number(b.pending_amount) > 0 ? "text-amber-500" : "text-success"}>
                            {formatINR(b.pending_amount || 0)}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="py-3.5 text-center">
                      <span className="inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                        {b.quality_grade}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      {canDelete("purchases") && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }}
                          className="rounded-lg p-1.5 text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                          title="Delete Batch"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden flex flex-col gap-4">
              {filteredBatches.map((b) => (
                <div key={b.id} className="bg-surface border border-border rounded-xl p-4 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-extrabold text-textPrimary text-base">{b.batch_number}</p>
                      <p className="text-sm font-bold text-primary">{b.fish_name}</p>
                      <div className="flex items-center gap-1 text-[11px] text-textSecondary mt-1">
                        <Calendar size={12} />
                        <span>{b.date}</span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                      Grade {b.quality_grade}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                    <div>
                      <p className="text-[10px] text-textSecondary uppercase tracking-wider font-bold">Supplier</p>
                      <p className="text-sm font-bold text-textPrimary">{b.supplier_name}</p>
                      {b.place_of_buying && (
                        <p className="text-[11px] text-textSecondary flex items-center gap-0.5 mt-0.5">
                          <MapPin size={10} /> {b.place_of_buying}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-textSecondary uppercase tracking-wider font-bold">Stock</p>
                      <p className="text-sm font-bold text-textPrimary">{b.remaining_packages} / {b.number_of_packages} pkg</p>
                      <p className="text-[11px] text-textSecondary">{b.total_weight} kg total</p>
                    </div>
                  </div>

                  {canViewFinancial() && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase tracking-wider font-bold">Cost/Kg</p>
                        <p className="text-sm font-bold text-textPrimary">{formatINR(b.actual_cost_per_kg || b.price_per_kg)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase tracking-wider font-bold">Pending Pay</p>
                        <p className={`text-sm font-bold ${Number(b.pending_amount) > 0 ? "text-amber-500" : "text-success"}`}>
                          {formatINR(b.pending_amount || 0)}
                        </p>
                      </div>
                    </div>
                  )}

                  {canDelete("purchases") && (
                    <div className="pt-3 border-t border-border/50 flex justify-end">
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-danger/10 text-danger border border-danger/20 rounded-lg text-xs font-bold active:scale-95 transition-all"
                      >
                        <Trash2 size={14} /> Void Batch
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Modal deleted - replaced by Full Detail Page workflow */}
    </div>
  );
}
