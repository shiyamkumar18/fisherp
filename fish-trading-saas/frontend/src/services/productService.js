import { apiClient } from "@/services/apiClient";
import { config } from "@/config";
import { productsMock } from "@/services/mocks/productMock";

// Fetches inventory items (remaining stock per fish batch).
export const fetchProducts = async () => {
  if (config.useMocks) return productsMock;
  const response = await apiClient.get("/inventory/");
  return response.data.results || response.data;
};

// Soft-delete a fish type by ID.
export const deleteProduct = async (id) => {
  if (config.useMocks) return;
  await apiClient.delete(`/fish/${id}/`);
};
