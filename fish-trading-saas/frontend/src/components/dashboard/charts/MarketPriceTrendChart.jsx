import { useState, useMemo, memo } from "react";
import { ArrowDown, ArrowUp, Zap, Clock } from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Skeleton from "@/components/ui/skeleton";

export function MarketPriceTrendChart({ data = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  
  if (!data || data.length === 0) return (
    <div className="w-full h-[150px] flex items-center justify-center text-textSecondary text-sm">
      <p>No market price data</p>
    </div>
  );

  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;

  const maxVal = Math.max(...data.map(d => d.avg_price)) * 1.1 || 100;
  const minVal = Math.min(...data.map(d => d.avg_price)) * 0.9;

  const getX = (idx) => paddingX + (idx / Math.max(1, data.length - 1)) * (width - paddingX * 2);
  const getY = (val) => height - paddingY - ((val - minVal) / (maxVal - minVal)) * (height - paddingY * 2);

  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.avg_price), ...d, idx: i }));
  
  const linePath = points.reduce((acc, p, i) => 
    i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, ""
  );

  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : "";

  return (
    <div className="relative w-full overflow-x-auto pb-4 hide-scrollbar">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[500px] h-[180px] overflow-visible">
        <defs>
          <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const val = minVal + (maxVal - minVal) * p;
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

        <path d={linePath} fill="none" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={areaPath} fill="url(#purpleGrad)" />

        {points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 5)) === 0).map((p, i) => (
          <text key={i} x={p.x} y={height - 4} textAnchor="middle" className="text-[8px] fill-current opacity-70 font-bold">
            {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </text>
        ))}

        {points.map((p, i) => (
          <g key={i} className="cursor-pointer" 
             onMouseEnter={() => setHoveredPoint(p)}
             onMouseLeave={() => setHoveredPoint(null)}>
            <circle cx={p.x} cy={p.y} r={hoveredPoint?.idx === i ? "6" : "4"} fill="var(--surface)" stroke="#8b5cf6" strokeWidth="2.5" className="transition-all" />
            <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
          </g>
        ))}
      </svg>

      {hoveredPoint && (
        <div 
          className="absolute z-10 rounded-lg border border-border bg-surface px-3 py-2 shadow-md text-xs font-bold transition-all duration-75 min-w-[140px]"
          style={{ 
            left: `${Math.min(80, Math.max(5, (hoveredPoint.idx / Math.max(1, data.length - 1)) * 100))}%`,
            top: `${(hoveredPoint.y / height) * 75 - 35}%`,
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
              <span className="text-textSecondary font-medium text-[10px]">Avg Price</span>
              <span className="text-purple-500">{formatINR(hoveredPoint.avg_price)}/kg</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}