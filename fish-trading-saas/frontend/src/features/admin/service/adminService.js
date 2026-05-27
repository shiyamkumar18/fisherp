import { api } from "@/services/core/apiClient";

export const getCompanies = () => api.get("/admin/companies/");
export const getSubscriptions = () => api.get("/admin/subscriptions/");
export const getUsers = () => api.get("/admin/users/");
export const getAdminStats = () => api.get("/admin/stats/");
export const updateSubscription = (payload) => api.post("/admin/subscriptions/update/", payload);
