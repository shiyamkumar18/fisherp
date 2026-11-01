import React, { useEffect } from "react";

export default function Toast({ open, message, type = "success", onClose, duration = 3000 }) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => onClose && onClose(), duration);
    return () => clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open) return null;
  return (
    <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded shadow-lg text-white ${type === "success" ? "bg-green-600" : type === "error" ? "bg-red-600" : "bg-blue-600"}`}>
      {message}
      <button className="ml-3 text-white/80 hover:text-white" onClick={onClose}>&times;</button>
    </div>
  );
}
