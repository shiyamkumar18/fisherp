import { useTopBuyers } from "../hooks/useAnalytics";

export default function TopBuyers() {
  const { data, isLoading, isError, error } = useTopBuyers();
  const buyers = Array.isArray(data) ? data : data?.buyers || data?.data || [];

  return (
    <div className="bg-white rounded shadow p-4">
      <h3 className="font-bold mb-2">Top Buyers</h3>
      {isLoading && <div className="text-gray-500">Loading...</div>}
      {isError && <div className="text-red-600">{error?.message || "Failed to load buyers."}</div>}
      {!isLoading && !isError && buyers.length === 0 && <div className="text-gray-400">No data</div>}
      {!isLoading && !isError && buyers.length > 0 && (
        <ul className="text-sm">
          {buyers.map((row, i) => (
            <li key={row.id || row.name || i} className="flex justify-between py-1 border-b last:border-b-0">
              <span>{row.name}</span>
              <span className="font-semibold">₹{row.total?.toLocaleString() ?? 0}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
