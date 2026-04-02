import { cn } from "@/utils/cn";

export function Card({ className, ...props }) {
  return <section className={cn("surface-card p-4 md:p-6", className)} {...props} />;
}
