import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

export const ToastProviderRoot = ToastPrimitive.Provider;
export const ToastViewport = ToastPrimitive.Viewport;

export function Toast({ className, variant = "default", ...props }) {
  return (
    <ToastPrimitive.Root
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl border px-4 py-3 shadow-md transition-all data-[state=open]:animate-in data-[state=closed]:animate-out",
        variant === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-slate-200 bg-white text-slate-800",
        className
      )}
      {...props}
    />
  );
}

export function ToastTitle({ className, ...props }) {
  return <ToastPrimitive.Title className={cn("text-sm font-semibold", className)} {...props} />;
}

export function ToastDescription({ className, ...props }) {
  return <ToastPrimitive.Description className={cn("text-sm", className)} {...props} />;
}

export function ToastClose({ className, ...props }) {
  return (
    <ToastPrimitive.Close
      className={cn("rounded-md p-1 text-current/70 transition hover:bg-slate-100 hover:text-current", className)}
      {...props}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </ToastPrimitive.Close>
  );
}
