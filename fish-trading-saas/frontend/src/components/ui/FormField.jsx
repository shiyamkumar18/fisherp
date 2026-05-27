import React from "react";

export default function FormField({ label, error, children }) {
  return (
    <div className="mb-4">
      {label && <label className="block mb-1 font-medium text-gray-700">{label}</label>}
      {children}
      {error && <div className="mt-1 text-sm text-red-600">{error}</div>}
    </div>
  );
}