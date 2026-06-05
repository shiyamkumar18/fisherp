import { useState } from "react";
import { useCreatePayment } from "../hooks/usePayments";

export default function PaymentForm() {
  const [type, setType] = useState("buyer");
  const [entityId, setEntityId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { mutate, isLoading, isSuccess, isError, error: mutationError } = useCreatePayment();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!entityId || !amount) {
      setError("Entity and amount are required");
      return;
    }
    mutate(
      {
        type,
        entity_id: entityId,
        amount: Number(amount),
        method,
      },
      {
        onSuccess: () => {
          setSuccess(true);
          setEntityId("");
          setAmount("");
        },
        onError: (err) => {
          setError(err?.message || "Failed to record payment");
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-1 font-semibold">Type</label>
        <select
          className="input border px-2 py-1 rounded w-full"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="buyer">Buyer Payment</option>
          <option value="supplier">Supplier Payment</option>
        </select>
      </div>
      <div>
        <label className="block mb-1 font-semibold">Entity ID</label>
        <input
          placeholder="Entity ID"
          className="input border px-2 py-1 rounded w-full"
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
        />
      </div>
      <div>
        <label className="block mb-1 font-semibold">Amount</label>
        <input
          type="number"
          min="1"
          placeholder="Amount"
          className="input border px-2 py-1 rounded w-full"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div>
        <label className="block mb-1 font-semibold">Method</label>
        <select
          className="input border px-2 py-1 rounded w-full"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank">Bank</option>
        </select>
      </div>
      {error && <div className="text-red-600">{error}</div>}
      {isError && <div className="text-red-600">{mutationError?.message || "Failed to record payment"}</div>}
      {success || isSuccess ? <div className="text-green-600">Payment recorded!</div> : null}
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={isLoading}
      >
        {isLoading ? "Saving..." : "Record Payment"}
      </button>
    </form>
  );
}
