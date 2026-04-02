import { cva } from "class-variance-authority";
import { cn } from "@/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-blue-700",
        secondary: "bg-secondary text-white hover:bg-cyan-600",
        outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
        ghost: "text-slate-700 hover:bg-slate-100",
        danger: "bg-red-600 text-white hover:bg-red-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export function Button({ className, variant, ...props }) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />;
}
