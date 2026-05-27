import React from "react";
import Modal from "./Modal";
import Button from "./Button";

export default function ConfirmDialog({ open, title = "Are you sure?", description = "This action cannot be undone.", confirmLabel = "Delete", cancelLabel = "Cancel", onConfirm, onCancel, danger = false }) {
  if (!open) return null;
  return (
    <Modal onClose={onCancel}>
      <div className="text-center p-2">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-gray-500 mb-6">{description}</p>
        <div className="flex justify-center gap-3">
          <Button onClick={onCancel} variant="ghost">{cancelLabel}</Button>
          <Button onClick={onConfirm} variant={danger ? "danger" : "primary"}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}
