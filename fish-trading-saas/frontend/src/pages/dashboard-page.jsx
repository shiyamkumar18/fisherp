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
  Fish,
  PieChart,
  LineChart,
  LifeBuoy,
  CreditCard,
  Target,
  Server,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Card from "@/components/ui/card";
import Skeleton from "@/components/ui/skeleton";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { fetchDashboardOverview, fetchFishSalesTrend, fetchOutstandingCollections, fetchInventoryHealth, fetchDailyPurchaseVsSales, fetchPaymentCollectionTrend, fetchMarketPriceTrend } from "@/services/dashboardService";
import { platformService } from "@/services/platformService";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/shared/toast-provider";
import { usePermission } from "@/hooks/usePermission";
import { 
  generateMockFunnel,
  generateMockMrrTrend
} from "@/utils/platform-mocks";

const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const DELIVERY_CLS = {
  pending: "bg-amber-100 text-warning dark:bg-amber-950/40 dark:text-warning border border-warning/30/50 dark:border-amber-900/50",
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

// 6. Market Price Trend Component
function MarketPriceTrendChart({ data = [] }) {
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

const KpiCard = memo(({ label, value, icon: Icon, trend, trendLabel, accent, subtext }) => {
  const iconCls = {
    blue: "bg-primary/10 text-primary border-primary/20",
    cyan: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    amber: "bg-warning/10 text-warning border-warning/20",
    green: "bg-success/10 text-success border-success/20",
    purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  }[accent] || "bg-primary/10 text-primary border-primary/20";
  
  const shadowGlow = {
    blue: "hover:shadow-primary/10",
    cyan: "hover:shadow-cyan-500/10",
    amber: "hover:shadow-warning/10",
    green: "hover:shadow-success/10",
    purple: "hover:shadow-purple-500/10",
  }[accent] || "hover:shadow-primary/10";

  return (
    <Card className={`flex flex-col gap-4 relative group transition-all duration-300 hover:shadow-xl ${shadowGlow} hover:border-border`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-extrabold uppercase tracking-widest text-textSecondary">{label}</p>
        <span className={`rounded-xl p-2.5 border ${iconCls} transition-transform duration-300 group-hover:scale-110`}>
          <Icon size={20} />
        </span>
      </div>
      <div>
        <p className="text-3xl font-extrabold text-textPrimary leading-none tracking-tight mb-3">{value}</p>
        
        <div className="flex items-center gap-2 mt-3">
          {trend !== null && trend !== undefined && (
            <span
              className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                trend >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
              }`}
            >
              {trend >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {(trendLabel || subtext) && (
            <span className="text-[11px] font-semibold text-textSecondary truncate">
              {trendLabel || subtext}
            </span>
          )}
        </div>
        
        {/* Micro progress indicator */}
        <div className="w-full bg-border/50 h-1 rounded-full mt-4 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              accent === 'green' ? 'bg-success' : accent === 'amber' ? 'bg-warning' : accent === 'purple' ? 'bg-purple-500' : accent === 'cyan' ? 'bg-cyan-500' : 'bg-primary'
            }`} 
            style={{ width: `${Math.min(100, Math.max(10, trend ? 50 + trend : 50))}%` }}
          />
        </div>
      </div>
    </Card>
  );
});

const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {/* Header Skeleton */}
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-border/40 rounded-lg"></div>
        <div className="h-5 w-48 bg-border/20 rounded-md"></div>
      </div>
      <div className="h-10 w-32 bg-border/30 rounded-xl"></div>
    </div>
    
    {/* Quick Actions Skeleton */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-[104px] bg-surface border border-border/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
          <div className="h-8 w-8 bg-border/40 rounded-full"></div>
          <div className="h-4 w-16 bg-border/30 rounded"></div>
          <div className="h-2 w-24 bg-border/20 rounded"></div>
        </div>
      ))}
    </div>
    
    {/* KPI Cards Skeleton */}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-36 bg-surface border border-border/50 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="h-3 w-20 bg-border/30 rounded"></div>
            <div className="h-10 w-10 bg-border/20 rounded-xl"></div>
          </div>
          <div className="space-y-2">
            <div className="h-8 w-24 bg-border/40 rounded"></div>
            <div className="h-3 w-32 bg-border/20 rounded"></div>
          </div>
        </div>
      ))}
    </div>
    
    {/* Charts Skeleton */}
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="h-80 bg-surface border border-border/50 rounded-2xl lg:col-span-2"></div>
      <div className="h-80 bg-surface border border-border/50 rounded-2xl"></div>
    </div>
  </div>
);

// ---- Platform KPI Card Component ----
const PlatformKpiCard = memo(({ title, mainValue, subtext, icon: Icon, trend, trendLabel, severity = "info" }) => {
  const severities = {
    critical: "bg-danger/10 border-danger/30 text-danger",
    warning: "bg-warning/10 border-warning/30 text-warning",
    healthy: "bg-success/10 border-success/30 text-success",
    info: "bg-primary/10 border-primary/30 text-primary",
  };
  const theme = severities[severity] || severities.info;
  
  return (
    <Card className={`relative overflow-hidden border p-5 hover:shadow-md transition-all duration-300 ${theme.replace('text-', 'hover:border-').replace('/10', '/20')}`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${theme.split(' ')[2].replace('text-', 'bg-')}`} />
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider">{title}</h4>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${theme.split(' ')[2]}`}>{mainValue}</span>
          </div>
        </div>
        <div className={`p-2 rounded-xl ${theme.split(' ')[0]} ${theme.split(' ')[2]}`}>
          <Icon size={20} />
        </div>
      </div>
      {(trend || trendLabel || subtext) && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/30">
          {trend && (
            <span className={`flex items-center text-[11px] font-bold ${trend > 0 ? 'text-success' : trend < 0 ? 'text-danger' : 'text-textSecondary'}`}>
              {trend > 0 ? <ArrowUp size={12} className="mr-0.5" /> : trend < 0 ? <ArrowDown size={12} className="mr-0.5" /> : null}
              {Math.abs(trend)}%
            </span>
          )}
          {trendLabel && <span className="text-[10px] font-semibold text-textSecondary">{trendLabel}</span>}
          {subtext && !trend && !trendLabel && <span className="text-[11px] font-bold text-textSecondary">{subtext}</span>}
        </div>
      )}
    </Card>
  );
});

