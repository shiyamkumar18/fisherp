import React from "react";
import clsx from "clsx";

export default function Card({ children, className = "", hoverEffect = true, ...props }) {
  const hoverClasses = hoverEffect 
    ? "hover:bg-elevated hover:-translate-y-[1px] hover:shadow-md transition-all duration-300" 
    : "transition-all duration-300";
  return (
    <div className={clsx("bg-card border border-border rounded-xl shadow-sm p-6", hoverClasses, className)} {...props}>
      {children}
    </div>
  );
}
