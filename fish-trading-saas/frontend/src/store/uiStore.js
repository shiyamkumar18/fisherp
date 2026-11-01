import { create } from "zustand";

export const useUiStore = create((set) => ({
  sidebarOpen: false,
  notifications: [],
  theme: localStorage.getItem("theme") || "system",
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
  addNotification: (notification) =>
    set((state) => ({ notifications: [notification, ...state.notifications].slice(0, 10) })),
  setTheme: (theme) => {
    localStorage.setItem("theme", theme);
    set({ theme });
  },
  toggleTheme: () => set((state) => {
    let nextTheme;
    if (state.theme === "light") {
      nextTheme = "dark";
    } else if (state.theme === "dark") {
      nextTheme = "system";
    } else {
      nextTheme = "light";
    }
    localStorage.setItem("theme", nextTheme);
    return { theme: nextTheme };
  }),
}));
