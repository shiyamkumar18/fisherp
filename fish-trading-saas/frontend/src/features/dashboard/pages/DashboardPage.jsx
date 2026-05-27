
import Card from "@/components/ui/Card";
import FinancialCards from "../components/FinancialCards";
import RevenueChart from "../components/RevenueChart";
import ProfitChart from "../components/ProfitChart";
import TopBuyers from "../components/TopBuyers";
import RecentOrdersTable from "../components/RecentOrdersTable";

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-secondary">Overview of your business</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="transition-all duration-200 hover:shadow-md"><FinancialCards /></Card>
        <Card className="transition-all duration-200 hover:shadow-md">Orders</Card>
        <Card className="transition-all duration-200 hover:shadow-md">Stock</Card>
        <Card className="transition-all duration-200 hover:shadow-md">Profit</Card>
      </div>

      {/* CHART + ACTIVITY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Card><RevenueChart /></Card>
        </div>
        <Card><TopBuyers /></Card>
      </div>

      {/* TABLE */}
      <Card><RecentOrdersTable /></Card>
    </div>
  );
}
