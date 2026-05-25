import React, { createContext, useContext, useEffect } from "react";
import ReactDOM from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

const DialogContext = createContext({ open: false, onClose: () => {} });

export function Dialog({ open, onOpenChange, children }) {
  const onClose = () => onOpenChange?.(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <DialogContext.Provider value={{ open, onClose }}>
      <AnimatePresence>
        {open && children}
      </AnimatePresence>
    </DialogContext.Provider>
  );
}

export function DialogContent({ className, children, ...props }) {
  const { open, onClose } = useContext(DialogContext);
  
  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
      />
      
      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className={cn(
          "relative z-50 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-xl",
          className
        )}
        {...props}
      >
        {children}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-textSecondary hover:bg-border/30 hover:text-textPrimary transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </motion.div>
    </div>,
    document.body
  );
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn("mb-4 space-y-1.5 text-left", className)} {...props} />;
}

export function DialogTitle({ className, ...props }) {
  return <h2 className={cn("text-lg font-bold text-textPrimary", className)} {...props} />;
}

export function DialogDescription({ className, ...props }) {
  return <p className={cn("text-sm text-textSecondary", className)} {...props} />;
}

export function DialogFooter({ className, ...props }) {
  return <div className={cn("mt-6 flex items-center justify-end gap-2", className)} {...props} />;
}

export const DialogTrigger = ({ children }) => children;
export const DialogClose = ({ children }) => children;
export const DialogPortal = ({ children }) => children;
export const DialogOverlay = () => null;
