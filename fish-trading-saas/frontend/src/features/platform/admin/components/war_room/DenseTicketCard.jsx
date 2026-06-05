import React from 'react';
import { Clock, MessageSquare, Play, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

export function DenseTicketCard({ ticket, onClick, onDragStart }) {
  const { percent, isBreached, remainingText, colorClass } = calculateSLA(ticket.sla_resolution_at);

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, ticket.id)}
      onClick={() => onClick(ticket)}
      className="bg-[#121215] border border-white/5 rounded-lg p-3 hover:border-indigo-500/50 hover:bg-[#1a1a20] transition-colors cursor-pointer active:cursor-grabbing group shadow-sm flex flex-col gap-2 relative overflow-hidden"
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
            {ticket.ticket_number || `TKT-${ticket.id}`}
          </span>
          {ticket.unread_message_count > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-lg shadow-rose-500/20">
              {ticket.unread_message_count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className={clsx(
            "text-[9px] font-bold px-1.5 py-0.5 rounded border",
            ticket.priority === 'critical' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
            ticket.priority === 'high' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : 
            "bg-slate-800 text-slate-400 border-white/5"
          )}>
            {(ticket.priority || 'medium').toUpperCase()}
          </span>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-200 leading-snug line-clamp-2 mb-1">{ticket.subject}</h4>
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span className="font-medium text-slate-400 truncate max-w-[120px]">{ticket.tenant_name}</span>
          <span>{ticket.creator_name}</span>
        </div>
      </div>

      <div className="mt-1 pt-2 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <Clock size={10} className={isBreached ? "text-rose-500" : "text-slate-500"} />
          <span className={clsx(isBreached ? "text-rose-400 font-bold" : "text-slate-400")}>
            {remainingText}
          </span>
        </div>
        
        {ticket.is_escalated && (
          <div className="flex items-center gap-1 text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
            <AlertTriangle size={10} /> L{ticket.escalation_level}
          </div>
        )}
      </div>

      {/* SLA Progress Bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900">
        <div 
          className={clsx("h-full transition-all duration-1000", colorClass, isBreached && "animate-pulse")}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
}

function calculateSLA(slaResolutionAt) {
  if (!slaResolutionAt) return { percent: 100, isBreached: false, remainingText: 'No SLA', colorClass: 'bg-slate-700' };
  
  const target = new Date(slaResolutionAt).getTime();
  const now = new Date().getTime();
  const diffMs = target - now;
  
  // Assume a 24h standard SLA window for percentage calculation if we don't have the creation time.
  // In a real system, percent = (now - created) / (target - created)
  const windowMs = 24 * 60 * 60 * 1000; 
  let percent = ((windowMs - diffMs) / windowMs) * 100;
  
  if (diffMs < 0) {
    const absMs = Math.abs(diffMs);
    const hrs = Math.floor(absMs / 3600000);
    const mins = Math.floor((absMs % 3600000) / 60000);
    return { 
      percent: 100, 
      isBreached: true, 
      remainingText: `-${hrs}h ${mins}m`, 
      colorClass: 'bg-rose-500' 
    };
  }

  const hrs = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  
  let colorClass = 'bg-emerald-500';
  if (percent > 85) colorClass = 'bg-amber-500';
  if (percent > 95) colorClass = 'bg-rose-400';

  return {
    percent,
    isBreached: false,
    remainingText: `${hrs}h ${mins}m`,
    colorClass
  };
}
