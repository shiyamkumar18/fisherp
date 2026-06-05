import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  TrendingUp, Plus, Search, Calendar, User, FileText, 
  Layers, DollarSign, Percent, AlertCircle, ShoppingCart, Truck, Trash2, Sparkles, CheckCircle2
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { fetchSales, deleteSale } from "@/services/salesService";
import { useToast } from "@/components/shared/toast-provider";
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
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { push: toast } = useToast();
  const { canEditForm, canViewFinancial, canDelete } = usePermission();
  const isEditable = canEditForm("sales");
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const sData = await fetchSales();
      setSales(sData);
    } catch (e) {
      toast({ message: e?.message || "Failed to fetch sales assets.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenAdd = () => {
    navigate("/dashboard/sales/new");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to void this sales invoice?")) return;
    setIsDeleting(true);
    try {
      await deleteSale(id);
      toast({ message: "Invoice record voided." });
      loadData();
    } catch (e) {
      toast({ message: e?.message || "Failed to delete sales record.", variant: "error" });
    } finally {
      setIsDeleting(false);
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
        {isEditable && (
        <Button onClick={handleOpenAdd} className="flex items-center gap-2">
          <Plus size={16} />
          Create Invoice
        </Button>
        )}
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
          <div className="py-12 text-center text-textSecondary animate-pulse">Loading invoice history...</div>
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
                      onClick={() => navigate(`/dashboard/sales/${s.id}`)}
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
                        {canDelete("sales") && (
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
                    onClick={() => navigate(`/dashboard/sales/${s.id}`)}
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

                    {canDelete("sales") && (
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
    </div>
  );
}
