import { useState, useMemo, memo } from "react";
import { ArrowDown, ArrowUp, Zap, Clock } from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Skeleton from "@/components/ui/skeleton";

export function PlatformFunnelChart({ data }) {
  const steps = [
    { label: "Signups", value: data.signups, color: "bg-blue-500" },
    { label: "Trials Started", value: data.trials, color: "bg-cyan-500" },
    { label: "Activated", value: data.activated, color: "bg-teal-500" },
    { label: "Paid Conversion", value: data.paid, color: "bg-green-500" },
    { label: "Renewed", value: data.renewed, color: "bg-emerald-600" },
  ];
  const max = Math.max(...steps.map(s => s.value), 1);
  return (
    <div className="flex flex-col gap-3 mt-4">
      {steps.map((step, idx) => {
        const pct = (step.value / max) * 100;
        const drop = idx > 0 ? ((steps[idx-1].value - step.value) / steps[idx-1].value * 100).toFixed(1) : 0;
        return (
          <div key={step.label} className="flex items-center gap-4">
            <div className="w-32 text-right">
              <span className="text-[11px] font-bold text-textPrimary">{step.label}</span>
              {idx > 0 && <span className="block text-[9px] text-danger font-semibold">-{drop}% drop</span>}
            </div>
            <div className="flex-1 bg-border/20 rounded-full h-8 flex items-center relative overflow-hidden group">
              <div className={`h-full ${step.color} transition-all duration-700 ease-in-out relative flex items-center justify-end pr-3`} style={{ width: `${pct}%` }}>
                 <span className="text-white text-[10px] font-black z-10">{step.value}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Platform Operator Administration View ----