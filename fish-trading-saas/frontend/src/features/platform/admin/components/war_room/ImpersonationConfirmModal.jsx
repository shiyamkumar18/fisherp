import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ShieldAlert, Loader2 } from 'lucide-react';

export function ImpersonationConfirmModal({ isOpen, onClose, ticket, onConfirm, loading }) {
  const [reason, setReason] = useState("");

  // Reset state on open
  React.useEffect(() => {
    if (isOpen) setReason("");
  }, [isOpen]);

  if (!isOpen || !ticket) return null;

  const handleConfirm = () => {
    onConfirm(ticket, reason);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-[#121215] border-rose-500/20 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="text-rose-500" size={18} />
            Start Impersonation Session
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-slate-300 mb-4">
            You are about to access the environment of <strong className="text-white">{ticket.tenant_name}</strong> to investigate <span className="font-mono text-indigo-400 bg-indigo-500/10 px-1 py-0.5 rounded">{ticket.ticket_number || `TKT-${ticket.id}`}</span>.
          </p>
          
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-xs text-rose-300 mb-4">
            <strong>WARNING:</strong> This action is strictly audited. All operations performed during this session will be logged to your account.
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Mandatory Justification
            </label>
            <textarea 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a detailed reason for requiring tenant access..."
              className="w-full h-24 bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-rose-500 resize-none"
            />
          </div>
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
            disabled={loading || reason.trim().length < 10}
            className="px-4 py-2 text-sm font-bold bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Start Session
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
