import React from "react";
import { useCompanies } from "../hooks/useAdmin";
import { Shield, ChevronRight, Activity, Zap } from "lucide-react";
import clsx from "clsx";

export default function CompanyTable({ onSelectTenant }) {
  const { data, isLoading, isError } = useCompanies();
  const companies = Array.isArray(data) ? data : data?.tenants || data?.companies || data?.data || [];

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading intelligence grid...</div>;
  if (isError) return <div className="p-8 text-center text-rose-500">Failed to load tenant data.</div>;
  if (companies.length === 0) return <div className="p-8 text-center text-slate-500">No tenants active.</div>;

  return (
    <table className="w-full text-sm text-left">
      <thead className="text-xs text-slate-400 uppercase bg-black/40 border-b border-white/10">
        <tr>
          <th className="px-6 py-4 font-medium tracking-wider">Tenant</th>
          <th className="px-6 py-4 font-medium tracking-wider">Plan & Sub ID</th>
          <th className="px-6 py-4 font-medium tracking-wider">Health</th>
          <th className="px-6 py-4 font-medium tracking-wider text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5 bg-[#111]">
        {companies.map((c) => (
          <tr 
            key={c.id} 
            onClick={() => onSelectTenant(c.id)}
            className="hover:bg-white/5 transition-colors cursor-pointer group"
          >
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center">
                  <span className="text-indigo-400 font-bold">{c.name ? c.name.charAt(0) : '?'}</span>
                </div>
                <div>
                  <div className="font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2">{c.name}</div>
                  <div className="text-xs text-slate-500 font-mono">ID: {c.id}</div>
                </div>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex flex-col gap-1">
                <span className="inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-white/10">
                  {c.tier || 'Free Tier'}
                </span>
                {c.subscription_id && (
                  <span className="text-[10px] text-slate-500 font-mono">SUB-{c.subscription_id}</span>
                )}
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={clsx(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                c.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-800 text-slate-400 border-white/10"
              )}>
                <Activity size={12} className={clsx(c.is_active && "animate-pulse")} />
                {c.is_active ? "Operational" : "Inactive"}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right">
              <button 
                className="text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                onClick={(e) => { e.stopPropagation(); onSelectTenant(c.id); }}
              >
                Manage <ChevronRight size={14} className="inline ml-1" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
