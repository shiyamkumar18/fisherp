import { useState, useMemo, memo } from "react";
import { ArrowDown, ArrowUp, Zap, Clock } from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Skeleton from "@/components/ui/skeleton";

export function DailyPurchaseVsSalesChart({ data = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!data || data.length === 0) return (
    <div className="w-full h-[150px] flex items-center justify-center text-textSecondary text-sm">
      <p>No purchase or sales data</p>
    </div>
  );

  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;

  const maxVal = Math.max(...data.map(d => Math.max(d.purchase_kg, d.sales_kg))) * 1.1 || 100;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const barWidth = Math.max(2, (chartWidth / Math.max(1, data.length)) * 0.4);

  const getX = (idx) => paddingX + (idx / Math.max(1, data.length - 1)) * chartWidth;
  const getY = (val) => height - paddingY - ((val) / maxVal) * chartHeight;

  const points = data.map((d, i) => ({
    x: getX(i),
    yLine: getY(d.sales_kg),
    yBar: getY(d.purchase_kg),
    barHeight: (d.purchase_kg / maxVal) * chartHeight,
    ...d
  }));

  const linePath = points.reduce((acc, p, i) => 
    i === 0 ? `M ${p.x} ${p.yLine}` : `${acc} L ${p.x} ${p.yLine}`, ""
  );

  return (
    <div className="relative w-full overflow-x-auto pb-4 hide-scrollbar">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[500px] h-[180px] overflow-visible">
        {/* Y Axis */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const val = maxVal * p;
          const y = getY(val);
          return (
            <g key={i} className="opacity-15">
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="var(--text-secondary)" strokeWidth="1" strokeDasharray="3 3" />
              <text x={paddingX - 8} y={y + 4} textAnchor="end" className="text-[9px] fill-current font-bold">
                {val >= 1000 ? `${(val/1000).toFixed(1)}k` : Math.round(val)}
              </text>
            </g>
          );
        })}

        {/* Purchase Bars */}
        {points.map((p, i) => (
          <rect key={`bar-${i}`} x={p.x - barWidth/2} y={p.yBar} width={barWidth} height={p.barHeight} fill="var(--primary)" fillOpacity="0.2" rx="2" />
        ))}

        {/* Sales Line */}
        <path d={linePath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Interactions */}
        {points.map((p, i) => (
          <g key={`interaction-${i}`} className="cursor-pointer"
             onMouseEnter={() => setHoveredPoint({ ...p, idx: i })}
             onMouseLeave={() => setHoveredPoint(null)}>
            <circle cx={p.x} cy={p.yLine} r={hoveredPoint?.idx === i ? "4" : "2"} fill="#f59e0b" className="transition-all" />
            <circle cx={p.x} cy={p.yLine} r="14" fill="transparent" />
            <rect x={p.x - barWidth} y={paddingY} width={barWidth * 2} height={chartHeight} fill="transparent" />
          </g>
        ))}

        {/* X Axis Labels */}
        {points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 5)) === 0).map((p, i) => (
          <text key={`label-${i}`} x={p.x} y={height - 4} textAnchor="middle" className="text-[8px] fill-current opacity-70 font-bold">
            {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </text>
        ))}
      </svg>
      
      <div className="flex gap-4 justify-end mt-2 text-[10px] text-textSecondary font-bold px-4">
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-primary/20 block" /> Purchase (KG)</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning block" /> Sales (KG)</div>
      </div>

      {hoveredPoint && (
        <div 
          className="absolute z-10 rounded-lg border border-border bg-surface px-3 py-2 shadow-md text-xs font-bold transition-all duration-75 min-w-[140px]"
          style={{ 
            left: `${Math.min(80, Math.max(5, (hoveredPoint.idx / Math.max(1, data.length - 1)) * 100))}%`,
            top: `${(hoveredPoint.yLine / height) * 75 - 35}%`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="flex justify-between items-center border-b border-border/50 pb-1 mb-1">
            <p className="text-[10px] text-textSecondary uppercase tracking-wider">
              {new Date(hoveredPoint.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="space-y-1 mt-1">
            <div className="flex justify-between items-center gap-4">
              <span className="text-textSecondary font-medium text-[10px]">Purchased</span>
              <span className="text-primary">{hoveredPoint.purchase_kg.toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-textSecondary font-medium text-[10px]">Sold</span>
              <span className="text-warning">{hoveredPoint.sales_kg.toFixed(1)} kg</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 5. Line Chart Component