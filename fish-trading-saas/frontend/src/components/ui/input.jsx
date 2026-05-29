import React from "react";

export default function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full border p-2 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
