import { useState, useMemo, memo } from "react";
import { ArrowDown, ArrowUp, Zap, Clock } from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Skeleton from "@/components/ui/skeleton";

export const PlatformKpiCard = memo(({ title, mainValue, subtext, icon: Icon, trend, trendLabel, severity = "info" }) => {
  const severities = {
    critical: "bg-danger/10 border-danger/30 text-danger",
    warning: "bg-warning/10 border-warning/30 text-warning",
    healthy: "bg-success/10 border-success/30 text-success",
    info: "bg-primary/10 border-primary/30 text-primary",
  };
  const theme = severities[severity] || severities.info;
  
  return (
    <Card className={`relative overflow-hidden border p-5 hover:shadow-md transition-all duration-300 ${theme.replace('text-', 'hover:border-').replace('/10', '/20')}`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${theme.split(' ')[2].replace('text-', 'bg-')}`} />
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider">{title}</h4>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${theme.split(' ')[2]}`}>{mainValue}</span>
          </div>
        </div>
        <div className={`p-2 rounded-xl ${theme.split(' ')[0]} ${theme.split(' ')[2]}`}>
          <Icon size={20} />
        </div>
      </div>
      {(trend || trendLabel || subtext) && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/30">
          {trend && (
            <span className={`flex items-center text-[11px] font-bold ${trend > 0 ? 'text-success' : trend < 0 ? 'text-danger' : 'text-textSecondary'}`}>
              {trend > 0 ? <ArrowUp size={12} className="mr-0.5" /> : trend < 0 ? <ArrowDown size={12} className="mr-0.5" /> : null}
              {Math.abs(trend)}%
            </span>
          )}
          {trendLabel && <span className="text-[10px] font-semibold text-textSecondary">{trendLabel}</span>}
          {subtext && !trend && !trendLabel && <span className="text-[11px] font-bold text-textSecondary">{subtext}</span>}
        </div>
      )}
    </Card>
  );
});

// ---- Platform MRR Chart ----