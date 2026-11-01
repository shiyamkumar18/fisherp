import React, { useState } from 'react';
import { CreditCard, AlertTriangle, RefreshCcw, Mail, MessageSquare, PhoneCall, CheckCircle, ShieldAlert, Clock, ArrowRight } from 'lucide-react';
import { useToast } from "@/components/shared/toast-provider";
import clsx from 'clsx';

export function FailedPaymentsRecovery({ failedBilling = [], onRecoveryAction }) {
  const { push: toast } = useToast();
  const [selectedRecoveryId, setSelectedRecoveryId] = useState(failedBilling[0]?.id || null);
  const [actionLoading, setActionLoading] = useState(null); // 'retry', 'email', 'sms' etc.

  const selectedItem = failedBilling.find(b => b.id === selectedRecoveryId) || failedBilling[0];

  const handleAction = (actionKey, label) => {
    if (!selectedItem) return;
    setActionLoading(actionKey);
    setTimeout(() => {
      setActionLoading(null);
      if (onRecoveryAction) {
        onRecoveryAction(actionKey, selectedItem.id, selectedItem.tenant_name, selectedItem.tenant_id);
      }
    }, 1000);
  };

  // Mock timeline logs for failed payments
  const mockTimeline = [
    { title: 'Attempt 1: Automated Retry', date: 'May 25, 2026', status: 'Failed', reason: 'Insufficient funds' },
    { title: 'Attempt 2: Automated Retry', date: 'May 28, 2026', status: 'Failed', reason: 'Declined by Bank' },
    { title: 'Attempt 3: Smart Retrying (Optimal)', date: 'June 01, 2026', status: 'Failed', reason: 'Insufficient funds' },
    { title: 'Attempt 4: Final Retry Queue', date: 'Scheduled for June 06, 2026', status: 'Pending', reason: 'Awaiting trigger' }
  ];

  return (
    <div className="bg-[#121215] border border-white/10 rounded-2xl overflow-hidden shadow-2xl mt-6 grid grid-cols-1 md:grid-cols-3 min-h-[360px]">
      
      {/* Left side list of failed payments */}
      <div className="md:col-span-1 border-r border-white/5 bg-[#18181c] p-4 flex flex-col gap-3 overflow-y-auto max-h-[380px] custom-scrollbar">
        <div className="border-b border-white/5 pb-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={13} className="text-rose-400" /> Dunning Queue
          </h4>
          <span className="text-[10px] text-slate-500 block mt-0.5">Select a failed payment to view dunning parameters</span>
        </div>

        {failedBilling.map((bill) => {
          const isSelected = selectedRecoveryId === bill.id || (!selectedRecoveryId && failedBilling[0]?.id === bill.id);
          return (
            <div 
              key={bill.id}
              onClick={() => setSelectedRecoveryId(bill.id)}
              className={clsx(
                "p-3 rounded-lg border text-left cursor-pointer transition-all space-y-1.5 select-none",
                isSelected 
                  ? "bg-white/[0.04] border-indigo-500" 
                  : "bg-black/30 border-white/5 hover:border-white/10"
              )}
            >
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-200 truncate max-w-[100px]">{bill.tenant_name}</span>
                <span className="text-rose-400 font-mono font-bold">₹{Math.round(bill.amount_due).toLocaleString()}</span>
              </div>
              <p className="text-[9px] text-slate-500 font-mono truncate">{bill.subscription_id} | attempts: {bill.failed_attempts}</p>
            </div>
          );
        })}
        {failedBilling.length === 0 && (
          <span className="text-xs text-slate-500 italic p-4 text-center block">No active dunning failures.</span>
        )}
      </div>

      {/* Center & Right side detailed recovery timeline */}
      <div className="md:col-span-2 p-6 flex flex-col justify-between gap-5 bg-black/20">
        {selectedItem ? (
          <>
            <div>
              <div className="flex justify-between items-start border-b border-white/5 pb-3 mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-200">{selectedItem.tenant_name} Recovery Logs</h4>
                  <span className="text-[10px] text-slate-500 font-mono">Invoice reference: INV-2026-F{selectedItem.id}</span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wide">
                  Retries: {selectedItem.failed_attempts} / 4
                </span>
              </div>

              {/* Dunning timeline logs */}
              <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-2 before:h-full before:w-0.5 before:bg-white/5">
                {mockTimeline.map((log, i) => (
                  <div key={i} className="flex gap-4 relative text-xs">
                    <div className={clsx(
                      "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 z-10",
                      log.status === 'Failed' ? "bg-[#1f0f10] border-rose-500/30 text-rose-400" : "bg-slate-900 border-white/10 text-slate-500"
                    )}>
                      {log.status === 'Failed' ? <AlertTriangle size={8} /> : <Clock size={8} />}
                    </div>
                    <div className="flex-1 space-y-0.5 leading-snug">
                      <div className="flex justify-between font-medium">
                        <span className="text-slate-300">{log.title}</span>
                        <span className="text-[9px] text-slate-500 font-mono">{log.date}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block">Status: {log.status} | Reason: {log.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Manual recovery toolbar actions */}
            <div className="border-t border-white/5 pt-4 space-y-3 shrink-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Manual Recovery Protocols</span>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
                {[
                  { id: 'manual_retry', label: 'Manual Retry', icon: <RefreshCcw size={11} />, style: 'bg-indigo-600 hover:bg-indigo-500 text-white' },
                  { id: 'email_reminder', label: 'Email Notice', icon: <Mail size={11} />, style: 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10' },
                  { id: 'sms_reminder', label: 'SMS Notice', icon: <MessageSquare size={11} />, style: 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10' },
                  { id: 'call_followup', label: 'Call Follow', icon: <PhoneCall size={11} />, style: 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10' },
                  { id: 'mark_resolved', label: 'Resolve Log', icon: <CheckCircle size={11} />, style: 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10' },
                  { id: 'blacklist', label: 'Blacklist Risk', icon: <ShieldAlert size={11} />, style: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20' }
                ].map((act) => {
                  const isCurrLoading = actionLoading === act.id;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      disabled={actionLoading !== null}
                      onClick={() => handleAction(act.id, act.label)}
                      className={clsx(
                        "h-8 px-2 text-[9px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all select-none",
                        act.style,
                        isCurrLoading && "opacity-50"
                      )}
                    >
                      {isCurrLoading ? (
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        act.icon
                      )}
                      <span className="truncate">{act.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-2 p-8">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
            <p className="text-sm font-semibold">Platform billing is running optimal. No failed payments detected.</p>
          </div>
        )}
      </div>

    </div>
  );
}
