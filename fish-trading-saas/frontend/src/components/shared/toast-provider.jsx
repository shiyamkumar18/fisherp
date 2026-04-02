import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProviderRoot,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((toast) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, variant: "default", ...toast }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastProviderRoot duration={3000} swipeDirection="right">
      <ToastContext.Provider value={value}>
        {children}
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            open
            variant={toast.variant}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                setToasts((prev) => prev.filter((item) => item.id !== toast.id));
              }
            }}
          >
            <div className="grid gap-1">
              {toast.title ? <ToastTitle>{toast.title}</ToastTitle> : null}
              <ToastDescription>{toast.message}</ToastDescription>
            </div>
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport className="fixed right-4 top-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
      </ToastContext.Provider>
    </ToastProviderRoot>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
