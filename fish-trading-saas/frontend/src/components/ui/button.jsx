import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primaryHover shadow-sm shadow-primary/20",
        secondary: "bg-secondary text-white hover:opacity-90",
        outline: "border border-border bg-transparent text-textPrimary hover:bg-surface/50",
        ghost: "text-textSecondary hover:text-textPrimary hover:bg-border/30",
        danger: "bg-danger text-white hover:bg-danger/90 shadow-sm shadow-danger/20",
        success: "bg-success text-white hover:bg-success/90 shadow-sm shadow-success/20",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export function Button({ className, variant, size, asChild = false, ...props }) {
  if (asChild && props.children) {
    const child = React.Children.only(props.children);
    return React.cloneElement(child, {
      className: cn(buttonVariants({ variant, size }), className, child.props.className),
      ...props,
      children: child.props.children
    });
  }
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
