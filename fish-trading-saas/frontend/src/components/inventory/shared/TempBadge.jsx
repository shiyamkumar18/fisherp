import React from "react";
import { ThermometerSnowflake } from "lucide-react";
import { TEMP_LOGIC } from "./constants";

export function TempBadge({ temp, size = "sm" }) {
  const state = TEMP_LOGIC.getTempState(temp);
  const isWarning = state !== "optimal";
  return (
    <div className={`inline-flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border
      ${state === "optimal" ? "bg-success/10 border-success/20"
      : state === "warning"  ? "bg-warning/10 border-warning/20"
      : "bg-danger/10 border-danger/20"}
      ${isWarning && state === "critical" ? "animate-pulse" : ""}
    `}>
      <div className={`flex items-center gap-1.5 font-black ${size === "lg" ? "text-base" : "text-sm"} ${TEMP_LOGIC.getColor(state)}`}>
        <ThermometerSnowflake size={size === "lg" ? 16 : 13} />
        {temp?.toFixed(1)}°C
      </div>
      <span className={`text-[9px] font-black uppercase mt-0.5 ${TEMP_LOGIC.getColor(state)} opacity-80`}>
        {TEMP_LOGIC.getLabel(state)}
      </span>
    </div>
  );
}

