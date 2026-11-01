import React from 'react';
import { Loader2, Shield, User, Users, Zap, CheckCircle2, AlertCircle, Play } from 'lucide-react';
import clsx from 'clsx';

export function TicketFooterActions({
  category,
  priority,
  severity,
  loading,
  actionType,
  onClose,
  onSubmit,
  isDraftSaved,
  hasUnsavedChanges
}) {
  const getSlaInfo = () => {
    if (priority === 'critical') return "30m resp / 4h res";
    if (priority === 'high') return "2h resp / 12h res";
    if (priority === 'medium') return "12h resp / 48h res";
    return "24h resp / 5d res";
  };

  const getAutoAssignTarget = () => {
    if (category === 'billing') return "Billing Admin";
    if (category === 'technical') return "Support L2";
    if (priority === 'critical' || severity === 'critical') return "Support L3 Manager";
    return "Support L1";
  };

  const getQueueTarget = () => {
    if (priority === 'critical') return "CRITICAL EMERGENCY QUEUE";
    if (category === 'billing') return "FINANCIAL OPERATIONS";
    if (category === 'security') return "SECURITY TRIAGE";
    return "STANDARD SUPPORT BACKLOG";
  };

  return (
    <div className="h-[88px] px-6 border-t border-white/5 bg-[#101216] shrink-0 flex items-center justify-between w-full">
      {/* LEFT: SLA & Flow Previews */}
      <div className="flex items-center gap-6 text-[10px] text-slate-500">
        <div className="space-y-1">
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider block">SLA Policy</span>
          <span className="flex items-center gap-1.5 text-slate-300 font-mono font-medium">
            <div className={clsx(
              "w-2 h-2 rounded-full",
              priority === 'critical' ? "bg-rose-500" :
              priority === 'high' ? "bg-amber-500" : "bg-indigo-500"
            )} />
            {getSlaInfo()}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider block">Auto assignment</span>
          <span className="flex items-center gap-1 text-indigo-400 font-mono font-medium">
            <Users size={11} /> {getAutoAssignTarget()}
          </span>
        </div>

        <div className="hidden xl:block space-y-1">
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider block">Queue Placement</span>
          <span className="text-slate-300 font-mono font-medium">{getQueueTarget()}</span>
        </div>

        <div className="hidden 2xl:block space-y-1">
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider block">Workflow flow</span>
          <div className="flex items-center gap-1 text-slate-400 font-medium">
            <span>Draft</span>
            <span>→</span>
            <span className="text-indigo-400 font-semibold">Triage</span>
            <span>→</span>
            <span>Resolution</span>
          </div>
        </div>
      </div>

      {/* CENTER: Auto-save status feedback */}
      <div className="hidden md:flex items-center justify-center gap-2">
        {isDraftSaved && (
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md flex items-center gap-1 animate-fade-in font-medium">
            <CheckCircle2 size={12} /> Draft auto-saved
          </span>
        )}
        {!isDraftSaved && hasUnsavedChanges && (
          <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md flex items-center gap-1 font-medium">
            <AlertCircle size={12} /> Unsaved changes in composer
          </span>
        )}
      </div>

      {/* RIGHT: Actions */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="h-11 px-4 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors bg-transparent border border-white/5 hover:border-white/10 rounded-xl"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={(e) => onSubmit(e, 'draft')}
          disabled={loading}
          className="h-11 px-4 text-xs font-semibold bg-white/5 text-slate-300 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-1.5 border border-white/10 disabled:opacity-50"
        >
          {loading && actionType === 'draft' && <Loader2 size={13} className="animate-spin" />}
          Save Draft
        </button>

        <button
          type="button"
          onClick={(e) => onSubmit(e, 'create')}
          disabled={loading}
          className="h-11 px-4 text-xs font-bold bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
        >
          {loading && actionType === 'create' && <Loader2 size={13} className="animate-spin" />}
          Create Ticket
        </button>

        <button
          type="button"
          onClick={(e) => onSubmit(e, 'assign')}
          disabled={loading}
          className="h-11 px-4.5 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 hover:shadow-indigo-500/10 hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
        >
          {loading && actionType === 'assign' && <Loader2 size={13} className="animate-spin" />}
          Create & Assign
        </button>

        <button
          type="button"
          onClick={(e) => onSubmit(e, 'escalate')}
          disabled={loading}
          className="h-11 px-4 text-xs font-bold bg-rose-950/40 text-rose-300 rounded-xl hover:bg-rose-900/30 border border-rose-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
        >
          {loading && actionType === 'escalate' && <Loader2 size={13} className="animate-spin" />}
          Create & Escalate
        </button>

        <button
          type="button"
          onClick={(e) => onSubmit(e, 'notify')}
          disabled={loading}
          className="h-11 px-4 text-xs font-bold bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all flex items-center gap-1.5 disabled:opacity-50"
        >
          {loading && actionType === 'notify' && <Loader2 size={13} className="animate-spin" />}
          Create & Notify
        </button>
      </div>
    </div>
  );
}
