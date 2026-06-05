import { api } from "@/services/core/apiClient";

export const getBuyers = () => api.get("/buyers/");
export const createBuyer = (data) => api.post("/buyers/", data);
export const updateBuyer = (id, data) => api.patch(`/buyers/${id}/`, data);
export const getBuyerLedger = (id) => api.get(`/buyers/${id}/ledger/`);
