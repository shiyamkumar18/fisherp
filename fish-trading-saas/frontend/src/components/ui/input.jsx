import { forwardRef } from "react";
import { cn } from "@/utils/cn";

export const Input = forwardRef(function Input({ className, type = "text", ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-10 w-full rounded-xl border border-border bg-surface px-4 text-sm text-textPrimary outline-none transition duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-border/30 disabled:text-textSecondary",
        className
      )}
      {...props}
    />
  );
});
