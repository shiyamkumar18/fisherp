import { apiClient } from "@/services/apiClient";

export const fetchOrders = async ({ page = 1, search = "", filters = {} } = {}) => {
  const params = { page, search };
  
  if (filters.deliveryStatus && filters.deliveryStatus !== "all") {
    params.delivery_status = filters.deliveryStatus;
  }
  
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    // Map 'partially_paid' to 'partial' to match Django backend expectations
    params.payment_status = filters.paymentStatus === "partially_paid" ? "partial" : filters.paymentStatus;
  }
  
  const response = await apiClient.get("/sales/", { params });
  return response.data;
};


