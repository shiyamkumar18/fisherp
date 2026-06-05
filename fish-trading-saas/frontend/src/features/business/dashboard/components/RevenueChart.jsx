import { useSalesTrend } from "../hooks/useAnalytics";

export default function RevenueChart() {
  useSalesTrend();

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="text-base font-semibold text-secondary mb-2">Revenue Trend</h3>
      <div className="text-gray-500">Chart unavailable.</div>
    </div>
  );
}

