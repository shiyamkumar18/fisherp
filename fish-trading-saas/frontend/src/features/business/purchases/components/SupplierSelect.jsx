import React from "react";

export default function SupplierSelect({ value, onChange }) {
  // Minimal UI for supplier selection
  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Supplier</label>
      <input
        type="text"
        placeholder="Supplier name or ID"
        value={value?.name || ""}
        onChange={e => onChange({ id: 1, name: e.target.value })}
        className="border px-2 py-1 rounded w-full"
      />
    </div>
  );
}
