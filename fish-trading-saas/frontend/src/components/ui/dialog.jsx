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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pb-safe sm:pb-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-bg/60 backdrop-blur-sm"
      />
      
      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className={cn(
          "relative z-50 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-border bg-modal p-6 shadow-2xl",
          className
        )}
        {...props}
      >
        <div className="mx-auto w-12 h-1.5 bg-border rounded-full mb-4 sm:hidden opacity-50" />
        {children}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-full text-textSecondary hover:bg-border/30 hover:text-textPrimary transition-colors cursor-pointer"
        >
          <X className="h-6 w-6" />
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
