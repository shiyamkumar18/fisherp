import create from 'zustand';

export const useSuppliersStore = create((set) => ({
  suppliers: [],
  setSuppliers: (suppliers) => set({ suppliers }),
}));
