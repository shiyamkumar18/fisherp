import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Loader2 } from 'lucide-react';

export function ActionConfirmModal({ isOpen, onClose, actionData, onConfirm, loading }) {
  const [note, setNote] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [timeSpent, setTimeSpent] = useState("");
  const [priority, setPriority] = useState("");

  // Reset state on open
  React.useEffect(() => {
    if (isOpen && actionData?.ticket) {
      setNote("");
      setRootCause("");
      setTimeSpent("");
      setPriority(actionData.ticket.priority || "medium");
    }
  }, [isOpen, actionData]);

  if (!isOpen || !actionData) return null;

  const { ticket, targetStatus, targetColumnLabel } = actionData;

  const isResolve = targetStatus === 'resolved';
  const isEscalate = targetStatus.startsWith('escalated');

  const handleConfirm = () => {
    let payload = { status: targetStatus, note };
    if (isResolve) {
      payload.reason = `Note: ${note}\nRoot Cause: ${rootCause}\nTime Spent: ${timeSpent}`;
    } else if (isEscalate) {
      payload.reason = note;
      payload.priority = priority;
    }
    
    onConfirm(ticket.id, targetStatus, payload);
  };

  const isFormValid = () => {
    if (note.trim().length === 0) return false;
    if (isResolve && (rootCause.trim().length === 0 || timeSpent.trim().length === 0)) return false;
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-[#121215] border-white/10 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={18} />
            Confirm Action
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-slate-300 mb-4">
            You are moving ticket <span className="font-mono text-indigo-400 bg-indigo-500/10 px-1 py-0.5 rounded">{ticket.ticket_number || `TKT-${ticket.id}`}</span> to <strong className="text-white">{targetColumnLabel}</strong>.
          </p>

          {isResolve ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Resolution Note</label>
                <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="How was this resolved?"
                  className="w-full h-16 bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Root Cause</label>
                <input 
                  type="text"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder="e.g. Database lock timeout"
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Time Spent (Mins)</label>
                <input 
                  type="number"
                  value={timeSpent}
                  onChange={(e) => setTimeSpent(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          ) : isEscalate ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Escalation Reason</label>
                <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Why is this being escalated?"
                  className="w-full h-16 bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Update Priority</label>
                <select 
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Required Note / Reason
              </label>
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Waiting on customer to provide error logs..."
                className="w-full h-24 bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-white/5 pt-4 flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !isFormValid()}
            className="px-4 py-2 text-sm font-bold bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Confirm Move
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
