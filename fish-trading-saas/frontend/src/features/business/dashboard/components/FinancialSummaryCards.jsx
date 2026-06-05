import { useFinancialOverview } from "../hooks/useDashboard";

export default function FinancialSummaryCards() {
  const { data, isLoading, isError, error } = useFinancialOverview();
  const summary = data?.data || data || {};

  return (
    <div className="mb-8">
      {isLoading && <div className="text-gray-500">Loading summary...</div>}
      {isError && <div className="text-red-600">{error?.message || "Failed to load summary."}</div>}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-100 text-green-800 rounded p-4 flex flex-col items-center">
            <h3 className="font-bold text-lg mb-1">Revenue</h3>
            <p className="text-2xl font-mono">₹{summary.revenue?.toLocaleString() ?? 0}</p>
          </div>
          <div className="bg-yellow-100 text-yellow-800 rounded p-4 flex flex-col items-center">
            <h3 className="font-bold text-lg mb-1">Profit</h3>
            <p className="text-2xl font-mono">₹{summary.profit?.toLocaleString() ?? 0}</p>
          </div>
          <div className="bg-blue-100 text-blue-800 rounded p-4 flex flex-col items-center">
            <h3 className="font-bold text-lg mb-1">Net Cash</h3>
            <p className="text-2xl font-mono">₹{summary.net_cash?.toLocaleString() ?? 0}</p>
          </div>
        </div>
      )}
    </div>
  );
}