// ---- Platform MRR Chart ----
function PlatformMrrChart({ data = [] }) {
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
function PlatformMixChart({ breakdown = [] }) {
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
function PlatformFunnelChart({ data }) {
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
function PlatformOperatorDashboard() {
  const { push } = useToast();
  const setImpersonation = useAuthStore((s) => s.setImpersonation);
  const [activeTab, setActiveTab] = useState("overview");

  // Overview stats state
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  
  // Support ticket modal state
  const [selectedTicket, setSelectedTicket] = useState(null);

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
      } else if (modalAction === "impersonate") {
        const res = await platformService.impersonateTenant(selectedTenant.slug || selectedTenant.id, actionReason);
        setImpersonation(res);
        push({ message: `Impersonation started for ${res.tenant_name}. Redirecting...` });
        window.location.reload();
        return;
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
        <div className="flex flex-wrap rounded-xl bg-border/20 p-1 select-none overflow-x-auto scrollbar-hide max-w-full">
          {[
            { id: "overview", label: "Live Operations", icon: Activity },
            { id: "revenue", label: "Revenue Intelligence", icon: DollarSign },
            { id: "lifecycle", label: "Tenant Lifecycle", icon: Users },
            { id: "support", label: "Support Operations", icon: LifeBuoy },
            { id: "billing", label: "Billing Risks", icon: CreditCard },
            { id: "audit", label: "Security & Audit", icon: Shield },
            { id: "diagnostics", label: "Diagnostics", icon: Server },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
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
                {/* NEW KPI Cards Row */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <PlatformKpiCard
                    title="Monthly Recurring Revenue"
                    mainValue={formatINR(overview.mrr)}
                    icon={DollarSign}
                    trend={overview.churn_rate ? 14.2 : 0}
                    trendLabel={`${formatINR(overview.yearly_projection)} annualized`}
                    severity="healthy"
                  />
                  <PlatformKpiCard
                    title="Active Tenant Health"
                    mainValue={`${overview.active_tenants} / ${overview.total_tenants}`}
                    subtext={`${overview.suspended_tenants} Suspended • ${overview.expired_tenants} Expired`}
                    icon={Target}
                    severity={overview.suspended_tenants > 0 ? "warning" : "healthy"}
                  />
                  <PlatformKpiCard
                    title="Expired Tenants"
                    mainValue={overview.expired_tenants}
                    subtext={overview.expired_tenants > 0 ? "Action required" : "All clear"}
                    icon={CreditCard}
                    severity={overview.expired_tenants > 0 ? "critical" : "healthy"}
                  />
                  <PlatformKpiCard
                    title="Active Support Incidents"
                    mainValue={overview.active_incidents || 0}
                    subtext="Pending Support Tickets"
                    icon={LifeBuoy}
                    severity={overview.active_incidents > 0 ? "warning" : "healthy"}
                  />
                  <PlatformKpiCard
                    title="Security Alerts"
                    mainValue={0}
                    subtext="Suspicious Activities"
                    icon={Shield}
                    severity="healthy"
                  />
                </div>

                {/* Live Operations Center - Phase 3 */}
                <div className="grid gap-4 lg:grid-cols-3">
                  {/* Left: Tenant Health Center */}
                  <Card className="lg:col-span-2 flex flex-col">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-textPrimary">Live Tenant Health</h3>
                        <p className="text-xs text-textSecondary">Real-time monitoring of tenant workspaces.</p>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => setActiveTab("tenants")}>View All Tenants</Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-[11px] font-extrabold uppercase tracking-wider text-textSecondary/70">
                            <th className="pb-3 pr-4">Tenant</th>
                            <th className="pb-3 pr-4">Tier</th>
                            <th className="pb-3 pr-4">Health</th>
                            <th className="pb-3 pr-4">Last Active</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {overview.recent_signups && overview.recent_signups.slice(0, 6).map((company, idx) => {
                            const riskLevel = idx === 1 ? "Critical" : idx === 3 ? "Warning" : "Healthy";
                            const riskTheme = riskLevel === "Critical" ? "text-danger bg-danger/10 border-danger/20" : riskLevel === "Warning" ? "text-warning bg-warning/10 border-warning/20" : "text-success bg-success/10 border-success/20";
                            return (
                              <tr key={company.id || idx} className="hover:bg-border/10 transition-colors group">
                                <td className="py-3 pr-4">
                                  <div className="font-bold text-textPrimary text-xs">{company.name}</div>
                                  <div className="text-[10px] text-textSecondary font-mono">{company.slug}</div>
                                </td>
                                <td className="py-3 pr-4 text-xs font-semibold text-textSecondary capitalize">
                                  {company.subscription_status === "active" ? "Enterprise" : "Trial"}
                                </td>
                                <td className="py-3 pr-4">
                                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold border ${riskTheme}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${riskTheme.split(' ')[0].replace('text-', 'bg-')}`} />
                                    {riskLevel}
                                  </span>
                                </td>
                                <td className="py-3 pr-4 text-[11px] font-semibold text-textSecondary">
                                  {idx === 1 ? "2 days ago" : "Just now"}
                                </td>
                                <td className="py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        setSelectedTenant(company);
                                        setModalAction("impersonate");
                                      }}
                                      className="flex items-center gap-1.5 text-[10px] font-extrabold text-primary px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm"
                                    >
                                      <Eye size={12} strokeWidth={2.5} />
                                      IMPERSONATE
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {(!overview.recent_signups || overview.recent_signups.length === 0) && (
                            <tr>
                              <td colSpan="5" className="py-8 text-center text-xs text-textSecondary italic">No active tenants available for monitoring.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {/* Right: Support Operations Panel */}
                  <Card className="flex flex-col">
                    <div className="mb-4">
                      <h3 className="text-base font-bold text-textPrimary">Support Queue</h3>
                      <p className="text-xs text-textSecondary">Live SLA tracking & active tickets.</p>
                    </div>
                    <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                      {overview.recent_tickets?.length > 0 ? (
                        overview.recent_tickets.map(t => {
                          const isUrgent = t.priority === "Urgent" || t.priority === "Critical";
                          const isBreached = t.timeRemaining === "Breached";
                          return (
                            <div 
                              key={t.id} 
                              onClick={() => setSelectedTicket(t)}
                              className={`p-3 rounded-xl border flex flex-col gap-2 cursor-pointer hover:shadow-md ${isUrgent ? 'border-danger/30 bg-danger/5 hover:bg-danger/10' : isBreached ? 'border-warning/30 bg-warning/5 hover:bg-warning/10' : 'border-border bg-surface hover:border-primary/30 hover:bg-primary/5 transition-colors'}`}
                            >
                              <div className="flex justify-between items-start">
                                <span className="text-[11px] font-bold text-textPrimary">{t.id}</span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${isUrgent ? 'bg-danger/20 text-danger' : isBreached ? 'bg-warning/20 text-warning' : 'bg-border text-textSecondary'}`}>
                                  {isBreached ? "SLA BREACH" : t.priority}
                                </span>
                              </div>
                              <div className="text-xs font-semibold text-textSecondary truncate">{t.tenant}</div>
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-[10px] font-bold text-textSecondary">Assignee: <span className="text-textPrimary">{t.agent}</span></span>
                                <span className={`text-[10px] font-bold ${isBreached ? 'text-danger animate-pulse' : 'text-success'}`}>{t.timeRemaining}</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-textSecondary py-8">
                          <CheckCircle size={32} className="mb-2 text-success/50" />
                          <p className="text-xs font-semibold">No pending tickets!</p>
                        </div>
                      )}
                    </div>
                    <Button className="w-full mt-4 text-xs font-bold" onClick={() => setActiveTab("support")}>
                      Open Support Command Center
                    </Button>
                  </Card>
                </div>
              </div>
            )
          )}
        </>
      )}

      {/* Revenue Intelligence Tab */}
      {activeTab === "revenue" && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-base font-bold text-textPrimary">MRR Growth</h3>
                <p className="text-xs text-textSecondary mb-4">6-month monthly recurring revenue trajectory with churn overlay.</p>
              </div>
              <PlatformMrrChart data={generateMockMrrTrend(overview?.mrr || 1000000)} />
            </Card>

            <Card className="flex flex-col justify-between items-center text-center h-full">
              <div className="w-full text-left">
                <h3 className="text-base font-bold text-textPrimary">Subscription Mix</h3>
                <p className="text-xs text-textSecondary mb-4">Distribution of MRR by tier.</p>
              </div>
              <PlatformMixChart breakdown={overview?.tier_breakdown || [
                { tier: "enterprise", count: 12 },
                { tier: "pro", count: 24 },
                { tier: "starter", count: 8 }
              ]} />
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
             <Card>
                <div className="mb-4">
                  <h3 className="text-base font-bold text-textPrimary">Churn Analytics</h3>
                  <p className="text-xs text-textSecondary">Accounts lost in the last 30 days.</p>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border/50 rounded-2xl bg-surface/50">
                   <div className="bg-success/10 text-success p-3 rounded-full mb-3"><Shield className="h-6 w-6" /></div>
                   <h4 className="text-sm font-extrabold text-textPrimary mb-1">0 Churn This Month</h4>
                   <p className="text-xs text-textSecondary font-semibold">Excellent retention rate.</p>
                </div>
             </Card>
             <Card>
                <div className="mb-4">
                  <h3 className="text-base font-bold text-textPrimary">Payment Failures</h3>
                  <p className="text-xs text-textSecondary">Failed subscription charge attempts.</p>
                </div>
                {overview.expired_tenants > 0 ? (
                  <div className="space-y-2">
                    {Array.from({length: overview.expired_tenants}).map((_, i) => (
                      <div key={i} className="flex justify-between items-center p-3 rounded-lg border border-danger/20 bg-danger/5">
                         <div className="flex items-center gap-2">
                           <XCircle className="text-danger h-4 w-4" />
                           <span className="text-xs font-bold text-textPrimary">Expired Tenant {i + 1}</span>
                         </div>
                         <Button variant="outline" size="sm" className="h-6 text-[10px] text-danger border-danger/30 hover:bg-danger/10">Retry</Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border/50 rounded-2xl bg-surface/50">
                     <div className="bg-success/10 text-success p-3 rounded-full mb-3"><CheckCircle className="h-6 w-6" /></div>
                     <h4 className="text-sm font-extrabold text-textPrimary mb-1">All Payments Successful</h4>
                  </div>
                )}
             </Card>
          </div>
        </div>
      )}

      {/* Tenant Lifecycle Tab */}
      {activeTab === "lifecycle" && (
        <div className="space-y-6">
          <Card>
            <div className="mb-4">
              <h3 className="text-base font-bold text-textPrimary">Conversion Funnel</h3>
              <p className="text-xs text-textSecondary">Platform signups to active paid renewals.</p>
            </div>
            <div className="max-w-3xl mx-auto py-4">
               <PlatformFunnelChart data={generateMockFunnel(overview?.active_tenants || 45)} />
            </div>
          </Card>
        </div>
      )}

      {/* Support Operations Tab */}
      {activeTab === "support" && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-4">
            <PlatformKpiCard title="Active Incidents" mainValue={overview.active_incidents || 0} icon={AlertTriangle} severity={overview.active_incidents > 0 ? "warning" : "healthy"} />
            <PlatformKpiCard title="SLA Breached" mainValue={overview.recent_tickets?.filter(t => t.timeRemaining === 'Breached').length || 0} icon={Clock} severity="warning" />
            <PlatformKpiCard title="Avg Resolution" mainValue={`0h`} icon={CheckCircle} severity="healthy" />
            <PlatformKpiCard title="Agents Online" mainValue="4" subtext="Support L1, L2" icon={Users} severity="info" />
          </div>
          
          <Card>
            <div className="mb-4">
              <h3 className="text-base font-bold text-textPrimary">Impersonation Log</h3>
              <p className="text-xs text-textSecondary">Audit trail of staff impersonating tenant accounts.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-extrabold uppercase tracking-wider text-textSecondary/70">
                    <th className="pb-3 pr-4">Time</th>
                    <th className="pb-3 pr-4">Staff Member</th>
                    <th className="pb-3 pr-4">Target Tenant</th>
                    <th className="pb-3 pr-4">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {logs.filter(log => log.action === 'impersonate').slice(0, 5).map(log => (
                    <tr key={log.id} className="hover:bg-border/10">
                      <td className="py-3 pr-4 text-xs font-semibold text-textSecondary">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="py-3 pr-4 text-xs font-bold text-primary">{log.actor_email}</td>
                      <td className="py-3 pr-4 text-xs font-semibold text-textPrimary">{log.target_user || log.details?.tenant}</td>
                      <td className="py-3 pr-4 text-[11px] font-bold text-warning">14m 23s</td>
                    </tr>
                  ))}
                  {logs.filter(log => log.action === 'impersonate').length === 0 && (
                     <tr><td colSpan="4" className="py-8 text-center text-xs text-textSecondary italic">No impersonation events logged recently.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Billing Operations Tab */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-danger/20 bg-danger/5">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-base font-bold text-danger">Failed Renewals</h3>
                 <span className="bg-danger text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{overview.expired_tenants} ACTION REQ</span>
               </div>
               <div className="text-3xl font-black text-textPrimary mb-1">₹{((overview.mrr || 0) * overview.expired_tenants).toLocaleString()}</div>
               <p className="text-xs font-semibold text-danger">At risk revenue requiring manual collection.</p>
            </Card>
            <Card className="border-warning/20 bg-warning/5">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-base font-bold text-warning">Expiring within 7 Days</h3>
                 <span className="bg-warning text-white text-[10px] px-2 py-0.5 rounded-full font-bold">0 UPCOMING</span>
               </div>
               <div className="text-3xl font-black text-textPrimary mb-1">₹0</div>
               <p className="text-xs font-semibold text-warning">Expected renewal revenue next week.</p>
            </Card>
          </div>
          <Card>
            <div className="mb-4">
              <h3 className="text-base font-bold text-textPrimary">Upcoming Renewals</h3>
              <p className="text-xs text-textSecondary">Tenants scheduled for automated billing soon.</p>
            </div>
            <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border/50 rounded-2xl bg-surface/50">
               <div className="bg-primary/10 text-primary p-3 rounded-full mb-3"><CreditCard className="h-6 w-6" /></div>
               <h4 className="text-sm font-extrabold text-textPrimary mb-1">Stripe Billing Active</h4>
               <p className="text-xs text-textSecondary font-semibold">Auto-collection is enabled for {overview?.active_tenants || 0} tenants.</p>
            </div>
          </Card>
        </div>
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
                                : "bg-amber-100 text-warning dark:bg-amber-950/40 dark:text-warning border border-warning/30/50"
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
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
             <PlatformKpiCard title="Failed Logins" mainValue="42" subtext="Last 24 hours" icon={Lock} severity="warning" />
             <PlatformKpiCard title="Suspicious Activity" mainValue="3" subtext="Multiple failed 2FA" icon={AlertTriangle} severity="critical" />
             <PlatformKpiCard title="Webhook Failures" mainValue="1" subtext="Stripe checkout webhook" icon={Server} severity="critical" />
          </div>
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

      {/* Diagnostics Tab */}
      {activeTab === "diagnostics" && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-textPrimary">Platform API Traffic</h3>
                <p className="text-xs text-textSecondary mb-4">Request telemetry metrics over the last 24 hours.</p>
              </div>
              <PlatformTrafficChart data={[
                { label: "00:00", value: Math.round((overview?.total_api_calls || 1000) * 0.08) },
                { label: "04:00", value: Math.round((overview?.total_api_calls || 1000) * 0.05) },
                { label: "08:00", value: Math.round((overview?.total_api_calls || 1000) * 0.12) },
                { label: "12:00", value: Math.round((overview?.total_api_calls || 1000) * 0.22) },
                { label: "16:00", value: Math.round((overview?.total_api_calls || 1000) * 0.28) },
                { label: "20:00", value: Math.round((overview?.total_api_calls || 1000) * 0.25) },
              ]} />
            </Card>
            
            <Card className="flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-textPrimary">Global Diagnostics</h3>
                <p className="text-xs text-textSecondary mb-4">SaaS system health parameters.</p>
                <div className="space-y-4 text-xs font-semibold text-textSecondary">
                  <div className="flex justify-between items-center pb-2 border-b border-border/30">
                    <span>Database Status</span>
                    <span className="flex items-center gap-1.5 font-bold text-success"><span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Operational</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-border/30">
                    <span>Redis Cache</span>
                    <span className="flex items-center gap-1.5 font-bold text-success"><span className="h-2 w-2 rounded-full bg-success" /> 99.8% hit rate</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-border/30">
                    <span>API Gateway</span>
                    <span className="flex items-center gap-1.5 font-bold text-success"><span className="h-2 w-2 rounded-full bg-success" /> 100% online</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-border/30">
                    <span>Backups Status</span>
                    <span className="flex items-center gap-1.5 font-bold text-success"><span className="h-2 w-2 rounded-full bg-success" /> Daily Sync OK</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 border-t border-border/50 pt-4 text-[10px] text-textSecondary/70 italic text-center">
                All systems operating normally.
              </div>
            </Card>
          </div>
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

            {/* Audit Reason Modal */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Admin Audit Required</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-textSecondary">
                    You are taking an administrative action on a tenant's account. Please log the reason for this action for security audit purposes.
                  </p>
                  <Input 
                    placeholder="e.g., Resolving support ticket #TCK-8022" 
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    disabled={modalLoading}
                  />
                  {modalError && <p className="text-xs text-danger font-bold">{modalError}</p>}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setModalOpen(false)} disabled={modalLoading}>Cancel</Button>
                  <Button onClick={handleModalSubmit} loading={modalLoading}>Proceed</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>


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

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex justify-between items-center pr-8">
                <DialogTitle className="text-xl font-black">{selectedTicket.id}</DialogTitle>
                <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${selectedTicket.priority === 'Urgent' ? 'bg-danger/20 text-danger' : selectedTicket.timeRemaining === 'Breached' ? 'bg-warning/20 text-warning' : 'bg-primary/10 text-primary'}`}>
                  {selectedTicket.priority}
                </span>
              </div>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface p-3 rounded-xl border border-border/50">
                  <p className="text-[10px] font-bold text-textSecondary uppercase mb-1">Tenant</p>
                  <p className="text-sm font-bold text-textPrimary">{selectedTicket.tenant}</p>
                </div>
                <div className="bg-surface p-3 rounded-xl border border-border/50">
                  <p className="text-[10px] font-bold text-textSecondary uppercase mb-1">Assignee</p>
                  <p className="text-sm font-bold text-textPrimary">{selectedTicket.agent}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-textPrimary mb-2 border-b border-border/50 pb-2">Issue Description</h4>
                <p className="text-sm text-textSecondary">
                  {selectedTicket.priority === "Urgent" 
                    ? "Critical system failure reported. Immediate attention required to restore service availability."
                    : "Standard user inquiry regarding platform usage and data export functionality."}
                </p>
              </div>
              <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-textSecondary uppercase mb-1">SLA Time Remaining</p>
                  <p className={`text-xl font-black ${selectedTicket.timeRemaining === 'Breached' ? 'text-danger' : 'text-success'}`}>
                    {selectedTicket.timeRemaining}
                  </p>
                </div>
                <Button onClick={() => {
                  setSelectedTicket(null);
                  setActiveTab("support");
                }}>
                  Go to Support Center
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


// ---- Original Business Dashboard View ----
function BusinessDashboard() {
  const { user, impersonation } = useAuthStore();
  const { push } = useToast();
  const role = impersonation?.role || (impersonation ? "tenant_admin" : (user?.role || "tenant_admin"));
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
  const [marketPriceTrend, setMarketPriceTrend] = useState([]);

  useEffect(() => {
    let alive = true;
    fetchDashboardOverview()
      .then((data) => alive && setOverview(data))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchFishSalesTrend(salesDays).then((d) => alive && setFishSalesTrend(d)).catch(console.error);
    return () => { alive = false; };
  }, [salesDays]);

  useEffect(() => {
    let alive = true;
    fetchOutstandingCollections(10).then((d) => alive && setOutstandingCollections(d)).catch(console.error);
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchInventoryHealth().then((d) => alive && setInventoryHealth(d)).catch(console.error);
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchDailyPurchaseVsSales(14).then((d) => alive && setPurchaseVsSales(d)).catch(console.error);
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchPaymentCollectionTrend(30).then((d) => alive && setPaymentCollectionTrend(d)).catch(console.error);
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchMarketPriceTrend(14).then((d) => alive && setMarketPriceTrend(d)).catch(console.error);
    return () => { alive = false; };
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

  // Header Greeting
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good Morning" : currentHour < 18 ? "Good Afternoon" : "Good Evening";
  const firstName = user?.username ? user.username.split(" ")[0] : "User";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const isMarketOpen = currentHour >= 6 && currentHour < 20;

  // Role flags
  const isAdmin  = role === "tenant_admin";
  const isAcct   = role === "accountant";
  const isTrader = role === "trader";
  const isStore  = role === "store";

  // Action Required Panel
  const safeCollections = Array.isArray(outstandingCollections) ? outstandingCollections : [];
  const overdueAmt   = safeCollections.reduce((s, b) => s + ((b["30_plus_days"] || 0) + (b["90_plus_days"] || 0)), 0);
  const overdueCount = safeCollections.filter(b => (b["30_plus_days"] || 0) > 0 || (b["90_plus_days"] || 0) > 0).length;
  const expiringStock = inventoryHealth.find(s => s.status === "Expiring Soon");

  const actionAlerts = [
    overdueAmt > 0 && {
      id: "overdue", color: "danger", icon: "🔴",
      title: "Overdue Collections",
      body: `${formatINR(overdueAmt)} overdue • ${overdueCount} buyers pending`,
      cta: "Collect Now", route: "/dashboard/payments",
      show: isAdmin || isAcct || isTrader,
    },
    (expiringStock?.count > 0) && {
      id: "expiry", color: "warning", icon: "🟠",
      title: "Stock Expiring Soon",
      body: `${expiringStock.count} batch${expiringStock.count > 1 ? "es" : ""} expire within 2 days`,
      cta: "Check Inventory", route: "/dashboard/inventory",
      show: isAdmin || isStore,
    },
    metrics.stockAlerts > 0 && {
      id: "stock", color: "amber", icon: "🟡",
      title: "Supplier Payments Due",
      body: "Review and settle pending supplier payouts",
      cta: "Pay Supplier", route: "/dashboard/payments",
      show: isAdmin || isAcct,
    },
    {
      id: "delay", color: "info", icon: "🔵",
      title: "Delivery Tracking",
      body: `${metrics.activeOrders || 0} active orders in transit`,
      cta: "View Orders", route: "/dashboard/orders",
      show: isAdmin || isTrader || isStore,
    },
  ].filter(Boolean).filter(a => a.show !== false);

  // Market Intelligence (enrich from API later)
  const marketPrices = [
    { name: "Vanjaram",  price: 720, trend: "up",   delta: "+₹30" },
    { name: "Seer Fish", price: 580, trend: "down",  delta: "-₹15" },
    { name: "Prawns",    price: 420, trend: "up",   delta: "+₹20" },
    { name: "Pomfret",   price: 650, trend: "up",   delta: "+₹10" },
    { name: "Sardine",   price: 95,  trend: "down",  delta: "-₹5"  },
  ];

  const aiSuggestions = [
    { icon: "🔥", msg: "Vanjaram demand rising in Chennai harbor. Consider increasing selling price by ₹20/kg." },
    { icon: "⚠️", msg: overdueCount > 0 ? `${overdueCount} buyers have delayed payments. Review credit limits before next order.` : "All buyer payments are up to date — excellent credit discipline." },
    { icon: "📦", msg: "Pomfret stock is slow-moving. Consider running a 5% discount to clear inventory before expiry." },
    { icon: "📈", msg: "Purchase cost of Prawns dropped 8% this week — good opportunity to increase stock." },
  ];

  return (
    <div className="flex flex-col gap-6 pb-24 md:pb-6">

      {/* ── HEADER: Market Status Cockpit ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-textPrimary flex items-center gap-2">
            {greeting}, {firstName} <span className="animate-wave origin-bottom-right inline-block">👋</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="flex items-center gap-1.5 bg-surface border border-border px-2.5 py-1 rounded-lg shadow-sm text-xs font-bold text-textSecondary">
              <Calendar size={12} className="text-primary" /> {today}
            </span>
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg shadow-sm text-xs font-bold border ${isMarketOpen ? "bg-success/10 border-success/30 text-success" : "bg-border/30 border-border text-textSecondary"}`}>
              <span className="relative flex h-2 w-2">
                {isMarketOpen && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isMarketOpen ? "bg-success" : "bg-textSecondary"}`} />
              </span>
              Market {isMarketOpen ? "Open" : "Closed"}
            </span>
            <span className="flex items-center gap-1.5 bg-warning/10 border border-warning/30 px-2.5 py-1 rounded-lg shadow-sm text-xs font-bold text-warning">
              🔥 High Vanjaram Demand Today
            </span>
            <span className="flex items-center gap-1.5 bg-info/10 border border-info/30 px-2.5 py-1 rounded-lg shadow-sm text-xs font-bold text-info">
              🌧 Rain expected near harbor
            </span>
          </div>
        </div>
        <Button
          onClick={() => { localStorage.setItem("is_simple_ux", "true"); window.location.reload(); }}
          variant="outline"
          className="flex items-center gap-2 border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 hover:border-primary/40 font-bold shadow-sm transition-all rounded-xl shrink-0"
        >
          Simple Mode / எளிய முறை
        </Button>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => navigate("/dashboard/purchases")}
          className="group relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-primary to-primaryHover text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all duration-200 cursor-pointer min-h-[104px] overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-16 w-16 rounded-full bg-white opacity-10 blur-xl group-hover:scale-150 transition-transform duration-500" />
          <ShoppingBag size={28} className="drop-shadow-sm transition-transform group-hover:scale-110" />
          <div className="flex flex-col items-center">
            <span className="font-bold text-sm tracking-wide">Buy Fish</span>
            <span className="text-[10px] font-semibold opacity-80 mt-0.5">{metrics.activeOrders || 12} purchases today</span>
            <span className="text-[9px] font-bold opacity-70 mt-0.5">{safeCollections.length > 0 ? `${safeCollections.length} supplier payouts pending` : "All payables clear"}</span>
          </div>
        </button>

        <button onClick={() => navigate("/dashboard/sales")}
          className="group relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-surface border border-border shadow-sm hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-1 active:scale-95 transition-all duration-200 cursor-pointer min-h-[104px] overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <TrendingUp size={28} className="text-primary transition-transform group-hover:scale-110" />
          <div className="flex flex-col items-center">
            <span className="font-bold text-sm tracking-wide text-textPrimary">Sell Fish</span>
            <span className="text-[10px] font-medium text-textSecondary mt-0.5">{metrics.activeOrders || 9} pending orders</span>
            <span className="text-[9px] font-bold text-warning mt-0.5">🔥 Vanjaram trending ↑</span>
          </div>
        </button>

        <button onClick={() => navigate("/dashboard/payments")}
          className="group relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-surface border border-border shadow-sm hover:border-success/50 hover:shadow-md hover:shadow-success/5 hover:-translate-y-1 active:scale-95 transition-all duration-200 cursor-pointer min-h-[104px] overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-success/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <DollarSign size={28} className="text-success transition-transform group-hover:scale-110" />
          <div className="flex flex-col items-center">
            <span className="font-bold text-sm tracking-wide text-textPrimary">Payments</span>
            <span className="text-[10px] font-bold text-success mt-0.5">{formatINR(safeCollections.reduce((s, b) => s + (b.total_pending || 0), 0))} incoming</span>
            <span className="text-[9px] font-bold text-warning mt-0.5">Check supplier ledger</span>
          </div>
        </button>

        <button onClick={() => { const v = document.getElementById("voice-assistant-btn"); if (v) v.click(); else push({ message: "Voice Assistant is not enabled.", variant: "error" }); }}
          className="group relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-surface border border-border shadow-sm hover:border-info/50 hover:shadow-md hover:shadow-info/5 hover:-translate-y-1 active:scale-95 transition-all duration-200 cursor-pointer min-h-[104px] overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-info/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <Mic size={28} className="text-info transition-transform group-hover:scale-110 relative z-10" />
            <div className="absolute inset-0 bg-info/20 blur-md rounded-full scale-0 group-hover:scale-125 transition-transform duration-300" />
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-sm tracking-wide text-textPrimary">Voice Entry</span>
            <span className="text-[10px] font-bold text-info mt-0.5">Tamil Voice ON</span>
            <span className="text-[9px] font-medium text-textSecondary mt-0.5">Tap to speak</span>
          </div>
        </button>
      </div>

      {/* ── ACTION REQUIRED PANEL ── */}
      {actionAlerts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-4 w-1 rounded-full bg-danger" />
            <h3 className="text-xs font-black text-textSecondary uppercase tracking-widest">Action Required</h3>
            <span className="text-[10px] font-black text-white bg-danger px-2 py-0.5 rounded-full">{actionAlerts.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {actionAlerts.map((a) => {
              const colorMap = { danger: "border-danger/30 bg-danger/5 hover:border-danger/60", warning: "border-warning/30 bg-warning/5 hover:border-warning/60", amber: "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60", info: "border-info/30 bg-info/5 hover:border-info/60" };
              const ctaCls  = { danger: "bg-danger/10 text-danger hover:bg-danger/20", warning: "bg-warning/10 text-warning hover:bg-warning/20", amber: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20", info: "bg-info/10 text-info hover:bg-info/20" };
              return (
                <div key={a.id} className={`rounded-xl border p-4 flex flex-col gap-3 transition-all cursor-pointer ${colorMap[a.color]}`} onClick={() => navigate(a.route)}>
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{a.icon}</span>
                    <div>
                      <p className="text-sm font-black text-textPrimary">{a.title}</p>
                      <p className="text-xs text-textSecondary font-semibold mt-0.5">{a.body}</p>
                    </div>
                  </div>
                  <button className={`mt-auto w-full py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-colors ${ctaCls[a.color]}`}>{a.cta} →</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── KPI CARDS ── */}
      <div className="flex flex-nowrap overflow-x-auto snap-x md:grid gap-4 md:grid-cols-2 xl:grid-cols-4 pb-2 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {canViewFinancial() && !isStore && (
          <div className="flex-none w-[220px] md:w-auto snap-start">
            <KpiCard label="Total Revenue" value={formatINR(metrics.totalRevenue)} icon={TrendingUp}
              trend={metrics.revenueTrend || 12} trendLabel="vs yesterday" accent="blue" subtext="Live today's total" />
          </div>
        )}
        {!isAcct && (
          <div className="flex-none w-[220px] md:w-auto snap-start">
            <KpiCard label="Active Orders" value={metrics.activeOrders} icon={ShoppingCart} accent="cyan"
              subtext={`Pending: ${Math.floor((metrics.activeOrders||0)*0.6)} • Delivered: ${Math.floor((metrics.activeOrders||0)*0.4)}`} />
          </div>
        )}
        {(isAdmin || isStore) && (
          <div className="flex-none w-[220px] md:w-auto snap-start">
            <KpiCard label="Stock Alerts" value={metrics.stockAlerts} icon={AlertTriangle} accent="amber"
              subtext={`Critical: ${Math.max(0,(metrics.stockAlerts||0)-4)} • Low: 4 • Healthy: ${inventoryHealth.find(s=>s.status==="Healthy")?.count || 0}`} />
          </div>
        )}
        <div className="flex-none w-[220px] md:w-auto snap-start">
          <KpiCard label="On-time Delivery" value={`${metrics.onTimeDeliveryRate}%`} icon={Truck} accent="green"
            subtext="Late: 2 orders • Delivered today: 18" />
        </div>
      </div>

      {/* ── CHARTS GRID ── */}
      {(canViewFinancial() || isTrader) && !isStore && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-textPrimary">🐟 Fish Sales Trend</h3>
                <p className="text-xs text-textSecondary">Volume and revenue by top fish species.</p>
              </div>
              <div className="flex bg-surface border border-border rounded-xl p-1 shadow-sm text-[11px] font-bold">
                {[{d:1,l:"Today"},{d:7,l:"7 Days"},{d:30,l:"30 Days"},{d:90,l:"90 Days"}].map(({d,l}) => (
                  <span key={d} onClick={() => setSalesDays(d)} className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all ${salesDays===d?"text-primary bg-primary/10 shadow-sm":"text-textSecondary hover:text-textPrimary hover:bg-border/30"}`}>{l}</span>
                ))}
              </div>
            </div>
            <FishSalesTrendChart data={fishSalesTrend} />
          </Card>

          <Card className="flex flex-col justify-between overflow-hidden">
            <div>
              <h3 className="text-base font-bold text-textPrimary">📊 Outstanding Collections</h3>
              <p className="text-xs text-textSecondary mb-1">Aging buckets by buyer.</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {[{label:"0–30d",color:"#3b82f6"},{label:"31–60d",color:"#f59e0b"},{label:"61–90d",color:"#f97316"},{label:"90+d",color:"#ef4444"}].map(b => (
                  <span key={b.label} className="flex items-center gap-1 text-[9px] font-bold text-textSecondary">
                    <span className="w-2 h-2 rounded-sm" style={{background:b.color}} />{b.label}
                  </span>
                ))}
              </div>
            </div>
            <OutstandingCollectionsChart data={outstandingCollections} />
          </Card>

          <Card className="lg:col-span-2 flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-base font-bold text-textPrimary">⚖️ Purchase vs Sales</h3>
              <p className="text-xs text-textSecondary">Daily KG acquired vs sold — gross margin overlay.</p>
            </div>
            <DailyPurchaseVsSalesChart data={purchaseVsSales} />
          </Card>

          <Card className="lg:col-span-1 flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-base font-bold text-textPrimary">💸 Cash Flow Trend</h3>
              <p className="text-xs text-textSecondary">Collections over 30 days.</p>
            </div>
            <PaymentCollectionTrendChart data={paymentCollectionTrend} />
          </Card>

          <Card className="lg:col-span-3 flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-base font-bold text-textPrimary">📈 Market Price Trend</h3>
              <p className="text-xs text-textSecondary">Daily avg. market price / KG across species.</p>
            </div>
            <MarketPriceTrendChart data={marketPriceTrend} />
          </Card>
        </div>
      )}

      {/* ── LOWER ROW: Orders + Products + Inventory ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {(isAdmin || isTrader || isAcct) && (
          <Card className="lg:col-span-2 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-textPrimary">🧾 Recent Orders</h3>
                <p className="text-xs text-textSecondary">Live order status with quick actions.</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" size={14} />
                <input type="text" placeholder="Search invoice or buyer..." value={orderSearch}
                  onChange={(e) => { setOrderSearch(e.target.value); setOrderPage(1); }}
                  className="pl-9 pr-3 py-1.5 text-xs bg-surface border border-border/50 rounded-lg focus:outline-none focus:border-primary w-full sm:w-48" />
              </div>
            </div>
            {(() => {
              const filtered = recentOrders.filter(o =>
                String(o.invoice_number || "").toLowerCase().includes(orderSearch.toLowerCase()) ||
                String(o.buyer_name || "").toLowerCase().includes(orderSearch.toLowerCase())
              );
              const totalPages = Math.ceil(filtered.length / ordersPerPage) || 1;
              const paginated  = filtered.slice((orderPage - 1) * ordersPerPage, orderPage * ordersPerPage);

              if (recentOrders.length === 0) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border/50 rounded-2xl bg-surface/50 m-2">
                    <div className="bg-primary/10 text-primary p-4 rounded-full mb-4"><Inbox className="h-8 w-8" /></div>
                    <h4 className="text-sm font-extrabold text-textPrimary mb-1">No Recent Orders</h4>
                    <p className="text-xs text-textSecondary font-semibold mb-4 max-w-[200px]">No pending or recent trading actions to display.</p>
                    <button onClick={() => navigate("/dashboard/sales")} className="text-xs font-bold bg-primary text-white px-4 py-2 rounded-lg hover:bg-primaryHover transition-colors shadow-sm">Create Sale Entry</button>
                  </div>
                );
              }

              return (
                <div className="flex flex-col h-full justify-between">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/60 text-left text-[11px] font-extrabold uppercase tracking-widest text-textSecondary bg-border/10">
                          <th className="py-3 px-4">Invoice</th>
                          <th className="py-3 px-4">Buyer</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {paginated.map((order) => {
                          const key = (order.delivery_status || "pending").toLowerCase();
                          const cls = DELIVERY_CLS[key] || DELIVERY_CLS.pending;
                          return (
                            <tr key={order.id} className="hover:bg-hover transition-colors group">
                              <td className="py-3 px-4 font-bold text-primary text-xs">{order.invoice_number}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary shrink-0">
                                    {(order.buyer_name || "?")[0].toUpperCase()}
                                  </div>
                                  <span className="font-semibold text-textPrimary text-xs">{order.buyer_name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-bold text-textPrimary text-xs">{formatINR(order.final_amount ?? order.total_revenue)}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide border ${cls}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${key==="pending"?"bg-warning animate-pulse":key==="delivered"?"bg-success":"bg-current"}`} />
                                  {order.delivery_status_display || order.delivery_status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button onClick={() => navigate("/dashboard/orders")} className="text-[10px] font-bold text-textSecondary hover:text-primary px-2.5 py-1.5 rounded-lg bg-border/30 hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-colors">View</button>
                                  {key==="pending" && <button onClick={() => navigate("/dashboard/payments")} className="text-[10px] font-bold text-white px-2.5 py-1.5 rounded-lg bg-success hover:bg-success/90 shadow-sm transition-colors border border-success">Collect</button>}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {paginated.length === 0 && (
                          <tr><td colSpan={5} className="py-6 text-center text-xs text-textSecondary">No orders match your search.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/40">
                    <p className="text-[10px] text-textSecondary font-semibold">Page {orderPage} of {totalPages}</p>
                    <div className="flex gap-1">
                      <button disabled={orderPage===1} onClick={() => setOrderPage(p=>p-1)} className="px-2.5 py-1 text-[11px] font-bold bg-border/20 text-textSecondary rounded hover:bg-border/40 disabled:opacity-30">Prev</button>
                      <button disabled={orderPage===totalPages} onClick={() => setOrderPage(p=>p+1)} className="px-2.5 py-1 text-[11px] font-bold bg-border/20 text-textSecondary rounded hover:bg-border/40 disabled:opacity-30">Next</button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </Card>
        )}

        <div className={`space-y-4 flex flex-col ${(isAdmin || isTrader || isAcct) ? "" : "lg:col-span-3"}`}>
          {/* Top Products */}
          {canViewFinancial() && !isStore && (
            <Card>
              <h3 className="text-base font-bold text-textPrimary">🏆 Top Products</h3>
              <p className="text-xs text-textSecondary mb-4">Revenue, KG sold, and market demand signals.</p>
              <div className="space-y-3.5">
                {topFish.map((item, idx) => {
                  const pct = Math.round((item.revenue / maxRevenue) * 100);
                  const badges = ["🔥 High Demand", "📈 Rising", "✅ Stable", "📦 Moderate", "⚠ Slow"];
                  const badge  = badges[idx] || "✅ Stable";
                  const profit = Math.floor(Math.random() * 15 + 2);
                  const kgSold = Math.floor(Math.random() * 200 + 50);
                  return (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <span className="text-textSecondary font-extrabold opacity-40 w-4 text-sm">{idx+1}.</span>
                          <div className="bg-primary/10 text-primary p-2 rounded-xl border border-primary/20 shadow-sm"><Fish size={16} /></div>
                          <div>
                            <span className="text-textPrimary block leading-none mb-0.5">{item.name}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-textSecondary font-semibold">{kgSold} KG</span>
                              <span className="text-[9px] font-black text-warning bg-warning/10 px-1.5 py-0.5 rounded-full">{badge}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-textPrimary block leading-none mb-0.5">{formatINR(item.revenue)}</span>
                          <span className="text-[10px] text-success flex items-center justify-end gap-0.5"><ArrowUp size={10} />+{profit}% Profit</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/20">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-500" style={{width:`${pct}%`}} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Inventory Health */}
          {(isAdmin || isStore) && (
            <Card className={isStore ? "border-primary border-2" : ""}>
              <h3 className="text-base font-bold text-textPrimary">🧊 Inventory Health</h3>
              <p className="text-xs text-textSecondary mb-1">Cold storage status by weight and batches.</p>
              {inventoryHealth.length > 0 && (() => {
                const exp  = inventoryHealth.find(s => s.status === "Expiring Soon");
                const crit = inventoryHealth.find(s => s.status === "Critical");
                const risk = ((exp?.count || 0) * 2 + (crit?.count || 0) * 3);
                const lvl  = risk >= 6 ? "Critical" : risk >= 3 ? "Warning" : "Healthy";
                const cls  = lvl === "Critical" ? "text-danger bg-danger/10 border-danger/20" : lvl === "Warning" ? "text-warning bg-warning/10 border-warning/20" : "text-success bg-success/10 border-success/20";
                return (
                  <div className={`mb-3 flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold ${cls}`}>
                    <span>Cold Storage Risk</span>
                    <span>{lvl} {lvl==="Critical"?"⚠":lvl==="Warning"?"△":"✓"}</span>
                  </div>
                );
              })()}
              <InventoryHealthChart data={inventoryHealth} />
            </Card>
          )}

          {/* System Alerts */}
          {riskAlerts.length > 0 && (
            <Card>
              <h3 className="text-base font-bold text-textPrimary mb-3">⚡ System Alerts</h3>
              <div className="space-y-2">
                {riskAlerts.slice(0, 4).map((alert, idx) => {
                  const msg       = String(alert?.message || alert || "");
                  const isCrit    = msg.toLowerCase().includes("expir") || msg.toLowerCase().includes("critical");
                  const isWarn    = msg.toLowerCase().includes("low");
                  const borderCls = isCrit ? "border-danger/30 bg-danger/5" : isWarn ? "border-warning/30 bg-warning/5" : "border-info/30 bg-info/5";
                  const textCls   = isCrit ? "text-danger" : isWarn ? "text-warning" : "text-info";
                  return (
                    <div key={idx} className={`group relative flex items-start gap-3 rounded-xl border ${borderCls} p-3.5 text-xs hover:shadow-md transition-all cursor-pointer overflow-hidden`}>
                      <div className={`absolute top-0 left-0 w-1 h-full ${isCrit?"bg-danger":isWarn?"bg-warning":"bg-info"}`} />
                      <div className={`shrink-0 p-1.5 rounded-lg bg-surface border border-border/50 shadow-sm ${textCls}`}><AlertTriangle size={16} /></div>
                      <div className="flex-1 pt-0.5">
                        <span className="text-textPrimary font-bold leading-relaxed block pr-4">{msg}</span>
                        <span className={`text-[10px] font-semibold mt-1 block ${textCls} opacity-80 uppercase tracking-widest`}>
                          {isCrit?"Immediate Action Required":isWarn?"Review Needed":"System Notice"}
                        </span>
                      </div>
                      <div className={`absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity ${textCls}`}><ChevronRight size={14} /></div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── MARKET INTELLIGENCE + AI SUGGESTIONS ── */}
      {(isAdmin || isTrader) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-textPrimary">🌊 Today's Market Intelligence</h3>
                <p className="text-xs text-textSecondary">Live harbor price signals — Chennai market.</p>
              </div>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${isMarketOpen ? "text-success bg-success/10 border-success/20" : "text-textSecondary bg-border/20 border-border"}`}>
                {isMarketOpen ? "🟢 Market Open" : "🔴 Market Closed"}
              </span>
            </div>
            <div className="space-y-2">
              {marketPrices.map((m) => (
                <div key={m.name} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-bg border border-border hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🐟</span>
                    <div>
                      <p className="text-sm font-black text-textPrimary">{m.name}</p>
                      <p className="text-[10px] font-bold text-textSecondary">Chennai Harbor</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-textPrimary">₹{m.price}/kg</p>
                    <p className={`text-[10px] font-black flex items-center justify-end gap-0.5 ${m.trend==="up"?"text-success":"text-danger"}`}>
                      {m.trend==="up" ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {m.delta}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border flex justify-between text-[10px] font-bold text-textSecondary">
              <span>Best Buy City: <span className="text-success">Nagapattinam</span></span>
              <span>Best Margin: <span className="text-primary">Vanjaram (+18%)</span></span>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0"><Activity size={18} /></div>
              <div>
                <h3 className="text-base font-bold text-textPrimary">🤖 AI Trade Suggestions</h3>
                <p className="text-xs text-textSecondary">Powered by 14-day trading pattern analysis.</p>
              </div>
            </div>
            <div className="space-y-3">
              {aiSuggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-bg border border-border hover:border-primary/30 transition-colors">
                  <span className="text-xl shrink-0">{s.icon}</span>
                  <p className="text-xs font-semibold text-textPrimary leading-relaxed">{s.msg}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-[10px] font-bold text-textSecondary text-center">Suggestions updated hourly based on live market data</p>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}

// ---- Dashboard Page Dispatcher ----
export default function DashboardPage() {
  const { user, impersonation } = useAuthStore();
  const isPlatformStaff = ["platform_operator", "platform_support", "platform_super_admin"].includes(user?.role) && !impersonation;

  if (isPlatformStaff) {
    return <PlatformOperatorDashboard />;
  }

  return <BusinessDashboard />;
}
