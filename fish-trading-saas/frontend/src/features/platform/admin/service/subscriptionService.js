import { apiClient } from '@/services/apiClient';

export const getAdvancedSubscriptions = (params = {}) => {
  return apiClient.get('/platform/advanced-subscriptions/', { params });
};

export const getAdvancedSubscription = (id) => {
  return apiClient.get(`/platform/advanced-subscriptions/${id}/`);
};

export const getTenantSubscription = (tenantId) => {
  return apiClient.get(`/platform/advanced-subscriptions/tenant/${tenantId}/`);
};

export const overrideSubscriptionLimits = (id, limits) => {
  return apiClient.post(`/platform/advanced-subscriptions/${id}/override/`, limits);
};

export const suspendSubscription = (id) => {
  return apiClient.post(`/platform/advanced-subscriptions/${id}/suspend/`);
};

export const reactivateSubscription = (id) => {
  return apiClient.post(`/platform/advanced-subscriptions/${id}/reactivate/`);
};

export const getSubscriptionUsage = (id) => {
  return apiClient.get(`/platform/advanced-subscriptions/${id}/usage/`);
};
