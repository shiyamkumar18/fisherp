import { api } from "@/services/core/apiClient";

export const createPayment = (data) =>
  api.post("/payments/", data);

export const getPayments = () =>
  api.get("/payments/");
