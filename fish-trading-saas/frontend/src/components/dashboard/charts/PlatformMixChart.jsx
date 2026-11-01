import { useState, useMemo, memo } from "react";
import { ArrowDown, ArrowUp, Zap, Clock } from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Skeleton from "@/components/ui/skeleton";

export function PlatformMixChart({ breakdown = [] }) {
  const total = breakdown.reduce((sum, item) => sum + item.count, 0) || 1;
  let currentOffset = 0;
  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 100 100" className="transform -rotate-90">
        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1e293b" strokeWidth="20" />
        {breakdown.map((item, idx) => {
          const pct = item.count / total;
          const dashArray = pct * 251.2; // 2 * PI * 40
          const color = idx === 0 ? "#3b82f6" : idx === 1 ? "#8b5cf6" : "#10b981";
          const comp = (
            <circle
              key={item.tier}
              cx="50" cy="50" r="40" fill="transparent"
              stroke={color} strokeWidth="20"
              strokeDasharray={`${dashArray} ${251.2 - dashArray}`}
              strokeDashoffset={-currentOffset}
              className="transition-all duration-1000 hover:opacity-80 cursor-pointer"
            />
          );
          currentOffset += dashArray;
          return comp;
        })}
      </svg>
      <div className="w-full mt-4 space-y-2">
        {breakdown.map((item, idx) => (
          <div key={item.tier} className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: idx === 0 ? "#3b82f6" : idx === 1 ? "#8b5cf6" : "#10b981" }} />
              <span className="font-semibold capitalize text-textSecondary">{item.tier}</span>
            </div>
            <span className="font-bold text-textPrimary">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Platform Funnel Chart ----