import React, { useState } from 'react';
import { User, Activity, AlertCircle, Circle, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import clsx from 'clsx';
import { assignTicket } from "../../service/adminService";
import { useToast } from "@/components/shared/toast-provider";

export function AgentWorkloadPanel({ agents = [], tickets = [], onSelectTicket, onAssignTicket }) {
  const { push: toast } = useToast();
  const [expandedAgentId, setExpandedAgentId] = useState(null);

  const handleDrop = async (e, agentId) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData("ticketId");
    if (!ticketId || !agentId) return;

    try {
      await assignTicket(ticketId, agentId);
      toast({ message: "Ticket assigned successfully" });
      if (onAssignTicket) {
        onAssignTicket(ticketId, 'assigned', {});
      }
    } catch (err) {
      toast({ message: "Failed to assign ticket", variant: "error" });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const toggleExpand = (agentId) => {
    setExpandedAgentId(prev => (prev === agentId ? null : agentId));
  };

  return (
    <div className="w-64 shrink-0 bg-[#0a0a0c] border-l border-white/10 hidden xl:flex flex-col h-full sticky top-0 overflow-y-auto custom-scrollbar">
      <div className="p-4 border-b border-white/5 sticky top-0 bg-[#0a0a0c]/90 backdrop-blur z-10">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Activity size={12} className="text-indigo-400" /> Live Queue Operations
        </h2>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3">On Shift (L2/L3)</h3>
          <div className="space-y-3">
            {agents.filter(a => ['SUPPORT L2', 'SUPPORT L3'].includes(a.role)).map(agent => {
              const agentTickets = tickets.filter(t => 
                t.assignee === agent.id || 
                t.assignee_id === agent.id || 
                (t.assignee_name && t.assignee_name === agent.name)
              );
              return (
                <AgentRow 
                  key={agent.id} 
                  agent={agent} 
                  tickets={agentTickets}
                  onSelectTicket={onSelectTicket}
                  isExpanded={expandedAgentId === agent.id}
                  onToggleExpand={() => toggleExpand(agent.id)}
                  onDrop={(e) => handleDrop(e, agent.id)} 
                  onDragOver={handleDragOver} 
                />
              );
            })}
          </div>
        </div>
        
        <div>
          <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3">Frontline (L1)</h3>
          <div className="space-y-3">
            {agents.filter(a => a.role === 'SUPPORT L1').map(agent => {
              const agentTickets = tickets.filter(t => 
                t.assignee === agent.id || 
                t.assignee_id === agent.id || 
                (t.assignee_name && t.assignee_name === agent.name)
              );
              return (
                <AgentRow 
                  key={agent.id} 
                  agent={agent} 
                  tickets={agentTickets}
                  onSelectTicket={onSelectTicket}
                  isExpanded={expandedAgentId === agent.id}
                  onToggleExpand={() => toggleExpand(agent.id)}
                  onDrop={(e) => handleDrop(e, agent.id)} 
                  onDragOver={handleDragOver} 
                />
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="mt-auto p-4 border-t border-white/5 bg-white/[0.01]">
        <button className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-medium rounded-md transition-colors border border-indigo-500/20">
          Reassign Queue Balances
        </button>
      </div>
    </div>
  );
}

function AgentRow({ agent, tickets = [], onSelectTicket, isExpanded, onToggleExpand, onDrop, onDragOver }) {
  const isHighWorkload = agent.workload > 80;
  
  return (
    <div 
      onDrop={onDrop}
      onDragOver={onDragOver}
      onClick={onToggleExpand}
      className={clsx(
        "group flex flex-col gap-1.5 p-2 rounded-lg hover:bg-white/5 transition-all cursor-pointer border",
        isExpanded ? "bg-white/[0.03] border-white/10 shadow-lg" : "border-transparent"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {isExpanded ? <ChevronDown size={12} className="text-slate-500 shrink-0" /> : <ChevronRight size={12} className="text-slate-500 shrink-0" />}
          <div className="relative shrink-0">
            <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
              <User size={12} className="text-slate-400" />
            </div>
            <Circle 
              size={8} 
              className={clsx(
                "absolute -bottom-0.5 -right-0.5 fill-current border border-[#0a0a0c] rounded-full",
                agent.status === 'online' ? "text-emerald-500" : agent.status === 'away' ? "text-amber-500" : "text-slate-600"
              )} 
            />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-200 truncate">{agent.name}</div>
            <div className="text-[9px] text-slate-500">{agent.role}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-mono text-slate-300">
            {agent.activeTickets} <span className="text-[9px] text-slate-600">tkts</span>
          </div>
        </div>
      </div>
      
      {agent.status !== 'offline' && !isExpanded && (
        <div className="w-full flex items-center gap-2 mt-0.5">
          <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={clsx("h-full rounded-full transition-all", isHighWorkload ? "bg-rose-500" : "bg-indigo-500")}
              style={{ width: `${agent.workload}%` }}
            />
          </div>
          <span className={clsx("text-[8px] font-mono", isHighWorkload ? "text-rose-400" : "text-slate-500")}>
            {agent.workload}%
          </span>
          {isHighWorkload && <AlertCircle size={9} className="text-rose-500 shrink-0" title="High Workload Warning" />}
        </div>
      )}

      {isExpanded && (
        <div className="mt-2.5 space-y-1.5 pl-3 border-l border-indigo-500/30">
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <FileText size={10} /> Active Tickets ({tickets.length})
          </div>
          {tickets.length > 0 ? (
            tickets.map(ticket => (
              <div
                key={ticket.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTicket(ticket);
                }}
                className="flex items-center justify-between p-1.5 rounded bg-black/40 hover:bg-[#1a1a24] border border-white/5 hover:border-indigo-500/30 text-[10px] text-slate-300 font-medium transition-all"
              >
                <span className="text-indigo-400 font-mono font-bold shrink-0">{ticket.ticket_number || `TKT-${ticket.id}`}</span>
                <span className="truncate flex-1 ml-1.5 mr-1" title={ticket.subject}>{ticket.subject}</span>
              </div>
            ))
          ) : (
            <span className="text-[9px] text-slate-600 italic block pl-1">No active tickets</span>
          )}
        </div>
      )}
    </div>
  );
}
