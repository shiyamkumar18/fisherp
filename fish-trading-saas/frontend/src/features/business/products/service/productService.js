import { apiClient } from "@/services/apiClient";
import { config } from "@/config";
import { productsMock } from "@/services/mocks/productMock";


// Fetches all fish/products
export const fetchProducts = async () => {
	if (config.useMocks) return productsMock;
	const response = await apiClient.get("/fish/");
	return response.data.results || response.data;
};

// Create a new product
export const createProduct = async (data) => {
	if (config.useMocks) return { ...data, id: Math.random() };
	const response = await apiClient.post("/fish/", data);
	return response.data;
};

// Edit/update a product
export const updateProduct = async (id, data) => {
	if (config.useMocks) return { ...data, id };
	const response = await apiClient.patch(`/fish/${id}/`, data);
	return response.data;
};

// Soft-delete a fish type by ID.
export const deleteProduct = async (id) => {
	if (config.useMocks) return;
	await apiClient.delete(`/fish/${id}/`);
};