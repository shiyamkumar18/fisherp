import { useBuyerLedger } from "../hooks/useBuyer";

export default function BuyerLedger({ buyerId }) {
  const { data, isLoading, isError, error } = useBuyerLedger(buyerId);
  const ledger = data?.data || data || [];

  return (
    <div className="mt-6">
      <h2 className="text-lg font-bold mb-2">Ledger</h2>
      {isLoading && <div className="text-gray-500">Loading...</div>}
      {isError && <div className="text-red-600">{error?.message || "Failed to load ledger."}</div>}
      {!isLoading && !isError && ledger.length === 0 && (
        <div className="text-gray-500">No transactions found.</div>
      )}
      {ledger.length > 0 && (
        <table className="min-w-full text-sm border">
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
                  "px-2 py-1 border " +
                  (entry.type === "Sale" ? "text-green-700" : "text-red-700")
                }>
                  {entry.type === "Sale" ? "+" : "-"}{entry.amount}
                </td>
                <td className="px-2 py-1 border">{entry.balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
