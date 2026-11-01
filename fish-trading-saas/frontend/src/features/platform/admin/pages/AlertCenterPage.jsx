import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/services/core/apiClient";
import {
  Bell, BellRing, CheckCircle2, X, ChevronDown,
  Send, Megaphone, AlertTriangle, Info, Zap, Loader2,
  BarChart3, Users, ShieldAlert, ArrowUpRight, Check,
  Clock, Calendar, FileText, MonitorPlay, Radio, Activity
} from "lucide-react";
import clsx from "clsx";
import { useToast } from "@/components/shared/toast-provider";
import { safeObjectAccess } from "@/utils/security/safeAccess";

const ALERT_TYPES = [
  { id: "system",       label: "System Message",      icon: Info,           color: "blue"   },
  { id: "maintenance",  label: "Maintenance Window",  icon: Zap,            color: "amber"  },
  { id: "feature",      label: "Feature Launch",      icon: Megaphone,      color: "indigo" },
  { id: "billing",      label: "Billing Notice",      icon: FileText,       color: "emerald" },
  { id: "security",     label: "Security Warning",    icon: ShieldAlert,    color: "rose"   },
  { id: "emergency",    label: "Critical Outage",     icon: AlertTriangle,  color: "rose"   },
];

const PRIORITIES = [
  { id: "info",      label: "Info",      color: "blue" },
  { id: "low",       label: "Low",       color: "emerald" },
  { id: "medium",    label: "Medium",    color: "amber" },
  { id: "high",      label: "High",      color: "orange" },
  { id: "critical",  label: "Critical",  color: "rose" },
];

