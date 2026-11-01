import React from 'react';
import { CreditCard, AlertTriangle, CheckCircle, RefreshCcw, Bell, AlertOctagon, HelpCircle, Send, MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';

export function BillingQueue({ 
  failedBilling = [], 
  onRetryPayment, 
  onSendReminder, 
  onSuspendSubscription, 
  onCreateFinanceTicket, 
  onOpenLedger, 
  onSelectTenant 
}) {
  const formatCur = (v) => v ? `₹${Math.round(v).toLocaleString()}` : '₹0';

  return (
    <div className="bg-[#121215] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-5 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#18181c]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CreditCard size={18} className="text-rose-400" /> Actionable Billing Operations Queue
          </h3>
          <p className="text-xs text-slate-400 mt-1">Dunning dashboard to monitor failed payments, schedule retries, and recover platform revenue.</p>
        </div>
        {failedBilling.length > 0 && (
          <span className="bg-rose-500/20 text-rose-400 text-xs font-bold px-2.5 py-1 rounded-full border border-rose-500/20 w-fit">
            {failedBilling.length} Overdue Accounts
          </span>
        )}
      </div>
      
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-[#0f0f13] border-b border-white/5 font-bold">
            <tr>
              <th className="px-5 py-4">Tenant / Sub ID</th>
              <th className="px-5 py-4">Plan / MRR</th>
              <th className="px-5 py-4">Invoice / Amount</th>
              <th className="px-5 py-4">Retries</th>
              <th className="px-5 py-4">Failure Reason</th>
              <th className="px-5 py-4">Risk Level</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {failedBilling.map((bill) => {
              // Derived fields for mock dunning enrichment
              const invoiceNo = bill.invoice_no || `INV-2026-${1000 + bill.id}`;
              const failureReason = bill.failure_reason || (bill.failed_attempts >= 3 ? "Card expired / Declined" : "Insufficient funds");
              const riskLevel = bill.failed_attempts >= 3 ? "High" : bill.failed_attempts === 2 ? "Medium" : "Low";
              const lastRetry = "2 hours ago";

              return (
                <tr key={bill.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-5 py-4">
                    <button 
                      type="button"
                      onClick={() => onSelectTenant?.(bill.tenant_id || 1, bill.tenant_name)}
                      className="font-bold text-slate-200 hover:text-indigo-400 text-left hover:underline block truncate max-w-[150px]"
                    >
                      {bill.tenant_name}
                    </button>
                    <span className="text-[10px] font-mono text-slate-500 block mt-0.5">{bill.subscription_id}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="uppercase text-[10px] font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {bill.tier}
                    </span>
                    <span className="text-xs text-slate-500 block mt-1 font-mono">{formatCur(bill.amount_due)}/mo</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-slate-300 block font-medium font-mono text-xs">{invoiceNo}</span>
                    <span className="text-rose-400 font-bold block font-mono text-xs mt-0.5">{formatCur(bill.amount_due)}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-slate-300 font-bold font-mono">{bill.failed_attempts} / 4</span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">Last: {lastRetry}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-slate-400 text-xs block max-w-[150px] truncate" title={failureReason}>
                      {failureReason}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={clsx(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      riskLevel === 'High' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                      riskLevel === 'Medium' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                      "bg-slate-800 text-slate-400 border-white/5"
                    )}>
                      {riskLevel}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={clsx(
                      "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                      bill.status === 'payment_failed' ? "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse" :
                      bill.status === 'grace_period' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                      "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                    )}>
                      {bill.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end items-center gap-1.5">
                      <button 
                        type="button"
                        onClick={() => onRetryPayment(bill.id)}
                        className="px-2.5 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded text-xs font-bold border border-indigo-500/20 transition-all flex items-center gap-1"
                        title="Retry charge"
                      >
                        <RefreshCcw size={11} /> Retry
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => onSendReminder(bill.id, bill.tenant_name, bill.tenant_id)}
                        className="px-2.5 py-1.5 bg-white/5 text-slate-300 rounded text-xs font-bold border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
                        title="Send reminder notice"
                      >
                        <Bell size={11} />
                      </button>
                      
                      {/* Secondary action dot dropdown menu */}
                      <div className="relative group/menu">
                        <button
                          type="button"
                          className="p-1.5 bg-white/5 text-slate-400 hover:text-slate-200 rounded border border-white/10 hover:bg-white/10"
                        >
                          <MoreHorizontal size={13} />
                        </button>
                        <div className="absolute right-0 top-full mt-1.5 w-44 rounded-lg bg-slate-900 border border-white/10 p-1.5 shadow-xl hidden group-hover/menu:block hover:block z-10 text-left space-y-0.5">
                          <button
                            type="button"
                            onClick={() => onSuspendSubscription(bill.id, bill.tenant_name)}
                            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-rose-500/10 text-rose-400 text-xs font-semibold flex items-center gap-1.5"
                          >
                            <AlertOctagon size={11} /> Suspend Sub
                          </button>
                          <button
                            type="button"
                            onClick={() => onCreateFinanceTicket(bill.id, bill.tenant_name, bill.tenant_id)}
                            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/5 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
                          >
                            <Send size={11} /> Open Ticket
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenLedger(bill.tenant_id || 1)}
                            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/5 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
                          >
                            <HelpCircle size={11} /> View Ledger
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
            {failedBilling.length === 0 && (
              <tr>
                <td colSpan="8" className="px-5 py-12 text-center text-slate-500 font-medium">
                  <CheckCircle className="mx-auto mb-2 text-emerald-500" size={24} />
                  No failed payments or collections tasks in the queue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
