import React from "react";

export function StockBar({ remaining, initial, weightKg }) {
  const pct = initial ? Math.min(100, Math.round((remaining / initial) * 100)) : 0;
  const color = pct < 10 ? "bg-danger" : pct < 30 ? "bg-warning" : "bg-success";
  const textColor = pct < 10 ? "text-danger" : pct < 30 ? "text-warning" : "text-success";
  return (
    <div className="min-w-[140px]">
      <div className="flex items-center justify-between text-xs font-bold mb-1.5">
        <span className="text-textPrimary">{remaining} / {initial} pkg</span>
        <span className={`font-black ${textColor}`}>{pct}%</span>
      </div>
      <div className="h-2 w-full bg-border/60 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-700 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] font-bold text-textSecondary uppercase mt-1.5 tracking-wide">{weightKg} KG remaining</p>
    </div>
  );
}

/* ─────────────────────── MAIN PAGE ─────────────────────── */

