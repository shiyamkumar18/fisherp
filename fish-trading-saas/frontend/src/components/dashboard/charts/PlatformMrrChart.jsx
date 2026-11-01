import { useState, useMemo, memo } from "react";
import { ArrowDown, ArrowUp, Zap, Clock } from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Skeleton from "@/components/ui/skeleton";

export function PlatformMrrChart({ data = [] }) {
  const max = Math.max(...data.map(d => d.mrr), 1);
  return (
    <div className="h-48 w-full flex items-end gap-2 mt-4 relative">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full">
          <div className="w-full bg-primary/20 hover:bg-primary/40 rounded-t-sm transition-all relative overflow-hidden" style={{ height: `${(d.mrr / max) * 100}%` }}>
            <div className="absolute bottom-0 w-full bg-danger/50" style={{ height: `${(d.churn / d.mrr) * 100}%` }} />
          </div>
          <span className="text-[9px] font-bold text-textSecondary mt-2">{d.name}</span>
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface border border-border text-[10px] font-bold p-1.5 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
            MRR: ₹{(d.mrr / 1000).toFixed(1)}k<br/>Churn: <span className="text-danger">₹{(d.churn / 1000).toFixed(1)}k</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Platform Subscription Mix Chart ----