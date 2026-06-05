import { useTopProducts } from "../hooks/useAnalytics";

export default function TopProducts() {
  const { data, isLoading, isError, error } = useTopProducts();
  const products = Array.isArray(data) ? data : data?.products || data?.data || [];

  return (
    <div className="bg-white rounded shadow p-4">
      <h3 className="font-bold mb-2">Top-Selling Fish</h3>
      {isLoading && <div className="text-gray-500">Loading...</div>}
      {isError && <div className="text-red-600">{error?.message || "Failed to load products."}</div>}
      {!isLoading && !isError && products.length === 0 && <div className="text-gray-400">No data</div>}
      {!isLoading && !isError && products.length > 0 && (
        <ul className="text-sm">
          {products.map((row, i) => (
            <li key={row.id || row.name || i} className="flex justify-between py-1 border-b last:border-b-0">
              <span>{row.name}</span>
              <span className="font-semibold">{row.quantity ?? row.sales} kg <span className="text-gray-400">(₹{row.revenue?.toLocaleString() ?? 0})</span></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
