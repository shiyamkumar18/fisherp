import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, CheckCircle, Clock, XCircle, AlertCircle, FileText, 
  User, DollarSign, Calendar, ChevronRight, Activity, Download,
  Printer, Share2, ArrowUpRight, ArrowDownLeft, ShieldCheck, Check, ArrowRight
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { fetchPaymentDetails, approvePayment, markPaymentPaid, reversePayment, cancelPayment } from "@/services/paymentService";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/components/shared/toast-provider";

const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n || 0);

const formatDate = (ds) => {
  if (!ds) return "—";
  return new Date(ds).toLocaleString();
};

export default function PaymentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push: toast } = useToast();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { canEditForm } = usePermission();
  const isFinance = canEditForm("financials"); // Assuming financial edit permission handles approvals

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchPaymentDetails(id);
      setPayment(data);
    } catch (e) {
      toast({ message: "Failed to load payment details.", variant: "error" });
      navigate("/dashboard/payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAction = async (actionFn, actionName, needsReason = false) => {
    let reason = "";
    if (needsReason) {
      reason = window.prompt(`Please provide a reason to ${actionName} this payment:`);
      if (reason === null) return; // cancelled
      if (!reason.trim()) {
        toast({ message: "Reason is required.", variant: "error" });
        return;
      }
    } else if (actionName === "reverse" || actionName === "cancel") {
       if(!window.confirm(`Are you sure you want to ${actionName} this payment?`)) return;
    }

    setProcessing(true);
    try {
      await actionFn(id, reason);
      toast({ message: `Payment ${actionName} successfully.` });
      loadData();
    } catch (e) {
      toast({ message: e?.message || `Failed to ${actionName} payment.`, variant: "error" });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="py-20 flex justify-center text-textSecondary">Loading payment dossier...</div>;
  }

  if (!payment) return null;

  const isDraft = payment.status === 'draft';
  const isPending = payment.status === 'pending_approval';
  const isApproved = payment.status === 'approved';
  const isPaid = payment.status === 'paid';
  const isReversed = payment.status === 'reversed';
  const isCancelled = payment.status === 'cancelled';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-border pb-6">
        <div>
          <button onClick={() => navigate(-1)} className="text-textSecondary hover:text-textPrimary flex items-center gap-1 text-sm font-bold mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Ledger
          </button>
          
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h2 className="text-3xl font-black tracking-tight text-textPrimary flex items-center gap-2">
              {payment.payment_type === 'inbound' ? <ArrowDownLeft className="text-primary"/> : <ArrowUpRight className="text-danger"/>}
              {payment.reference_number || `PAY-${payment.id.toString().padStart(5, '0')}`}
            </h2>
            
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-1.5
              ${isPaid ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                isDraft ? 'bg-hover text-textPrimary border-border' : 
                isPending ? 'bg-amber-100 text-warning border-warning/30' :
                isApproved ? 'bg-primary/20 text-primaryHover border-indigo-200' :
                'bg-rose-100 text-rose-700 border-rose-200'
              }`}>
              {isPaid && <CheckCircle size={14}/>}
              {isPending && <Clock size={14}/>}
              {isApproved && <ShieldCheck size={14}/>}
              {isDraft && <FileText size={14}/>}
              {payment.status.replace('_', ' ')}
            </span>
            
            {payment.reconciliation_status === 'matched' && (
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Check size={14} /> Reconciled
              </span>
            )}
            
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-hover text-textPrimary border border-border">
              {payment.payment_type_display}
            </span>
          </div>
          
          <div className="flex items-center gap-6 text-sm font-medium text-textSecondary mt-3">
            <span className="flex items-center gap-1.5"><User size={14}/> {payment.buyer_name || payment.supplier_name}</span>
            <span className="flex items-center gap-1.5"><Calendar size={14}/> {payment.date}</span>
            <span className="flex items-center gap-1.5 text-textSecondary/70">Created by: Admin • {formatDate(payment.created_at)}</span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex flex-wrap gap-2 md:justify-end">
          {isDraft && (
            <>
              <Button onClick={() => handleAction(approvePayment, 'submit for approval')} disabled={processing} className="bg-primary text-white hover:bg-primaryHover font-bold">Request Approval</Button>
              <Button onClick={() => handleAction(markPaymentPaid, 'process as paid')} disabled={processing} className="bg-success text-white hover:bg-emerald-700 font-bold">Mark Paid</Button>
            </>
          )}
          {isPending && isFinance && (
            <>
              <Button onClick={() => handleAction(approvePayment, 'approve')} disabled={processing} className="bg-primary text-white hover:bg-primaryHover font-bold">Approve Payment</Button>
              <Button onClick={() => handleAction(cancelPayment, 'reject', true)} disabled={processing} variant="danger" className="bg-rose-100 text-rose-700 hover:bg-rose-200 font-bold">Reject</Button>
            </>
          )}
          {isApproved && (
            <Button onClick={() => handleAction(markPaymentPaid, 'process as paid')} disabled={processing} className="bg-success text-white hover:bg-emerald-700 font-bold">Mark Paid</Button>
          )}
          
          <div className="w-full sm:w-auto h-px sm:h-auto sm:border-l border-border mx-1 my-2 sm:my-0"></div>
          
          <Button variant="outline" className="font-bold gap-2 text-textPrimary border-border hover:bg-card"><Download size={16}/> PDF</Button>
          <Button variant="outline" className="font-bold gap-2 text-textPrimary border-border hover:bg-card"><Printer size={16}/> Print</Button>
          
          {(isDraft || isApproved || isPending) && (
            <div className="w-full sm:w-auto mt-2 sm:mt-0 flex gap-2">
              <Button onClick={() => handleAction(cancelPayment, 'cancel', true)} disabled={processing} variant="danger" className="bg-danger/10 text-danger hover:bg-rose-100 font-bold">Cancel</Button>
            </div>
          )}
          {isPaid && (
            <Button onClick={() => handleAction(reversePayment, 'reverse', true)} disabled={processing} variant="danger" className="bg-danger/10 text-danger hover:bg-rose-100 font-bold mt-2 sm:mt-0">Reverse Transaction</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-0 shadow-lg shadow-slate-200/50">
            <div className="bg-card px-6 py-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-black text-textPrimary flex items-center gap-2">
                <FileText size={18} className="text-primary" /> Transaction Particulars
              </h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-6">
                <div>
                  <p className="text-xs font-black text-textSecondary/70 uppercase tracking-widest mb-1.5">Counterparty</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                      {(payment.buyer_name || payment.supplier_name || 'U').charAt(0)}
                    </div>
                    <p className="font-bold text-textPrimary truncate">{payment.buyer_name || payment.supplier_name}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-black text-textSecondary/70 uppercase tracking-widest mb-1.5">Transaction Amount</p>
                  <p className="font-black text-2xl text-slate-900 tracking-tight">{formatINR(payment.amount)}</p>
                </div>
                <div>
                  <p className="text-xs font-black text-textSecondary/70 uppercase tracking-widest mb-1.5">Payment Method</p>
                  <p className="font-bold text-textPrimary capitalize bg-hover inline-block px-3 py-1 rounded-lg">{payment.payment_mode_display || payment.payment_mode}</p>
                </div>
                <div>
                  <p className="text-xs font-black text-textSecondary/70 uppercase tracking-widest mb-1.5">Reference No.</p>
                  <p className="font-bold text-textPrimary font-mono">{payment.reference_number || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-black text-textSecondary/70 uppercase tracking-widest mb-1.5">Allocated</p>
                  <p className="font-bold text-success">{formatINR(payment.allocated_amount)}</p>
                </div>
                <div>
                  <p className="text-xs font-black text-textSecondary/70 uppercase tracking-widest mb-1.5">Unallocated / Advance</p>
                  <p className={`font-bold ${payment.unallocated_balance > 0 ? 'text-warning' : 'text-textSecondary'}`}>{formatINR(payment.unallocated_balance)}</p>
                </div>
              </div>
              
              {payment.notes && (
                <div className="mt-8 pt-6 border-t border-border/50 bg-card/50 -mx-6 -mb-6 px-6 py-6">
                  <p className="text-xs font-black text-textSecondary/70 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <AlertCircle size={14}/> Internal Remarks
                  </p>
                  <p className="text-sm font-medium text-textPrimary italic border-l-2 border-indigo-200 pl-3">{payment.notes}</p>
                </div>
              )}
            </div>
          </Card>
          
          {/* Allocations Card */}
          <Card className="overflow-hidden border-0 shadow-lg shadow-slate-200/50">
            <div className="bg-card px-6 py-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-black text-textPrimary flex items-center gap-2">
                <CheckCircle size={18} className="text-success" /> Invoice Allocations
              </h3>
            </div>
            <div className="p-0">
              {payment.sale_invoice_number || payment.purchase_batch_number ? (
                <div className="divide-y divide-slate-100">
                  <div className="p-5 flex items-center justify-between hover:bg-card transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <FileText className="text-primary" size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-textPrimary">
                          {payment.payment_type === 'inbound' ? `Invoice: ${payment.sale_invoice_number}` : `Batch: ${payment.purchase_batch_number}`}
                        </p>
                        <p className="text-xs font-medium text-textSecondary mt-0.5">Primary Allocation</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-success">{formatINR(payment.allocated_amount)}</p>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded mt-1 inline-block">Allocated</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-10 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mb-3">
                    <FileText size={24} className="text-textSecondary/50" />
                  </div>
                  <p className="font-bold text-textPrimary">No Document Allocated</p>
                  <p className="text-sm font-medium text-textSecondary mt-1 max-w-xs">This payment is currently held as an advance and is not applied to any specific invoice.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Audit Trail */}
          <Card className="overflow-hidden border-0 shadow-lg shadow-slate-200/50">
            <div className="bg-card px-6 py-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-black text-textPrimary flex items-center gap-2">
                <Activity size={18} className="text-primary" /> Activity Ledger
              </h3>
            </div>
            <div className="p-6">
              {payment.audit_logs && payment.audit_logs.length > 0 ? (
                <div className="space-y-6">
                  {payment.audit_logs.map((log, i) => (
                    <div key={log.id} className="flex gap-4 group">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-sm relative z-10 group-hover:bg-primary group-hover:text-white transition-colors">
                          <User size={14} />
                        </div>
                        {i !== payment.audit_logs.length - 1 && (
                          <div className="w-px h-full bg-border mt-2"></div>
                        )}
                      </div>
                      <div className="pb-2 w-full">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-bold text-textPrimary">
                            {log.changed_by_name || 'System'} <span className="text-textSecondary font-medium ml-1 capitalize">{log.action.replace('_', ' ')}</span>
                          </p>
                          <span className="text-[10px] font-bold text-textSecondary/70 uppercase tracking-wider bg-hover px-2 py-0.5 rounded">{formatDate(log.timestamp)}</span>
                        </div>
                        {log.reason && <p className="text-xs text-textSecondary italic mb-3 border-l-2 border-indigo-200 pl-2">"{log.reason}"</p>}
                        
                        {/* Show changes if any */}
                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <div className="bg-card rounded-xl p-4 border border-border/50 text-xs font-medium space-y-2 mt-2 group-hover:border-primary/20 transition-colors">
                            {Object.entries(log.changes).map(([field, vals]) => {
                              if (field === 'old' || field === 'new') return null;
                              if (vals && typeof vals === 'object' && vals.old !== undefined) {
                                return (
                                  <div key={field} className="flex items-center gap-4">
                                    <span className="text-textSecondary/70 uppercase tracking-wider font-bold w-20 shrink-0">{field}</span>
                                    <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-border flex-1">
                                      <span className="line-through text-danger font-bold">{String(vals.old) || '—'}</span>
                                      <ArrowRight size={12} className="text-textSecondary/70" />
                                      <span className="text-success font-black">{String(vals.new) || '—'}</span>
                                    </div>
                                  </div>
                                );
                              } else if (typeof vals === 'string') {
                                return (
                                  <div key={field} className="flex items-center gap-4">
                                    <span className="text-textSecondary/70 uppercase tracking-wider font-bold w-20 shrink-0">{field}</span>
                                    <span className="text-textPrimary font-bold bg-white px-3 py-1.5 rounded-lg border border-border flex-1">{vals}</span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 opacity-60">
                  <Activity size={24} className="text-textSecondary/70 mx-auto mb-2" />
                  <p className="text-sm font-bold text-textPrimary">No Activity Recorded</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - Status & Journal */}
        <div className="space-y-6">
          {/* Financial Insights Card */}
          <Card className="overflow-hidden border-0 shadow-lg shadow-slate-200/50 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="p-6 relative z-10">
              <h3 className="font-black text-lg flex items-center gap-2 mb-6 text-white">
                <DollarSign size={18} className="text-primary" /> Financial Impact
              </h3>
              
              <div className="space-y-4">
                <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                  <p className="text-xs font-bold text-textSecondary/70 uppercase tracking-widest mb-1">Transaction Total</p>
                  <p className="text-3xl font-black tracking-tight">{formatINR(payment.amount)}</p>
                </div>
                
                {payment.unallocated_balance > 0 && (
                  <div className="bg-warning/10 rounded-xl p-4 border border-warning/20">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-warning uppercase tracking-widest">Unallocated Advance</p>
                      <AlertCircle size={14} className="text-warning"/>
                    </div>
                    <p className="text-xl font-black text-warning mt-1">{formatINR(payment.unallocated_balance)}</p>
                    <p className="text-[10px] text-warning/80 mt-1 font-medium">This amount can be linked to future invoices.</p>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs font-bold uppercase tracking-wider text-textSecondary/70">
                  <span>Risk Status</span>
                  <span className={`px-2 py-1 rounded bg-black/30 ${payment.unallocated_balance > 0 ? 'text-warning' : 'text-success'}`}>
                    {payment.unallocated_balance > 0 ? 'Advance Held' : 'Fully Applied'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="overflow-hidden border-0 shadow-lg shadow-slate-200/50">
            <div className="bg-card px-6 py-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-black text-textPrimary flex items-center gap-2">
                <Clock size={18} className="text-primary" /> State Timeline
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-3.5 before:-translate-x-px before:h-full before:w-0.5 before:bg-border">
                
                <div className="relative flex items-center gap-4">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-sm shrink-0 z-10 ${payment.created_at ? 'bg-success text-white' : 'bg-border text-textSecondary/70'}`}>
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-textPrimary">Drafted</p>
                    <p className="text-[11px] text-textSecondary font-bold uppercase tracking-wider">{formatDate(payment.created_at) || 'Pending'}</p>
                  </div>
                </div>

                <div className="relative flex items-center gap-4">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-sm shrink-0 z-10 ${payment.submitted_for_approval_at ? 'bg-success text-white' : 'bg-border text-textSecondary/70'}`}>
                    {payment.submitted_for_approval_at ? <Check size={14} strokeWidth={3} /> : <div className="w-2 h-2 rounded-full bg-slate-400"></div>}
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${payment.submitted_for_approval_at ? 'text-textPrimary' : 'text-textSecondary/70'}`}>Pending Approval</p>
                    {payment.submitted_for_approval_at && <p className="text-[11px] text-textSecondary font-bold uppercase tracking-wider">{formatDate(payment.submitted_for_approval_at)}</p>}
                  </div>
                </div>

                <div className="relative flex items-center gap-4">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-sm shrink-0 z-10 ${payment.approved_at ? 'bg-success text-white' : 'bg-border text-textSecondary/70'}`}>
                    {payment.approved_at ? <Check size={14} strokeWidth={3} /> : <div className="w-2 h-2 rounded-full bg-slate-400"></div>}
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${payment.approved_at ? 'text-textPrimary' : 'text-textSecondary/70'}`}>Approved</p>
                    {payment.approved_at && <p className="text-[11px] text-textSecondary font-bold uppercase tracking-wider">{formatDate(payment.approved_at)}</p>}
                  </div>
                </div>

                <div className="relative flex items-center gap-4">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-sm shrink-0 z-10 ${payment.paid_at ? 'bg-primary text-white' : 'bg-border text-textSecondary/70'}`}>
                    {payment.paid_at ? <Check size={14} strokeWidth={3} /> : <div className="w-2 h-2 rounded-full bg-slate-400"></div>}
                  </div>
                  <div className="flex-1">
                    <p className={`font-black text-sm ${payment.paid_at ? 'text-primary' : 'text-textSecondary/70'}`}>Paid & Settled</p>
                    {payment.paid_at && <p className="text-[11px] text-primary font-bold uppercase tracking-wider">{formatDate(payment.paid_at)}</p>}
                  </div>
                </div>

                {payment.status === 'reversed' && (
                  <div className="relative flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-sm shrink-0 z-10 bg-danger text-white">
                      <XCircle size={14} strokeWidth={3} />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-sm text-danger">Reversed</p>
                      <p className="text-[11px] text-danger font-bold uppercase tracking-wider">Transaction Cancelled</p>
                    </div>
                  </div>
                )}
                
              </div>
            </div>
          </Card>

          {/* Double Entry Accounting Journal */}
          {payment.journal_entries && payment.journal_entries.length > 0 && (
            <Card className="p-6 border-l-4 border-l-primary overflow-hidden">
              <h3 className="font-extrabold text-lg flex items-center gap-2 mb-2">
                <FileText size={18} className="text-primary" /> Accounting Journal
              </h3>
              <p className="text-xs font-semibold text-textSecondary mb-4">Double-entry records posted automatically.</p>
              
              <div className="space-y-3">
                {payment.journal_entries.map(je => (
                  <div key={je.id} className="bg-background rounded-lg border border-border p-3 text-sm">
                    <div className="flex justify-between font-bold mb-2 pb-2 border-b border-border/50 text-xs">
                      <span>{je.date}</span>
                      <span className="text-textSecondary">Ref: {je.reference}</span>
                    </div>
                    <div className="grid grid-cols-[1fr_80px_80px] gap-2 font-medium py-1">
                      <span></span>
                      <span className="text-right text-xs text-textSecondary">Debit</span>
                      <span className="text-right text-xs text-textSecondary">Credit</span>
                    </div>
                    <div className="grid grid-cols-[1fr_80px_80px] gap-2 font-semibold">
                      <span className="text-primary">{je.account_debit}</span>
                      <span className="text-right">{formatINR(je.amount).replace('₹', '')}</span>
                      <span className="text-right text-textSecondary">-</span>
                    </div>
                    <div className="grid grid-cols-[1fr_80px_80px] gap-2 font-semibold mt-1">
                      <span className="pl-4">{je.account_credit}</span>
                      <span className="text-right text-textSecondary">-</span>
                      <span className="text-right">{formatINR(je.amount).replace('₹', '')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
