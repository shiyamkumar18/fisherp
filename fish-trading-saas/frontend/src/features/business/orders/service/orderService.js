import { api } from "@/services/core/apiClient";

/**
 * Get orders from backend. Supports pagination, search, and filters.
 * @param {Object} params - Query params (page, search, filters)
 */

export const getOrders = async (params = {}) => {
  const response = await api.get("/orders/", { params });
  return response.data;
};

/**
 * Create a new order (sale)
 * @param {Object} order - { buyer_id, items: [{ fish_id, quantity, price }] }
 */
export const createOrder = async (order) => {
  const response = await api.post("/orders/", order);
  return response.data;
};

/**
 * Mark an order as delivered
 * @param {number|string} orderId
 */
export const markDelivered = async (orderId) => {
  const response = await api.post(`/orders/${orderId}/mark-delivered`);
  return response.data;
};

/**
 * Record payment for an order
 * @param {number|string} orderId
 */
export const recordPayment = async (orderId) => {
  const response = await api.post(`/orders/${orderId}/record-payment`);
  return response.data;
};