import React from "react";
import clsx from "clsx";

const STATUS_STYLES = {
  success: "bg-success/10 text-success border border-success/20",
  pending: "bg-warning/10 text-warning border border-warning/20",
  danger: "bg-danger/10 text-danger border border-danger/20",
  info: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
  primary: "bg-primary/10 text-primary border border-primary/20",
  default: "bg-surfaceHover text-textSecondary border border-border",
};

export default function Badge({ status = "default", children, className = "", ...props }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.default;
  return (
    <span
      className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider select-none", style, className)}
      aria-label={typeof children === "string" ? children : status}
      {...props}
    >
      {children || status}
    </span>
  );
}
