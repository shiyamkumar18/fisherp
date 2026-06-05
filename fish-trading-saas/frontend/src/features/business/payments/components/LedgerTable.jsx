import { useLedger } from "../hooks/usePayments";

export default function LedgerTable({ params }) {
  const { data, isLoading, isError, error } = useLedger(params);
  const ledger = data?.data || data || [];

  return (
    <div className="overflow-x-auto">
      {isLoading && <div className="text-gray-500">Loading...</div>}
      {isError && <div className="text-red-600">{error?.message || "Failed to load ledger."}</div>}
      {!isLoading && !isError && ledger.length === 0 && (
        <div className="text-gray-500">No transactions found.</div>
      )}
      {ledger.length > 0 && (
        <table className="min-w-full text-sm border mt-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1 border">Date</th>
              <th className="px-2 py-1 border">Type</th>
              <th className="px-2 py-1 border">Amount</th>
              <th className="px-2 py-1 border">Balance</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((entry, idx) => (
              <tr key={idx}>
                <td className="px-2 py-1 border">{entry.date}</td>
                <td className="px-2 py-1 border">{entry.type}</td>
                <td className={
                  "px-2 py-1 border font-mono " +
                  (entry.type === "Sale" ? "text-green-700" : "text-red-700")
                }>
                  {entry.type === "Sale" ? "+" : "-"}{Number(entry.amount).toLocaleString()}
                </td>
                <td className="px-2 py-1 border font-mono">{Number(entry.balance).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
