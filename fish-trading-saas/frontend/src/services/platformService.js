import { apiClient } from "@/services/apiClient";

export const platformService = {
  // Fetch SaaS KPIs and stats
  getDashboardOverview: async () => {
    const res = await apiClient.get("/platform/dashboard/");
    return res.data;
  },

  // Fetch all tenants with search, status filter, and pagination
  getTenants: async (params = {}) => {
    const res = await apiClient.get("/platform/tenants/", { params });
    return res.data;
  },

  // Suspend or activate a tenant
  suspendTenant: async (tenantId, action, reason) => {
    const res = await apiClient.post(`/platform/tenants/${tenantId}/suspend/`, {
      action,
      reason,
    });
    return res.data;
  },

  // Extend a tenant's subscription duration
  extendSubscription: async (tenantId, days, reason) => {
    const res = await apiClient.post(`/platform/subscriptions/${tenantId}/extend/`, {
      days,
      reason,
    });
    return res.data;
  },

  // Impersonate a tenant
  impersonateTenant: async (tenantSlug, reason) => {
    const res = await apiClient.post(`/impersonate/`, {
      tenant_slug: tenantSlug,
      reason,
    });
    return res.data;
  },

  // Fetch platform-wide audit logs
  getAuditLogs: async (params = {}) => {
    const res = await apiClient.get("/platform/audit/", { params });
    return res.data;
  },
};
