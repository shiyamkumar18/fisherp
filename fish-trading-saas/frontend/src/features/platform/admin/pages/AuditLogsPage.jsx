import React, { useEffect, useState } from "react";
import { api } from "@/services/core/apiClient";
import { 
  ShieldAlert, Activity, UserX, AlertOctagon, TerminalSquare, 
  MapPin, Shield, Zap, Search, Download, Filter, Eye, StopCircle, RefreshCcw
} from "lucide-react";
import { useToast } from "@/components/shared/toast-provider";
import clsx from "clsx";
import { safeObjectAccess } from "@/utils/security/safeAccess";

export default function AuditLogsPage() {
  const [kpiData, setKpiData] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loginData, setLoginData] = useState(null);
  const [warRoom, setWarRoom] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { push: toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [kpiRes, incRes, logRes, warRes] = await Promise.all([
        api.get("/platform/security/kpi/"),
        api.get("/platform/security/incidents/"),
        api.get("/platform/security/login-intelligence/"),
        api.get("/platform/security/impersonation-war-room/")
      ]);
      setKpiData(kpiRes.data);
      setIncidents(incRes.data.results);
      setLoginData(logRes.data);
      setWarRoom(warRes.data.results);
    } catch (error) {
      console.error(error);
      toast({ message: "Failed to load SOC data", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (endpoint, action, id) => {
    try {
      await api.post(`/platform/security/${endpoint}/`, { action, id });
      toast({ message: `Action '${action}' executed successfully.` });
      loadData();
    } catch (err) {
      toast({ message: `Failed to execute action`, variant: "error" });
    }
  };

  const handleImpersonationAction = async (action, id) => {
    try {
      await api.post(`/platform/security/impersonation-war-room/${id}/`, { action });
      toast({ message: `Session terminated forcibly.` });
      loadData();
    } catch (err) {
      toast({ message: `Failed to terminate session`, variant: "error" });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-full">
        <Activity className="animate-spin text-emerald-500 w-8 h-8" />
      </div>
    );
  }

  const isSecure = kpiData?.score > 80 && incidents.length === 0;

  return (
    <div className="space-y-6 pb-20 max-w-[1600px] mx-auto custom-scrollbar">
      {/* Top Header & Global Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-[#0a0a0c]/90 backdrop-blur-md z-20 py-4 border-b border-white/5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Security & Audit SOC
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 uppercase tracking-wider border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> LIVE MONITORING ACTIVE
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Platform security operations, threat detection, and audit trails.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
            <Shield className={clsx(
              "w-8 h-8",
              kpiData?.status === 'Healthy' ? "text-emerald-500" : kpiData?.status === 'Warning' ? "text-amber-500" : "text-rose-500"
            )} />
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Platform Score</div>
              <div className={clsx(
                "text-xl font-black leading-none",
                kpiData?.status === 'Healthy' ? "text-emerald-400" : kpiData?.status === 'Warning' ? "text-amber-400" : "text-rose-400"
              )}>
                {kpiData?.score} / 100
              </div>
            </div>
          </div>
          <button className="px-3 py-2 bg-white/5 text-slate-300 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 flex items-center gap-2 transition-colors">
            <Download size={16} /> Export Logs
          </button>
        </div>
      </div>

      {isSecure && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-8 flex flex-col items-center justify-center text-center">
          <ShieldAlert className="text-emerald-400 mb-4 w-12 h-12" />
          <h2 className="text-2xl font-bold text-emerald-400">Platform Secure</h2>
          <p className="text-emerald-400/80 mt-2 max-w-md">
            No active threats detected. Recent system health is Excellent. Continue monitoring or review permission policies.
          </p>
        </div>
      )}

      {/* Executive KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard 
          title="Failed Logins (24h)" 
          value={kpiData?.metrics?.failed_logins_24h} 
          icon={UserX} 
          color={kpiData?.metrics?.failed_logins_24h > 10 ? "rose" : "emerald"} 
          alert={kpiData?.metrics?.failed_logins_24h > 20}
        />
        <KPICard 
          title="Permission Violations" 
          value={kpiData?.metrics?.permission_violations} 
          icon={AlertOctagon} 
          color={kpiData?.metrics?.permission_violations > 0 ? "amber" : "emerald"} 
        />
        <KPICard 
          title="Active Impersonations" 
          value={kpiData?.metrics?.active_impersonations} 
          icon={TerminalSquare} 
          color="indigo" 
        />
        <KPICard 
          title="Suspicious Sessions" 
          value={kpiData?.metrics?.suspicious_sessions} 
          icon={Zap} 
          color="rose" 
          alert={kpiData?.metrics?.suspicious_sessions > 0}
        />
      </div>

      {/* Login Intelligence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Failed vs Success Logins */}
        <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-6">Authentication Trends (7 Days)</h3>
          <div className="h-[250px] w-full flex items-end justify-between px-4 gap-2 pb-4 pt-8">
            {loginData?.trends?.map((d, i) => (
              <div key={i} className="w-full flex flex-col justify-end items-center gap-1 h-full group">
                <div className="w-full bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/30 rounded-t transition-all relative" style={{ height: `${Math.min(100, (d.success / 1000) * 100)}%` }}>
                  <div className="absolute top-0 w-full bg-rose-500/40 border-b border-rose-500/50" style={{ height: `${Math.min(100, (d.failed / (d.success + 1)) * 100)}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-2">{d.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Geo-Login Distribution */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-6 flex items-center gap-2">
            <MapPin size={16} /> Global Login Origins
          </h3>
          <div className="flex-1 w-full h-[250px] flex flex-col justify-center gap-4">
            {loginData?.geo_distribution?.map((entry, index) => (
              <div key={index} className="w-full">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{entry.country}</span>
                  <span>{entry.percentage}%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${entry.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Incident Feed */}
        <div className="bg-[#121215] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
          <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#18181c] shrink-0">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertOctagon size={18} className="text-rose-400" /> Security Incident Feed
              </h3>
              <p className="text-xs text-slate-400 mt-1">High-risk audit events requiring investigation.</p>
            </div>
            <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-md border border-white/10">
               <Search size={14} className="text-slate-400" />
               <input type="text" placeholder="Search incidents..." className="bg-transparent border-none text-xs text-white focus:outline-none w-32" />
            </div>
          </div>
          
          <div className="overflow-y-auto custom-scrollbar flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-[#0f0f13] border-b border-white/5 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3 font-bold">Threat</th>
                  <th className="px-5 py-3 font-bold">Context</th>
                  <th className="px-5 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={clsx("w-2 h-2 rounded-full", inc.risk_score > 80 ? "bg-rose-500 animate-pulse" : "bg-amber-500")}></span>
                        <div className="font-bold text-slate-200">{inc.threat_type}</div>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">{inc.id} • {new Date(inc.timestamp).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-xs text-slate-300 font-medium truncate max-w-[200px]">{inc.user}</div>
                      <div className="text-[10px] text-slate-500">{inc.tenant} • {inc.ip_address}</div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleAction('incidents', 'suspend_user', inc.raw_log_id); }}
                          className="px-2 py-1 bg-rose-500/10 text-rose-400 rounded text-[10px] font-bold border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
                        >
                          Suspend
                        </button>
                        <button className="px-2 py-1 bg-white/5 text-slate-300 rounded text-[10px] font-bold border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-1">
                          <Eye size={10} /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {incidents.length === 0 && (
                  <tr>
                    <td colSpan="3" className="px-5 py-12 text-center text-slate-500">
                      No security incidents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Impersonation War Room */}
        <div className="bg-[#121215] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
          <div className="p-5 border-b border-white/5 bg-[#18181c] shrink-0">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TerminalSquare size={18} className="text-indigo-400" /> Impersonation War Room
            </h3>
            <p className="text-xs text-slate-400 mt-1">Live monitoring of platform operator impersonations.</p>
          </div>
          <div className="overflow-y-auto custom-scrollbar flex-1 p-5 space-y-3">
            {warRoom.map((log) => (
              <div key={log.id} className={clsx(
                "border rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden",
                log.is_active ? "bg-indigo-500/5 border-indigo-500/20" : "bg-white/[0.02] border-white/5 opacity-60"
              )}>
                {log.is_active && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>}
                
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-1">OPERATOR</div>
                    <div className="font-mono text-sm text-slate-200">{log.operator}</div>
                  </div>
                  {log.is_active ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-white/5 px-2 py-1 rounded border border-white/10">
                      Ended
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Target Tenant</div>
                    <div className="text-xs text-slate-300 font-medium truncate">{log.tenant}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Duration</div>
                    <div className="text-xs font-mono text-slate-300">{log.duration}</div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 bg-black/20 p-2 rounded border border-white/5">
                  <span className="font-bold">Reason:</span> {log.reason}
                </div>

                {log.is_active && (
                  <div className="pt-2 flex justify-end">
                    <button 
                      onClick={() => handleImpersonationAction('force_stop', log.id)}
                      className="px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded text-xs font-bold transition-colors flex items-center gap-1 border border-rose-500/20 hover:border-rose-500"
                    >
                      <StopCircle size={14} /> Force Stop Session
                    </button>
                  </div>
                )}
              </div>
            ))}
            {warRoom.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-2 py-12">
                <TerminalSquare size={24} className="text-slate-600" />
                <p className="text-sm font-medium">No impersonation history.</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

function KPICard({ title, value, icon: Icon, color, alert }) {
  const colorMap = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };
  
  const textColorMap = {
    emerald: "text-emerald-400",
    indigo: "text-indigo-400",
    rose: "text-rose-400",
    amber: "text-amber-400",
  };
  
  const safeColorClass = safeObjectAccess(colorMap, color, "text-slate-400 bg-slate-500/10 border-slate-500/20");
  const textColor = safeObjectAccess(textColorMap, color, "text-slate-400");

  return (
    <div className={clsx("bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group", alert && "border-rose-500/30")}>
      {alert && <div className="absolute top-0 right-0 w-12 h-12 bg-rose-500/10 rounded-bl-full border-b border-l border-rose-500/10 -mr-2 -mt-2"></div>}
      <div className="flex items-center gap-3 mb-4 z-10">
        <div className={clsx("p-2 rounded-xl flex items-center justify-center border", safeColorClass)}>
          <Icon size={16} />
        </div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="z-10">
        <p className={clsx("text-2xl font-black mb-1", textColor)}>{value ?? '0'}</p>
      </div>
    </div>
  );
}
