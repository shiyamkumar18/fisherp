import React from "react";
import Loader from "./Loader";
import clsx from "clsx";

const variants = {
  primary: "bg-primary text-white hover:bg-primaryHover border border-transparent shadow-sm",
  secondary: "bg-hover text-textPrimary hover:bg-border border border-transparent shadow-sm",
  outline: "bg-transparent text-textPrimary border border-border hover:bg-hover shadow-sm",
  ghost: "bg-transparent text-textPrimary hover:bg-hover border border-transparent",
  danger: "bg-danger text-white hover:bg-danger/90 border border-transparent shadow-sm",
  success: "bg-success text-white hover:bg-success/90 border border-transparent shadow-sm",
};

const sizes = {
  sm: "h-9 px-3 text-xs",
  md: "h-10 px-4 py-2 text-sm",
  lg: "h-12 px-8 text-base",
  icon: "h-10 w-10",
  iconSm: "h-8 w-8 p-0 shrink-0",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  className = "",
  disabled,
  ...props
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-bold transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
        "disabled:pointer-events-none disabled:opacity-50 disabled:translate-y-0 disabled:scale-100",
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        fullWidth && "w-full",
        className
      )}
      disabled={loading || disabled}
      aria-busy={loading}
      {...props}
    >
      {loading && <Loader className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
}
