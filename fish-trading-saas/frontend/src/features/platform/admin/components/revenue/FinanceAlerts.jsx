import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, ShieldCheck, UserCheck, EyeOff, Send, HelpCircle, Ban } from 'lucide-react';
import { useToast } from "@/components/shared/toast-provider";
import clsx from 'clsx';

export function FinanceAlerts() {
  const { push: toast } = useToast();
  const [alerts, setAlerts] = useState([
    { id: 'alt_1', type: 'critical', title: 'Unexpected MRR Reduction (- ₹45,000)', desc: 'Enterprise tenant "SeaFoods Co" cancelled their active subscription renewal plan.', category: 'CHURN', age: '10 mins ago' },
    { id: 'alt_2', type: 'warning', title: 'High Refund Velocity detected', desc: '₹18,000 in refunds issued over the past 4 hours. Breached standard daily safety threshold.', category: 'ANOMALY', age: '2 hours ago' },
    { id: 'alt_3', type: 'info', title: 'Upcoming Enterprise Renewal', desc: 'Tenant "Maris & Sons" (₹1,20,000 ARR) renewal invoice due in 5 days.', category: 'RENEWAL', age: '4 hours ago' },
    { id: 'alt_4', type: 'warning', title: 'Multiple Stripe Gateway declines', desc: '6 payment declines recorded in 12 hours from credit card payments in Karnataka region.', category: 'GATEWAY', age: '12 hours ago' }
  ]);

  const handleResolveAlert = (id, title) => {
    setAlerts(prev => prev.filter(alt => alt.id !== id));
    toast({ message: `Alert Resolved: ${title}`, variant: "success" });
  };

  const handleMuteAlert = (id, title) => {
    setAlerts(prev => prev.map(alt => alt.id === id ? { ...alt, muted: true } : alt));
    toast({ message: `Muted notifications for: ${title}`, variant: "info" });
  };

  const handleEscalateAlert = (id, title) => {
    toast({ message: `Escalated alert to Platform Finance Manager: ${title}`, variant: "success" });
  };

  const handleAssignAlert = (id, title) => {
    toast({ message: `Assigned alert to billing administrator: ${title}`, variant: "info" });
  };

  return (
    <div className="bg-[#121215] border border-white/10 rounded-2xl overflow-hidden shadow-2xl mt-6">
      <div className="p-5 border-b border-white/5 bg-[#18181c] flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-400" /> Platform Finance Alert & Audit Center
          </h3>
          <p className="text-xs text-slate-400 mt-1">Anomalies monitoring, daily refund safety tracking, and high-value renewal alerts.</p>
        </div>
        {alerts.length > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {alerts.length} Warnings Active
          </span>
        )}
      </div>

      <div className="p-5 divide-y divide-white/5 space-y-4 max-h-[380px] overflow-y-auto custom-scrollbar">
        {alerts.map((alt) => (
          <div 
            key={alt.id} 
            className={clsx(
              "flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 first:pt-0 pb-1 text-xs transition-all",
              alt.muted && "opacity-40"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={clsx(
                "p-2 rounded-xl border flex items-center justify-center shrink-0 mt-0.5",
                alt.type === 'critical' ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                alt.type === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
              )}>
                {alt.type === 'critical' ? <Ban size={14} /> : <AlertTriangle size={14} />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200">{alt.title}</span>
                  <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-mono font-bold tracking-wide uppercase border border-white/5">
                    {alt.category}
                  </span>
                </div>
                <p className="text-slate-400 leading-normal">{alt.desc}</p>
                <span className="text-[9px] text-slate-600 font-mono block">Logged: {alt.age}</span>
              </div>
            </div>

            {/* Mitigations */}
            <div className="flex items-center gap-2 shrink-0 md:justify-end">
              <button
                type="button"
                onClick={() => handleResolveAlert(alt.id, alt.title)}
                className="px-2.5 py-1.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1"
                title="Resolve Alert"
              >
                <ShieldCheck size={11} /> Resolve
              </button>

              <button
                type="button"
                onClick={() => handleEscalateAlert(alt.id, alt.title)}
                className="px-2.5 py-1.5 bg-white/5 text-slate-300 hover:text-white border border-white/10 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                title="Escalate Alert"
              >
                <Send size={11} /> Escalate
              </button>

              <button
                type="button"
                onClick={() => handleMuteAlert(alt.id, alt.title)}
                disabled={alt.muted}
                className="p-1.5 bg-white/5 text-slate-400 hover:text-slate-200 border border-white/10 rounded-lg disabled:opacity-50 transition-colors"
                title="Mute notification"
              >
                <EyeOff size={12} />
              </button>
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="py-8 text-center text-slate-500 font-medium flex flex-col items-center gap-2">
            <ShieldCheck size={32} className="text-emerald-500" />
            <p className="text-sm">Platform finance metrics are healthy. All alerts resolved.</p>
          </div>
        )}
      </div>

    </div>
  );
}
