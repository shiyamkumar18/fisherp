import React, { useState } from "react";
import MoveStockModal from "./MoveStockModal";
import TemperatureModal from "./TemperatureModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Toast from "@/components/ui/toast";

export default function InventoryActions({ item }) {
  const [moveOpen, setMoveOpen] = useState(false);
  const [tempOpen, setTempOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", type: "success" });

  const handleDelete = () => {
    // TODO: Replace with real delete logic
    setConfirmOpen(false);
    setToast({ open: true, message: "Item deleted successfully!", type: "success" });
  };

  return (
    <div className="flex gap-2">
      <button className="btn btn-xs" onClick={() => setMoveOpen(true)}>
        Move
      </button>
      <button className="btn btn-xs" onClick={() => setTempOpen(true)}>
        Temp
      </button>
      <button className="btn btn-xs btn-danger" onClick={() => setConfirmOpen(true)}>
        Delete
      </button>

      <MoveStockModal open={moveOpen} onClose={() => setMoveOpen(false)} item={item} />
      <TemperatureModal open={tempOpen} onClose={() => setTempOpen(false)} item={item} />
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Item?"
        description="This action cannot be undone. Are you sure you want to delete this inventory item?"
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, open: false })}
      />
    </div>
  );
}
