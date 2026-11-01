import React, { useEffect, useState } from "react";
import { X, Building, Server, Shield, Activity, DollarSign, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { api } from "@/services/core/apiClient";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

function ImpersonateBtn({ tenantId }) {
  const [loading, setLoading] = useState(false);
  const [reason] = useState("Support drawer quick impersonate");

  const handleClick = async () => {
    setLoading(true);
    try {
      await api.post(`/platform/impersonate/${tenantId}/start/`, { reason });
      window.location.href = "/dashboard";
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to start impersonation");
    } finally { setLoading(false); }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
      {loading ? "Starting…" : "Impersonate"}
    </button>
  );
}

function SuspendBtn({ tenantId, onClose }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!window.confirm("Suspend this tenant? Their users will be locked out.")) return;
    setLoading(true);
    try {
      await api.post(`/platform/tenants/${tenantId}/suspend/`, { reason: "Admin suspension" });
      alert("Tenant suspended.");
      onClose();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to suspend tenant");
    } finally { setLoading(false); }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="py-2.5 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-50 text-rose-400 rounded-lg text-sm font-medium transition-colors border border-rose-500/20 flex items-center justify-center gap-2"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
      {loading ? "Suspending…" : "Suspend Account"}
    </button>
  );
}

export default function TenantIntelligenceDrawer({ tenantId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    api.get(`/platform/enterprise/tenant/${tenantId}/intelligence/`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tenantId]);

  return (
    <AnimatePresence>
      {tenantId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[500px] bg-[#111] border-l border-white/10 z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#161616]">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center">
                  <Building size={20} className="text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {loading ? "Loading..." : data?.tenant?.name}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    ID: {tenantId} • Joined {data?.tenant?.created_at ? new Date(data.tenant.created_at).toLocaleDateString() : '...'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
              {loading ? (
                <div className="flex justify-center py-12"><Activity className="animate-spin text-indigo-500" /></div>
              ) : data ? (
                <>
                  {/* Subscription Box */}
                  <div className="bg-[#1a1a1a] rounded-xl p-5 border border-white/5">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <DollarSign size={16} className="text-emerald-400" /> Subscription Health
                    </h3>
                    {data.subscription ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Plan</p>
                          <p className="text-sm font-medium text-slate-200">{data.subscription.tier}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Status</p>
                          <p className={clsx("text-sm font-medium", data.subscription.status === 'active' ? "text-emerald-400" : "text-rose-400")}>
                            {data.subscription.status.toUpperCase()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">MRR</p>
                          <p className="text-sm font-medium text-slate-200">₹{data.subscription.mrr}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No active subscription found.</p>
                    )}
                  </div>

                  {/* Usage Metrics */}
                  <div className="bg-[#1a1a1a] rounded-xl p-5 border border-white/5">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <Server size={16} className="text-blue-400" /> Platform Usage
                    </h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                      <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                        <p className="text-xs text-slate-500 mb-1">Branches</p>
                        <p className="text-xl font-bold text-white">{data.metrics.branches}</p>
                      </div>
                      <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                        <p className="text-xs text-slate-500 mb-1">Staff Users</p>
                        <p className="text-xl font-bold text-white">{data.metrics.staff}</p>
                      </div>
                      <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                        <p className="text-xs text-slate-500 mb-1">Purchase Orders</p>
                        <p className="text-xl font-bold text-white">{data.metrics.purchases}</p>
                      </div>
                      <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                        <p className="text-xs text-slate-500 mb-1">Sales Orders</p>
                        <p className="text-xl font-bold text-white">{data.metrics.sales}</p>
                      </div>
                    </div>
                  </div>

                  {/* Security Events */}
                  <div className="bg-[#1a1a1a] rounded-xl p-5 border border-white/5">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <Shield size={16} className="text-rose-400" /> Recent Security Events
                    </h3>
                    {data.security_events.length > 0 ? (
                      <div className="space-y-3">
                        {data.security_events.map((ev, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded bg-rose-500/5 border border-rose-500/10">
                            <div>
                              <p className="text-xs font-medium text-rose-300">{ev.action}</p>
                              <p className="text-[10px] text-slate-500">{new Date(ev.timestamp).toLocaleString()}</p>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">{ev.ip_address}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-emerald-500 flex flex-col items-center">
                        <Shield size={24} className="mb-2 opacity-50" />
                        No security flags detected
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer Actions */}
            {data && (
              <div className="p-6 border-t border-white/10 bg-[#161616] grid grid-cols-2 gap-3">
                <ImpersonateBtn tenantId={tenantId} />
                <SuspendBtn tenantId={tenantId} onClose={onClose} />
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
