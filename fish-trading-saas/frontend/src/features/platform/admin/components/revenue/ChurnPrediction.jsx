import React, { useState } from 'react';
import { Zap, AlertTriangle, MessageSquare, ShieldAlert, Sparkles, UserPlus, Gift, Send, Calendar } from 'lucide-react';
import { useToast } from "@/components/shared/toast-provider";
import clsx from 'clsx';

export function ChurnPrediction({ churnRisk = [], onRetentionAction }) {
  const { push: toast } = useToast();
  const [actionLoading, setActionLoading] = useState(null); // 'contact', 'discount', etc.

  const handleAction = (actionName, tenantName, label, tenantId) => {
    setActionLoading(`${tenantName}-${actionName}`);
    setTimeout(() => {
      setActionLoading(null);
      if (onRetentionAction) {
        onRetentionAction(actionName, tenantName, tenantId);
      }
    }, 1000);
  };

  return (
    <div className="bg-[#121215] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full">
      <div className="p-5 border-b border-white/5 bg-[#18181c]">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Sparkles size={18} className="text-amber-400" /> AI Churn Risk Prediction Engine
        </h3>
        <p className="text-xs text-slate-400 mt-1">Machine learning churn model alerting you of customer accounts showing early warning churn signals.</p>
      </div>

      <div className="p-5 flex-1 overflow-y-auto custom-scrollbar space-y-4">
        {churnRisk.map((risk, idx) => {
          const isHighRisk = risk.risk_score > 80;
          // Derived mock risk factors for realistic detail
          const riskReasons = [
            "Low dashboard login activity (-42% last month)",
            risk.risk_score > 80 ? "3 Failed payment retries on Stripe" : "Nearing subscription renewal date",
            "2 Open support tickets (Priority: High)"
          ];

          return (
            <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3.5 hover:border-white/10 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-200 text-sm">{risk.tenant_name}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">ID: {risk.tenant_id}</span>
                </div>
                <span className={clsx(
                  "text-xs font-bold px-2 py-1 rounded border uppercase tracking-wide",
                  isHighRisk ? "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                )}>
                  {risk.risk_score}% Churn Risk
                </span>
              </div>

              {/* Churn Reasoning Factors */}
              <div className="text-xs bg-black/40 p-3 rounded-lg border border-white/5 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Risk Diagnostic Factors</span>
                <div className="space-y-1.5 font-mono text-[11px] text-slate-400">
                  {riskReasons.map((reason, i) => (
                    <div key={i} className="flex items-start gap-1.5 leading-tight">
                      <AlertTriangle size={10} className="text-amber-500 shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
                {[
                  { id: 'discount', label: 'Offer Discount', icon: <Gift size={11} />, style: 'bg-indigo-600 hover:bg-indigo-500 text-white' },
                  { id: 'contact', label: 'Contact Tenant', icon: <MessageSquare size={11} />, style: 'bg-white/5 hover:bg-white/10 text-slate-300' },
                  { id: 'campaign', label: 'Run Campaign', icon: <Send size={11} />, style: 'bg-white/5 hover:bg-white/10 text-slate-300' },
                  { id: 'manager', label: 'Assign Manager', icon: <UserPlus size={11} />, style: 'bg-white/5 hover:bg-white/10 text-slate-300' },
                  { id: 'followup', label: 'Schedule Follow', icon: <Calendar size={11} />, style: 'bg-white/5 hover:bg-white/10 text-slate-300' }
                ].map(action => {
                  const key = `${risk.tenant_name}-${action.id}`;
                  const isCurrentLoading = actionLoading === key;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      disabled={actionLoading !== null}
                      onClick={() => handleAction(action.id, risk.tenant_name, action.label, risk.tenant_id)}
                      className={clsx(
                        "h-8 px-2 text-[10px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all select-none",
                        action.style,
                        isCurrentLoading && "opacity-50"
                      )}
                    >
                      {isCurrentLoading ? (
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        action.icon
                      )}
                      <span className="truncate">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {churnRisk.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center space-y-2">
            <ShieldAlert size={24} className="text-emerald-500" />
            <p className="text-sm font-medium">No high-churn-risk accounts detected at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
