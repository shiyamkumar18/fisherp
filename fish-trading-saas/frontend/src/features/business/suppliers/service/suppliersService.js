import { api } from "./apiClient";

export const getSuppliers = () => api.get("/suppliers");
