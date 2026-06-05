import React, { useState } from 'react';
import { Loader2, Users, CheckCircle2, AlertCircle, ArrowUpRight, Check } from 'lucide-react';
import clsx from 'clsx';

export function WorkspaceFooterActions({
  mode, // 'create' | 'view' | 'edit'
  setMode,
  category,
  priority,
  severity,
  loading,
  actionType,
  onClose,
  onSubmit, // Form submission handler
  onAssignSelf,
  onEscalate, // Ticket action callback
  onResolve, // Ticket action callback
  onCloseTicket, // Ticket action callback
  isDraftSaved,
  hasUnsavedChanges,
  ticket
}) {
  const [showEscalateForm, setShowEscalateForm] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");
  const [escalatePriority, setEscalatePriority] = useState("high");

  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolveReason, setResolveReason] = useState("");

  const handleEscalateSubmit = async (e) => {
    e.preventDefault();
    if (!escalateReason.trim()) return;
    await onEscalate(ticket.id, escalateReason, escalatePriority);
    setShowEscalateForm(false);
    setEscalateReason("");
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolveReason.trim()) return;
    await onResolve(ticket.id, resolveReason);
    setShowResolveForm(false);
    setResolveReason("");
  };

  const getAutoAssignTarget = () => {
    if (category === 'billing') return "Billing Admin";
    if (category === 'technical') return "Support L2";
    if (priority === 'critical' || severity === 'critical') return "Support L3 Manager";
    return "Support L1";
  };

  // 1. ESCALATION FORM POPUP INLINE IN FOOTER
  if (showEscalateForm) {
    return (
      <div className="h-[88px] px-6 border-t border-rose-500/20 bg-[#140f10] shrink-0 flex items-center justify-between w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Escalate Ticket</span>
          <input
            type="text"
            value={escalateReason}
            onChange={(e) => setEscalateReason(e.target.value)}
            placeholder="Reason for escalation..."
            className="bg-black/40 border border-rose-500/20 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500 w-64"
          />
          <select
            value={escalatePriority}
            onChange={(e) => setEscalatePriority(e.target.value)}
            className="bg-black/40 border border-rose-500/20 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="high">High Priority</option>
            <option value="critical">Critical (P1)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowEscalateForm(false)} className="h-9 px-3 text-xs text-slate-400 hover:text-slate-200">Cancel</button>
          <button type="button" onClick={handleEscalateSubmit} className="h-9 px-4 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg flex items-center gap-1.5">
            Confirm Escalation
          </button>
        </div>
      </div>
    );
  }

  // 2. RESOLUTION FORM POPUP INLINE IN FOOTER
  if (showResolveForm) {
    return (
      <div className="h-[88px] px-6 border-t border-emerald-500/20 bg-[#0f1411] shrink-0 flex items-center justify-between w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Resolve Ticket</span>
          <input
            type="text"
            value={resolveReason}
            onChange={(e) => setResolveReason(e.target.value)}
            placeholder="Resolution notes / fix details..."
            className="bg-black/40 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 w-96"
          />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowResolveForm(false)} className="h-9 px-3 text-xs text-slate-400 hover:text-slate-200">Cancel</button>
          <button type="button" onClick={handleResolveSubmit} className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5">
            Mark Resolved
          </button>
        </div>
      </div>
    );
  }

  // 3. EDIT MODE FOOTER
  if (mode === 'edit') {
    return (
      <div className="h-[88px] px-6 border-t border-white/5 bg-[#101216] shrink-0 flex items-center justify-between w-full">
        <span className="text-xs text-slate-500">Modifying ticket details...</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('view')}
            className="h-11 px-4 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors bg-transparent border border-white/5 hover:border-white/10 rounded-xl"
          >
            Cancel Edit
          </button>
          <button
            type="button"
            onClick={(e) => onSubmit(e, 'edit')}
            disabled={loading}
            className="h-11 px-5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all flex items-center gap-1.5"
          >
            {loading && <Loader2 size={13} className="animate-spin" />} Save Changes
          </button>
        </div>
      </div>
    );
  }

  // 4. VIEW MODE FOOTER
  if (mode === 'view' && ticket) {
    const isClosed = ticket.status === 'closed';
    const isResolved = ticket.status === 'resolved';

    return (
      <div className="h-[88px] px-6 border-t border-white/5 bg-[#101216] shrink-0 flex items-center justify-between w-full">
        <div className="flex items-center gap-4 text-[10px] text-slate-500">
          <div className="space-y-0.5">
            <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider block">Assigned Tier</span>
            <span className="text-slate-300 font-mono font-medium">{ticket.assignee_name || "Unassigned Queue"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-4 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors bg-transparent border border-white/5 hover:border-white/10 rounded-xl"
          >
            Close Workspace
          </button>

          {!isClosed && !isResolved && (
            <>
              <button
                type="button"
                onClick={() => setMode('edit')}
                className="h-11 px-4 text-xs font-semibold bg-white/5 text-slate-300 rounded-xl hover:bg-white/10 transition-colors border border-white/10"
              >
                Edit Ticket
              </button>

              {!ticket.assignee && (
                <button
                  type="button"
                  onClick={onAssignSelf}
                  className="h-11 px-4 text-xs font-semibold bg-indigo-600/10 text-indigo-400 rounded-xl hover:bg-indigo-600/20 border border-indigo-500/20 transition-all"
                >
                  Claim Ticket
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowEscalateForm(true)}
                className="h-11 px-4 text-xs font-bold bg-rose-950/40 text-rose-300 rounded-xl hover:bg-rose-900/30 border border-rose-500/20 transition-all flex items-center gap-1.5"
              >
                Escalate
              </button>

              <button
                type="button"
                onClick={() => setShowResolveForm(true)}
                className="h-11 px-4 text-xs font-bold bg-emerald-950/40 text-emerald-300 rounded-xl hover:bg-emerald-900/30 border border-emerald-500/20 transition-all flex items-center gap-1.5"
              >
                Mark Resolved
              </button>

              <button
                type="button"
                onClick={onCloseTicket}
                className="h-11 px-4 text-xs font-bold bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all"
              >
                Close Queue Ticket
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // 5. CREATE MODE FOOTER
  return (
    <div className="h-[88px] px-6 border-t border-white/5 bg-[#101216] shrink-0 flex items-center justify-between w-full">
      <div className="flex items-center gap-6 text-[10px] text-slate-500">
        <div className="space-y-1">
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider block">Auto assignment</span>
          <span className="flex items-center gap-1 text-indigo-400 font-mono font-medium">
            <Users size={11} /> {getAutoAssignTarget()}
          </span>
        </div>
      </div>

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
      </div>
    </div>
  );
}