export default function AlertCenterPage() {
  const [kpis, setKpis] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Composer State
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [alertType, setAlertType] = useState("system");
  const [priority, setPriority] = useState("info");
  const [audience, setAudience] = useState("all");
  const [channel, setChannel] = useState("in_app");
  
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const { push: toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [kRes, bRes, aRes, tRes] = await Promise.all([
        api.get("/platform/notifications/kpis/"),
        api.get("/platform/notifications/broadcasts/"),
        api.get("/platform/notifications/analytics/"),
        api.get("/platform/tenants/")
      ]);
      setKpis(kRes.data.kpis);
      setBroadcasts(bRes.data.results);
      setAnalytics(aRes.data.trend);
      setTenants(tRes.data?.tenants || []);
    } catch (err) {
      console.error(err);
      toast({ message: "Failed to load notification intelligence", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Force emergency state overrides
  useEffect(() => {
    if (emergencyMode) {
      setAlertType("emergency");
      setPriority("critical");
      setChannel("in_app_email");
      setAudience("all");
    }
  }, [emergencyMode]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ message: "Title and message are required", variant: "error" });
      return;
    }
    setSending(true);
    try {
      const payload = {
        title,
        message,
        priority,
        alert_type: alertType,
        audience,
        channel
      };
      
      const res = await api.post(`/platform/notifications/broadcasts/`, payload);
      toast({ message: res.data.message });
      setSent(true);
      setTitle("");
      setMessage("");
      setTimeout(() => setSent(false), 3000);
      loadData();
    } catch (err) {
      toast({ message: err.response?.data?.error || "Failed to dispatch broadcast", variant: "error" });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-full">
        <Loader2 className="animate-spin text-indigo-500 w-8 h-8" />
      </div>
    );
  }

  const selectedTypeObj = ALERT_TYPES.find(t => t.id === alertType) || ALERT_TYPES[0];
  const isRedZone = emergencyMode || alertType === 'emergency' || priority === 'critical';

  return (
    <div className={clsx("space-y-6 pb-20 max-w-[1600px] mx-auto transition-colors duration-500", isRedZone ? "bg-rose-950/10" : "")}>
      
      {/* Top Header */}
      <div className={clsx("flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 backdrop-blur-md z-30 py-4 border-b transition-colors duration-500", isRedZone ? "bg-rose-950/80 border-rose-500/30" : "bg-[#0a0a0c]/90 border-white/5")}>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Notification Center
            <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", isRedZone ? "bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse" : "bg-indigo-500/20 text-indigo-400 border-indigo-500/20")}>
              {isRedZone ? "Emergency Mode" : "Communication HQ"}
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Enterprise broadcast system for tenant communications and platform alerts.</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setEmergencyMode(!emergencyMode)} className={clsx("px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all border", emergencyMode ? "bg-rose-600 text-white border-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.4)]" : "bg-white/5 text-rose-400 border-rose-500/30 hover:bg-rose-500/10")}>
            <ShieldAlert size={16} /> {emergencyMode ? "Disable Emergency Mode" : "Trigger Emergency"}
          </button>
        </div>
      </div>

      {/* Executive KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Total Notifications Sent" value={kpis?.total_sent?.value} sub={kpis?.total_sent?.sub} trend={kpis?.total_sent?.trend} icon={Send} color="indigo" />
        <KPICard title="Active Broadcasts" value={kpis?.active_broadcasts?.value} sub={kpis?.active_broadcasts?.sub} trend={kpis?.active_broadcasts?.trend} icon={Radio} color="blue" />
        <KPICard title="Delivery Performance" value={kpis?.delivery_performance?.value} sub={kpis?.delivery_performance?.sub} trend={kpis?.delivery_performance?.trend} icon={BarChart3} color="emerald" />
        <KPICard title="Emergency Alerts" value={kpis?.emergencies?.value} sub={kpis?.emergencies?.sub} trend={kpis?.emergencies?.trend} icon={AlertTriangle} color="rose" alert={kpis?.emergencies?.value > 0} />
        <KPICard title="Tenant Reach" value={kpis?.tenant_reach?.value} sub={kpis?.tenant_reach?.sub} trend={kpis?.tenant_reach?.trend} icon={Users} color="amber" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT PANEL: Enterprise Composer */}
        <div className="xl:col-span-5 space-y-6">
          <div className={clsx("border rounded-2xl overflow-hidden shadow-2xl transition-all duration-500", isRedZone ? "bg-rose-950/20 border-rose-500/50 shadow-[0_0_30px_rgba(225,29,72,0.15)]" : "bg-[#121215] border-white/10")}>
            <div className={clsx("p-5 border-b flex items-center gap-2", isRedZone ? "border-rose-500/30 bg-rose-900/20" : "border-white/5 bg-[#18181c]")}>
              <MonitorPlay size={18} className={isRedZone ? "text-rose-400" : "text-indigo-400"} />
              <h3 className="font-bold text-white text-base">Broadcast Composer</h3>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Alert Type & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2 block">Alert Type</label>
                  <select 
                    value={alertType} 
                    onChange={e => setAlertType(e.target.value)}
                    disabled={emergencyMode}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 appearance-none disabled:opacity-50"
                  >
                    {ALERT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2 block">Priority Level</label>
                  <select 
                    value={priority} 
                    onChange={e => setPriority(e.target.value)}
                    disabled={emergencyMode}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 appearance-none disabled:opacity-50"
                  >
                    {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Audience & Channel */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2 block">Audience Segment</label>
                  <select 
                    value={audience} 
                    onChange={e => setAudience(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 appearance-none"
                  >
                    <option value="all">All Active Tenants</option>
                    <option value="premium">Premium/Enterprise Only</option>
                    <optgroup label="Specific Tenant">
                      {tenants.map(t => <option key={t.id} value={`tenant_${t.id}`}>{t.name}</option>)}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2 block">Delivery Channel</label>
                  <select 
                    value={channel} 
                    onChange={e => setChannel(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 appearance-none"
                  >
                    <option value="in_app">In-App Notification Only</option>
                    <option value="in_app_email">In-App + Email Digest</option>
                    <option value="push">Push Notification</option>
                  </select>
                </div>
              </div>

              {/* Message Basics */}
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2 block">Message Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Scheduled Maintenance for EU-West"
                  className={clsx("w-full bg-black/40 border rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none transition-colors", title ? "border-white/20 focus:border-indigo-500" : "border-white/10 focus:border-indigo-500/50")}
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2 block">Rich Message Body (Markdown Supported)</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={8}
                  placeholder="Enter the detailed broadcast message here..."
                  className={clsx(
                    "w-full bg-black/40 border rounded-lg px-4 py-3 text-sm text-slate-200 resize-none focus:outline-none transition-colors custom-scrollbar",
                    message ? "border-white/20 focus:border-indigo-500" : "border-white/10 focus:border-indigo-500/50"
                  )}
                />
              </div>

              {/* Send Controls */}
              <div className="pt-2">
                <button
                  onClick={handleSend}
                  disabled={!title.trim() || !message.trim() || sending}
                  className={clsx(
                    "w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg",
                    sent
                      ? "bg-emerald-600 text-white shadow-emerald-600/20"
                      : isRedZone
                        ? "bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white shadow-rose-600/30"
                        : "bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-indigo-600/20"
                  )}
                >
                  {sending ? (
                    <><Loader2 size={16} className="animate-spin" /> Dispatching Broadcast…</>
                  ) : sent ? (
                    <><CheckCircle2 size={16} /> Broadcast Dispatched!</>
                  ) : (
                    <><Send size={16} /> Dispatch Broadcast Now</>
                  )}
                </button>
                <p className="text-center text-[10px] text-slate-500 mt-3 font-medium">
                  Broadcasts are immutable once sent. They will be logged in the system audit trail.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Preview, Analytics & History */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          
          {/* Live Preview Panel */}
          <div className="bg-[#121215] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/5 bg-[#18181c] flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Activity size={16} className="text-emerald-400" /> Live Preview
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 text-slate-400 uppercase tracking-widest border border-white/10">In-App View</span>
            </div>
            <div className="p-8 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-white/[0.01]">
              {title || message ? (
                <div className={clsx("max-w-md mx-auto rounded-xl p-6 border shadow-2xl backdrop-blur-md relative overflow-hidden", 
                  isRedZone ? "bg-rose-950/40 border-rose-500/40" : "bg-[#1a1a1f]/90 border-white/10"
                )}>
                  {isRedZone && <div className="absolute top-0 left-0 w-full h-1 bg-rose-500 animate-pulse"></div>}
                  <div className="flex gap-4">
                    <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border",
                      isRedZone ? "bg-rose-500/20 border-rose-500/30 text-rose-400" : "bg-indigo-500/20 border-indigo-500/30 text-indigo-400"
                    )}>
                      <selectedTypeObj.icon size={20} />
                    </div>
                    <div>
                      <div className={clsx("text-[10px] font-bold uppercase tracking-wider mb-1", isRedZone ? "text-rose-400" : "text-indigo-400")}>
                        {selectedTypeObj.label} • {PRIORITIES.find(p=>p.id===priority)?.label} Priority
                      </div>
                      <h4 className="text-sm font-bold text-white mb-2">{title || "Untitled Notification"}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{message}</p>
                      
                      <div className="mt-4 flex gap-2">
                        <button className={clsx("px-4 py-1.5 rounded text-xs font-bold transition-colors", isRedZone ? "bg-rose-600 text-white" : "bg-indigo-600 text-white")}>Action Button</button>
                        <button className="px-4 py-1.5 rounded text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors">Dismiss</button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-slate-600 text-sm">
                  Start typing to see live preview
                </div>
              )}
            </div>
          </div>

          {/* Delivery Analytics */}
          <div className="bg-[#121215] border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/5 bg-[#18181c]">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-400" /> 7-Day Delivery Analytics
              </h3>
            </div>
            <div className="p-5 h-64 flex flex-col items-center justify-center border-t border-white/5 bg-gradient-to-b from-[#18181c] to-black/20">
              <div className="w-full h-full flex items-end justify-between px-4 gap-2 pb-4 pt-8">
                {analytics.map((d, i) => (
                  <div key={i} className="w-full flex flex-col justify-end items-center gap-1 h-full group">
                    <div className="w-full bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 rounded-t transition-all relative" style={{ height: `${(d.sent / 500) * 100}%` }}>
                      <div className="absolute bottom-0 w-full bg-emerald-500/40 border-t border-emerald-500/50" style={{ height: `${(d.opened / d.sent) * 100}%` }}></div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-2">{d.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Broadcast History Table */}
          <div className="bg-[#121215] border border-white/10 rounded-2xl overflow-hidden flex-1 flex flex-col min-h-[300px]">
            <div className="p-5 border-b border-white/5 bg-[#18181c] flex justify-between items-center">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Clock size={16} className="text-amber-400" /> Broadcast History
              </h3>
              <button className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300">View All</button>
            </div>
            <div className="overflow-y-auto custom-scrollbar flex-1">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-slate-500 uppercase font-bold tracking-widest bg-[#0f0f13] border-b border-white/5 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3">Campaign</th>
                    <th className="px-5 py-3">Audience & Reach</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {broadcasts.map((br) => {
                    const isCrit = br.priority === 'critical';
                    return (
                    <tr key={br.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-5 py-4">
                        <div className={clsx("font-bold text-slate-200 group-hover:text-white transition-colors", isCrit && "text-rose-300")}>{br.title}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span className="uppercase tracking-wider">{br.type}</span> • {br.id}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold text-slate-300">{br.audience}</div>
                        <div className="text-[10px] text-emerald-400 font-bold mt-0.5">{br.open_rate} Open Rate</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center w-fit gap-1">
                            <Check size={10} /> {br.status}
                          </span>
                          <span className="text-[10px] text-slate-500">{br.sent_time}</span>
                        </div>
                      </td>
                    </tr>
                  )})}
                  {broadcasts.length === 0 && (
                    <tr>
                      <td colSpan="3" className="px-5 py-12 text-center text-slate-500">
                        No previous broadcasts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, sub, icon: Icon, color, trend, alert }) {
  const colorMap = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };
  const textColorMap = {
    emerald: "text-emerald-400", indigo: "text-indigo-400", amber: "text-amber-400",
    purple: "text-purple-400", blue: "text-blue-400", rose: "text-rose-400",
  };
  const safeColorClass = safeObjectAccess(colorMap, color, "text-slate-400 bg-slate-500/10 border-slate-500/20");
  const textColor = safeObjectAccess(textColorMap, color, "text-slate-400");

  return (
    <div className={clsx("bg-white/[0.02] border border-white/5 rounded-2xl p-5 relative overflow-hidden group hover:border-white/10 transition-colors", alert && "border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]")}>
      {alert && <div className="absolute top-0 right-0 w-12 h-12 bg-rose-500/10 rounded-bl-full border-b border-l border-rose-500/10 -mr-2 -mt-2"></div>}
      <div className="flex justify-between items-start mb-4">
        <div className={clsx("p-2 rounded-xl border", safeColorClass)}>
          <Icon size={16} />
        </div>
        {trend !== undefined && trend !== 0 && (
          <span className={clsx("text-[10px] font-bold flex items-center", trend >= 0 ? "text-emerald-400" : "text-rose-400")}>
            <ArrowUpRight size={10} className={trend < 0 ? "rotate-90" : ""} /> {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <div className={clsx("text-2xl font-black mb-1", textColor)}>{value ?? '--'}</div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</div>
        {sub && <div className="text-[10px] text-slate-500 mt-2 font-medium truncate">{sub}</div>}
      </div>
    </div>
  );
}
