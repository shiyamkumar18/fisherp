import { cn } from "@/utils/cn";

export function Card({ className, ...props }) {
  return <section className={cn("surface-card p-4 md:p-6", className)} {...props} />;
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("mb-4 space-y-1.5", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn("text-lg font-bold text-slate-900", className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn("text-sm text-slate-600", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("space-y-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return <div className={cn("mt-6 flex items-center justify-end gap-2", className)} {...props} />;
}
