import React, { useEffect, useState } from "react";
import { api } from "@/services/core/apiClient";
import { 
  TrendingUp, Users, UserPlus, Target, DollarSign, Activity, AlertTriangle,
  ArrowUpRight, ArrowRight, Zap, MoreHorizontal, Mail, ShieldAlert,
  TerminalSquare, KanbanSquare, CheckCircle2, RefreshCw
} from "lucide-react";
import { useToast } from "@/components/shared/toast-provider";
import clsx from "clsx";
import { safeObjectAccess } from "@/utils/security/safeAccess";

export default function GrowthFunnelPage() {
  const [kpis, setKpis] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [kanban, setKanban] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { push: toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [kRes, fRes, knRes, tRes, pRes, aRes] = await Promise.all([
        api.get("/platform/growth/kpis/"),
        api.get("/platform/growth/funnel/"),
        api.get("/platform/growth/kanban/"),
        api.get("/platform/growth/tenants/"),
        api.get("/platform/growth/plans/"),
        api.get("/platform/growth/actions/")
      ]);
      setKpis(kRes.data.kpis);
      setFunnelData(fRes.data);
      setKanban(knRes.data.board);
      setTenants(tRes.data.results);
      setPlans(pRes.data.results);
      setActions(aRes.data.actions);
    } catch (error) {
      console.error(error);
      toast({ message: "Failed to load growth telemetry", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (actionStr, id = null) => {
    try {
      await api.post(`/platform/growth/tenants/`, { action: actionStr, tenant_id: id });
      toast({ message: `Action '${actionStr}' executed successfully.` });
    } catch (err) {
      toast({ message: `Failed to execute action`, variant: "error" });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-full">
        <Activity className="animate-spin text-indigo-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-[1600px] mx-auto custom-scrollbar">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-[#0a0a0c]/90 backdrop-blur-md z-20 py-4 border-b border-white/5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Growth Intelligence
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 uppercase tracking-wider border border-emerald-500/20">
              Live
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Tenant acquisition, lifecycle pipeline, and MRR intelligence.</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={loadData} className="px-3 py-2 bg-white/5 text-slate-300 rounded-lg text-sm font-medium hover:bg-white/10 flex items-center gap-2 border border-white/10 transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Executive KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Total MRR" value={kpis?.mrr?.value} sub={kpis?.mrr?.sub} trend={kpis?.mrr?.trend} icon={DollarSign} color="emerald" />
        <KPICard title="Active Tenants" value={kpis?.active_paying?.value} sub={kpis?.active_paying?.sub} trend={kpis?.active_paying?.trend} icon={Users} color="indigo" />
        <KPICard title="New Signups" value={kpis?.new_signups?.value} sub={kpis?.new_signups?.sub} trend={kpis?.new_signups?.trend} icon={UserPlus} color="purple" />
        <KPICard title="Total Accounts" value={kpis?.total_tenants?.value} sub={kpis?.total_tenants?.sub} trend={kpis?.total_tenants?.trend} icon={Target} color="blue" />
        <KPICard title="Churn Risk" value={kpis?.churn_risk?.value} sub={kpis?.churn_risk?.sub} trend={kpis?.churn_risk?.trend} icon={AlertTriangle} color="rose" alert={kpis?.churn_risk?.value > 5} />
      </div>

      {/* Visual Funnel & MRR Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Activation Funnel */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-6 flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-400" /> SaaS Activation Funnel
          </h3>
          <div className="space-y-4">
            {funnelData?.funnel?.map((stage, i) => {
              const max = Math.max(...funnelData.funnel.map(s => s.value), 1);
              const pct = (stage.value / max) * 100;
              return (
                <div key={stage.stage} className="relative">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-slate-200">{stage.stage}</span>
                    <span className="text-slate-400 font-mono">{stage.value} <span className="text-slate-600">({stage.conversion})</span></span>
                  </div>
                  <div className="h-4 bg-white/5 rounded-full overflow-hidden w-full relative">
                    <div 
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${pct}%`, backgroundColor: stage.color }}
                    />
                  </div>
                  {i < funnelData.funnel.length - 1 && (
                    <div className="flex justify-center -my-2 relative z-10">
                      <div className="bg-[#121215] border border-white/10 rounded-full p-0.5">
                        <ArrowRight size={10} className="text-slate-500 rotate-90" />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* MRR Trend */}
        <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-6">MRR Growth Trend (6 Mo)</h3>
          <div className="h-[250px] w-full flex items-end justify-between px-2 pt-4">
            {funnelData?.mrr_trend?.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end items-center px-1">
                <div className="w-full bg-emerald-500/40 border-t border-emerald-500/50 rounded-t" style={{ height: `${Math.min(100, (d.mrr / 50000) * 100)}%` }}></div>
                <span className="text-[10px] text-slate-500 mt-2 font-mono">{d.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tenant Lifecycle Kanban */}
      <div>
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <KanbanSquare size={16} className="text-purple-400" /> Tenant Lifecycle Pipeline
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          <KanbanColumn title="Lead" data={kanban?.lead} color="slate" />
          <KanbanColumn title="Onboarding (Trial)" data={kanban?.onboarding} color="blue" />
          <KanbanColumn title="Active (Paid)" data={kanban?.active} color="emerald" />
          <KanbanColumn title="At Risk" data={kanban?.at_risk} color="amber" />
          <KanbanColumn title="Churned" data={kanban?.churned} color="rose" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Growth Actions Center & Plan Performance */}
        <div className="space-y-6">
          <div className="bg-[#121215] border border-indigo-500/20 rounded-2xl p-5 shadow-[0_0_15px_rgba(99,102,241,0.05)]">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap size={16} /> Recommended Actions
            </h3>
            <div className="space-y-3">
              {actions?.map((act, i) => (
                <div key={i} className="bg-white/5 border border-white/10 p-3 rounded-lg flex justify-between items-center group">
                  <div>
                    <div className="text-xs font-bold text-slate-200">{act.title}</div>
                    <div className={clsx("text-[10px] font-bold uppercase tracking-widest mt-1", act.priority === 'High' ? "text-rose-400" : act.priority === 'Medium' ? "text-amber-400" : "text-emerald-400")}>{act.priority} Priority</div>
                  </div>
                  <button onClick={() => handleAction(act.action)} className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-indigo-500 text-white rounded text-[10px] font-bold transition-all">
                    {act.action}
                  </button>
                </div>
              ))}
              {actions?.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-4">No immediate actions recommended.</div>
              )}
            </div>
          </div>

          <div className="bg-[#121215] border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Plan Intelligence</h3>
            <div className="space-y-3">
              {plans?.map((plan, i) => (
                <div key={i} className="flex justify-between items-center p-3 border border-white/5 bg-white/[0.02] rounded-lg">
                  <div>
                    <div className="font-bold text-slate-200">{plan.plan}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{plan.tenants} Tenants • ${plan.mrr} MRR</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-400">+{plan.growth}% Gr</div>
                    <div className="text-xs font-bold text-rose-400">-{plan.churn}% Ch</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actionable Tenant Table */}
        <div className="lg:col-span-2 bg-[#121215] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
          <div className="p-5 border-b border-white/5 bg-[#18181c] shrink-0 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Target size={18} className="text-purple-400" /> Tenant Intelligence
              </h3>
              <p className="text-xs text-slate-400 mt-1">Deep analysis of tenant health and risk.</p>
            </div>
            <div className="flex gap-2">
               <input type="text" placeholder="Search tenants..." className="bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          
          <div className="overflow-y-auto custom-scrollbar flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-500 uppercase font-bold tracking-widest bg-[#0f0f13] border-b border-white/5 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3">Tenant</th>
                  <th className="px-5 py-3">Plan / MRR</th>
                  <th className="px-5 py-3">Health Score</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tenants?.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-200">{t.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{t.users} Users • Active {t.last_active}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xs font-bold text-slate-300">{t.plan}</div>
                      <div className="text-[10px] font-mono text-emerald-400">${t.mrr}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={clsx("w-2 h-2 rounded-full", t.risk_level === 'Critical' ? "bg-rose-500 animate-pulse" : t.risk_level === 'Warning' ? "bg-amber-500" : "bg-emerald-500")}></span>
                        <span className={clsx(
                          "text-xs font-bold px-2 py-0.5 rounded border",
                          t.risk_level === 'Critical' ? "text-rose-400 bg-rose-500/10 border-rose-500/20" : 
                          t.risk_level === 'Warning' ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : 
                          "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        )}>{t.risk_level}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right relative">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleAction('impersonate', t.id)} title="Impersonate" className="p-1.5 bg-white/5 hover:bg-indigo-500 hover:text-white text-slate-400 rounded transition-colors">
                          <TerminalSquare size={14} />
                        </button>
                        <button onClick={() => handleAction('email', t.id)} title="Email" className="p-1.5 bg-white/5 hover:bg-indigo-500 hover:text-white text-slate-400 rounded transition-colors">
                          <Mail size={14} />
                        </button>
                        <button onClick={() => handleAction('suspend', t.id)} title="Suspend" className="p-1.5 bg-white/5 hover:bg-rose-500 hover:text-white text-slate-400 rounded transition-colors">
                          <ShieldAlert size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tenants?.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-5 py-12 text-center text-slate-500">
                      No tenant data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}


// Sub-components

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
    <div className={clsx("bg-white/[0.02] border border-white/5 rounded-2xl p-5 relative overflow-hidden group", alert && "border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]")}>
      {alert && <div className="absolute top-0 right-0 w-12 h-12 bg-rose-500/10 rounded-bl-full border-b border-l border-rose-500/10 -mr-2 -mt-2"></div>}
      <div className="flex justify-between items-start mb-4">
        <div className={clsx("p-2 rounded-xl border", safeColorClass)}>
          <Icon size={16} />
        </div>
        {trend !== undefined && (
          <span className={clsx("text-xs font-bold flex items-center", trend >= 0 ? "text-emerald-400" : "text-rose-400")}>
            <ArrowUpRight size={12} className={trend < 0 ? "rotate-90" : ""} /> {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <div className={clsx("text-2xl font-black mb-1", textColor)}>{value ?? '--'}</div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</div>
        {sub && <div className="text-[10px] text-slate-500 mt-2 font-medium">{sub}</div>}
      </div>
    </div>
  );
}

function KanbanColumn({ title, data, color }) {
  const colorMap = {
    slate: "border-slate-500/20 text-slate-400 bg-slate-500/10",
    blue: "border-blue-500/20 text-blue-400 bg-blue-500/10",
    emerald: "border-emerald-500/20 text-emerald-400 bg-emerald-500/10",
    amber: "border-amber-500/20 text-amber-400 bg-amber-500/10",
    rose: "border-rose-500/20 text-rose-400 bg-rose-500/10",
  };
  const safeColorClass = safeObjectAccess(colorMap, color, "border-slate-500/20 text-slate-400 bg-slate-500/10");

  return (
    <div className="w-[280px] shrink-0 flex flex-col h-[400px] bg-[#121215] border border-white/5 rounded-xl">
      <div className="p-3 border-b border-white/5 flex justify-between items-center bg-[#18181c] rounded-t-xl">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">{title}</div>
        <div className={clsx("text-[10px] font-bold px-2 py-0.5 rounded border", safeColorClass)}>
          {data?.length || 0}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
        {data?.map(item => (
          <div key={item.id} className="bg-white/5 border border-white/10 p-3 rounded-lg hover:border-white/20 transition-colors cursor-pointer group">
            <div className="font-bold text-slate-200 text-sm mb-1 truncate">{item.name}</div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-3">
              <span>{item.plan}</span>
              <span className="text-emerald-400">${item.mrr}</span>
            </div>
            <div className="text-[10px] text-slate-600 border-t border-white/5 pt-2 flex justify-between items-center">
              <span>{item.signup_date}</span>
              <ArrowRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
            </div>
          </div>
        ))}
        {(!data || data.length === 0) && (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 py-8">
            <CheckCircle2 size={16} />
            <span className="text-xs">Empty</span>
          </div>
        )}
      </div>
    </div>
  )
}
