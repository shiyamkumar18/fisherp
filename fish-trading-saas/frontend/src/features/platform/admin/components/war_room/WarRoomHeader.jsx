import React from 'react';
import { Search, Clock, AlertTriangle, Users, Ticket, Plus, Activity } from 'lucide-react';
import clsx from 'clsx';

export function WarRoomHeader({ metrics, loading, onOpenCreate }) {
  if (loading || !metrics) {
    return <div className="h-20 border-b border-white/10 flex items-center p-6 text-slate-500 animate-pulse bg-[#0f0f13]">Loading metrics...</div>;
  }

  return (
    <div className="bg-[#0f0f13] border-b border-white/10 flex flex-col md:flex-row items-center justify-between px-6 py-4 sticky top-0 z-40 shadow-sm gap-4">
      <div className="flex items-center gap-4 w-full md:w-auto">
        <div className="h-10 w-10 bg-indigo-500/20 rounded-lg flex items-center justify-center border border-indigo-500/30">
          <Activity className="text-indigo-400" size={20} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-100 tracking-tight leading-none">Support Command Center</h1>
          <p className="text-[11px] text-emerald-400 font-mono mt-1 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span> LIVE SYNC ACTIVE
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="flex flex-wrap items-center gap-6 text-sm">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5 flex items-center gap-1"><Clock size={10}/> Avg Response</span>
          <span className="text-slate-200 font-mono">{metrics.avg_response_time_mins}m</span>
        </div>
        <div className="w-px h-8 bg-white/10 hidden md:block"></div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5 flex items-center gap-1"><AlertTriangle size={10}/> SLA Breaches</span>
          <span className={clsx("font-mono", metrics.breached_tickets > 0 ? "text-rose-500 font-bold" : "text-emerald-500")}>{metrics.breached_tickets}</span>
        </div>
        <div className="w-px h-8 bg-white/10 hidden md:block"></div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5 flex items-center gap-1"><Users size={10}/> Active Agents</span>
          <span className="text-slate-200 font-mono">{metrics.active_agents}</span>
        </div>
        <div className="w-px h-8 bg-white/10 hidden md:block"></div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5 flex items-center gap-1"><Ticket size={10}/> Escalated</span>
          <span className={clsx("font-mono", metrics.escalated_tickets > 0 ? "text-amber-500" : "text-slate-200")}>{metrics.escalated_tickets}</span>
        </div>
      </div>

      {/* Global Search and Create */}
      <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input 
            type="text" 
            placeholder="Search support (Ctrl+K)..." 
            className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[9px] text-slate-600 font-mono border border-white/5 rounded px-1.5 py-0.5 bg-white/5">
            <span>⌘</span>K
          </div>
        </div>

        <button 
          onClick={onOpenCreate}
          className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
        >
          <Plus size={14} /> Create Ticket
        </button>
      </div>
    </div>
  );
}
