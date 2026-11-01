import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, CheckCircle, Activity, CreditCard, XCircle, HardDrive, Users, Settings, Database, Mic } from 'lucide-react';
import { getAdvancedSubscription, suspendSubscription, reactivateSubscription, overrideSubscriptionLimits } from '../service/subscriptionService';
import { useToast } from "@/components/shared/toast-provider";
import clsx from 'clsx';

export default function SubscriptionDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push: toast } = useToast();
  
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = () => {
    setLoading(true);
    getAdvancedSubscription(id)
      .then(res => setSub(res.data))
      .catch(err => toast({ message: "Failed to load subscription details", variant: "error" }))
      .finally(() => setLoading(false));
  };

  const handleSuspend = async () => {
    if(!confirm("Are you sure you want to suspend this tenant?")) return;
    try {
      await suspendSubscription(id);
      toast({ message: "Tenant suspended" });
      fetchData();
    } catch (e) {
      toast({ message: "Failed to suspend", variant: "error" });
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivateSubscription(id);
      toast({ message: "Tenant reactivated" });
      fetchData();
    } catch (e) {
      toast({ message: "Failed to reactivate", variant: "error" });
    }
  };
  
  const handleOverrideLimits = async () => {
    const seatLimit = prompt("Enter new seat limit:", sub.seat_limit || "");
    if(seatLimit === null) return;
    try {
      await overrideSubscriptionLimits(id, { seat_limit: parseInt(seatLimit) });
      toast({ message: "Limits updated" });
      fetchData();
    } catch (e) {
      toast({ message: "Failed to update limits", variant: "error" });
    }
  };

  if (loading) return <div className="p-6 text-white">Loading...</div>;
  if (!sub) return <div className="p-6 text-white">Not found</div>;

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle },
      trial: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Activity },
      grace_period: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: ShieldAlert },
      suspended: { color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
      payment_failed: { color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: CreditCard },
    };
    const conf = statusConfig[status] || { color: 'bg-gray-500/10 text-gray-400', icon: XCircle };
    const Icon = conf.icon;
    return (
      <span className={clsx("px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 w-fit", conf.color)}>
        <Icon className="w-3.5 h-3.5" />
        {status.toUpperCase().replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Subscriptions
      </button>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            {sub.tenant_name}
            {getStatusBadge(sub.status)}
          </h1>
          <p className="text-slate-400 font-mono mt-1 text-sm">{sub.subscription_id} • {sub.tenant_slug}</p>
        </div>
        <div className="flex gap-2">
          {sub.status === 'suspended' ? (
            <button onClick={handleReactivate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
              Reactivate Tenant
            </button>
          ) : (
            <button onClick={handleSuspend} className="px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-400 hover:text-white border border-red-900/50 rounded-lg text-sm font-medium transition-colors">
              Suspend Tenant
            </button>
          )}
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Settings className="w-4 h-4" /> Update Plan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          
          {/* OVERVIEW */}
          <div className="bg-[#0B0E14] border border-slate-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4">Subscription Overview</h2>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Plan Tier</div>
                <div className="text-lg font-medium text-slate-200 mt-1 capitalize">{sub.tier_name}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Monthly Rate</div>
                <div className="text-lg font-medium text-slate-200 mt-1">${parseFloat(sub.price).toFixed(2)} {sub.currency}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Billing Cycle</div>
                <div className="text-sm font-medium text-slate-200 mt-1 capitalize">{sub.billing_cycle}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Renewal Date</div>
                <div className="text-sm font-medium text-slate-200 mt-1">
                  {sub.next_invoice_date ? new Date(sub.next_invoice_date).toLocaleDateString() : 'Auto-renew disabled'}
                </div>
              </div>
            </div>
          </div>

          {/* USAGE LIMITS */}
          <div className="bg-[#0B0E14] border border-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">Usage & Limits</h2>
              <button onClick={handleOverrideLimits} className="text-xs font-medium text-indigo-400 hover:text-indigo-300">
                Override Limits
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Storage */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <div className="flex items-center gap-2 text-slate-300 font-medium">
                    <Database className="w-4 h-4 text-slate-400" /> Storage Used
                  </div>
                  <div className="text-slate-400"><span className="text-slate-200">{sub.storage_used_mb} MB</span> / {sub.storage_limit || 'Unlimited'} GB</div>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (sub.storage_used_mb / ((sub.storage_limit || 5) * 1024)) * 100)}%` }}></div>
                </div>
              </div>
              
              {/* Seats */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <div className="flex items-center gap-2 text-slate-300 font-medium">
                    <Users className="w-4 h-4 text-slate-400" /> Active Users
                  </div>
                  <div className="text-slate-400"><span className="text-slate-200">?</span> / {sub.seat_limit || 'Unlimited'} Users</div>
                </div>
              </div>

              {/* Voice */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <div className="flex items-center gap-2 text-slate-300 font-medium">
                    <Mic className="w-4 h-4 text-slate-400" /> Voice Assistant Calls
                  </div>
                  <div className="text-slate-400"><span className="text-slate-200">{sub.voice_used}</span> / {sub.voice_limit || 'Disabled'} limits</div>
                </div>
              </div>
            </div>
          </div>

        </div>
        
        <div className="space-y-6">
          {/* BILLING HEALTH */}
          <div className="bg-[#0B0E14] border border-slate-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4">Billing Health</h2>
            {sub.failed_payment_count > 0 ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-red-400 font-semibold mb-1 text-sm">
                  <ShieldAlert className="w-4 h-4" /> Payment Failing
                </div>
                <p className="text-xs text-red-300/80">{sub.failed_payment_count} consecutive failed attempts.</p>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1 text-sm">
                  <CheckCircle className="w-4 h-4" /> Healthy
                </div>
                <p className="text-xs text-emerald-300/80">No current billing issues.</p>
              </div>
            )}
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Payment Method</span>
                <span className="text-slate-200 font-medium">{sub.payment_method || 'Invoice'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Provider ID</span>
                <span className="text-slate-500 font-mono text-xs">{sub.provider_customer_id || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Total LTV</span>
                <span className="text-slate-200 font-medium">${parseFloat(sub.total_paid_till_date).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* SUPPORT SLA */}
          <div className="bg-[#0B0E14] border border-slate-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4">Support SLA</h2>
            <div className="flex justify-between items-center text-sm mb-3">
              <span className="text-slate-400">Support Tier</span>
              <span className="text-indigo-400 font-medium">{sub.support_tier || 'Standard L1'}</span>
            </div>
            <p className="text-xs text-slate-500">
              This tier grants standard 24h response time during business hours.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
