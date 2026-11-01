import { create } from "zustand";

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  role: null,
  tenantId: null,

  login: ({ user, token }) => {
    localStorage.setItem("token", token);
    set({
      user,
      token,
      role: user.role,
      tenantId: user.tenantId,
    });
  },

  logout: () => {
    localStorage.removeItem("token");
    set({
      user: null,
      token: null,
      role: null,
      tenantId: null,
    });
  },
}));
