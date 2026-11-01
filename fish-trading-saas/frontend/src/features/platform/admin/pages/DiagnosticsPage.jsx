import React from "react";
import { 
  Server, Database, Activity, Cpu, HardDrive, Zap, Play,
  AlertTriangle, RefreshCw, Layers, ShieldCheck, CheckCircle2,
  Users, AlignLeft, RotateCw
} from "lucide-react";
import clsx from "clsx";
import { useDiagnostics } from "../hooks/useDiagnostics";
import { KPICard } from "../components/KPICard";

export default function DiagnosticsPage() {
  const {
    health,
    services,
    incidents,
    tenants,
    jobs,
    loading,
    loadData,
    handleAction
  } = useDiagnostics();

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-full">
        <Activity className="animate-spin text-indigo-500 w-8 h-8" />
      </div>
    );
  }

  const { global_status, kpis } = health || {};

  return (
    <div className="space-y-6 pb-20 max-w-[1600px] mx-auto custom-scrollbar">
      {/* Top Header & Global Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-[#0a0a0c]/90 backdrop-blur-md z-20 py-4 border-b border-white/5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Infrastructure Operations
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 uppercase tracking-wider border border-indigo-500/20">
              Datacenter
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Real-time platform telemetry, node health, and service tracking.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-6 px-5 py-2 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center gap-3 border-r border-white/10 pr-6">
              <ShieldCheck className={clsx(
                "w-8 h-8",
                global_status?.status === 'Healthy' ? "text-emerald-500" : "text-amber-500"
              )} />
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cluster Status</div>
                <div className={clsx(
                  "text-base font-black leading-none mt-1",
                  global_status?.status === 'Healthy' ? "text-emerald-400" : "text-amber-400"
                )}>
                  {global_status?.status?.toUpperCase()}
                </div>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Uptime</div>
              <div className="text-base font-mono font-bold text-slate-200 mt-1">{global_status?.uptime}</div>
            </div>
          </div>
          <button onClick={loadData} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20">
            <RefreshCw size={16} /> Sync
          </button>
        </div>
      </div>

      {/* Smart Alerts */}
      {incidents.length === 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-emerald-400 font-bold text-sm">All Systems Operational</h4>
            <p className="text-emerald-400/80 text-xs mt-1">
              Cluster telemetry indicates 0 active incidents. Resource consumption is nominal.
            </p>
          </div>
        </div>
      )}

      {/* Executive KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="API Health" 
          value={kpis?.api?.avg_latency} label="Avg Latency"
          sub={`${kpis?.api?.requests_min} req/m`} subIcon={Activity} 
          icon={Zap} color="indigo" 
        />
        <KPICard title="Database Health" 
          value={kpis?.database?.query_time} label="Query Time"
          sub={`${kpis?.database?.slow_queries} slow queries`} subIcon={Database} 
          icon={Database} color="emerald" alert={kpis?.database?.slow_queries > 10}
        />
        <KPICard title="Worker Queues" 
          value={kpis?.workers?.active_workers} label="Active Nodes"
          sub={`${kpis?.workers?.pending_jobs} pending jobs`} subIcon={Layers} 
          icon={Server} color="amber" 
        />
        <KPICard title="Redis Cache" 
          value={kpis?.redis?.hit_rate} label="Hit Rate"
          sub={`${kpis?.redis?.memory_use} Memory`} subIcon={Cpu} 
          icon={Cpu} color="purple" 
        />
        <KPICard title="Storage Health" 
          value={kpis?.storage?.used} label="Used"
          sub={kpis?.storage?.sync_state} subIcon={HardDrive} 
          icon={HardDrive} color="blue" 
        />
      </div>

      {/* Real-Time Metrics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-6 flex justify-between">
            API Response Latency (P95)
            <span className="text-indigo-400 font-mono">Live</span>
          </h3>
          <div className="h-[200px] w-full flex items-end justify-between px-2 pt-4">
            {services?.telemetry?.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end items-center px-1">
                <div className="w-full bg-indigo-500/40 border-t border-indigo-500/50 rounded-t" style={{ height: `${Math.min(100, (d.api_latency / 300) * 100)}%` }}></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-6 flex justify-between">
            Cluster Resource Load
            <span className="text-emerald-400 font-mono">Live</span>
          </h3>
          <div className="h-[200px] w-full flex items-end justify-between px-2 pt-4">
            {services?.telemetry?.map((d, i) => (
              <div key={i} className="flex-1 flex items-end justify-center px-0.5 gap-1">
                <div className="w-full bg-emerald-500/50 rounded-t" style={{ height: `${d.cpu}%` }}></div>
                <div className="w-full bg-amber-500/50 rounded-t" style={{ height: `${d.memory}%` }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Service Monitoring Grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Layers size={16} /> Microservices Telemetry
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {services?.services?.map((svc, i) => (
            <div key={i} className="bg-[#121215] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors flex flex-col group relative overflow-hidden">
              <div className={clsx(
                "absolute top-0 left-0 w-full h-1",
                svc.status === 'Healthy' ? "bg-emerald-500" : svc.status === 'Warning' ? "bg-amber-500" : "bg-rose-500"
              )}></div>
              <div className="flex justify-between items-start mb-4 mt-1">
                <div className="font-bold text-slate-200">{svc.name}</div>
                <div className={clsx(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                  svc.status === 'Healthy' ? "bg-emerald-500/10 text-emerald-400" : svc.status === 'Warning' ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"
                )}>{svc.status}</div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Latency</span>
                  <span className="font-mono text-slate-300">{svc.latency}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Load</span>
                  <span className="font-mono text-slate-300">{svc.load_pct}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Req/s</span>
                  <span className="font-mono text-slate-300">{svc.req_sec}</span>
                </div>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleAction('services', 'restart', svc.name)}
                  className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded text-[10px] font-bold transition-colors flex justify-center items-center gap-1 border border-white/10"
                >
                  <RotateCw size={12} /> Restart
                </button>
                <button 
                  onClick={() => handleAction('services', 'view_logs', svc.name)}
                  className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded text-[10px] font-bold transition-colors flex justify-center items-center gap-1 border border-white/10"
                >
                  <AlignLeft size={12} /> Logs
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Incident Feed */}
        <div className="bg-[#121215] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[400px]">
          <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#18181c] shrink-0">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-400" /> Active Incidents
              </h3>
              <p className="text-xs text-slate-400 mt-1">Infrastructure alerts requiring operator attention.</p>
            </div>
          </div>
          
          <div className="overflow-y-auto custom-scrollbar flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-[#0f0f13] border-b border-white/5 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3 font-bold">Issue</th>
                  <th className="px-5 py-3 font-bold">Service</th>
                  <th className="px-5 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={clsx("w-2 h-2 rounded-full", inc.severity === 'Critical' ? "bg-rose-500 animate-pulse" : inc.severity === 'Warning' ? "bg-amber-500" : "bg-blue-500")}></span>
                        <div className="font-bold text-slate-200">{inc.description}</div>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">{inc.id} • {new Date(inc.detected_at).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {inc.service}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleAction('incidents', 'resolve')}
                          className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                        >
                          Resolve
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {incidents.length === 0 && (
                  <tr>
                    <td colSpan="3" className="px-5 py-12 text-center text-slate-500">
                      No active infrastructure incidents.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tenant Noisy Neighbors */}
        <div className="bg-[#121215] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[400px]">
          <div className="p-5 border-b border-white/5 bg-[#18181c] shrink-0">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users size={18} className="text-amber-400" /> Tenant Resource Consumption
            </h3>
            <p className="text-xs text-slate-400 mt-1">Top tenants by API and infrastructure load.</p>
          </div>
          <div className="overflow-y-auto custom-scrollbar flex-1 p-5 space-y-3">
            {tenants.map((t, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="font-bold text-slate-200">{t.tenant_name}</div>
                  <span className={clsx(
                    "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border",
                    t.risk_level === 'High' ? "text-rose-400 bg-rose-500/10 border-rose-500/20" : t.risk_level === 'Medium' ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  )}>
                    {t.risk_level} Impact
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-black/20 p-2 rounded border border-white/5">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">API Reqs</div>
                    <div className="text-xs font-mono text-slate-300 mt-0.5">{t.api_requests}</div>
                  </div>
                  <div className="bg-black/20 p-2 rounded border border-white/5">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Storage</div>
                    <div className="text-xs font-mono text-slate-300 mt-0.5">{t.storage_mock}</div>
                  </div>
                  <div className="bg-black/20 p-2 rounded border border-white/5">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">CPU Load</div>
                    <div className="text-xs font-mono text-slate-300 mt-0.5">{t.cpu_impact}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Background Jobs Monitor */}
      <div className="bg-[#121215] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#18181c]">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Play size={18} className="text-purple-400" /> Background Queue Operations
            </h3>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/5">
          {jobs.map((job, i) => (
            <div key={i} className="p-5 hover:bg-white/[0.02] transition-colors flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{job.queue.replace('_', ' ')}</span>
                  {job.failed > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
                </div>
                <div className="text-3xl font-black text-slate-200 mb-1">{job.pending}</div>
                <div className="text-[10px] text-slate-500 uppercase font-bold">Pending Tasks</div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-xs">
                <span className="text-slate-400"><span className="text-emerald-400 font-bold">{job.active}</span> Active</span>
                <span className="text-slate-400"><span className={job.failed > 0 ? "text-rose-400 font-bold" : ""}>{job.failed}</span> Failed</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
