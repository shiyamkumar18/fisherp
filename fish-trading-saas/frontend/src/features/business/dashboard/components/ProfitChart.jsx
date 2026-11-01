import { useProfitLoss } from "../hooks/useAnalytics";

// NOTE: Some environments don't have `recharts` installed.
// To avoid build-time failures (white page), we render a minimal placeholder
// when recharts isn't available.

export default function ProfitChart() {
  // Keep hook call so data loading behaviour remains consistent.
  useProfitLoss();

  return (
    <div className="bg-white rounded shadow p-4">
      <h3 className="font-bold mb-2">Profit/Loss</h3>
      <div className="text-gray-500">Chart unavailable.</div>
    </div>
  );
}

