import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./dialog";
import Button from "./button";

export default function ConfirmDialog({ 
  open, 
  title = "Are you sure?", 
  description = "This action cannot be undone.", 
  confirmLabel = "Delete", 
  cancelLabel = "Cancel", 
  onConfirm, 
  onCancel, 
  danger = false 
}) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 flex justify-end gap-3">
          <Button onClick={onCancel} variant="outline">{cancelLabel}</Button>
          <Button onClick={onConfirm} variant={danger ? "danger" : "primary"}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
