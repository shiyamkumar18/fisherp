import React, { useState, useEffect, useCallback } from "react";
import { useAdminStats } from "../hooks/useAdmin";
import { api } from "@/services/core/apiClient";
import {
  TrendingUp, Users, ShieldAlert, Activity, DollarSign,
  Clock, CheckCircle, X, Play, Bell, RefreshCw, UserPlus,
  Lock, AlertTriangle, ChevronDown, Send, Check, Loader2
} from "lucide-react";
import clsx from "clsx";

/* ─────────────────────────────────────────────
   Reusable Modal Shell
───────────────────────────────────────────── */
function Modal({ title, icon: Icon, onClose, children, danger = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-[#111] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className={clsx(
          "flex items-center justify-between px-6 py-4 border-b border-white/10",
          danger ? "bg-rose-500/10" : "bg-[#161616]"
        )}>
          <div className="flex items-center gap-3">
            {Icon && <Icon size={18} className={danger ? "text-rose-400" : "text-indigo-400"} />}
            <h2 className="font-bold text-white text-sm tracking-wide">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Toast Notification
───────────────────────────────────────────── */
function Toast({ message, type = "success", onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className={clsx(
      "fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium animate-slide-up",
      type === "success" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" :
      type === "error"   ? "bg-rose-500/20 border-rose-500/30 text-rose-300" :
                           "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
    )}>
      {type === "success" ? <Check size={16}/> : <AlertTriangle size={16}/>}
      {message}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Impersonate Tenant Modal
───────────────────────────────────────────── */
function ImpersonateModal({ tenants, onClose, onToast }) {
  const [tenantId, setTenantId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!tenantId || !reason.trim()) return;
    setLoading(true);
    try {
      await api.post(`/platform/impersonate/${tenantId}/start/`, { reason });
      onToast("Impersonation session started. Redirecting…", "success");
      setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
      onClose();
    } catch (err) {
      onToast(err?.response?.data?.error || "Failed to start impersonation", "error");
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Impersonate Tenant" icon={Play} onClose={onClose}>
      <p className="text-xs text-slate-400 mb-5 leading-relaxed">
        You will temporarily act as the tenant admin. All actions are <span className="text-rose-400 font-semibold">audit-logged</span>.
      </p>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block font-medium">Select Tenant</label>
          <div className="relative">
            <select
              value={tenantId}
              onChange={e => setTenantId(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 appearance-none"
            >
              <option value="">-- Choose a tenant --</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name} (ID: {t.id})</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block font-medium">Reason <span className="text-rose-400">*</span></label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Describe why you need access (required for audit log)…"
            rows={3}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 resize-none"
          />
        </div>
        <button
          onClick={submit}
          disabled={!tenantId || !reason.trim() || loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
          {loading ? "Starting session…" : "Start Impersonation"}
        </button>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────
   Broadcast Notification Modal
───────────────────────────────────────────── */
function BroadcastModal({ tenants, onClose, onToast }) {
  const [target, setTarget] = useState("all");
  const [tenantId, setTenantId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      if (target === "all") {
        await Promise.all(tenants.map(t =>
          api.post(`/platform/tenants/${t.id}/notify/`, { message })
        ));
        onToast(`Broadcast sent to ${tenants.length} tenants`, "success");
      } else {
        await api.post(`/platform/tenants/${tenantId}/notify/`, { message });
        onToast("Notification sent to tenant", "success");
      }
      onClose();
    } catch {
      onToast("Failed to send notification", "error");
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Broadcast Notification" icon={Bell} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex gap-2">
          {["all", "single"].map(t => (
            <button
              key={t}
              onClick={() => setTarget(t)}
              className={clsx(
                "flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors",
                target === t
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              )}
            >
              {t === "all" ? "All Tenants" : "Specific Tenant"}
            </button>
          ))}
        </div>

        {target === "single" && (
          <div className="relative">
            <select
              value={tenantId}
              onChange={e => setTenantId(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 appearance-none"
            >
              <option value="">-- Select tenant --</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        )}

        <div>
          <label className="text-xs text-slate-400 mb-1.5 block font-medium">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Platform announcement or alert message…"
            rows={4}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 resize-none"
          />
        </div>

        <button
          onClick={submit}
          disabled={!message.trim() || (target === "single" && !tenantId) || loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {loading ? "Sending…" : "Send Notification"}
        </button>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────
   Reset Subscription Modal
───────────────────────────────────────────── */
function ResetSubscriptionModal({ tenants, onClose, onToast }) {
  const [tenantId, setTenantId] = useState("");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      await api.post(`/platform/subscriptions/${tenantId}/extend/`, { days });
      onToast(`Subscription extended by ${days} days`, "success");
      onClose();
    } catch (err) {
      onToast(err?.response?.data?.error || "Failed to extend subscription", "error");
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Reset / Extend Subscription" icon={RefreshCw} onClose={onClose}>
      <div className="space-y-4">
        <div className="relative">
          <label className="text-xs text-slate-400 mb-1.5 block font-medium">Select Tenant</label>
          <select
            value={tenantId}
            onChange={e => setTenantId(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 appearance-none"
          >
            <option value="">-- Choose a tenant --</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-[38px] text-slate-500 pointer-events-none" />
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1.5 block font-medium">Extend by (days)</label>
          <div className="flex gap-2">
            {[7, 14, 30, 60, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={clsx(
                  "flex-1 py-2 rounded-lg text-xs font-bold border transition-colors",
                  days === d
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                )}
              >{d}d</button>
            ))}
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300">
          ⚠ This extends the subscription expiry date. The action will be audit-logged.
        </div>

        <button
          onClick={submit}
          disabled={!tenantId || loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {loading ? "Extending…" : `Extend by ${days} Days`}
        </button>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────
   Force Logout Modal
───────────────────────────────────────────── */
function ForceLogoutModal({ tenants, onClose, onToast }) {
  const [tenantId, setTenantId] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      await api.post(`/platform/tenants/${tenantId}/force-logout/`);
      onToast("All sessions for this tenant have been terminated", "success");
      onClose();
    } catch {
      onToast("Failed to force logout tenant", "error");
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Force Logout Tenant" icon={Lock} onClose={onClose} danger>
      <p className="text-xs text-slate-400 mb-4 leading-relaxed">
        This will <span className="text-rose-400 font-semibold">immediately terminate all active sessions</span> for the selected tenant. Use only in emergency situations.
      </p>
      <div className="space-y-4">
        <div className="relative">
          <select
            value={tenantId}
            onChange={e => setTenantId(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500/50 appearance-none"
          >
            <option value="">-- Select tenant to lock out --</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
        <button
          onClick={submit}
          disabled={!tenantId || loading}
          className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
          {loading ? "Logging out…" : "Force Logout All Sessions"}
        </button>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────
   Invite Tenant Modal
───────────────────────────────────────────── */
function InviteTenantModal({ onClose, onToast }) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !company.trim()) return;
    setLoading(true);
    try {
      // Registration endpoint - creates a new tenant
      await api.post("/register/", {
        email,
        company_name: company,
        username: email.split("@")[0],
        password: "Welcome@123",
      });
      onToast(`Invitation sent to ${email}`, "success");
      onClose();
    } catch (err) {
      onToast(err?.response?.data?.email?.[0] || "Failed to invite tenant", "error");
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Invite New Tenant" icon={UserPlus} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block font-medium">Company Name</label>
          <input
            type="text"
            value={company}
            onChange={e => setCompany(e.target.value)}
            placeholder="e.g. Acme Fisheries Pvt Ltd"
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block font-medium">Admin Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@company.com"
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 text-xs text-indigo-300">
          ℹ Tenant will receive a welcome email with login credentials.
        </div>
        <button
          onClick={submit}
          disabled={!email.trim() || !company.trim() || loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
          {loading ? "Creating…" : "Create & Invite Tenant"}
        </button>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────
   Main AdminDashboard
───────────────────────────────────────────── */
export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminStats();
  const [revenue, setRevenue] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [modal, setModal] = useState(null); // "impersonate" | "broadcast" | "reset" | "logout" | "invite"
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    api.get("/platform/enterprise/revenue/")
      .then(r => setRevenue(r.data))
      .catch(console.error);

    api.get("/platform/tenants/")
      .then(r => setTenants(r.data?.tenants || []))
      .catch(console.error);
  }, []);

  const QUICK_ACTIONS = [
    { id: "impersonate", label: "Impersonate Tenant", icon: Play,        color: "text-indigo-400", border: "hover:border-indigo-500/40", desc: "Debug as tenant" },
    { id: "broadcast",   label: "Broadcast Alert",   icon: Bell,         color: "text-amber-400",  border: "hover:border-amber-500/40",  desc: "Notify all tenants" },
    { id: "reset",       label: "Reset Subscription",icon: RefreshCw,    color: "text-emerald-400",border: "hover:border-emerald-500/40",desc: "Extend expiry" },
    { id: "logout",      label: "Force Logout",      icon: Lock,         color: "text-rose-400",   border: "hover:border-rose-500/40",   desc: "Kill all sessions" },
    { id: "invite",      label: "Invite Tenant",     icon: UserPlus,     color: "text-blue-400",   border: "hover:border-blue-500/40",   desc: "Add new tenant" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Operations</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time SaaS telemetry and tenant health.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setModal("logout")}
            className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-rose-500/30"
          >
            <Lock size={14} /> Emergency Lockdown
          </button>
          <button
            onClick={() => setModal("invite")}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-white/10"
          >
            <UserPlus size={14} /> Invite Tenant
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#161616] border border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={64} className="text-emerald-500" />
          </div>
          <h3 className="text-sm font-medium text-slate-400 mb-1">Monthly Recurring Revenue</h3>
          <div className="text-3xl font-bold text-white mb-2">
            ₹{revenue?.executive_kpis?.mrr ? revenue.executive_kpis.mrr.toLocaleString() : "—"}
          </div>
          <div className="flex items-center text-xs text-emerald-400 font-medium">
            <TrendingUp size={14} className="mr-1" /> +12.4% vs last month
          </div>
          <div className="mt-3 text-xs text-slate-500">
            ARR: ₹{revenue?.executive_kpis?.arr ? revenue.executive_kpis.arr.toLocaleString() : "—"}
          </div>
        </div>

        <div className="bg-[#161616] border border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users size={64} className="text-blue-500" />
          </div>
          <h3 className="text-sm font-medium text-slate-400 mb-1">Active Tenants</h3>
          <div className="text-3xl font-bold text-white mb-2">
            {stats?.active_tenants ?? tenants.length ?? "—"}
          </div>
          <div className="flex items-center text-xs text-emerald-400 font-medium">
            <CheckCircle size={14} className="mr-1" /> {stats?.active_tenants ? "100% Healthy" : "Loading…"}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
            <span><span className="text-amber-400 font-bold">{stats?.warning_tenants ?? 0}</span> Warning</span>
            <span><span className="text-rose-400 font-bold">{stats?.critical_tenants ?? 0}</span> Critical</span>
          </div>
        </div>

        <div className="bg-[#161616] border border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock size={64} className="text-indigo-500" />
          </div>
          <h3 className="text-sm font-medium text-slate-400 mb-1">Support SLA</h3>
          <div className="text-3xl font-bold text-white mb-2">99.2%</div>
          <div className="flex items-center text-xs text-indigo-400 font-medium">
            <Activity size={14} className="mr-1" /> Avg Response: 12m
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Open Tickets: {stats?.active_incidents ?? 0} | Breached: 0
          </div>
        </div>

        <div className="bg-[#161616] border border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldAlert size={64} className="text-rose-500" />
          </div>
          <h3 className="text-sm font-medium text-slate-400 mb-1">Billing Risk</h3>
          <div className="text-3xl font-bold text-white mb-2">
            {revenue?.executive_kpis?.failed_payments ?? 0}
          </div>
          <div className="flex items-center text-xs text-rose-400 font-medium">
            <ShieldAlert size={14} className="mr-1" /> Failed payments
          </div>
          <div className="mt-3 text-xs text-slate-500">
            {revenue?.subscription_overview?.expiring_soon ?? 0} expiring soon
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-widest">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {QUICK_ACTIONS.map(({ id, label, icon: Icon, color, border, desc }) => (
            <button
              key={id}
              onClick={() => setModal(id)}
              className={clsx(
                "bg-white/5 border border-white/10 p-4 rounded-xl text-left transition-all duration-200 group flex flex-col gap-2",
                border, "hover:bg-white/8"
              )}
            >
              <Icon size={18} className={clsx(color, "transition-transform group-hover:scale-110")} />
              <span className="text-sm text-slate-200 font-medium leading-tight">{label}</span>
              <span className="text-[11px] text-slate-500">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Modals */}
      {modal === "impersonate" && (
        <ImpersonateModal tenants={tenants} onClose={() => setModal(null)} onToast={showToast} />
      )}
      {modal === "broadcast" && (
        <BroadcastModal tenants={tenants} onClose={() => setModal(null)} onToast={showToast} />
      )}
      {modal === "reset" && (
        <ResetSubscriptionModal tenants={tenants} onClose={() => setModal(null)} onToast={showToast} />
      )}
      {modal === "logout" && (
        <ForceLogoutModal tenants={tenants} onClose={() => setModal(null)} onToast={showToast} />
      )}
      {modal === "invite" && (
        <InviteTenantModal onClose={() => setModal(null)} onToast={showToast} />
      )}

      {/* Toast */}
      {toast && (
        <Toast key={toast.id} message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
