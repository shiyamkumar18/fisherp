import React from "react";
import { AlertTriangle } from "lucide-react";

export default function ErrorState({ message = "Something went wrong", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-red-500">
      <AlertTriangle size={36} className="mb-2" />
      <div>{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded bg-red-100 text-red-700 hover:bg-red-200 transition"
        >
          Retry
        </button>
      )}
    </div>
  );
}
