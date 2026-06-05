import React, { useState } from 'react';
import { Activity, Clock, LogOut, Play, Pause, AlertOctagon, HelpCircle } from 'lucide-react';
import clsx from 'clsx';

export function SubscriptionLifecycle({ 
  lifecycle = {}, 
  activeFilter = '', 
  onFilterChange,
  onLifecycleAction
}) {
  const totalActive = lifecycle.active || 0;
  const list = [
    { id: 'active', title: 'Active', value: lifecycle.active || 0, color: 'bg-emerald-500 text-emerald-400 border-emerald-500/20', action: 'Upgrade Plan' },
    { id: 'trial', title: 'Trial', value: lifecycle.trials || 0, color: 'bg-indigo-500 text-indigo-400 border-indigo-500/20', action: 'Extend Trial' },
    { id: 'expiring_soon', title: 'Expiring Soon', value: lifecycle.expiring_soon || 0, color: 'bg-amber-500 text-amber-400 border-amber-500/20', action: 'Send Renewal Notice' },
    { id: 'cancelled', title: 'Cancelled/Churn', value: lifecycle.cancelled || 0, color: 'bg-rose-500 text-rose-400 border-rose-500/20', action: 'Win-back Campaign' },
    { id: 'paused', title: 'Paused', value: lifecycle.paused || 0, color: 'bg-slate-500 text-slate-400 border-slate-500/20', action: 'Resume billing' },
    { id: 'grace_period', title: 'Grace Period', value: lifecycle.grace_period || 0, color: 'bg-yellow-500 text-yellow-400 border-yellow-500/20', action: 'Collect Now' },
    { id: 'payment_failed', title: 'Payment Failed', value: lifecycle.payment_failed || 0, color: 'bg-red-500 text-red-400 border-red-500/20', action: 'Retry charge' }
  ];

  const handleActionClick = (e, stageId, actionLabel) => {
    e.stopPropagation();
    if (onLifecycleAction) {
      onLifecycleAction(stageId, actionLabel);
    }
  };

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
      <div>
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
          <Activity size={13} className="text-indigo-400" /> Subscription Lifecycle Funnel
        </h3>
        <span className="text-[10px] text-slate-500 block mt-0.5">Click any lifecycle stage to filter the tenant revenue ledger below.</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {list.map((step) => {
          const isSelected = activeFilter === step.id;
          const percentage = totalActive > 0 ? (step.value / totalActive) * 100 : 0;
          return (
            <div
              key={step.id}
              onClick={() => onFilterChange(isSelected ? '' : step.id)}
              className={clsx(
                "flex flex-col justify-between p-4 rounded-xl border cursor-pointer hover:bg-white/[0.03] transition-all relative overflow-hidden group select-none h-32",
                isSelected ? "bg-white/[0.05] border-indigo-500" : "bg-black/30 border-white/5"
              )}
            >
              {/* Custom background percentage indicator bar */}
              <div 
                className={clsx("absolute bottom-0 left-0 right-0 opacity-[0.03] group-hover:opacity-[0.06] transition-all", step.color.split(' ')[0])} 
                style={{ height: `${Math.max(12, Math.min(100, percentage))}%` }} 
              />
              
              <div className="z-10">
                <span className="text-2xl font-black text-white">{step.value}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-1">{step.title}</span>
              </div>

              <button
                type="button"
                onClick={(e) => handleActionClick(e, step.id, step.action)}
                className="z-10 text-[9px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline text-left mt-2 block opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {step.action} &rarr;
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
