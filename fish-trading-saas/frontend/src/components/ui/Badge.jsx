import React from "react";

const STATUS_STYLES = {
  success: "bg-green-100 text-green-600 border border-green-200",
  pending: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  danger: "bg-red-100 text-red-600 border border-red-200",
  info: "bg-blue-100 text-blue-600 border border-blue-200",
  default: "bg-gray-100 text-gray-700 border border-gray-200",
};

export default function Badge({ status = "default", children, className = "", ...props }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.default;
  return (
    <span
      className={`inline-block px-2 py-1 text-xs rounded-md font-medium select-none ${style} ${className}`}
      aria-label={typeof children === "string" ? children : status}
      {...props}
    >
      {children || status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
