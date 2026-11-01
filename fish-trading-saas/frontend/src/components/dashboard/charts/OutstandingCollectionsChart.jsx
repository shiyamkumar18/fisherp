import { useState, useMemo, memo } from "react";
import { ArrowDown, ArrowUp, Zap, Clock } from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Skeleton from "@/components/ui/skeleton";

export function OutstandingCollectionsChart({ data = [] }) {
  const [hoveredBar, setHoveredBar] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[150px] flex flex-col items-center justify-center text-textSecondary text-sm">
        <p>No outstanding collections</p>
      </div>
    );
  }

  const width = 300;
  const height = 180;
  const paddingX = 30;
  const paddingY = 20;

  const maxVal = Math.max(...data.map(d => d.total_pending)) * 1.1 || 10;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const barWidth = (chartWidth / Math.max(1, data.length)) * 0.5;
  const gap = (chartWidth / Math.max(1, data.length)) * 0.5;

  const buckets = [
    { key: "0_30_days", color: "#3b82f6", label: "0-30 Days" },
    { key: "31_60_days", color: "#f59e0b", label: "31-60 Days" },
    { key: "61_90_days", color: "#f97316", label: "61-90 Days" },
    { key: "90_plus_days", color: "#ef4444", label: "90+ Days" }
  ];

  return (
    <div className="relative w-full overflow-x-auto pb-4 hide-scrollbar">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[300px] h-[180px] overflow-visible">
        {/* Y Axis Grid lines */}
        {[0, 0.5, 1].map((p, i) => {
          const val = maxVal * p;
          const y = height - paddingY - p * chartHeight;
          return (
            <g key={i}>
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="var(--text-secondary)" strokeWidth="1" className="opacity-10" />
              <text x={paddingX - 4} y={y + 3} textAnchor="end" className="text-[9px] fill-current opacity-50 font-bold">
                {val >= 1000 ? `${(val/1000).toFixed(1)}k` : Math.round(val)}
              </text>
            </g>
          );
        })}

        {/* Stacked Bars */}
        {data.map((d, i) => {
          const x = paddingX + i * (barWidth + gap) + gap / 2;
          let currentY = height - paddingY;

          return (
            <g key={i} className="cursor-pointer"
               onMouseEnter={() => setHoveredBar({ ...d, idx: i, x, y: height - paddingY - (d.total_pending / maxVal) * chartHeight })}
               onMouseLeave={() => setHoveredBar(null)}>
              
              {buckets.map((b) => {
                const val = d[b.key] || 0;
                if (val <= 0) return null;
                const h = (val / maxVal) * chartHeight;
                currentY -= h;
                return (
                  <rect key={b.key} x={x} y={currentY} width={barWidth} height={h} fill={b.color} className="transition-all hover:brightness-110 stroke-surface stroke-[0.5px]" />
                );
              })}
              
              {/* Label */}
              <text x={x + barWidth / 2} y={height - 4} textAnchor="middle" className="text-[8px] fill-current opacity-70 font-bold">
                {d.buyer_name?.substring(0, 8)}{d.buyer_name?.length > 8 ? '..' : ''}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredBar && (
        <div 
          className="absolute z-10 rounded-lg border border-border bg-surface px-3 py-2 shadow-md text-xs font-bold min-w-[140px]"
          style={{ 
            left: `${Math.min(70, Math.max(5, (hoveredBar.idx / data.length) * 100))}%`,
            top: `${Math.max(0, (hoveredBar.y / height) * 100 - 40)}%`,
          }}
        >
          <p className="text-[10px] text-textSecondary uppercase tracking-wider mb-2 border-b border-border/50 pb-1">{hoveredBar.buyer_name}</p>
          <div className="space-y-1">
            {buckets.map(b => hoveredBar[b.key] > 0 && (
              <div key={b.key} className="flex justify-between items-center gap-3">
                <span className="text-[9px]" style={{color: b.color}}>{b.label}</span>
                <span className="text-textPrimary">{formatINR(hoveredBar[b.key])}</span>
              </div>
            ))}
            <div className="flex justify-between items-center gap-3 pt-1 mt-1 border-t border-border/50">
              <span className="text-[9px] text-textSecondary">Total</span>
              <span className="text-primary">{formatINR(hoveredBar.total_pending)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 3. Stacked Inventory Bar Chart Component