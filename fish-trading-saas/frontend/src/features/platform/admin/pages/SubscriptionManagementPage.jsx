import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ShieldAlert, CreditCard, Activity, CheckCircle, XCircle } from 'lucide-react';
import { getAdvancedSubscriptions } from '../service/subscriptionService';
import { useToast } from "@/components/shared/toast-provider";
import clsx from 'clsx';

export default function SubscriptionManagementPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { push: toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubscriptions();
  }, [search]);

  const fetchSubscriptions = () => {
    setLoading(true);
    getAdvancedSubscriptions({ search })
      .then(res => {
        setSubscriptions(res.data.results || res.data);
      })
      .catch(err => {
        toast({ message: 'Failed to load subscriptions', variant: 'error' });
      })
      .finally(() => setLoading(false));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle },
      trial: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Activity },
      grace_period: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: ShieldAlert },
      suspended: { color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
      payment_failed: { color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: CreditCard },
      expired: { color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: XCircle },
    };
    const conf = statusConfig[status] || statusConfig.expired;
    const Icon = conf.icon;
    return (
      <span className={clsx("px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 w-fit", conf.color)}>
        <Icon className="w-3 h-3" />
        {status.toUpperCase().replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Subscription Management</h1>
          <p className="text-slate-400 text-sm mt-1">Manage tenant lifecycles, billing health, and entitlements.</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by Tenant Name or SUB-FP-ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm font-medium text-slate-300 hover:text-white flex items-center gap-2">
          <Filter className="w-4 h-4" /> Filters
        </button>
      </div>

      <div className="bg-[#0B0E14] border border-slate-800 rounded-xl overflow-hidden shadow-2xl shadow-black/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tenant</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Sub ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">MRR</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Renewal</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">Loading subscriptions...</td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">No subscriptions found</td>
                </tr>
              ) : (
                subscriptions.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-200">{sub.tenant_name}</div>
                      <div className="text-xs text-slate-500">{sub.tenant_slug}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-indigo-400">{sub.subscription_id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-300 capitalize">{sub.tier_name}</td>
                    <td className="px-6 py-4">
                      {getStatusBadge(sub.status)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-300">
                      ${parseFloat(sub.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {sub.next_invoice_date ? new Date(sub.next_invoice_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => navigate(`/admin/subscriptions/${sub.id}`)}
                        className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
