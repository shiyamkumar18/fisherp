import { useSmartInsights } from "../hooks/useAnalytics";

export default function SmartInsights() {
  const { data, isLoading, isError, error } = useSmartInsights();
  const insights = data?.data || data || [];

  return (
    <div className="bg-white rounded shadow p-4">
      <h3 className="font-bold mb-2">Smart Insights</h3>
      {isLoading && <div className="text-gray-500">Loading...</div>}
      {isError && <div className="text-red-600">{error?.message || "Failed to load insights."}</div>}
      {!isLoading && !isError && insights.length === 0 && <div className="text-gray-400">No insights available</div>}
      {!isLoading && !isError && insights.length > 0 && (
        <ul className="text-sm list-disc ml-6">
          {insights.map((row, i) => (
            <li key={i}>{row.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
