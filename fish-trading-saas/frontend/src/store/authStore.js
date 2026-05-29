import { create } from "zustand";
import { apiClient } from "@/services/apiClient";

const getStoredSession = () => {
  try {
    const raw = localStorage.getItem("auth_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const persistSession = (session) => {
  if (!session) {
    localStorage.removeItem("auth_session");
    return;
  }
  localStorage.setItem("auth_session", JSON.stringify(session));
};

export const useAuthStore = create((set, get) => ({
  session: getStoredSession(),
  user: getStoredSession()?.user || null,
  token: getStoredSession()?.access || null,
  entitlements: [],
  isHydrated: false,
  hydrate: () => {
    const s = getStoredSession();
    set({ session: s, user: s?.user || null, token: s?.access || null, isHydrated: true });
    if (s?.access) {
      get().fetchEntitlements();
    }
  },
  login: (session) => {
    persistSession(session);
    set({ session, user: session?.user || null, token: session?.access || null, isHydrated: true });
    get().fetchEntitlements();
  },
  logout: () => {
    persistSession(null);
    set({ session: null, user: null, token: null, entitlements: [], isHydrated: true });
  },
  updateAccessToken: (access) => {
    const current = get().session;
    if (!current) return;
    const next = { ...current, access };
    persistSession(next);
    set({ session: next, token: access });
  },
  fetchEntitlements: async () => {
    try {
      const res = await apiClient.get("/subscriptions/my-entitlements/");
      set({ entitlements: res.data.entitlements || [] });
    } catch (e) {
      console.error("Failed to fetch entitlements", e);
      set({ entitlements: [] });
    }
  },
}));
