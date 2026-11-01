import React from "react";
import clsx from "clsx";

export default function Input({ className = "", ...props }) {
  return (
    <input
      className={clsx(
        "flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-textPrimary placeholder:text-textSecondary/50",
        "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20",
        "disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
        className
      )}
      {...props}
    />
  );
}
