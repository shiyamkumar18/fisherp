import { useState } from "react";
import OrderItems from "./OrderItems";
import { useCreateOrder } from "../hooks/useCreateOrder";

export default function OrderForm({ onSuccess }) {
  const [buyer, setBuyer] = useState("");
  const [date] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState([{ fish: "", qty: 1, price: 0 }]);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const createOrder = useCreateOrder({
    onSuccess: () => {
      setSuccess(true);
      setError("");
      if (onSuccess) onSuccess();
    },
    onError: (err) => {
      setError(err?.response?.data?.detail || "Failed to create order.");
      setSuccess(false);
    },
  });

  const handleItemChange = (idx, field, value) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };
  const handleAddRow = () => setItems((prev) => [...prev, { fish: "", qty: 1, price: 0 }]);
  const handleRemoveRow = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const grandTotal = items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.price)), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Map form state to API payload
    const payload = {
      buyer_id: buyer,
      items: items.map((item) => ({
        fish_id: item.fish,
        quantity: Number(item.qty),
        price: Number(item.price),
      })),
    };
    createOrder.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block mb-1 font-medium">Buyer</label>
          <select className="input w-full" value={buyer} onChange={e => setBuyer(e.target.value)} required>
            <option value="">Select buyer</option>
            {/* TODO: Populate with real buyers */}
          </select>
        </div>
        <div>
          <label className="block mb-1 font-medium">Date</label>
          <input className="input w-full" type="date" value={date} readOnly />
        </div>
      </div>
      <OrderItems items={items} onChange={handleItemChange} onAdd={handleAddRow} onRemove={handleRemoveRow} />
      <div className="flex justify-between items-center border-t pt-4">
        <div className="font-bold text-lg">Grand Total: ₹{grandTotal}</div>
        <button
          type="submit"
          className="btn btn-primary px-6 py-2 rounded"
          disabled={createOrder.isLoading}
        >
          {createOrder.isLoading ? "Saving..." : "Save Order"}
        </button>
      </div>
      {success && <div className="text-green-600 font-medium mt-2">Order saved successfully!</div>}
      {error && <div className="text-red-600 font-medium mt-2">{error}</div>}
    </form>
  );
}
