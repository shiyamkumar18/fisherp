import { apiClient } from "@/services/apiClient";

export const fetchOrders = async ({ page = 1, search = "" } = {}) => {
  const response = await apiClient.get("/sales/", { params: { page, search } });
  return response.data;
};

