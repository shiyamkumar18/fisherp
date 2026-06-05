export const normalizeOrder = (apiOrder) => ({
  id: apiOrder.id,
  invoice: apiOrder.invoice_number,
  buyer: apiOrder.buyer_name || "Unknown Buyer",
  status: apiOrder.delivery_status_display || apiOrder.delivery_status || "Pending",
  paymentStatus: apiOrder.payment_status_display || apiOrder.payment_status || "Pending",
  amount: Number(apiOrder.final_amount ?? apiOrder.total_revenue ?? 0),
  createdAt: apiOrder.created_at,
});

export const normalizeOrderPage = (payload) => ({
  count: payload.count || 0,
  next: payload.next,
  previous: payload.previous,
  results: (payload.results || []).map(normalizeOrder),
});
