import React, { useState } from "react";
import { 
  X, Printer, Download, CreditCard, CheckCircle, 
  XCircle, Clock, Truck, FileText, User, IndianRupee,
  Activity, Tag, Calendar
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Button from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/shared/toast-provider";
import { apiClient } from "@/services/apiClient";

const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

export default function SaleDetailModal({ sale, open, onOpenChange, onUpdate }) {
  const { session } = useAuthStore();
  const { push: toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!sale) return null;

  const role = session?.user?.role || "sales_staff";
  const canViewProfit = ["super_admin", "tenant_admin", "accountant", "sales_manager"].includes(role);
  const canApprove = ["super_admin", "tenant_admin", "sales_manager"].includes(role);
  const canProcessPayment = ["super_admin", "tenant_admin", "accountant"].includes(role);

  const handleAction = async (actionEndpoint, successMessage) => {
    setLoading(true);
    try {
      await apiClient.post(`/sales/${sale.id}/${actionEndpoint}/`);
      toast({ message: successMessage });
      onUpdate();
    } catch (e) {
      toast({ message: e?.response?.data?.error || "Action failed.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const pKey = (sale.payment_status || "pending").toLowerCase();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl overflow-y-auto max-h-[90vh] bg-surface border-border">
        <DialogHeader className="border-b border-border pb-4 flex flex-row items-start justify-between">
          <div>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              Invoice {sale.invoice_number}
              {pKey === "paid" && <CheckCircle className="text-success h-5 w-5" />}
              {pKey === "pending" && <Clock className="text-amber-500 h-5 w-5" />}
            </DialogTitle>
            <p className="text-sm text-textSecondary mt-1 flex items-center gap-2">
              <Calendar size={14} /> {sale.date} 
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold capitalize">
                {sale.sale_type_display || sale.sale_type}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
              <Printer size={14} /> Print
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download size={14} /> PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
          
          {/* Left Column: Details */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-surface/50 border border-border rounded-xl p-4">
              <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 mb-3">
                <User size={16} className="text-primary" /> Customer Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-textSecondary text-xs">Name</p>
                  <p className="font-semibold">{sale.buyer_name}</p>
                </div>
                <div>
                  <p className="text-textSecondary text-xs">Delivery Address</p>
                  <p className="font-semibold">{sale.delivery_address || "N/A"}</p>
                </div>
              </div>
            </div>

            <div className="bg-surface/50 border border-border rounded-xl p-4">
              <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 mb-3">
                <Tag size={16} className="text-primary" /> Line Items & Batch Allocation
              </h3>
              <table className="w-full text-sm">
                <thead className="text-xs text-textSecondary border-b border-border/50">
                  <tr>
                    <th className="pb-2 text-left font-semibold">Batch</th>
                    <th className="pb-2 text-right font-semibold">Packages</th>
                    <th className="pb-2 text-right font-semibold">Weight</th>
                    <th className="pb-2 text-right font-semibold">Rate</th>
                    <th className="pb-2 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  <tr className="font-medium text-textPrimary">
                    <td className="py-3">{sale.batch_number}</td>
                    <td className="py-3 text-right">{sale.number_of_packages_sold}</td>
                    <td className="py-3 text-right">
                      {sale.number_of_packages_sold * sale.selling_weight_per_package} kg
                      <div className="text-[10px] text-textSecondary">{sale.selling_weight_per_package} kg/pkg</div>
                    </td>
                    <td className="py-3 text-right">{formatINR(sale.selling_price_per_kg)}/kg</td>
                    <td className="py-3 text-right">{formatINR(sale.total_revenue)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-4 pt-4 border-t border-border/50 flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between text-textSecondary">
                    <span>Subtotal:</span>
                    <span className="text-textPrimary">{formatINR(sale.total_revenue)}</span>
                  </div>
                  <div className="flex justify-between text-danger">
                    <span>Discount:</span>
                    <span>-{formatINR(sale.discount_amount)}</span>
                  </div>
                  <div className="flex justify-between text-textSecondary">
                    <span>Tax ({sale.tax_percent}%):</span>
                    <span className="text-textPrimary">+{formatINR(sale.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-border/50 text-textPrimary">
                    <span>Grand Total:</span>
                    <span className="text-primary">{formatINR(sale.final_amount)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {canViewProfit && (
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Financial Margin</h3>
                  <p className="text-[10px] text-textSecondary">Visible to Admin/Finance only</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold text-primary">{formatINR(sale.profit)}</p>
                  <p className="text-xs font-bold text-success">
                    {((sale.profit / (sale.final_amount || 1)) * 100).toFixed(1)}% Margin
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Actions & Logs */}
          <div className="space-y-6">
            
            {/* Status Card */}
            <div className="bg-surface/50 border border-border rounded-xl p-4 space-y-4">
              <div>
                <p className="text-xs text-textSecondary font-semibold">Payment Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize
                    ${pKey === 'paid' ? 'bg-success/20 text-success' : 'bg-amber-500/20 text-amber-500'}
                  `}>
                    {sale.payment_status}
                  </span>
                </div>
              </div>
              
              <div className="pt-3 border-t border-border/50">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-textSecondary">Received:</span>
                  <span className="font-bold text-success">{formatINR(sale.amount_received)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Pending:</span>
                  <span className="font-bold text-amber-500">{formatINR(sale.pending_amount)}</span>
                </div>
              </div>
            </div>

            {/* Actions Card */}
            <div className="bg-surface/50 border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-textPrimary mb-2">Actions</h3>
              
              {canProcessPayment && pKey !== "paid" && (
                <Button 
                  className="w-full justify-start gap-2 bg-success hover:bg-success/90 text-white" 
                  disabled={loading}
                >
                  <IndianRupee size={16} /> Record Payment
                </Button>
              )}
              
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => handleAction("mark_delivered", "Invoice marked as delivered.")}
                disabled={loading}
              >
                <Truck size={16} /> Mark Delivered
              </Button>
              
              {canApprove && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 text-danger hover:bg-danger/10 hover:text-danger border-danger/20"
                  disabled={loading}
                >
                  <XCircle size={16} /> Process Return
                </Button>
              )}
            </div>
            
            {/* Activity Log stub */}
            <div className="bg-surface/50 border border-border rounded-xl p-4">
              <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 mb-3">
                <Activity size={16} className="text-textSecondary" /> Recent Activity
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="text-textPrimary font-medium">Invoice Generated</p>
                    <p className="text-textSecondary text-[10px]">{sale.created_at || "Just now"}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
