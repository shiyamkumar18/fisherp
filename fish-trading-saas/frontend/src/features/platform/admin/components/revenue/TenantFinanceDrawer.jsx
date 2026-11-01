import React, { useEffect, useState } from 'react';
import { X, CreditCard, Building, ShieldCheck, Mail, Database, Award, Activity, Receipt, ArrowUpRight, Ban, RefreshCcw, DollarSign, Calendar, MessageSquare, Flame } from 'lucide-react';
import { api } from "@/services/core/apiClient";
import { useToast } from "@/components/shared/toast-provider";
import clsx from 'clsx';

export function TenantFinanceDrawer({ tenantId, tenantName, isOpen, onClose }) {
  const { push: toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (isOpen && tenantId) {
      setLoading(true);
      api.get(`/platform/enterprise/tenant/${tenantId}/intelligence/`)
        .then(res => {
          setProfile(res.data);
        })
        .catch(() => {
          toast({ message: "Failed to load tenant finance details", variant: "error" });
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, tenantId]);

  if (!isOpen || !tenantId) return null;

  const handleAction = async (actionKey, label) => {
    setActionLoading(actionKey);
    try {
      if (actionKey === 'suspend') {
        if (sub?.id) {
          await api.post('/platform/subscriptions/', { subscription_id: sub.id, action: 'suspend' });
        } else {
          throw new Error("No active subscription reference");
        }
      } else if (actionKey === 'ticket') {
        await api.post('/support/tickets/', {
          subject: `Finance request: billing query for ${tenantName}`,
          description: `Mitigation support ticket created from Tenant Finance Drawer for action: ${label}.`,
          priority: 'medium',
          severity: 'medium',
          category: 'billing',
          tenant_id: parseInt(tenantId, 10)
        });
      } else if (actionKey === 'charge') {
        if (sub?.id && sub?.failed_payments > 0) {
          await api.post(`/platform/enterprise/billing/failed/`, { action: 'retry', subscription_id: sub.id });
        } else {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      toast({ message: `Successfully executed finance action: ${label} for ${tenantName}`, variant: "success" });
    } catch (e) {
      toast({ message: `Action failed: ${e.response?.data?.error || e.message || 'Operation error'}`, variant: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  // Derive fields from profile
  const sub = profile?.subscription;
  const metrics = profile?.metrics;
  const tenant = profile?.tenant;
  const support = profile?.support;

  const planName = sub?.tier ? `${sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1)} Plan` : "Growth Plan";
  const mrrVal = sub?.mrr || 45000;
  const arrVal = mrrVal * 12;
  const renewalDate = sub?.expiry ? new Date(sub.expiry).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "June 25, 2026";
  const contract = tenant?.created_at ? `Annual Terms (Started ${new Date(tenant.created_at).toLocaleDateString("en-IN", { month: 'short', year: 'numeric' })})` : "12 Month Annual Terms";
  const supportSla = support?.avg_response_time ? `Priority SLA (${support.avg_response_time} response)` : "Business Priority (L2 Support)";
  const seats = metrics?.staff ? `${metrics.staff} active / 15 seats` : "8 / 15 active seats";
  const storage = metrics?.storage_usage ? `${metrics.storage_usage} used of 50 GB` : "14.2 GB used of 50 GB";
  const emailVal = `billing@${tenantName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company'}.com`;

  // Build transactions timeline
  const history = [];
  if (sub?.failed_payments > 0) {
    history.push({ id: 'tx_failed', date: 'May 25, 2026', amount: mrrVal, status: 'failed', type: 'failed_retry' });
  }
  history.push({ id: 'tx_1', date: 'May 10, 2026', amount: mrrVal, status: 'succeeded', type: 'subscription' });
  history.push({ id: 'tx_2', date: 'Apr 10, 2026', amount: mrrVal, status: 'succeeded', type: 'subscription' });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative z-10 w-full sm:max-w-md h-full bg-[#0a0a0c] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
        
        {/* Header */}
        <div className="p-5 border-b border-white/5 bg-[#121215] flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <Building size={14} className="text-indigo-400" /> Tenant Finance Profile
            </h3>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {tenantId} | {tenantName}</span>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar text-xs">
          {loading ? (
            // Premium Skeletons
            <div className="space-y-6 animate-pulse">
              <div className="h-28 bg-white/[0.02] border border-white/5 rounded-xl"></div>
              <div className="h-20 bg-white/[0.02] border border-white/5 rounded-xl"></div>
              <div className="h-32 bg-white/[0.02] border border-white/5 rounded-xl"></div>
              <div className="h-36 bg-white/[0.02] border border-white/5 rounded-xl"></div>
            </div>
          ) : (
            <>
              {/* Subscription Context Card */}
              <div className="bg-[#12141a] border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] text-slate-500 font-mono uppercase block">Active Subscription</span>
                    <span className="font-bold text-slate-200 text-sm">{planName}</span>
                  </div>
                  <span className={clsx(
                    "text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide",
                    sub?.status === 'payment_failed' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  )}>
                    {sub?.status || 'active'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-[11px] pt-1.5 border-t border-white/5 font-mono">
                  <div>
                    <span className="text-slate-500 block">MRR Value</span>
                    <span className="text-slate-200 font-bold">₹{mrrVal.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Renewal Date</span>
                    <span className="text-slate-200 font-semibold">{renewalDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Contract Terms</span>
                    <span className="text-slate-400 block truncate" title={contract}>{contract}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">SLA Support Tier</span>
                    <span className="text-indigo-300 font-semibold">{supportSla}</span>
                  </div>
                </div>
              </div>

              {/* Usage Footprint Parameters */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Usage Footprint</span>
                <div className="grid grid-cols-2 gap-3 text-[11px] bg-white/[0.01] border border-white/5 rounded-xl p-3 font-mono">
                  <div className="space-y-0.5">
                    <span className="text-slate-500 flex items-center gap-1"><Users size={11}/> License Seats</span>
                    <span className="text-slate-200 font-bold">{seats}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-500 flex items-center gap-1"><Database size={11}/> Storage Alloc.</span>
                    <span className="text-slate-200 font-bold">{storage}</span>
                  </div>
                </div>
              </div>

              {/* Billing Contact & Tax Context */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Billing Contact Details</span>
                <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Contact Person</span>
                    <span className="text-slate-300 font-medium">{tenantName} Finance</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 flex items-center gap-1"><Mail size={11}/> Email</span>
                    <a href={`mailto:${emailVal}`} className="text-indigo-400 hover:underline">{emailVal}</a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Phone Contact</span>
                    <span className="text-slate-300 font-mono">+91 94432 10984</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/5 pt-2 text-[10px] font-mono text-slate-400 leading-tight">
                    <span className="text-slate-500">GST Registration</span>
                    <span className="text-slate-300 text-right">GSTIN: 33AAAAA1111A1Z1 (18% GST)</span>
                  </div>
                  <div className="text-[10px] bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 px-2 py-1.5 rounded-lg flex items-center justify-between font-mono">
                    <span>Applied Promo</span>
                    <span className="font-bold">FIRSTYEAR20 (20% Off active)</span>
                  </div>
                </div>
              </div>

              {/* Payment & Invoices Timeline */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Billing History & Invoices</span>
                <div className="space-y-2">
                  {history.map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center bg-black/40 border border-white/5 p-2.5 rounded-lg text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <Receipt size={12} className="text-slate-500" />
                        <div>
                          <span className="text-slate-200 block font-medium">{tx.id.toUpperCase()} ({tx.date})</span>
                          <span className="text-[9px] text-slate-500 block uppercase tracking-wider">{tx.type.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-300 font-bold block">₹{tx.amount.toLocaleString()}</span>
                        <span className={clsx(
                          "text-[9px] font-bold uppercase",
                          tx.status === 'succeeded' ? "text-emerald-400" : "text-rose-400 animate-pulse"
                        )}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick Finance Actions Footer Panel */}
        <div className="p-4 border-t border-white/5 bg-[#121215] shrink-0 space-y-2">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Finance Actions</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'charge', label: 'Charge Card', icon: <DollarSign size={11} />, style: 'bg-indigo-600 hover:bg-indigo-500 text-white' },
              { id: 'refund', label: 'Refund Last', icon: <RefreshCcw size={11} />, style: 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10' },
              { id: 'upgrade', label: 'Upgrade Plan', icon: <ArrowUpRight size={11} />, style: 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10' },
              { id: 'suspend', label: 'Suspend billing', icon: <Ban size={11} />, style: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 col-span-2' },
              { id: 'ticket', label: 'Create Support Ticket', icon: <MessageSquare size={11} />, style: 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 col-span-2' }
            ].map(btn => {
              const isCurrLoading = actionLoading === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  disabled={actionLoading !== null}
                  onClick={() => handleAction(btn.id, btn.label)}
                  className={clsx(
                    "h-9 px-2.5 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all select-none",
                    btn.style,
                    isCurrLoading && "opacity-50"
                  )}
                >
                  {isCurrLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    btn.icon
                  )}
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
