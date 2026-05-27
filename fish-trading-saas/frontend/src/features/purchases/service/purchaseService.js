import { api } from "@/services/core/apiClient";

export const createPurchase = (data) =>
  api.post("/purchases/", data);

export const getPurchases = () =>
  api.get("/purchases/");
