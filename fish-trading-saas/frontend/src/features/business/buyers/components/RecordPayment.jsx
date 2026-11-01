import { useState } from "react";
import { api } from "@/services/core/apiClient";

export default function RecordPayment({ buyerId, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      await api.post("/payments/", {
        buyer_id: buyerId,
        amount: Number(amount),
      });
      setSuccess(true);
      setAmount("");
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        placeholder="Amount"
        type="number"
        min="1"
        className="input border px-2 py-1 rounded w-32"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button
        className="bg-blue-600 text-white px-4 py-1 rounded ml-2"
        onClick={handlePay}
        disabled={loading || !amount}
      >
        {loading ? "Paying..." : "Pay"}
      </button>
      {error && <div className="text-red-600">{error}</div>}
      {success && <div className="text-green-600">Payment recorded!</div>}
    </div>
  );
}
