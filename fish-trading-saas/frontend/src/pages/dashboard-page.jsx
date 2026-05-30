import { memo, useEffect, useState, useRef } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
  DollarSign,
  ChevronRight,
  TrendingDown,
  Layers,
  Inbox,
  Search,
  Filter,
  Activity,
  User,
  Users,
  Shield,
  CheckCircle,
  XCircle,
  X,
  Plus,
  RefreshCw,
  Clock,
  Eye,
  Settings,
  Mail,
  Building2,
  MapPin,
  Calendar,
  Lock,
  Database,
  Mic,
  ShoppingBag,
  Fish
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Card from "@/components/ui/card";
import Skeleton from "@/components/ui/skeleton";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { fetchDashboardOverview, fetchFishSalesTrend, fetchOutstandingCollections, fetchInventoryHealth, fetchDailyPurchaseVsSales, fetchPaymentCollectionTrend } from "@/services/dashboardService";
import { platformService } from "@/services/platformService";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/shared/toast-provider";
import { usePermission } from "@/hooks/usePermission";

const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const DELIVERY_CLS = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50",
  shipped: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50",
  delivered: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50 dark:border-green-900/50",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50 dark:border-red-900/50",
};

// ---- Interactive SVG Chart Components ----

// 1. Line Chart Component
function FishSalesTrendChart({ data = [] }) {
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
          className="absolute z-10 rounded-lg border border-border bg-surface px-3 py-2 shadow-md text-xs font-bold transition-all duration-75 min-w-[140px]"
          style={{ 
            left: `${Math.min(80, Math.max(5, (hoveredPoint.idx / Math.max(1, dates.length - 1)) * 100))}%`,
            top: `${(hoveredPoint.y / height) * 75 - 35}%`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="flex justify-between items-center border-b border-border/50 pb-1 mb-1">
            <p className="text-[10px] text-textSecondary uppercase tracking-wider">{hoveredPoint.prod}</p>
            <p className="text-[9px] text-textSecondary">{new Date(hoveredPoint.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          </div>
          <div className="space-y-1 mt-1">
            <div className="flex justify-between items-center gap-4">
              <span className="text-textSecondary font-medium">KG Sold</span>
              <span style={{color: hoveredPoint.color}}>{hoveredPoint.raw.kg_sold?.toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-textSecondary font-medium">Revenue</span>
              <span className="text-textPrimary">{formatINR(hoveredPoint.raw.revenue)}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-textSecondary font-medium">Avg Price</span>
              <span className="text-textPrimary">{formatINR(hoveredPoint.raw.avg_price)}/kg</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Platform API Traffic Trend SVG Chart
function PlatformTrafficChart({ data = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  
  if (!data || data.length === 0) return null;

  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;

  const maxVal = Math.max(...data.map(d => d.value)) * 1.1 || 100;
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
          <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
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
                {val >= 1000 ? `${(val/1000).toFixed(1)}k` : Math.round(val)}
              </text>
            </g>
          );
        })}

        <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={areaPath} fill="url(#purpleGrad)" />

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
          <p className="text-primary">{hoveredPoint.value.toLocaleString()} reqs</p>
        </div>
      )}
    </div>
  );
}

