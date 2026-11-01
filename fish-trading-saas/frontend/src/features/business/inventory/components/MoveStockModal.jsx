import { useMoveStock } from "../hooks/useInventoryActions";
import { useState } from "react";

export default function MoveStockModal({ open, onClose, item }) {
  const [location, setLocation] = useState("");
  const [quantity, setQuantity] = useState("");
  const { mutate, isLoading, isError, error, isSuccess } = useMoveStock();

  const handleMove = () => {
    if (!location || !quantity) return;
    mutate(
      {
        inventory_id: item.id,
        location,
        quantity: Number(quantity),
      },
      {
        onSuccess: () => {
          setLocation("");
          setQuantity("");
          onClose();
        },
      }
    );
  };

  if (!open) return null;
  return (
    <div className="modal fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
      <div className="modal-content bg-white p-6 rounded shadow w-80 relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-black" onClick={onClose}>&times;</button>
        <h3 className="text-lg font-bold mb-4">Move Stock for {item?.fish || item?.name}</h3>
        <input
          className="input border px-3 py-2 rounded mb-2 w-full"
          placeholder="New Location"
          value={location}
          onChange={e => setLocation(e.target.value)}
        />
        <input
          className="input border px-3 py-2 rounded mb-4 w-full"
          placeholder="Quantity"
          type="number"
          min={1}
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
        />
        {isError && <div className="text-red-600 mb-2">{error?.message || "Move failed"}</div>}
        <div className="flex gap-2">
          <button
            className="btn btn-primary flex-1"
            onClick={handleMove}
            disabled={isLoading || !location || !quantity}
          >
            {isLoading ? "Moving..." : "Confirm"}
          </button>
          <button className="btn flex-1" onClick={onClose} disabled={isLoading}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
