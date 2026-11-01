import { useState, useMemo, memo } from "react";
import { ArrowDown, ArrowUp, Zap, Clock } from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Skeleton from "@/components/ui/skeleton";

export function InventoryHealthChart({ data = [] }) {
  const [hoveredSlice, setHoveredSlice] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[150px] flex flex-col items-center justify-center text-textSecondary text-sm">
        <p>No inventory data</p>
      </div>
    );
  }

  const width = 200;
  const height = 200;
  const cx = width / 2;
  const cy = height / 2;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  const totalKg = data.reduce((acc, d) => acc + d.kg, 0);

  const colors = {
    "Healthy": "#10b981",
    "Low Stock": "#f59e0b",
    "Expiring Soon": "#f97316",
    "Critical": "#ef4444"
  };

  let currentOffset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-[150px] h-[150px] shrink-0">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full -rotate-90">
          <circle cx={cx} cy={cy} r={radius} fill="transparent" stroke="var(--border)" strokeWidth="30" />
          {totalKg > 0 && data.map((d, i) => {
            if (d.kg <= 0) return null;
            const strokeDasharray = `${(d.kg / totalKg) * circumference} ${circumference}`;
            const strokeDashoffset = -currentOffset;
            currentOffset += (d.kg / totalKg) * circumference;

            return (
              <circle
                key={d.status}
                cx={cx}
                cy={cy}
                r={radius}
                fill="transparent"
                stroke={colors[d.status]}
                strokeWidth={hoveredSlice?.status === d.status ? "34" : "30"}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300 cursor-pointer hover:opacity-90 origin-center"
                onMouseEnter={() => setHoveredSlice(d)}
                onMouseLeave={() => setHoveredSlice(null)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-black text-textPrimary leading-none">{totalKg > 0 ? (totalKg > 1000 ? (totalKg/1000).toFixed(1) + 't' : Math.round(totalKg) + 'kg') : '0'}</span>
          <span className="text-[9px] font-bold text-textSecondary uppercase tracking-widest mt-1">Total</span>
        </div>
      </div>
      
      <div className="flex-1 space-y-3 w-full">
        {data.map(d => (
          <div 
            key={d.status} 
            className={`flex items-center justify-between text-xs font-bold p-2 rounded-lg transition-colors ${hoveredSlice?.status === d.status ? 'bg-border/20' : ''}`}
            onMouseEnter={() => setHoveredSlice(d)}
            onMouseLeave={() => setHoveredSlice(null)}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[d.status] }} />
              <span className="text-textPrimary">{d.status}</span>
            </div>
            <div className="text-right flex flex-col">
              <span className="text-textPrimary">{d.kg.toFixed(1)} kg</span>
              <span className="text-[9px] text-textSecondary">{d.count} batches</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. Combo Chart (Bar + Line)