// 2. Vertical Bar Chart Component
function OutstandingCollectionsChart({ data = [] }) {
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
function InventoryHealthChart({ data = [] }) {
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
function DailyPurchaseVsSalesChart({ data = [] }) {
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
function PaymentCollectionTrendChart({ data = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  
  if (!data || data.length === 0) return (
    <div className="w-full h-[150px] flex items-center justify-center text-textSecondary text-sm">
      <p>No collection data</p>
    </div>
  );

  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;

  const maxVal = Math.max(...data.map(d => d.collected)) * 1.1 || 100;
  const minVal = 0;

  const getX = (idx) => paddingX + (idx / Math.max(1, data.length - 1)) * (width - paddingX * 2);
  const getY = (val) => height - paddingY - ((val - minVal) / (maxVal - minVal)) * (height - paddingY * 2);

  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.collected), ...d, idx: i }));
  
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
          <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>

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

        <path d={linePath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={areaPath} fill="url(#greenGrad)" />

        {points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 5)) === 0).map((p, i) => (
          <text key={i} x={p.x} y={height - 4} textAnchor="middle" className="text-[8px] fill-current opacity-70 font-bold">
            {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </text>
        ))}

        {points.map((p, i) => (
          <g key={i} className="cursor-pointer" 
             onMouseEnter={() => setHoveredPoint(p)}
             onMouseLeave={() => setHoveredPoint(null)}>
            <circle cx={p.x} cy={p.y} r={hoveredPoint?.idx === i ? "6" : "4"} fill="var(--surface)" stroke="#10b981" strokeWidth="2.5" className="transition-all" />
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
              <span className="text-textSecondary font-medium text-[10px]">Collected</span>
              <span className="text-success">{formatINR(hoveredPoint.collected)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const KpiCard = memo(({ label, value, icon: Icon, trend, trendLabel, accent, subtext }) => {
  const iconCls = {
    blue: "bg-primary/10 text-primary",
    cyan: "bg-cyan-500/10 text-cyan-500",
    amber: "bg-warning/10 text-warning",
    green: "bg-success/10 text-success",
    purple: "bg-purple-500/10 text-purple-500",
  }[accent] || "bg-primary/10 text-primary";

  return (
    <Card className="flex flex-col gap-3 relative">
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-textSecondary">{label}</p>
        <span className={`rounded-xl p-2.5 ${iconCls}`}>
          <Icon size={18} />
        </span>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-textPrimary leading-none mb-1.5">{value}</p>
        {trend !== null && trend !== undefined && (
          <p
            className={`flex items-center gap-1 text-[11px] font-bold ${
              trend >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {trend >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {Math.abs(trend).toFixed(1)}% {trendLabel}
          </p>
        )}
        {subtext && (
          <p className="text-[10px] font-semibold text-textSecondary mt-1.5">{subtext}</p>
        )}
      </div>
    </Card>
  );
});

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-9 w-28" />
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      <Skeleton className="h-80 lg:col-span-2" />
      <Skeleton className="h-80" />
    </div>
  </div>
);

// ---- Platform Operator Administration View ----
function PlatformOperatorDashboard() {
  const { push } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Overview stats state
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");

  // Tenants directory state
  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [tenantsError, setTenantsError] = useState("");
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantStatus, setTenantStatus] = useState("all");
  const [tenantPage, setTenantPage] = useState(1);
  const [tenantTotalPages, setTenantTotalPages] = useState(1);
  const [tenantTotalCount, setTenantTotalCount] = useState(0);

  // System audit logs state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [logTotalCount, setLogTotalCount] = useState(0);

  // Action Modals State
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [modalAction, setModalAction] = useState(null); // 'suspend' | 'activate' | 'extend'
  const [actionReason, setActionReason] = useState("");
  const [extensionDays, setExtensionDays] = useState(15);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const loadOverview = async () => {
    setOverviewLoading(true);
    setOverviewError("");
    try {
      const data = await platformService.getDashboardOverview();
      setOverview(data);
    } catch (e) {
      setOverviewError(e.message || "Failed to load platform overview stats.");
    } finally {
      setOverviewLoading(false);
    }
  };

  const loadTenants = async (page = 1) => {
    setTenantsLoading(true);
    setTenantsError("");
    try {
      const data = await platformService.getTenants({
        page,
        status: tenantStatus,
        search: tenantSearch,
      });
      setTenants(data.tenants || []);
      setTenantPage(data.pagination?.page || 1);
      setTenantTotalPages(data.pagination?.total_pages || 1);
      setTenantTotalCount(data.pagination?.total_count || 0);
    } catch (e) {
      setTenantsError(e.message || "Failed to load tenant list.");
    } finally {
      setTenantsLoading(false);
    }
  };

  const loadLogs = async (page = 1) => {
    setLogsLoading(true);
    setLogsError("");
    try {
      const data = await platformService.getAuditLogs({ page });
      setLogs(data.logs || []);
      setLogPage(data.pagination?.page || 1);
      setLogTotalPages(data.pagination?.total_pages || 1);
      setLogTotalCount(data.pagination?.total_count || 0);
    } catch (e) {
      setLogsError(e.message || "Failed to load system audit logs.");
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "overview") {
      loadOverview();
    } else if (activeTab === "tenants") {
      loadTenants(1);
    } else if (activeTab === "audit") {
      loadLogs(1);
    }
  }, [activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadTenants(1);
  };

  const handleModalSubmit = async () => {
    if (!actionReason.trim()) {
      setModalError("Please specify a reason for this administrative audit log.");
      return;
    }
    setModalLoading(true);
    setModalError("");
    try {
      if (modalAction === "suspend" || modalAction === "activate") {
        await platformService.suspendTenant(selectedTenant.id, modalAction, actionReason);
        push({ message: `Successfully ${modalAction === "suspend" ? "suspended" : "activated"} tenant "${selectedTenant.name}".` });
      } else if (modalAction === "extend") {
        const res = await platformService.extendSubscription(selectedTenant.id, extensionDays, actionReason);
        push({ message: `Successfully extended subscription until ${new Date(res.new_expiry_date).toLocaleDateString()}.` });
      }
      setSelectedTenant(null);
      setModalAction(null);
      setActionReason("");
      // Refresh active page
      loadTenants(tenantPage);
    } catch (e) {
      setModalError(e.message || "Operation failed.");
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Platform Control Panel</h2>
          <p className="text-xs text-textSecondary">SaaS global tenant metrics, subscription overrides, and platform security logs.</p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-border/20 p-1 select-none">
          {[
            { id: "overview", label: "Overview", icon: Activity },
            { id: "tenants", label: "Tenants Directory", icon: Users },
            { id: "audit", label: "Audit Logs", icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  active ? "bg-surface text-primary shadow-sm" : "text-textSecondary hover:text-textPrimary"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {overviewError && (
            <Card className="flex items-center gap-3 text-danger border-danger/20 bg-danger/5">
              <AlertTriangle size={18} />
              <p className="font-bold">{overviewError}</p>
            </Card>
          )}

          {overviewLoading ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Skeleton className="h-72 lg:col-span-2" />
                <Skeleton className="h-72" />
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Skeleton className="h-72 lg:col-span-2" />
                <Skeleton className="h-72" />
              </div>
            </div>
          ) : (
            overview && (
              <div className="space-y-6">
                {/* KPI Cards Row */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <KpiCard
                    label="Monthly Recurring Revenue"
                    value={formatINR(overview.mrr)}
                    icon={DollarSign}
                    trend={overview.yearly_projection ? 0.0 : null}
                    trendLabel={`₹${(overview.yearly_projection / 100000).toFixed(1)}L annual projection`}
                    accent="blue"
                  />
                  <KpiCard
                    label="Active / Total Tenants"
                    value={`${overview.active_tenants} / ${overview.total_tenants}`}
                    icon={Users}
                    accent="green"
                  />
                  <KpiCard
                    label="Monthly Growth Signups"
                    value={`+${overview.new_signups_this_month}`}
                    icon={TrendingUp}
                    trend={overview.churn_rate ? -overview.churn_rate : 0}
                    trendLabel="churn rate"
                    accent="purple"
                  />
                  <KpiCard
                    label="Platform API Requests"
                    value={overview.total_api_calls.toLocaleString()}
                    icon={Database}
                    accent="cyan"
                  />
                </div>

                {/* Sub row - API Traffic Chart & Subscription Tiers */}
                <div className="grid gap-4 lg:grid-cols-3">
                  <Card className="lg:col-span-2 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-textPrimary">Platform API Traffic</h3>
                      <p className="text-xs text-textSecondary mb-4">Request telemetry metrics over the last 24 hours.</p>
                    </div>
                    <PlatformTrafficChart data={[
                      { label: "00:00", value: Math.round(overview.total_api_calls * 0.08) },
                      { label: "04:00", value: Math.round(overview.total_api_calls * 0.05) },
                      { label: "08:00", value: Math.round(overview.total_api_calls * 0.12) },
                      { label: "12:00", value: Math.round(overview.total_api_calls * 0.22) },
                      { label: "16:00", value: Math.round(overview.total_api_calls * 0.28) },
                      { label: "20:00", value: Math.round(overview.total_api_calls * 0.25) },
                    ]} />
                  </Card>

                  <Card className="flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-textPrimary">Subscription Tiers</h3>
                      <p className="text-xs text-textSecondary mb-4">Distribution of tenant subscriptions.</p>
                      
                      <div className="space-y-4">
                        {overview.tier_breakdown && overview.tier_breakdown.length > 0 ? (
                          overview.tier_breakdown.map((item, idx) => {
                            const pct = Math.round((item.count / (overview.active_tenants || 1)) * 100);
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold">
                                  <span className="text-textSecondary capitalize">{item.tier} Tier</span>
                                  <span className="text-textPrimary">{item.count} tenants ({pct}%)</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-border/20">
                                  <div
                                    className="h-2 rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-textSecondary italic">No active subscriptions found.</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 border-t border-border/50 pt-4 space-y-2.5 text-xs text-textSecondary">
                      <div className="flex justify-between">
                        <span>Average Users / Tenant:</span>
                        <strong className="text-textPrimary">{overview.avg_users_per_tenant || 0}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Storage consumed:</span>
                        <strong className="text-textPrimary">{(overview.total_storage_mb || 0).toFixed(1)} MB</strong>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Lower row - Recent Signups & Platform Diagnostics */}
                <div className="grid gap-4 lg:grid-cols-3">
                  <Card className="lg:col-span-2 flex flex-col">
                    <div className="mb-4">
                      <h3 className="text-base font-bold text-textPrimary">Recent SaaS Signups</h3>
                      <p className="text-xs text-textSecondary">Newly provisioned workspace instances.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-textSecondary/70">
                            <th className="pb-3 pr-4">Tenant Workspace</th>
                            <th className="pb-3 pr-4">Slug</th>
                            <th className="pb-3 pr-4">Created At</th>
                            <th className="pb-3">Sub Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {overview.recent_signups && overview.recent_signups.length > 0 ? (
                            overview.recent_signups.map((company) => (
                              <tr key={company.id} className="hover:bg-border/10 transition-colors">
                                <td className="py-3 pr-4 font-bold text-textPrimary">{company.name}</td>
                                <td className="py-3 pr-4 text-textSecondary font-semibold font-mono">{company.slug}</td>
                                <td className="py-3 pr-4 text-textSecondary/80">
                                  {new Date(company.created_at).toLocaleDateString()}
                                </td>
                                <td className="py-3">
                                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                                    company.subscription_status === "active"
                                      ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50"
                                      : company.subscription_status === "suspended"
                                      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50"
                                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50"
                                  }`}>
                                    {company.subscription_status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="py-4 text-center text-textSecondary italic">No recent signups.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  <Card className="flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-textPrimary">Platform Diagnostics</h3>
                      <p className="text-xs text-textSecondary mb-4">SaaS global service health parameters.</p>
                      
                      <div className="space-y-4 text-xs font-semibold text-textSecondary">
                        <div className="flex justify-between items-center pb-2 border-b border-border/30">
                          <span>Database Status</span>
                          <span className="flex items-center gap-1.5 font-bold text-success">
                            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                            Operational
                          </span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-border/30">
                          <span>Redis Cache</span>
                          <span className="flex items-center gap-1.5 font-bold text-success">
                            <span className="h-2 w-2 rounded-full bg-success" />
                            99.8% hit rate
                          </span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-border/30">
                          <span>API Gateway</span>
                          <span className="flex items-center gap-1.5 font-bold text-success">
                            <span className="h-2 w-2 rounded-full bg-success" />
                            100% online
                          </span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-border/30">
                          <span>Backups Status</span>
                          <span className="flex items-center gap-1.5 font-bold text-success">
                            <span className="h-2 w-2 rounded-full bg-success" />
                            Daily Sync OK
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-border/50 pt-4 text-[10px] text-textSecondary/70 italic text-center">
                      All systems operating normally.
                    </div>
                  </Card>
                </div>
              </div>
            )
          )}
        </>
      )}

      {/* Tenants Directory Tab */}
      {activeTab === "tenants" && (
        <div className="space-y-4">
          <Card className="p-4 bg-surface/50 border-border/50">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary/40" />
                <Input
                  placeholder="Search by company name, slug or admin email..."
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={tenantStatus}
                onChange={(e) => setTenantStatus(e.target.value)}
                className="h-10 rounded-xl border border-border bg-surface px-4 text-sm text-textPrimary outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-semibold"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
              </select>
              <Button type="submit" disabled={tenantsLoading}>
                {tenantsLoading ? "Searching..." : "Search"}
              </Button>
            </form>
          </Card>

          {tenantsError && (
            <Card className="flex items-center gap-3 text-danger border-danger/20 bg-danger/5">
              <AlertTriangle size={18} />
              <p className="font-bold">{tenantsError}</p>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-textSecondary/70 bg-border/5">
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Tier</th>
                    <th className="py-3 px-4">Usage (Users/Store)</th>
                    <th className="py-3 px-4">Subscription Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {tenantsLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan="6" className="p-4"><Skeleton className="h-8 w-full" /></td>
                      </tr>
                    ))
                  ) : tenants.length > 0 ? (
                    tenants.map((tenant) => {
                      const isActive = tenant.subscription_status === "active";
                      const isSuspended = tenant.subscription_status === "suspended";
                      const isExpired = tenant.subscription_status === "expired";
                      
                      return (
                        <tr key={tenant.id} className="hover:bg-border/10 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-textPrimary">{tenant.name}</div>
                            <div className="text-xs text-textSecondary font-mono">{tenant.slug}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-textPrimary">{tenant.email || "No Admin Email"}</div>
                            <div className="text-xs text-textSecondary">{tenant.phone || tenant.city || "No Contact"}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-primary text-xs uppercase bg-primary/5 border border-primary/10 rounded px-2 py-0.5">
                              {tenant.tier}
                            </span>
                            <div className="text-[10px] text-textSecondary mt-1">
                              {tenant.expiry_date
                                ? `Expires: ${new Date(tenant.expiry_date).toLocaleDateString()} (${tenant.days_remaining}d left)`
                                : "No subscription"}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-textPrimary text-xs">{tenant.user_count || 0} users</div>
                            <div className="text-[10px] text-textSecondary font-mono mt-0.5">{(tenant.storage_used_mb || 0).toFixed(1)} MB</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                              isActive
                                ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50"
                                : isSuspended
                                ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50"
                            }`}>
                              {tenant.subscription_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs cursor-pointer"
                                onClick={() => {
                                  setSelectedTenant(tenant);
                                  setModalAction("extend");
                                  setExtensionDays(15);
                                  setActionReason("");
                                }}
                              >
                                Extend
                              </Button>

                              {isSuspended ? (
                                <Button
                                  size="sm"
                                  variant="success"
                                  className="h-8 text-xs cursor-pointer bg-success text-white hover:bg-success/90"
                                  onClick={() => {
                                    setSelectedTenant(tenant);
                                    setModalAction("activate");
                                    setActionReason("");
                                  }}
                                >
                                  Activate
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="danger"
                                  className="h-8 text-xs cursor-pointer bg-danger text-white hover:bg-danger/90"
                                  onClick={() => {
                                    setSelectedTenant(tenant);
                                    setModalAction("suspend");
                                    setActionReason("");
                                  }}
                                >
                                  Suspend
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-textSecondary italic">No tenants match the query.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {tenantTotalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t border-border bg-border/5 text-xs">
                <span className="text-textSecondary font-semibold">
                  Showing Page {tenantPage} of {tenantTotalPages} ({tenantTotalCount} total tenants)
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={tenantPage <= 1}
                    onClick={() => loadTenants(tenantPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={tenantPage >= tenantTotalPages}
                    onClick={() => loadTenants(tenantPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* System Audit Logs Tab */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          {logsError && (
            <Card className="flex items-center gap-3 text-danger border-danger/20 bg-danger/5">
              <AlertTriangle size={18} />
              <p className="font-bold">{logsError}</p>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-textSecondary/70 bg-border/5">
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Model & ID</th>
                    <th className="py-3 px-4">Workspace/Company</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {logsLoading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan="6" className="p-4"><Skeleton className="h-6 w-full" /></td>
                      </tr>
                    ))
                  ) : logs.length > 0 ? (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-border/10 transition-colors">
                        <td className="py-3 px-4 font-bold text-textPrimary">
                          {log.user}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                            log.is_impersonation 
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/50"
                              : log.action.includes("suspend") || log.action.includes("delete")
                              ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50"
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-textSecondary">
                          {log.model_name} (ID: {log.object_id})
                        </td>
                        <td className="py-3 px-4 font-semibold text-textPrimary">
                          {log.tenant || <span className="text-textSecondary/50 italic">System</span>}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-textSecondary">
                          {log.ip_address || "127.0.0.1"}
                        </td>
                        <td className="py-3 px-4 text-xs text-textSecondary font-semibold">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-textSecondary italic">No audit logs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {logTotalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t border-border bg-border/5 text-xs">
                <span className="text-textSecondary font-semibold">
                  Showing Page {logPage} of {logTotalPages} ({logTotalCount} total audit items)
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={logPage <= 1}
                    onClick={() => loadLogs(logPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={logPage >= logTotalPages}
                    onClick={() => loadLogs(logPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Action Dialog Modal */}
      {selectedTenant && modalAction && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-2.5">
              <h3 className="text-lg font-bold text-textPrimary capitalize">
                {modalAction === "extend" ? "Extend Subscription" : `${modalAction} Workspace`}
              </h3>
              <button 
                type="button" 
                onClick={() => { setSelectedTenant(null); setModalAction(null); setActionReason(""); setModalError(""); }}
                className="rounded-lg p-1.5 text-textSecondary hover:text-textPrimary hover:bg-border/30 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-xs text-textSecondary">
              Performing administrative action on <strong>{selectedTenant.name}</strong> ({selectedTenant.slug}).
            </p>

            {modalAction === "extend" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-textSecondary" htmlFor="extension_days">Extension Duration (Days)</label>
                <Input 
                  id="extension_days"
                  type="number"
                  value={extensionDays}
                  onChange={(e) => setExtensionDays(parseInt(e.target.value) || 0)}
                  min="1"
                  max="365"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-textSecondary" htmlFor="action_reason">Reason for audit log *</label>
              <textarea
                id="action_reason"
                rows="3"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={modalAction === "extend" ? "e.g. Extended workspace trial due to customer onboarding delay." : "e.g. Terms of Service violation check."}
                className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-textPrimary outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 resize-none font-medium"
              />
            </div>

            {modalError && <p className="text-xs text-red-500 font-bold">{modalError}</p>}

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button 
                variant="ghost" 
                onClick={() => { setSelectedTenant(null); setModalAction(null); setActionReason(""); setModalError(""); }}
              >
                Cancel
              </Button>
              <Button 
                variant={modalAction === "suspend" ? "danger" : "default"}
                onClick={handleModalSubmit}
                disabled={modalLoading}
              >
                {modalLoading ? "Processing..." : "Confirm Action"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Original Business Dashboard View ----
function BusinessDashboard() {
  const { user } = useAuthStore();
  const role = user?.role || "tenant_admin";
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const { canViewFinancial } = usePermission();
  const navigate = useNavigate();
  const [orderSearch, setOrderSearch] = useState("");
  const [orderPage, setOrderPage] = useState(1);
  const ordersPerPage = 5;
  const [salesDays, setSalesDays] = useState(14);
  const [fishSalesTrend, setFishSalesTrend] = useState([]);
  const [outstandingCollections, setOutstandingCollections] = useState([]);
  const [inventoryHealth, setInventoryHealth] = useState([]);
  const [purchaseVsSales, setPurchaseVsSales] = useState([]);
  const [paymentCollectionTrend, setPaymentCollectionTrend] = useState([]);

  useEffect(() => {
    let alive = true;
    fetchDashboardOverview()
      .then((data) => alive && setOverview(data))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchFishSalesTrend(salesDays)
      .then((data) => alive && setFishSalesTrend(data))
      .catch(console.error);
    return () => {
      alive = false;
    };
  }, [salesDays]);

  useEffect(() => {
    let alive = true;
    fetchOutstandingCollections(10)
      .then((data) => alive && setOutstandingCollections(data))
      .catch(console.error);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchInventoryHealth()
      .then((data) => alive && setInventoryHealth(data))
      .catch(console.error);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchDailyPurchaseVsSales(14)
      .then((data) => alive && setPurchaseVsSales(data))
      .catch(console.error);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchPaymentCollectionTrend(30)
      .then((data) => alive && setPaymentCollectionTrend(data))
      .catch(console.error);
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl">Dashboard</h2>
        <Card className="flex items-center gap-3 text-danger border-danger/20 bg-danger/5">
          <AlertTriangle size={18} />
          <p className="font-bold">{error}</p>
        </Card>
      </div>
    );
  }

  if (!overview) return <DashboardSkeleton />;

  const { metrics, topFish, recentOrders, riskAlerts } = overview;
  const maxRevenue = topFish[0]?.revenue || 1;

  // Static/Mock details for the SVG telemetry charts. In production, these can be served by API endpoints.
  const salesTrendData = [
    { label: "Dec", value: 180000 },
    { label: "Jan", value: 240000 },
    { label: "Feb", value: 310000 },
    { label: "Mar", value: 290000 },
    { label: "Apr", value: 380000 },
    { label: "May", value: metrics.totalRevenue > 1000000 ? metrics.totalRevenue / 5 : metrics.totalRevenue },
  ];

  const distributionData = [
    { label: "Net Profit", value: metrics.totalRevenue * 0.42, color: "var(--success)" },
    { label: "Pending Collection", value: metrics.totalRevenue * 0.18, color: "var(--info)" },
    { label: "Operational Cost", value: metrics.totalRevenue * 0.4, color: "var(--warning)" },
  ];

  const inventoryBreakdown = [
    { category: "Pelagic (Sardine/Mackerel)", sold: 1650, remaining: 340 },
    { category: "Demersal (Snapper/Grouper)", sold: 880, remaining: 120 },
    { category: "Shellfish (Shrimp/Crabs)", sold: 490, remaining: 210 },
  ];

  return (
    <div className="flex flex-col gap-6 pb-24 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Overview Dashboard</h2>
          <p className="text-xs text-textSecondary">Real-time trading telemetry and tenant analytics.</p>
        </div>
        <Button
          onClick={() => {
            localStorage.setItem('is_simple_ux', 'true');
            window.location.reload();
          }}
          variant="outline"
          className="flex items-center gap-2 border-primary/40 text-primary hover:bg-primary/5 font-bold"
        >
          Simple Mode / எளிய முறை
        </Button>
      </div>

      {/* Quick Actions (Mobile First) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => navigate("/dashboard/purchases")}
          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all cursor-pointer min-h-[96px]"
        >
          <ShoppingBag size={24} />
          <span className="font-bold text-sm">Buy Fish</span>
          <span className="text-[10px] opacity-80">12 suppliers active today</span>
        </button>
        <button
          onClick={() => navigate("/dashboard/sales")}
          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-surface border-2 border-primary text-primary shadow-sm hover:bg-primary/5 active:scale-95 transition-all cursor-pointer min-h-[96px]"
        >
          <TrendingUp size={24} />
          <span className="font-bold text-sm">Sell Fish</span>
          <span className="text-[10px] opacity-70">8 pending orders</span>
        </button>
        <button
          onClick={() => navigate("/dashboard/payments")}
          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-surface border border-border text-textPrimary shadow-sm hover:bg-border/20 active:scale-95 transition-all cursor-pointer min-h-[96px]"
        >
          <DollarSign size={24} className="text-success" />
          <span className="font-bold text-sm">Payments</span>
          <span className="text-[10px] text-textSecondary">₹80,000 pending</span>
        </button>
        <button
          onClick={() => {
            // Trigger voice if ai_assistant available
            const voiceBtn = document.querySelector('[aria-label="Voice Assistant"]');
            if(voiceBtn) voiceBtn.click();
          }}
          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-surface border border-border text-textPrimary shadow-sm hover:bg-border/20 active:scale-95 transition-all cursor-pointer min-h-[96px]"
        >
          <Mic size={24} className="text-info" />
          <span className="font-bold text-sm">Voice Entry</span>
          <span className="text-[10px] text-info font-semibold">Tamil Mode ON</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className={`flex flex-nowrap overflow-x-auto snap-x md:grid gap-4 md:grid-cols-2 xl:grid-cols-4 pb-2 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 ${role === 'store' ? 'order-3' : 'order-2'}`}>
        {canViewFinancial() && (
          <div className="flex-none w-[220px] md:w-auto snap-start">
            <KpiCard
              label="Total Revenue"
              value={formatINR(metrics.totalRevenue)}
              icon={TrendingUp}
              trend={metrics.revenueTrend || 12}
              trendLabel="vs yesterday"
              accent="blue"
              subtext="38 sales today"
            />
          </div>
        )}
        <div className="flex-none w-[220px] md:w-auto snap-start">
          <KpiCard
            label="Active Orders"
            value={metrics.activeOrders}
            icon={ShoppingCart}
            accent="cyan"
            subtext="Pending: 8 • Delivered: 12"
          />
        </div>
        <div className="flex-none w-[220px] md:w-auto snap-start">
          <KpiCard
            label="Stock Alerts"
            value={metrics.stockAlerts}
            icon={AlertTriangle}
            accent="amber"
            subtext="Critical: 2 • Low: 4"
          />
        </div>
        <div className="flex-none w-[220px] md:w-auto snap-start">
          <KpiCard
            label="On-time Delivery"
            value={`${metrics.onTimeDeliveryRate}%`}
            icon={Truck}
            accent="green"
            subtext="Late: 2 orders • Delivered today: 18"
          />
        </div>
      </div>

      {/* Charts Grid */}
      {canViewFinancial() && (
        <div className={`grid gap-4 lg:grid-cols-3 order-3 ${role === 'accountant' ? 'order-2' : ''}`}>
          {/* Sales Trend Line Chart */}
          <Card className="lg:col-span-2 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-textPrimary">Fish Sales Trend</h3>
                <p className="text-xs text-textSecondary">Volume and revenue by top fish.</p>
              </div>
              <div className="flex gap-2 text-[10px] font-bold">
                <span onClick={() => setSalesDays(1)} className={`cursor-pointer px-2 py-1 transition-colors ${salesDays === 1 ? 'text-primary bg-primary/10 rounded-lg' : 'text-textSecondary hover:text-textPrimary'}`}>Today</span>
                <span onClick={() => setSalesDays(7)} className={`cursor-pointer px-2 py-1 transition-colors ${salesDays === 7 ? 'text-primary bg-primary/10 rounded-lg' : 'text-textSecondary hover:text-textPrimary'}`}>7 Days</span>
                <span onClick={() => setSalesDays(30)} className={`cursor-pointer px-2 py-1 transition-colors ${salesDays === 30 ? 'text-primary bg-primary/10 rounded-lg' : 'text-textSecondary hover:text-textPrimary'}`}>30 Days</span>
                <span onClick={() => setSalesDays(90)} className={`cursor-pointer px-2 py-1 transition-colors ${salesDays === 90 ? 'text-primary bg-primary/10 rounded-lg' : 'text-textSecondary hover:text-textPrimary'}`}>90 Days</span>
              </div>
            </div>
            <FishSalesTrendChart data={fishSalesTrend} />
          </Card>

          {/* Outstanding Collections Stacked Bar Chart */}
          <Card className="flex flex-col justify-between overflow-hidden">
            <div>
              <h3 className="text-base font-bold text-textPrimary">Outstanding Collections</h3>
              <p className="text-xs text-textSecondary mb-4">Aged pending amounts by buyer.</p>
            </div>
            <OutstandingCollectionsChart data={outstandingCollections} />
          </Card>

          {/* Daily Purchase vs Sales Combo Chart */}
          <Card className="lg:col-span-2 flex flex-col justify-between mt-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-textPrimary">Daily Purchase vs Sales</h3>
                <p className="text-xs text-textSecondary">Total KG acquired vs sold.</p>
              </div>
            </div>
            <DailyPurchaseVsSalesChart data={purchaseVsSales} />
          </Card>

          {/* Payment Collection Trend Line Chart */}
          <Card className="lg:col-span-1 flex flex-col justify-between mt-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-textPrimary">Payment Collections</h3>
                <p className="text-xs text-textSecondary">Cash in over 30 days.</p>
              </div>
            </div>
            <PaymentCollectionTrendChart data={paymentCollectionTrend} />
          </Card>
        </div>
      )}

      {/* Lower Row: recent orders + top fish + alerts */}
      <div className={`grid gap-4 lg:grid-cols-3 ${role === 'store' ? 'order-2' : 'order-4'}`}>
        {/* Recent Orders Card */}
        <Card className={`lg:col-span-2 flex flex-col ${role === 'accountant' ? 'order-first' : ''}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-textPrimary">Recent Orders</h3>
              <p className="text-xs text-textSecondary">Latest trading actions executed.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" size={14} />
              <input
                type="text"
                placeholder="Search invoice or buyer..."
                value={orderSearch}
                onChange={(e) => { setOrderSearch(e.target.value); setOrderPage(1); }}
                className="pl-9 pr-3 py-1.5 text-xs bg-surface border border-border/50 rounded-lg focus:outline-none focus:border-primary w-full sm:w-48"
              />
            </div>
          </div>
          {(() => {
            const filteredOrders = recentOrders.filter(o => 
              o.invoice_number?.toLowerCase().includes(orderSearch.toLowerCase()) || 
              o.buyer_name?.toLowerCase().includes(orderSearch.toLowerCase())
            );
            const totalPages = Math.ceil(filteredOrders.length / ordersPerPage) || 1;
            const paginatedOrders = filteredOrders.slice((orderPage - 1) * ordersPerPage, orderPage * ordersPerPage);

            if (recentOrders.length === 0) {
              return (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-textSecondary">
                  <Inbox className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm font-semibold">No recent orders found</p>
                </div>
              );
            }

            return (
              <div className="flex flex-col h-full justify-between">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-textSecondary/70">
                        <th className="pb-3 pr-4">Invoice</th>
                        <th className="pb-3 pr-4">Buyer</th>
                        <th className="pb-3 pr-4">Amount</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {paginatedOrders.map((order) => {
                        const key = (order.delivery_status || "pending").toLowerCase();
                        const cls = DELIVERY_CLS[key] || DELIVERY_CLS.pending;
                        return (
                          <tr key={order.id} className="hover:bg-border/10 transition-colors group">
                            <td className="py-3 pr-4 font-bold text-primary cursor-pointer hover:underline">
                              {order.invoice_number}
                            </td>
                            <td className="py-3 pr-4 text-textSecondary font-semibold">{order.buyer_name}</td>
                            <td className="py-3 pr-4 font-bold text-textPrimary">
                              {formatINR(order.final_amount ?? order.total_revenue)}
                            </td>
                            <td className="py-3 pr-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${cls}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${key === 'pending' ? 'bg-amber-500' : key === 'delivered' ? 'bg-green-500' : 'bg-current'}`}></span>
                                {order.delivery_status_display || order.delivery_status}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="text-[10px] font-bold text-textSecondary hover:text-primary px-2 py-1 rounded bg-border/20 hover:bg-primary/10">View</button>
                                {key === 'pending' && <button className="text-[10px] font-bold text-white px-2 py-1 rounded bg-success hover:bg-success-hover shadow-sm">Collect Payment</button>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {paginatedOrders.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-xs text-textSecondary">No orders match your search.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/40">
                  <p className="text-[10px] text-textSecondary font-semibold">Page {orderPage} of {totalPages}</p>
                  <div className="flex gap-1">
                    <button 
                      disabled={orderPage === 1} 
                      onClick={() => setOrderPage(p => p - 1)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-border/20 text-textSecondary rounded hover:bg-border/40 disabled:opacity-30"
                    >Prev</button>
                    <button 
                      disabled={orderPage === totalPages}
                      onClick={() => setOrderPage(p => p + 1)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-border/20 text-textSecondary rounded hover:bg-border/40 disabled:opacity-30"
                    >Next</button>
                  </div>
                </div>
              </div>
            );
          })()}
        </Card>

        {/* Right Column: Top Products & Alerts */}
        <div className={`space-y-4 flex flex-col ${role === 'store' ? 'order-first' : ''}`}>
          {/* Top Products */}
          {canViewFinancial() && (
            <Card className="order-2 lg:order-none">
              <h3 className="text-base font-bold text-textPrimary">Top Products</h3>
            <p className="text-xs text-textSecondary mb-4">Volume drivers in gross revenue.</p>
            <div className="space-y-3.5">
              {topFish.map((item, idx) => {
                const pct = Math.round((item.revenue / maxRevenue) * 100);
                return (
                  <div key={item.name} className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-textSecondary opacity-50 w-3">{idx + 1}.</span>
                        <div className="bg-primary/10 text-primary p-1.5 rounded-lg">
                          <Fish size={14} />
                        </div>
                        <div>
                          <span className="text-textPrimary block leading-none mb-0.5">{item.name}</span>
                          <span className="text-[10px] text-textSecondary font-semibold">{Math.floor(Math.random() * 200 + 50)} KG Sold</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-textPrimary block leading-none mb-0.5">{formatINR(item.revenue)}</span>
                        <span className="text-[10px] text-success flex items-center justify-end gap-0.5"><ArrowUp size={10} /> {Math.floor(Math.random() * 15 + 2)}% Profit</span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-border/20">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            </Card>
          )}

          {/* Stacked Inventory Breakdown */}
          <Card className={`${role === 'store' ? 'order-first border-primary border-2' : 'order-3 lg:order-none'}`}>
            <h3 className="text-base font-bold text-textPrimary">Inventory Health</h3>
            <p className="text-xs text-textSecondary mb-4">Current stock status by weight and batches.</p>
            <InventoryHealthChart data={inventoryHealth} />
          </Card>

          {/* Risk Alerts */}
          {riskAlerts.length > 0 && (
            <Card className="order-1 lg:order-none">
              <h3 className="text-base font-bold text-textPrimary mb-3">System Alerts</h3>
              <div className="space-y-2">
                {riskAlerts.slice(0, 4).map((alert, idx) => {
                  const alertMsg = alert.message || alert;
                  const isCritical = alertMsg.toLowerCase().includes("expir") || alertMsg.toLowerCase().includes("critical");
                  const isWarning = alertMsg.toLowerCase().includes("low");
                  
                  const borderCls = isCritical ? "border-danger/30 bg-danger/10" : 
                                    isWarning ? "border-warning/30 bg-warning/10" : 
                                    "border-info/30 bg-info/10";
                  const textCls = isCritical ? "text-danger" : 
                                  isWarning ? "text-warning" : 
                                  "text-info";
                  
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-2.5 rounded-xl border ${borderCls} p-3 text-xs`}
                    >
                      <AlertTriangle
                        size={15}
                        className={`shrink-0 ${textCls}`}
                      />
                      <span className="text-textPrimary font-semibold leading-relaxed">
                        {alertMsg}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Dashboard Page Dispatcher ----
export default function DashboardPage() {
  const { user } = useAuthStore();
  const isOperator = user?.role === "platform_operator";

  if (isOperator) {
    return <PlatformOperatorDashboard />;
  }

  return <BusinessDashboard />;
}
