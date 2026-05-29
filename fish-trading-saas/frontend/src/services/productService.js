import { apiClient } from "@/services/apiClient";
import { config } from "@/config";
import { productsMock } from "@/services/mocks/productMock";

// Fetches inventory items (remaining stock per fish batch).
export const fetchProducts = async () => {
  if (config.useMocks) return productsMock;
  const response = await apiClient.get("/inventory/");
  return response.data.results || response.data || [];
};

// Soft-delete a fish type by ID.
export const deleteProduct = async (id) => {
  if (config.useMocks) return;
  await apiClient.delete(`/fish/${id}/`);
};

// Fetch fish catalog definitions (not inventory)
export const fetchFishTypes = async () => {
  const mockFish = [
    { id: 1, name: "Mackerel (Indian)", category: 1, category_name: "Sea Fish", unit_type: "box", box_weight_kg: 20 },
    { id: 2, name: "Tuna (Yellowfin)", category: 2, category_name: "Premium", unit_type: "box", box_weight_kg: 40 },
    { id: 3, name: "Pomfret", category: 2, category_name: "Premium", unit_type: "box", box_weight_kg: 27 },
    { id: 4, name: "Sardine", category: 1, category_name: "Sea Fish", unit_type: "box", box_weight_kg: 10 },
    { id: 5, name: "Kingfish", category: 2, category_name: "Premium", unit_type: "box", box_weight_kg: 27 },
    { id: 6, name: "Rohu", category: 3, category_name: "Freshwater", unit_type: "kg", box_weight_kg: 1 }
  ];
  if (config.useMocks) return mockFish;
  const response = await apiClient.get("/fish/");
  return response.data.results || response.data || [];
};

// Create a new fish definition
export const createFishType = async (data) => {
  if (config.useMocks) {
    return { id: Date.now(), category_name: "Custom", ...data };
  }
  const response = await apiClient.post("/fish/", data);
  return response.data;
};
