import React from "react";
import clsx from "clsx";
import { safeObjectAccess } from "@/utils/security/safeAccess";

export function KPICard({ title, value, label, sub, subIcon: SubIcon, icon: Icon, color, alert }) {
  const colorMap = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };
  
  const textColorMap = {
    emerald: "text-emerald-400",
    indigo: "text-indigo-400",
    amber: "text-amber-400",
    purple: "text-purple-400",
    blue: "text-blue-400",
    rose: "text-rose-400",
  };
  
  const safeColorClass = safeObjectAccess(colorMap, color, "text-slate-400 bg-slate-500/10 border-slate-500/20");
  const textColor = safeObjectAccess(textColorMap, color, "text-slate-400");

  return (
    <div className={clsx("bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group", alert && "border-rose-500/30")}>
      {alert && <div className="absolute top-0 right-0 w-12 h-12 bg-rose-500/10 rounded-bl-full border-b border-l border-rose-500/10 -mr-2 -mt-2"></div>}
      <div className="flex items-center justify-between mb-4 z-10">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</h3>
        <div className={clsx("p-1.5 rounded-lg flex items-center justify-center border", safeColorClass)}>
          <Icon size={14} />
        </div>
      </div>
      <div className="z-10 mt-auto">
        <div className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">{label}</div>
        <p className={clsx("text-2xl font-black mb-2", textColor)}>{value ?? '--'}</p>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-3 border-t border-white/5 mt-3">
          <SubIcon size={12} className="text-slate-500" /> {sub}
        </div>
      </div>
    </div>
  );
}
