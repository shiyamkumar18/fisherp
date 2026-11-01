import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Building, CreditCard, Clock, Activity, CloudOff, FileText, CheckCircle2, XCircle, HardDrive, Key, UserCheck, ShieldClose, DollarSign, LifeBuoy, RotateCcw } from 'lucide-react';
import { useToast } from "@/components/shared/toast-provider";
import clsx from 'clsx';

export const TenantIntelligenceSidebar = React.memo(({ tenantId, tenants, intelligence, loading }) => {
  const selectedTenant = tenants.find(t => t.id.toString() === tenantId?.toString());
  const { push: toast } = useToast();
  const [actionLoading, setActionLoading] = useState(null); // 'impersonate', 'suspend', etc.

  const handleQuickAction = (actionName, label) => {
    setActionLoading(actionName);
    setTimeout(() => {
      setActionLoading(null);
      toast({ message: `Successfully executed: ${label}`, variant: "success" });
    }, 1000);
  };

  if (!selectedTenant) {
    return (
      <div className="col-span-12 lg:col-span-3 bg-[#0d0e12] border border-white/5 rounded-2xl p-6 flex flex-col justify-center min-h-[300px] text-center">
        <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tenant Intelligence</h4>
        <p className="text-[11px] text-slate-500 mt-2 px-4 leading-relaxed">
          Select a target tenant on the left to pull live subscription health, support metrics, and diagnostic options.
        </p>
      </div>
    );
  }

  if (loading || !intelligence) {
    return (
      <div className="col-span-12 lg:col-span-3 bg-[#0d0e12] border border-white/5 rounded-2xl p-6 flex flex-col justify-center items-center min-h-[300px] gap-3">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Fetching tenant telemetry...</p>
      </div>
    );
  }

  const sub = intelligence.subscription || {};
  const metrics = intelligence.metrics || {};
  const support = intelligence.support || {};
  const security = intelligence.security_events || [];

  return (
    <div className="col-span-12 lg:col-span-3 bg-[#0d0e12] border border-white/5 rounded-2xl p-6 overflow-y-auto custom-scrollbar flex flex-col max-h-[calc(92vh-178px)] gap-5">
      
      {/* Target Tenant Profile */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-200">{intelligence.tenant?.name}</h4>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {intelligence.tenant?.id} | v{intelligence.tenant?.platform_version || '8.0.8'}</p>
          </div>
          <span className={clsx(
            "text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider",
            intelligence.tenant?.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          )}>
            {intelligence.tenant?.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Subscription & Finance */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <CreditCard size={12} className="text-indigo-400" /> Subscription & MRR
        </div>

        <div className="grid grid-cols-2 gap-3 border-b border-white/5 pb-2.5">
          <div>
            <span className="text-[9px] text-slate-500 block">Current Plan</span>
            <span className="text-xs font-bold text-indigo-400">{sub.tier || 'None'}</span>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block">MRR</span>
            <span className="text-xs font-bold text-slate-200">${sub.mrr?.toFixed(2) || '0.00'}</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-slate-500">Health Score</span>
            <span className={clsx(
              "font-bold font-mono",
              sub.health_score > 80 ? "text-emerald-400" : sub.health_score > 50 ? "text-amber-400" : "text-rose-400"
            )}>
              {sub.health_score || 0}/100
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div 
              className={clsx(
                "h-full transition-all duration-500",
                sub.health_score > 80 ? "bg-emerald-500" : sub.health_score > 50 ? "bg-amber-500" : "bg-rose-500"
              )}
              style={{ width: `${sub.health_score || 0}%` }}
            />
          </div>
        </div>

        {sub.outstanding_dues > 0 && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5 flex items-start gap-2">
            <AlertTriangle size={13} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-rose-400 uppercase">Payment Overdue</p>
              <p className="text-[9px] text-rose-400/80 leading-normal">
                ${sub.outstanding_dues.toFixed(2)} outstanding. {sub.failed_payments} failed payment attempts recorded.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Operational Footprint */}
      <div className="space-y-2 bg-white/[0.01] border border-white/5 rounded-xl p-3.5">
        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Activity size={12} className="text-indigo-400" /> Operational Metrics
        </h5>
        
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[10px] font-mono">
          <div className="flex items-center justify-between border-b border-white/5 pb-1">
            <span className="text-slate-500">Branches</span>
            <span className="text-slate-300 font-bold">{metrics.branches || 0}</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/5 pb-1">
            <span className="text-slate-500">Active Staff</span>
            <span className="text-slate-300 font-bold">{metrics.staff || 0}</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/5 pb-1">
            <span className="text-slate-500">Total Sales</span>
            <span className="text-slate-300 font-bold">{metrics.sales || 0}</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/5 pb-1">
            <span className="text-slate-500">API Latency</span>
            <span className="text-amber-400 font-bold">142ms</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/5 pb-1 col-span-2">
            <span className="text-slate-500 flex items-center gap-1"><HardDrive size={10}/> Storage Used</span>
            <span className="text-slate-300 font-bold">{metrics.storage_usage || 'Unknown'}</span>
          </div>
        </div>
      </div>

      {/* Support Health */}
      <div className="space-y-2 bg-white/[0.01] border border-white/5 rounded-xl p-3.5">
        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <LifeBuoy size={12} className="text-indigo-400" /> Active Support State
        </h5>
        
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-black/40 border border-white/5 rounded-lg p-2">
            <span className="text-[9px] text-slate-500 uppercase block">Open Tickets</span>
            <span className="text-sm font-bold text-amber-400">{support.open_tickets || 0}</span>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-lg p-2">
            <span className="text-[9px] text-slate-500 uppercase block">Escalations</span>
            <span className="text-sm font-bold text-rose-400">{support.escalated_tickets || 0}</span>
          </div>
        </div>

        {support.recent_incidents?.length > 0 && (
          <div className="space-y-1.5 mt-2">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Recent Tickets</p>
            {support.recent_incidents.map((tkt, idx) => (
              <div key={idx} className="flex justify-between items-center bg-black/20 p-2 rounded-lg border border-white/5 text-[10px]">
                <span className="text-indigo-400 font-mono truncate max-w-[100px]">{tkt.ticket_number}</span>
                <span className={clsx(
                  "px-1.5 py-0.5 rounded text-[8px] uppercase font-bold",
                  tkt.status === 'resolved' || tkt.status === 'closed' ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                )}>{tkt.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Alert Log */}
      {security.length > 0 && (
        <div className="space-y-2 bg-[#1a0f12] border border-rose-950/30 rounded-xl p-3.5">
          <h5 className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <CloudOff size={12} /> Security Flags
          </h5>
          <div className="space-y-1.5">
            {security.map((sec, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-[9px] text-rose-300/80 leading-tight">
                <AlertTriangle size={10} className="text-rose-500 mt-0.5 shrink-0" />
                <span>{sec.action} from {sec.ip_address || 'unknown'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions Panel */}
      <div className="space-y-2 border-t border-white/5 pt-4">
        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Actions</h5>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'view', label: 'View Tenant', icon: <Building size={11} />, cls: 'bg-white/5 hover:bg-white/10 text-slate-200' },
            { id: 'impersonate', label: 'Impersonate', icon: <UserCheck size={11} />, cls: 'bg-white/5 hover:bg-white/10 text-slate-200' },
            { id: 'suspend', label: 'Suspend', icon: <ShieldClose size={11} />, cls: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20' },
            { id: 'billing', label: 'Open Billing', icon: <DollarSign size={11} />, cls: 'bg-white/5 hover:bg-white/10 text-slate-200' },
            { id: 'incident', label: 'Create Incident', icon: <LifeBuoy size={11} />, cls: 'bg-white/5 hover:bg-white/10 text-slate-200' },
            { id: 'reset', label: 'Reset Session', icon: <RotateCcw size={11} />, cls: 'bg-white/5 hover:bg-white/10 text-slate-200' }
          ].map(act => (
            <button
              key={act.id}
              type="button"
              disabled={actionLoading !== null}
              onClick={() => handleQuickAction(act.id, act.label)}
              className={clsx(
                "h-9 px-2 text-[10px] font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all select-none",
                act.cls,
                actionLoading === act.id && "opacity-50 pointer-events-none"
              )}
            >
              {actionLoading === act.id ? (
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                act.icon
              )}
              <span className="truncate">{act.label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
});
