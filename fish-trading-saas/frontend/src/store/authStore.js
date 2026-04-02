import { create } from "zustand";

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
  isHydrated: false,
  hydrate: () => set({ session: getStoredSession(), isHydrated: true }),
  login: (session) => {
    persistSession(session);
    set({ session, isHydrated: true });
  },
  logout: () => {
    persistSession(null);
    set({ session: null, isHydrated: true });
  },
  updateAccessToken: (access) => {
    const current = get().session;
    if (!current) return;
    const next = { ...current, access };
    persistSession(next);
    set({ session: next });
  },
}));
