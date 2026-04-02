import { create } from "zustand";

export const useUiStore = create((set) => ({
  sidebarOpen: false,
  notifications: [],
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
  addNotification: (notification) =>
    set((state) => ({ notifications: [notification, ...state.notifications].slice(0, 10) })),
}));
