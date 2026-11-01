import React from "react";
import clsx from "clsx";
import { AlertCircle } from "lucide-react";

export default function FormField({ label, error, children, className = "" }) {
  return (
    <div className={clsx("space-y-1.5", className)}>
      {label && <label className="block text-sm font-semibold text-textSecondary">{label}</label>}
      {children}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-danger mt-1 font-medium">
          <AlertCircle size={12} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}