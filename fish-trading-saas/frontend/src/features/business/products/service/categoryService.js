import { apiClient } from "@/services/apiClient";

export const fetchCategories = async () => {
  const response = await apiClient.get("/fish-categories/");
  return response.data.results || response.data;
};
