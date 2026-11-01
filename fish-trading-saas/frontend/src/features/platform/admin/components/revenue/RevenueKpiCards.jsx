import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Activity, Users, ShieldAlert, ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';

export function RevenueKpiCards({ kpis = {}, onCardAction }) {
  const formatCur = (v) => v ? `₹${Math.round(v).toLocaleString()}` : '₹0';

  const cardList = [
    {
      id: 'mrr',
      title: 'Current MRR',
      value: formatCur(kpis.mrr),
      trend: '+5.2% MoM',
      icon: DollarSign,
      color: 'emerald',
      subtext: 'Monthly Recurring Revenue',
      actions: [
        { id: 'breakdown', label: 'View Breakdown' },
        { id: 'report', label: 'Open Report' }
      ],
      sparkline: [35, 40, 38, 45, 48, 52]
    },
    {
      id: 'arr',
      title: 'ARR Projection',
      value: formatCur(kpis.arr),
      trend: '94% Confidence',
      icon: TrendingUp,
      color: 'indigo',
      subtext: 'Annualized Revenue Run-rate',
      actions: [
        { id: 'forecast', label: 'Forecast Details' },
        { id: 'compare', label: 'Compare Quarter' }
      ],
      sparkline: [40, 42, 45, 44, 48, 50]
    },
    {
      id: 'net_revenue',
      title: 'Net Revenue',
      value: formatCur(kpis.net_revenue),
      trend: '-1.2% Refunds',
      icon: Activity,
      color: 'purple',
      subtext: 'Net billing after deductions',
      actions: [
        { id: 'ledger', label: 'View Ledger' }
      ],
      sparkline: [30, 32, 28, 35, 34, 38]
    },
    {
      id: 'failed_payments',
      title: 'Failed Payments',
      value: kpis.failed_payments || '0',
      trend: '84% Recovery %',
      icon: CreditCard,
      color: 'rose',
      alert: kpis.failed_payments > 0,
      subtext: 'Outstanding retry collections',
      actions: [
        { id: 'retry_all', label: 'Retry Failed' },
        { id: 'queue', label: 'Open Queue' }
      ],
      sparkline: [12, 18, 15, 8, 4, 2]
    },
    {
      id: 'churn_rate',
      title: 'Churn Rate',
      value: `${kpis.churn_rate || '2.4'}%`,
      trend: '-0.3% MoM',
      icon: TrendingDown,
      color: 'orange',
      subtext: 'Revenue & customer churn',
      actions: [
        { id: 'churn_analysis', label: 'Churn Analysis' }
      ],
      sparkline: [5, 4.8, 4.5, 3.8, 3.2, 2.4]
    },
    {
      id: 'arpu',
      title: 'ARPU',
      value: formatCur(kpis.arpu),
      trend: '+2.8% vs Q1',
      icon: Users,
      color: 'blue',
      subtext: 'Avg Revenue Per User',
      actions: [],
      sparkline: [22, 23, 22, 24, 24, 25]
    },
    {
      id: 'ltv',
      title: 'Lifetime Value (LTV)',
      value: formatCur(kpis.ltv),
      trend: '12.8x Expansion',
      icon: Activity,
      color: 'emerald',
      subtext: 'Projected customer value',
      actions: [],
      sparkline: [60, 62, 65, 68, 70, 72]
    },
    {
      id: 'health_score',
      title: 'Platform Health',
      value: '96/100',
      trend: 'Optimal State',
      icon: ShieldAlert,
      color: 'teal',
      subtext: 'Billing & Renewal stability',
      actions: [
        { id: 'health_report', label: 'Health Report' }
      ],
      sparkline: [90, 92, 91, 94, 95, 96]
    }
  ];

  const colorStyles = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    teal: "text-teal-400 bg-teal-500/10 border-teal-500/20"
  };

  const textColors = {
    emerald: "text-emerald-400", indigo: "text-indigo-400",
    rose: "text-rose-400", purple: "text-purple-400",
    orange: "text-orange-400", blue: "text-blue-400",
    teal: "text-teal-400"
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cardList.map((card) => {
        const Icon = card.icon;
        return (
          <div 
            key={card.id}
            className={clsx(
              "bg-white/[0.02] border rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-white/10 hover:bg-white/[0.03] transition-all min-h-[140px]",
              card.alert ? "border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.05)]" : "border-white/5"
            )}
          >
            {card.alert && (
              <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-bl-full border-b border-l border-rose-500/10 -mr-2 -mt-2"></div>
            )}
            
            <div className="flex items-start justify-between mb-3 z-10">
              <div className="flex items-center gap-2.5">
                <div className={clsx("p-2 rounded-xl flex items-center justify-center border", colorStyles[card.color])}>
                  <Icon size={14} />
                </div>
                <div>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{card.title}</h3>
                  <span className="text-[9px] text-slate-600 block">{card.subtext}</span>
                </div>
              </div>
            </div>

            <div className="flex items-end justify-between mt-1 z-10">
              <div>
                <p className={clsx("text-xl font-black tracking-tight", textColors[card.color])}>{card.value}</p>
                <span className="text-[9px] text-slate-400 font-mono font-medium block mt-0.5">{card.trend}</span>
              </div>

              {/* Sparkline Graphic */}
              <div className="h-6 w-16 flex items-end gap-[2px] opacity-40 group-hover:opacity-75 transition-opacity">
                {card.sparkline.map((h, index) => {
                  const maxVal = Math.max(...card.sparkline);
                  const pct = (h / maxVal) * 100;
                  return (
                    <div 
                      key={index} 
                      className={clsx(
                        "flex-1 rounded-t-sm",
                        card.color === 'emerald' && "bg-emerald-500",
                        card.color === 'indigo' && "bg-indigo-500",
                        card.color === 'purple' && "bg-purple-500",
                        card.color === 'rose' && "bg-rose-500",
                        card.color === 'orange' && "bg-orange-500",
                        card.color === 'blue' && "bg-blue-500",
                        card.color === 'teal' && "bg-teal-500"
                      )} 
                      style={{ height: `${pct}%` }} 
                    />
                  );
                })}
              </div>
            </div>

            {/* Explicit Actions Footer Block */}
            {card.actions && card.actions.length > 0 && (
              <div className="mt-3.5 pt-2.5 border-t border-white/5 flex flex-wrap gap-1.5 z-10 relative">
                {card.actions.map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCardAction?.(act.id, card.id);
                    }}
                    className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/10 transition-colors uppercase tracking-wider"
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
