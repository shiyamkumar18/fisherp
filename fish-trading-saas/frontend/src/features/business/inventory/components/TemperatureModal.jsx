import { useUpdateTemperature } from "../hooks/useInventoryActions";
import { useState } from "react";

export default function TemperatureModal({ open, onClose, item }) {
  const [temp, setTemp] = useState("");
  const { mutate, isLoading, isError, error } = useUpdateTemperature();

  const handleUpdate = () => {
    if (!temp) return;
    mutate(
      {
        inventory_id: item.id,
        temperature: temp,
      },
      {
        onSuccess: () => {
          setTemp("");
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
        <h3 className="text-lg font-bold mb-4">Update Temperature for {item?.fish || item?.name}</h3>
        <input
          className="input border px-3 py-2 rounded mb-4 w-full"
          placeholder="Temperature"
          type="number"
          value={temp}
          onChange={e => setTemp(e.target.value)}
        />
        {isError && <div className="text-red-600 mb-2">{error?.message || "Update failed"}</div>}
        <div className="flex gap-2">
          <button
            className="btn btn-primary flex-1"
            onClick={handleUpdate}
            disabled={isLoading || !temp}
          >
            {isLoading ? "Updating..." : "Update"}
          </button>
          <button className="btn flex-1" onClick={onClose} disabled={isLoading}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
