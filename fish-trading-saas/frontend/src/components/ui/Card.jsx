import React from "react";

export default function Card({ children, className = "", ...props }) {
  return (
    <div className={`bg-surface border rounded-xl shadow-sm p-5 hover:shadow-md transition-all duration-200 hover:scale-[1.02] ${className}`} {...props}>
      {children}
    </div>
  );
}
