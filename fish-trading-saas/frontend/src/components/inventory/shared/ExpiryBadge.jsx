import React from "react";
import { EXPIRY_LOGIC } from "./constants";

export function ExpiryBadge({ expiryDate }) {
  const days  = EXPIRY_LOGIC.getDaysLeft(expiryDate);
  const state = EXPIRY_LOGIC.getState(days);
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border
      ${state === "healthy"  ? "bg-success/10 border-success/20"
      : state === "warning"  ? "bg-warning/10 border-warning/20"
      : state === "expired" || state === "critical" ? "bg-danger/10 border-danger/20"
      : "bg-border/40 border-border"}
    `}>
      <div className={`w-1.5 h-1.5 rounded-full ${
        state === "healthy"  ? "bg-success" :
        state === "warning"  ? "bg-warning" :
        state === "expired" || state === "critical" ? "bg-danger" : "bg-textSecondary"}`} />
      <span className={`text-xs font-bold ${EXPIRY_LOGIC.getColor(state)}`}>
        {EXPIRY_LOGIC.getLabel(days, state)}
      </span>
    </div>
  );
}

