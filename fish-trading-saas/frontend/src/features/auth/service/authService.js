import { apiClient } from "@/services/apiClient";

export const loginUser = async ({ email, password, company_name }) => {
  const body = { email, password };
  if (company_name?.trim()) body.company_name = company_name.trim();

  const response = await apiClient.post("/auth/login/", body);
  const data = response.data;

  return {
    access: data.access,
    refresh: data.refresh,
    user: {
      id: data.user_id,
      email: data.email,
      username: data.username,
      role: data.role || "customer",
      company_name: data.company_name,
      tenant_slug: data.tenant_slug,
    },
  };
};

export const logoutUser = async () => {
  try {
    await apiClient.post("/auth/logout/");
  } catch {
    // Ignore logout API failures and clear local session regardless.
  }
};
