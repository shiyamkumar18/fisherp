import { api } from "@/services/core/apiClient";

// Get all inventory items (optionally with query params)
export const getInventory = (params) =>
  api.get("/inventory/", params ? { params } : undefined).then(r => r.data);

// Get items with low stock
export const getLowStock = () =>
  api.get("/inventory/low-stock/").then(r => r.data);

// Get items expiring soon
export const getExpiringSoon = () =>
  api.get("/inventory/expiring-soon/").then(r => r.data);

// Move stock between locations
export const moveStock = (data) =>
  api.post("/inventory/move-stock/", data).then(r => r.data);

// Update temperature log for an item
export const updateTemperature = (data) =>
  api.post("/inventory/update-temperature/", data).then(r => r.data);

// Stock events (purchase, sale, return, damage)
export const purchaseStock = (itemId, data) =>
  api.post(`/inventory/${itemId}/purchase`, data).then(r => r.data);

export const sellStock = (itemId, data) =>
  api.post(`/inventory/${itemId}/sale`, data).then(r => r.data);

export const returnStock = (itemId, data) =>
  api.post(`/inventory/${itemId}/return`, data).then(r => r.data);

export const damageStock = (itemId, data) =>
  api.post(`/inventory/${itemId}/damage`, data).then(r => r.data);
