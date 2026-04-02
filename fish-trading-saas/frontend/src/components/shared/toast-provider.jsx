import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const push = useCallback((toast) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, variant: "default", ...toast }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="fixed right-4 top-4 z-50 space-y-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-2 rounded-xl border px-4 py-3 shadow-md ${
              toast.variant === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-slate-200 bg-white text-slate-800"
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(toast.id)}
              className="ml-2 shrink-0 text-current opacity-60 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
