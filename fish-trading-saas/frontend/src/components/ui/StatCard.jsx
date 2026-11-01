import React from "react";
import clsx from "clsx";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function StatCard({ title, value, change, changeType = "up", icon: Icon }) {
  const getChangeStyles = () => {
    switch(changeType) {
      case "up": return { color: "text-success", icon: <TrendingUp size={14} /> };
      case "down": return { color: "text-danger", icon: <TrendingDown size={14} /> };
      default: return { color: "text-textSecondary", icon: <Minus size={14} /> };
    }
  };

  const style = getChangeStyles();

  return (
    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm transition-shadow duration-200 hover:shadow-md flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <p className="text-sm font-semibold text-textSecondary uppercase tracking-wider">{title}</p>
        {Icon && <div className="p-2 bg-surfaceHover rounded-md text-primary"><Icon size={18} /></div>}
      </div>
      <div>
        <h2 className="text-3xl font-black text-textPrimary">{value}</h2>
        {change && (
          <p className={clsx("text-xs font-bold mt-2 flex items-center gap-1", style.color)}>
            {style.icon} {change}
          </p>
        )}
      </div>
    </div>
  );
}
