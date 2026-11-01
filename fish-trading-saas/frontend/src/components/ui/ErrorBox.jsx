import React from "react";
import { AlertTriangle } from "lucide-react";

export default function ErrorBox({ message }) {
  return (
    <div className="bg-red-100 text-red-600 p-3 rounded flex items-center gap-2">
      <AlertTriangle size={20} />
      <span>{message}</span>
    </div>
  );
}
