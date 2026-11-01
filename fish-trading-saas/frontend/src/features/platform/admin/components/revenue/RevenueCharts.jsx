import React, { useState } from 'react';
import { TrendingUp, CreditCard, PieChart, Globe, Download, BarChart2 } from 'lucide-react';
import clsx from 'clsx';

export function RevenueCharts({ charts = {}, mrr = 100000 }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [chartMode, setChartMode] = useState('mrr'); // 'mrr', 'success', 'plan'

  const mrrData = charts.mrr_growth || [];
  const successData = charts.payment_success || [];
  const planData = charts.revenue_by_tier || [];

  const handleChartExport = (chartName) => {
    alert(`Exporting ${chartName} chart data as CSV...`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* MRR Growth Trend Line Chart */}
      <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col justify-between min-h-[340px]">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <BarChart2 size={13} className="text-indigo-400" /> MRR Growth Trend
            </h3>
            <span className="text-[10px] text-slate-500">6-Month growth pattern & projections</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-xs font-mono font-bold">+12.4% YTD</span>
            <button 
              type="button" 
              onClick={() => handleChartExport('MRR Growth')}
              className="p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-white/5"
            >
              <Download size={13} />
            </button>
          </div>
        </div>

        {/* Custom SVG Line Chart with Tooltip */}
        <div className="flex-1 flex items-end justify-between gap-2.5 pt-6 pb-2 px-2 relative min-h-[200px]">
          {mrrData.map((d, idx) => {
            const maxMrr = Math.max(...mrrData.map(item => item.mrr)) || 10000;
            const pct = (d.mrr / maxMrr) * 100;
            const isHovered = hoveredIdx === idx;
            return (
              <div 
                key={idx} 
                className="flex-1 flex flex-col justify-end items-center relative group cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full mb-2 bg-[#12141a] border border-indigo-500/30 p-2 rounded-lg shadow-xl text-center min-w-[90px] z-10 animate-fade-in">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">{d.name}</p>
                    <p className="text-xs font-black text-indigo-400 mt-0.5">₹{Math.round(d.mrr).toLocaleString()}</p>
                  </div>
                )}
                
                {/* Interactive bar */}
                <div 
                  className={clsx(
                    "w-full rounded-t-md transition-all duration-300 relative border-t",
                    isHovered 
                      ? "bg-indigo-500/80 border-indigo-400" 
                      : "bg-indigo-500/30 hover:bg-indigo-500/50 border-indigo-500/20"
                  )}
                  style={{ height: `${Math.max(10, pct)}%` }}
                />
                
                <span className="text-[9px] text-slate-500 font-mono mt-2">{d.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Success Rate Doughnut */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col min-h-[340px] justify-between">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <CreditCard size={13} className="text-indigo-400" /> Payment Success Rate
            </h3>
            <span className="text-[10px] text-slate-500">Gateway success vs decline metrics</span>
          </div>
          <button 
            type="button" 
            onClick={() => handleChartExport('Payment Success')}
            className="p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-white/5"
          >
            <Download size={13} />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center py-6 relative">
          {/* Custom concentric circular metric */}
          <div className="w-36 h-36 rounded-full border-[10px] border-emerald-500 border-r-rose-500/30 flex items-center justify-center rotate-45 shadow-[0_0_25px_rgba(16,185,129,0.05)] relative">
            <div className="-rotate-45 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-white">96.8%</span>
              <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">Approval Ratio</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 text-[10px] border-t border-white/5 pt-3">
          <span className="flex items-center gap-1 text-slate-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500" /> Success (32)
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <div className="w-2 h-2 rounded-full bg-rose-500" /> Failed (1)
          </span>
        </div>
      </div>

      {/* Revenue by Plan stacked chart */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col min-h-[340px] justify-between">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <PieChart size={13} className="text-indigo-400" /> Revenue by Plan
            </h3>
            <span className="text-[10px] text-slate-500">Revenue allocations by plan tier</span>
          </div>
          <button 
            type="button" 
            onClick={() => handleChartExport('Plan Revenue')}
            className="p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-white/5"
          >
            <Download size={13} />
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-3">
          {planData.map((p, i) => {
            const totalRevenue = planData.reduce((acc, curr) => acc + (curr.revenue || 0), 0) || 1;
            const pct = ((p.revenue || 0) / totalRevenue) * 100;
            return (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="font-bold text-slate-300 capitalize">{p.tier__name}</span>
                  <span className="font-mono text-slate-400">{pct.toFixed(1)}% (₹{Math.round(p.revenue).toLocaleString()})</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className={clsx(
                      "h-full rounded-full transition-all duration-500",
                      p.tier__name === 'free' ? "bg-slate-500" :
                      p.tier__name === 'starter' ? "bg-blue-500" :
                      p.tier__name === 'growth' ? "bg-indigo-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue by Geography Map Mockup */}
      <div className="lg:col-span-3 bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col min-h-[220px] justify-between">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Globe size={13} className="text-indigo-400" /> Geographic Allocation
            </h3>
            <span className="text-[10px] text-slate-500">Revenue contribution per territory</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { region: 'Tamil Nadu', percentage: '62.4%', value: '₹4,82,000' },
            { region: 'Kerala', percentage: '18.2%', value: '₹1,40,000' },
            { region: 'Karnataka', percentage: '12.3%', value: '₹95,000' },
            { region: 'Andhra Pradesh', percentage: '7.1%', value: '₹55,000' }
          ].map((geo, idx) => (
            <div key={idx} className="bg-black/20 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
              <p className="text-xs font-bold text-slate-300">{geo.region}</p>
              <p className="text-lg font-black text-indigo-400 mt-1">{geo.percentage}</p>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5">{geo.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
