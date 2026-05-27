import { api } from "@/services/core/apiClient";

export const getSuppliers = () => api.get("/suppliers/");
export const createSupplier = (data) => api.post("/suppliers/", data);
export const updateSupplier = (id, data) => api.patch(`/suppliers/${id}/`, data);
export const markPreferredSupplier = (id) => api.post(`/suppliers/${id}/mark-preferred/`);
