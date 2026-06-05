import { create } from "zustand";

export const useOrdersStore = create((set) => ({
  filters: {},
  setFilters: (filters) => set({ filters }),
}));
