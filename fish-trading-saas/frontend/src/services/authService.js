import { apiClient } from "@/services/apiClient";

export const loginUser = async (payload) => {
  const response = await apiClient.post("/auth/login/", payload);
  const data = response.data;

  return {
    access: data.access,
    refresh: data.refresh,
    user: {
      id: data.user?.id,
      email: data.user?.email,
      username: data.user?.username,
      role: data.user?.role || "customer",
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
