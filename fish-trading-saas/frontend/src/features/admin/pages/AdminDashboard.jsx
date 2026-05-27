import { useAdminStats } from "../hooks/useAdmin";
import MainLayout from "@/components/layout/MainLayout";

function formatCurrency(amount) {
  if (typeof amount !== "number") return "-";
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function AdminDashboard() {
  const { data, isLoading, isError, error } = useAdminStats();
  const stats = data || {};

  return (
    <MainLayout>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-white rounded shadow p-4 flex flex-col items-center">
          <h3 className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Companies</h3>
          <p className="text-xl font-bold text-blue-700">{isLoading ? "..." : stats.total_companies ?? "-"}</p>
        </div>
        <div className="card bg-white rounded shadow p-4 flex flex-col items-center">
          <h3 className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Revenue</h3>
          <p className="text-xl font-bold text-green-700">{isLoading ? "..." : formatCurrency(stats.total_revenue)}</p>
        </div>
        <div className="card bg-white rounded shadow p-4 flex flex-col items-center">
          <h3 className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Active Users</h3>
          <p className="text-xl font-bold text-indigo-700">{isLoading ? "..." : stats.active_users ?? "-"}</p>
        </div>
        <div className="card bg-white rounded shadow p-4 flex flex-col items-center">
          <h3 className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Subscriptions</h3>
          <p className="text-xl font-bold text-yellow-700">{isLoading ? "..." : stats.active_subscriptions ?? "-"}</p>
        </div>
      </div>
      {isError && <div className="text-red-600 mt-4">{error?.message || "Failed to load stats."}</div>}
    </MainLayout>
  );
}
