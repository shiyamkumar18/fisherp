import { useState, useMemo, memo } from "react";
import { ArrowDown, ArrowUp, Zap, Clock } from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Skeleton from "@/components/ui/skeleton";

export function FishSalesTrendChart({ data = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[180px] flex flex-col items-center justify-center text-textSecondary text-sm">
        <p className="mb-2">No fish sales available</p>
        <Button variant="outline" size="sm" onClick={() => window.location.href='/sales/new'}>Create Sale</Button>
      </div>
    );
  }

  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;

  // Group by date
  const dateMap = {};
  const products = new Set();
  
  data.forEach(d => {
    products.add(d.product);
    if (!dateMap[d.date]) dateMap[d.date] = { date: d.date, raw: {} };
    dateMap[d.date][d.product] = d.kg_sold;
    dateMap[d.date].raw[`${d.date}-${d.product}`] = d;
  });

  const dates = Object.keys(dateMap).sort();
  const productArray = Array.from(products);
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const maxVal = Math.max(...data.map(d => d.kg_sold)) * 1.1 || 10;
  const minVal = 0;

  const getX = (idx) => paddingX + (idx / Math.max(1, dates.length - 1)) * (width - paddingX * 2);
  const getY = (val) => height - paddingY - ((val - minVal) / (maxVal - minVal)) * (height - paddingY * 2);

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        {/* Grid lines */}
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

        {/* Lines */}
        {productArray.map((prod, pIdx) => {
          const color = colors[pIdx % colors.length];
          const pts = dates.map((d, i) => ({
            x: getX(i),
            y: getY(dateMap[d][prod] || 0),
            val: dateMap[d][prod] || 0,
            date: d,
            prod,
            raw: dateMap[d].raw[`${d}-${prod}`]
          }));
          
          const linePath = pts.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, "");

          return (
            <g key={prod}>
              <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80 hover:opacity-100 hover:stroke-[3px] transition-all" />
              {pts.map((p, i) => (
                p.raw && (
                  <g key={i} className="cursor-pointer"
                     onMouseEnter={() => setHoveredPoint({ ...p, color, idx: i })}
                     onMouseLeave={() => setHoveredPoint(null)}>
                    <circle cx={p.x} cy={p.y} r={hoveredPoint?.date === p.date && hoveredPoint?.prod === p.prod ? "6" : "3"} fill="var(--surface)" stroke={color} strokeWidth="2" className="transition-all" />
                    <circle cx={p.x} cy={p.y} r="10" fill="transparent" />
                  </g>
                )
              ))}
            </g>
          );
        })}

        {/* X Axis labels */}
        {dates.map((d, i) => {
          if (dates.length > 7 && i % Math.ceil(dates.length / 5) !== 0 && i !== dates.length - 1) return null;
          return (
            <text key={i} x={getX(i)} y={height - 4} textAnchor="middle" className="text-[9px] fill-current opacity-70 font-bold">
              {new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredPoint && (
        <div 
          className="absolute z-10 rounded-xl border border-border/50 bg-surface/90 backdrop-blur-xl px-4 py-3 shadow-xl text-xs font-bold transition-all duration-75 min-w-[160px]"
          style={{ 
            left: `${Math.min(80, Math.max(5, (hoveredPoint.idx / Math.max(1, dates.length - 1)) * 100))}%`,
            top: `${(hoveredPoint.y / height) * 75 - 45}%`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="flex justify-between items-center border-b border-border/50 pb-2 mb-2">
            <p className="text-[11px] text-textPrimary uppercase tracking-wider font-extrabold">{hoveredPoint.prod}</p>
            <p className="text-[10px] text-textSecondary">{new Date(hoveredPoint.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          </div>
          <div className="space-y-1.5 mt-1">
            <div className="flex justify-between items-center gap-6">
              <span className="text-textSecondary font-semibold">KG Sold</span>
              <span style={{color: hoveredPoint.color}} className="font-extrabold">{hoveredPoint.raw.kg_sold?.toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between items-center gap-6">
              <span className="text-textSecondary font-semibold">Revenue</span>
              <span className="text-textPrimary font-extrabold">{formatINR(hoveredPoint.raw.revenue)}</span>
            </div>
            <div className="flex justify-between items-center gap-6">
              <span className="text-textSecondary font-semibold">Avg Price</span>
              <span className="text-textPrimary font-extrabold">{formatINR(hoveredPoint.raw.avg_price)}/kg</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Platform API Traffic Trend SVG Chart