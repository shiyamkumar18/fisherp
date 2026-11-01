
import { useOrders } from "../hooks/useOrders";
import OrderStatusBadge from "./OrderStatusBadge";
import OrderActions from "./OrderActions";
import { markDelivered, recordPayment } from "../service/orderService";
import { useState } from "react";


export default function OrdersTable({ data: propData }) {
  const { data, isLoading, isError } = useOrders();

  if (isLoading) {
    return <div className="p-4">Loading orders...</div>;
  }
  if (isError) {
    return <div className="p-4 text-red-600">Error loading orders.</div>;
  }

  const orders = propData || data || [];

  if (!orders || !Array.isArray(orders) || orders.length === 0) {
    return <div className="p-4 text-gray-500">No orders found.</div>;
  }

  // For optimistic UI feedback
  const [actionLoading, setActionLoading] = useState({});

  // Handlers for order actions
  const handleMarkDelivered = async (orderId) => {
    setActionLoading((prev) => ({ ...prev, [orderId]: 'delivered' }));
    try {
      await markDelivered(orderId);
      // Optionally: refetch orders or update UI
      window.location.reload(); // quick fix, ideally use queryClient.invalidateQueries
    } finally {
      setActionLoading((prev) => ({ ...prev, [orderId]: null }));
    }
  };
  const handleRecordPayment = async (orderId) => {
    setActionLoading((prev) => ({ ...prev, [orderId]: 'payment' }));
    try {
      await recordPayment(orderId);
      window.location.reload();
    } finally {
      setActionLoading((prev) => ({ ...prev, [orderId]: null }));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mt-4 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="px-3 py-2 text-left font-semibold text-secondary">Order #</th>
            <th className="px-3 py-2 text-left font-semibold text-secondary">Buyer</th>
            <th className="px-3 py-2 text-left font-semibold text-secondary">Amount</th>
            <th className="px-3 py-2 text-left font-semibold text-secondary">Status</th>
            <th className="px-3 py-2 text-left font-semibold text-secondary">Date</th>
            <th className="px-3 py-2 text-left font-semibold text-secondary">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b hover:bg-slate-50 transition-all duration-200">
              <td className="px-3 py-2 text-base font-semibold">{order.invoice_number || order.id}</td>
              <td className="px-3 py-2 text-sm text-secondary">{order.buyer_name || order.buyer}</td>
              <td className="px-3 py-2">
                <span className="text-xl font-semibold">₹{order.final_amount?.toLocaleString?.() ?? order.total_amount ?? 0}</span>
              </td>
              <td className="px-3 py-2">
                <OrderStatusBadge status={order.status || order.payment_status_display} />
              </td>
              <td className="px-3 py-2 text-sm text-secondary">{order.date}</td>
              <td className="px-3 py-2">
                <OrderActions
                  order={order}
                  markDelivered={handleMarkDelivered}
                  recordPayment={handleRecordPayment}
                  loading={actionLoading[order.id]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
