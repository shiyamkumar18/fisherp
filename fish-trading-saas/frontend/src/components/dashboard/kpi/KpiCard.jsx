import { useState, useMemo, memo } from "react";
import { ArrowDown, ArrowUp, Zap, Clock } from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Skeleton from "@/components/ui/skeleton";

export const KpiCard = memo(({ label, value, icon: Icon, trend, trendLabel, accent, subtext }) => {
  const iconCls = {
    blue: "bg-primary/10 text-primary border-primary/20",
    cyan: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    amber: "bg-warning/10 text-warning border-warning/20",
    green: "bg-success/10 text-success border-success/20",
    purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  }[accent] || "bg-primary/10 text-primary border-primary/20";
  
  const shadowGlow = {
    blue: "hover:shadow-primary/10",
    cyan: "hover:shadow-cyan-500/10",
    amber: "hover:shadow-warning/10",
    green: "hover:shadow-success/10",
    purple: "hover:shadow-purple-500/10",
  }[accent] || "hover:shadow-primary/10";

  return (
    <Card className={`flex flex-col gap-4 relative group transition-all duration-300 hover:shadow-xl ${shadowGlow} hover:border-border`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-extrabold uppercase tracking-widest text-textSecondary">{label}</p>
        <span className={`rounded-xl p-2.5 border ${iconCls} transition-transform duration-300 group-hover:scale-110`}>
          <Icon size={20} />
        </span>
      </div>
      <div>
        <p className="text-3xl font-extrabold text-textPrimary leading-none tracking-tight mb-3">{value}</p>
        
        <div className="flex items-center gap-2 mt-3">
          {trend !== null && trend !== undefined && (
            <span
              className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                trend >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
              }`}
            >
              {trend >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {(trendLabel || subtext) && (
            <span className="text-[11px] font-semibold text-textSecondary truncate">
              {trendLabel || subtext}
            </span>
          )}
        </div>
        
        {/* Micro progress indicator */}
        <div className="w-full bg-border/50 h-1 rounded-full mt-4 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              accent === 'green' ? 'bg-success' : accent === 'amber' ? 'bg-warning' : accent === 'purple' ? 'bg-purple-500' : accent === 'cyan' ? 'bg-cyan-500' : 'bg-primary'
            }`} 
            style={{ width: `${Math.min(100, Math.max(10, trend ? 50 + trend : 50))}%` }}
          />
        </div>
      </div>
    </Card>
  );
});