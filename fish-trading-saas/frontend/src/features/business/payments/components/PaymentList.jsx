import { usePayments } from "../hooks/usePayments";

export default function PaymentList() {
  const { data, isLoading, isError, error } = usePayments();
  const payments = data?.data || data || [];

  return (
    <div>
      {isLoading && <div className="text-gray-500">Loading...</div>}
      {isError && <div className="text-red-600">{error?.message || "Failed to load payments."}</div>}
      {!isLoading && !isError && payments.length === 0 && (
        <div className="text-gray-500">No payments found.</div>
      )}
      <div className="space-y-2">
        {payments.map((p) => (
          <div key={p.id} className="border rounded p-3 bg-white shadow flex flex-col gap-1">
            <div className="font-semibold">{p.type === "buyer" ? "Buyer" : "Supplier"} Payment</div>
            <div>Entity ID: {p.entity_id}</div>
            <div>Amount: ₹{p.amount}</div>
            <div>Method: {p.method}</div>
            <div className="text-xs text-gray-400">{p.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
