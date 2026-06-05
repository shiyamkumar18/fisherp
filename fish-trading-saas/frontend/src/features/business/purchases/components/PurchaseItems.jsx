import React from "react";

export default function PurchaseItems({ items, setItems }) {
  // Minimal UI for adding purchase items
  const handleAdd = () => {
    setItems([
      ...items,
      { fish: null, quantity: "", price: "" },
    ]);
  };
  const handleChange = (idx, field, value) => {
    const updated = items.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item
    );
    setItems(updated);
  };
  const handleRemove = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold">Items</span>
        <button type="button" className="text-blue-600" onClick={handleAdd}>
          + Add Item
        </button>
      </div>
      {items.length === 0 && <div className="text-gray-400">No items added.</div>}
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-2 mb-2 items-center">
          {/* TODO: Replace with FishSelect */}
          <input
            type="text"
            placeholder="Fish"
            value={item.fish?.name || ""}
            onChange={e => handleChange(idx, "fish", { name: e.target.value })}
            className="border px-2 py-1 rounded w-32"
          />
          <input
            type="number"
            placeholder="Quantity"
            value={item.quantity}
            onChange={e => handleChange(idx, "quantity", e.target.value)}
            className="border px-2 py-1 rounded w-24"
          />
          <input
            type="number"
            placeholder="Price"
            value={item.price}
            onChange={e => handleChange(idx, "price", e.target.value)}
            className="border px-2 py-1 rounded w-24"
          />
          <button type="button" className="text-red-500" onClick={() => handleRemove(idx)}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
