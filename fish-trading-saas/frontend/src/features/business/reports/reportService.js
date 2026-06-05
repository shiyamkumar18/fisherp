import { apiClient } from "@/services/apiClient";

export const exportOrders = async (params) => {
  // params: { from, to }
  const response = await apiClient.get("/orders/export/", { params, responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "orders.xlsx");
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
};

export const exportInventory = async (params) => {
  const response = await apiClient.get("/inventory/export/", { params, responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "inventory.xlsx");
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
};

export const exportPayments = async (params) => {
  const response = await apiClient.get("/payments/export/", { params, responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "payments.xlsx");
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
};
