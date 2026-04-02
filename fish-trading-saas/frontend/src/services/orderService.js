import { apiClient } from "@/services/apiClient";
import { config } from "@/config";
import { orderMockPage } from "@/services/mocks/orderMock";
import { normalizeOrderPage } from "@/services/transformers/orderTransformer";

export const fetchOrders = async ({ page = 1, search = "" } = {}) => {
  if (config.useMocks) {
    return normalizeOrderPage(orderMockPage);
  }

  const response = await apiClient.get("/sales/", { params: { page, search } });
  return normalizeOrderPage(response.data);
};
