import { useState } from "react";

export const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

// Line Chart Component
export function SalesTrendChart({ data = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  
  if (!data || data.length === 0) return null;

  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;

  const maxVal = Math.max(1, ...data.map(d => d.value || 0)) * 1.1;
  const minVal = 0;

  const getX = (idx) => paddingX + (idx / (data.length - 1)) * (width - paddingX * 2);
  const getY = (val) => height - paddingY - ((val - minVal) / (maxVal - minVal)) * (height - paddingY * 2);

  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.value), ...d }));
  
  const linePath = points.reduce((acc, p, i) => 
    i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, ""
  );

  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : "";

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const val = maxVal * p;
          const y = getY(val);
          return (
            <g key={i} className="opacity-15">
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="var(--text-secondary)" strokeWidth="1" strokeDasharray="3 3" />
              <text x={paddingX - 8} y={y + 4} textAnchor="end" className="text-[9px] fill-current font-bold">
                {val > 100000 ? `${(val/100000).toFixed(0)}L` : val}
              </text>
            </g>
          );
        })}
        <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={areaPath} fill="url(#lineGrad)" />
        {points.map((p, i) => (
          <text key={i} x={p.x} y={height - 4} textAnchor="middle" className="text-[9px] fill-current opacity-70 font-bold">
            {p.label}
          </text>
        ))}
        {points.map((p, i) => (
          <g key={i} className="cursor-pointer" 
             onMouseEnter={() => setHoveredPoint({ ...p, idx: i })}
             onMouseLeave={() => setHoveredPoint(null)}>
            <circle cx={p.x} cy={p.y} r={hoveredPoint?.idx === i ? "6" : "4"} fill="var(--surface)" stroke="var(--primary)" strokeWidth="2.5" className="transition-all" />
            <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
          </g>
        ))}
      </svg>
      {hoveredPoint && (
        <div 
          className="absolute z-10 rounded-lg border border-border bg-surface px-2.5 py-1.5 shadow-md text-xs font-bold transition-all duration-75"
          style={{ 
            left: `${(hoveredPoint.idx / (data.length - 1)) * 75 + 10}%`,
            top: `${(hoveredPoint.y / height) * 75 - 15}%` 
          }}
        >
          <p className="text-[9px] text-textSecondary uppercase tracking-wider">{hoveredPoint.label}</p>
          <p className="text-primary">{formatINR(hoveredPoint.value)}</p>
        </div>
      )}
    </div>
  );
}

// Vertical Bar Chart Component
export function DistributionBarChart({ data = [] }) {
  const [hoveredBar, setHoveredBar] = useState(null);
  
  if (!data || data.length === 0) return null;

  const width = 250;
  const height = 150;
  const paddingX = 30;
  const paddingY = 20;

  const maxVal = Math.max(1, ...data.map(d => d.value || 0)) * 1.1;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const barWidth = (chartWidth / data.length) * 0.6;
  const gap = (chartWidth / data.length) * 0.4;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        {[0, 0.5, 1].map((p, i) => {
          const val = maxVal * p;
          const y = height - paddingY - p * chartHeight;
          return (
            <line key={i} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="var(--text-secondary)" strokeWidth="1" className="opacity-10" />
          );
        })}
        {data.map((d, i) => {
          const barHeight = (d.value / maxVal) * chartHeight;
          const x = paddingX + i * (barWidth + gap) + gap / 2;
          const y = height - paddingY - barHeight;

          return (
            <g key={i} className="cursor-pointer"
               onMouseEnter={() => setHoveredBar({ ...d, idx: i, x, y })}
               onMouseLeave={() => setHoveredBar(null)}>
              <rect x={x} y={y} width={barWidth} height={barHeight} fill={d.color || "var(--primary)"} rx="6" className="transition-all hover:brightness-110" />
              <text x={x + barWidth / 2} y={height - 4} textAnchor="middle" className="text-[9px] fill-current opacity-70 font-bold">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hoveredBar && (
        <div 
          className="absolute z-10 rounded-lg border border-border bg-surface px-2.5 py-1.5 shadow-md text-xs font-bold transition-all duration-75"
          style={{ left: `${(hoveredBar.x / width) * 100}%`, top: `${(hoveredBar.y / height) * 100 - 20}%` }}
        >
          <p className="text-[9px] text-textSecondary uppercase tracking-wider">{hoveredBar.label}</p>
          <p className="font-extrabold">{formatINR(hoveredBar.value)}</p>
        </div>
      )}
    </div>
  );
}
