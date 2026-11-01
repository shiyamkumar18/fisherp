import { apiClient as api } from "@/services/apiClient";

export const getCompanies = () => api.get("/platform/tenants/");
export const getSubscriptions = () => api.get("/platform/subscriptions/");
export const getUsers = () => Promise.resolve({ data: [] }); // No direct users endpoint, mocking for now
export const getAdminStats = () => api.get("/platform/dashboard/");
export const updateSubscription = (payload) => api.post("/platform/subscriptions/update/", payload);

// Support Command Center
export const getSupportTickets = (params) => api.get("/support/tickets/", { params });
export const updateTicketStatus = async (ticketId, data) => {
  const res = await api.patch(`/support/tickets/${ticketId}/`, data);
  return res.data;
};

export const addTicketMessage = async (ticketId, content, isInternal = false) => {
  const res = await api.post(`/support/tickets/${ticketId}/add_message/`, {
    content,
    is_internal: isInternal
  });
  return res.data;
};

export const getWarRoomMetrics = async () => {
  const res = await api.get('/support/tickets/war_room_metrics/');
  return res.data;
};

// Actions
export const assignTicket = async (ticketId, assigneeId) => {
  const res = await api.post(`/support/tickets/${ticketId}/assign/`, { assignee_id: assigneeId });
  return res.data;
};

export const escalateTicket = async (ticketId, payload) => {
  const res = await api.post(`/support/tickets/${ticketId}/escalate/`, payload);
  return res.data;
};

export const resolveTicket = async (ticketId, reason) => {
  const res = await api.post(`/support/tickets/${ticketId}/resolve/`, { reason });
  return res.data;
};

export const closeTicket = async (ticketId) => {
  const res = await api.post(`/support/tickets/${ticketId}/close/`);
  return res.data;
};

export const impersonateTenantFromTicket = async (ticketId, reason) => {
  const res = await api.post(`/support/tickets/${ticketId}/impersonate/`, { reason });
  return res.data;
};
