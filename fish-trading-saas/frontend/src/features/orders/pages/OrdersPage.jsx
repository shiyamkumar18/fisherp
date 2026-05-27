import MainLayout from "@/components/layout/MainLayout";
import { useOrders } from "../hooks/useOrders";
import OrdersTable from "../components/OrdersTable";

export default function OrdersPage() {
  const { data, isLoading, isError } = useOrders();

  if (isLoading) return <MainLayout><div className="p-8">Loading orders...</div></MainLayout>;
  if (isError) return <MainLayout><div className="p-8 text-red-600">Error loading orders.</div></MainLayout>;

  // Support both paginated and flat data
  const orders = data?.results || data?.orders || data?.data || [];

  return (
    <MainLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Orders</h1>
        <OrdersTable data={orders} />
      </div>
    </MainLayout>
  );
}
