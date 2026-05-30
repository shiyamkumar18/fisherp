import React from "react";

export default function Card({ children, className = "", hoverEffect = true, ...props }) {
  const hoverClasses = hoverEffect ? "hover:shadow-md transition-all duration-200 hover:scale-[1.02]" : "";
  return (
    <div className={`bg-surface border rounded-xl shadow-sm p-5 ${hoverClasses} ${className}`} {...props}>
      {children}
    </div>
  );
}
