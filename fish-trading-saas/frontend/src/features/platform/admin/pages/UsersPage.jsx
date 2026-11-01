import React, { useEffect, useState } from "react";
import { api } from "@/services/core/apiClient";
import { 
  Users, UserPlus, ShieldAlert, Activity, GitMerge, AlertTriangle, CheckCircle2,
  TerminalSquare, Mail, RefreshCw, X, ArrowUpRight, Search, Zap, Shield, Key
} from "lucide-react";
import { useToast } from "@/components/shared/toast-provider";
import clsx from "clsx";
import { safeObjectAccess } from "@/utils/security/safeAccess";

export default function UsersPage() {
  const [kpis, setKpis] = useState(null);
  const [staff, setStaff] = useState([]);
  const [hierarchy, setHierarchy] = useState(null);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'platform_support_l1', department: 'Operations' });

  const { push: toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [kRes, sRes, hRes, iRes] = await Promise.all([
        api.get("/platform/staff/kpis/"),
        api.get("/platform/staff/directory/"),
        api.get("/platform/staff/hierarchy/"),
        api.get("/platform/staff/invites/")
      ]);
      setKpis(kRes.data.kpis);
      setStaff(sRes.data.results);
      setHierarchy(hRes.data.hierarchy);
      setInvites(iRes.data.results);
    } catch (error) {
      console.error(error);
      toast({ message: "Failed to load workforce telemetry", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (actionStr, userId) => {
    try {
      const res = await api.post(`/platform/staff/actions/`, { action: actionStr, user_id: userId });
      toast({ message: res.data.message });
      if (actionStr === 'suspend') loadData();
    } catch (err) {
      toast({ message: err.response?.data?.error || `Failed to execute action`, variant: "error" });
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/platform/staff/invites/`, inviteForm);
      toast({ message: res.data.message });
      setInviteModalOpen(false);
      loadData();
    } catch (err) {
      toast({ message: err.response?.data?.error || "Failed to send invite", variant: "error" });
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
            Workforce Operations
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 uppercase tracking-wider border border-indigo-500/20">
              Command Center
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Platform staff directory, hierarchy mapping, and access controls.</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={loadData} className="p-2 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 border border-white/10 transition-colors">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setInviteModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-500 flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20 border border-indigo-500/50">
            <UserPlus size={16} /> Invite Staff
          </button>
        </div>
      </div>

      {/* Executive KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Total Staff" value={kpis?.total_staff?.value} sub={kpis?.total_staff?.sub} trend={kpis?.total_staff?.trend} icon={Users} color="indigo" />
        <KPICard title="Support Team Health" value={kpis?.support_health?.value} sub={kpis?.support_health?.sub} trend={kpis?.support_health?.trend} icon={Activity} color="emerald" />
        <KPICard title="Productivity Score" value={kpis?.productivity?.value} sub={kpis?.productivity?.sub} trend={kpis?.productivity?.trend} icon={Zap} color="amber" />
        <KPICard title="Access Risk" value={kpis?.access_risk?.value} sub={kpis?.access_risk?.sub} trend={kpis?.access_risk?.trend} icon={ShieldAlert} color="rose" alert={kpis?.access_risk?.value > 0} />
        <KPICard title="Pending Invites" value={kpis?.pending_invites?.value} sub={kpis?.pending_invites?.sub} trend={kpis?.pending_invites?.trend} icon={Mail} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Panel: Organizational Hierarchy & Invites */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-[#121215] border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-[#18181c]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GitMerge size={16} className="text-indigo-400" /> Platform Hierarchy
              </h3>
            </div>
            <div className="p-4 space-y-6 overflow-y-auto max-h-[400px] custom-scrollbar">
              {Object.entries(hierarchy || {}).map(([group, members]) => (
                <div key={group}>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <div className="h-[1px] bg-white/5 flex-1"></div>
                    {group}
                    <div className="h-[1px] bg-white/5 flex-1"></div>
                  </div>
                  <div className="space-y-3">
                    {members.map(m => (
                      <div key={m.id} className="flex items-start gap-3 relative before:content-[''] before:absolute before:-left-3 before:top-4 before:w-2 before:h-[1px] before:bg-white/10 ml-3">
                        <div className="w-8 h-8 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                          <Users size={14} className="text-indigo-400" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-200 leading-tight">{m.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{m.role}</div>
                        </div>
                      </div>
                    ))}
                    {members.length === 0 && <div className="text-[10px] text-slate-600 ml-8">None</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#121215] border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-[#18181c]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Mail size={16} className="text-emerald-400" /> Pending Invites
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {invites.map(inv => (
                <div key={inv.id} className="bg-white/5 border border-white/5 p-3 rounded-xl flex justify-between items-center group">
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-slate-200 truncate">{inv.email}</div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">{inv.role}</div>
                  </div>
                  <div className={clsx("text-[10px] font-bold px-2 py-0.5 rounded border ml-2 shrink-0", 
                    inv.status === 'pending' ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-rose-400 bg-rose-500/10 border-rose-500/20"
                  )}>
                    {inv.status}
                  </div>
                </div>
              ))}
              {invites.length === 0 && <div className="text-xs text-slate-500 text-center py-4">No active invites</div>}
            </div>
          </div>

        </div>

        {/* Right Panel: Staff Directory Table */}
        <div className="lg:col-span-3 bg-[#121215] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[750px]">
          <div className="p-5 border-b border-white/5 bg-[#18181c] shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield size={18} className="text-indigo-400" /> Enterprise Staff Directory
              </h3>
              <p className="text-xs text-slate-400 mt-1">Manage platform access, roles, and security compliance.</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" placeholder="Search staff..." className="w-full bg-white/5 border border-white/10 rounded-md pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
            </div>
          </div>
          
          <div className="overflow-y-auto custom-scrollbar flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-500 uppercase font-bold tracking-widest bg-[#0f0f13] border-b border-white/5 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Role & Dept</th>
                  <th className="px-5 py-3">Workload</th>
                  <th className="px-5 py-3">Security & Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {staff.map((user) => (
                  <tr key={user.id} className={clsx("hover:bg-white/[0.02] transition-colors group", user.status === 'Suspended' && "opacity-50")}>
                    <td className="px-5 py-4 cursor-pointer" onClick={() => setSelectedProfile(user)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-indigo-400 font-bold text-sm shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">{user.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xs font-bold text-slate-300">{user.role}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{user.department}</div>
                    </td>
                    <td className="px-5 py-4">
                      {user.open_tickets > 0 ? (
                        <div className="flex flex-col gap-1">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Open Tickets</div>
                          <div className="flex items-center gap-2">
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className={clsx("h-full rounded-full", user.open_tickets > 10 ? "bg-rose-500" : "bg-amber-500")} style={{ width: `${Math.min(100, user.open_tickets * 10)}%` }}></div>
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-300">{user.open_tickets}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600">No active queue</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className={clsx("w-2 h-2 rounded-full", user.status === 'Active' ? "bg-emerald-500" : "bg-rose-500")}></span>
                          <span className="text-xs text-slate-300">{user.status}</span>
                        </div>
                        <div className="flex gap-2">
                          {user.mfa_enabled ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1"><Key size={10}/> MFA ON</span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1"><AlertTriangle size={10}/> NO MFA</span>
                          )}
                          <span className={clsx("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border flex items-center gap-1", user.security_score > 80 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20")}>
                            Score: {user.security_score}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right relative">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setSelectedProfile(user)} title="View Profile" className="p-1.5 bg-white/5 hover:bg-indigo-500 hover:text-white text-slate-400 rounded transition-colors">
                          <TerminalSquare size={14} />
                        </button>
                        <button onClick={() => handleAction('force_logout', user.id)} title="Force Logout" className="p-1.5 bg-white/5 hover:bg-amber-500 hover:text-white text-slate-400 rounded transition-colors">
                          <RefreshCw size={14} />
                        </button>
                        <button onClick={() => handleAction('suspend', user.id)} title={user.status === 'Suspended' ? 'Unsuspend' : 'Suspend'} className="p-1.5 bg-white/5 hover:bg-rose-500 hover:text-white text-slate-400 rounded transition-colors">
                          <ShieldAlert size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-5 py-12 text-center text-slate-500">
                      No platform staff found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#121215] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#18181c]">
              <h3 className="font-bold text-white flex items-center gap-2"><UserPlus size={18} className="text-indigo-400"/> Invite Platform Staff</h3>
              <button onClick={() => setInviteModalOpen(false)} className="text-slate-400 hover:text-white"><X size={18}/></button>
            </div>
            <form onSubmit={handleSendInvite} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <input required type="email" value={inviteForm.email} onChange={e => setInviteForm({...inviteForm, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="colleague@fisherp.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Assign Role</label>
                <select required value={inviteForm.role} onChange={e => setInviteForm({...inviteForm, role: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 appearance-none">
                  <option value="platform_support_l1">Support L1</option>
                  <option value="platform_support_l2">Support L2</option>
                  <option value="platform_support_manager">Support Manager</option>
                  <option value="platform_customer_success">Customer Success</option>
                  <option value="platform_onboarding">Onboarding Specialist</option>
                  <option value="platform_billing">Billing Admin</option>
                  <option value="platform_operator">Platform Operator</option>
                </select>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg transition-colors">
                  Generate Secure Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Modal (Mocked details for UX) */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#121215] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-start bg-gradient-to-r from-[#18181c] to-indigo-900/10">
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-2xl shrink-0">
                  {selectedProfile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{selectedProfile.name}</h3>
                  <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                    {selectedProfile.role} <span className="text-slate-600">•</span> {selectedProfile.department}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedProfile(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"><X size={18}/></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Email</div>
                  <div className="text-sm font-mono text-slate-300">{selectedProfile.email}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Account Status</div>
                  <div className="flex items-center gap-2">
                    <span className={clsx("w-2 h-2 rounded-full", selectedProfile.status === 'Active' ? "bg-emerald-500" : "bg-rose-500")}></span>
                    <span className="text-sm text-slate-300">{selectedProfile.status}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Last Login</div>
                  <div className="text-sm text-slate-300">{selectedProfile.last_active}</div>
                </div>
              </div>
              
              <div className="space-y-4 border-l border-white/5 pl-6">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Security Health</div>
                  <div className={clsx("text-2xl font-black", selectedProfile.security_score > 80 ? "text-emerald-400" : "text-rose-400")}>
                    {selectedProfile.security_score} / 100
                  </div>
                  <div className="text-xs text-slate-500 mt-1">MFA: {selectedProfile.mfa_enabled ? 'Enabled' : 'Disabled'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Active Workload</div>
                  <div className="text-sm text-slate-300">{selectedProfile.open_tickets} open tickets</div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-white/5 bg-[#0f0f13] flex justify-end gap-3">
              <button onClick={() => {handleAction('force_logout', selectedProfile.id); setSelectedProfile(null);}} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-sm font-bold transition-colors">Force Logout</button>
              <button onClick={() => {handleAction('suspend', selectedProfile.id); setSelectedProfile(null);}} className="px-4 py-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 rounded-lg text-sm font-bold transition-colors">
                {selectedProfile.status === 'Suspended' ? 'Unsuspend' : 'Suspend Account'}
              </button>
            </div>
          </div>
        </div>
      )}

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
        {trend !== undefined && (
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
