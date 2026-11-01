import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  moveStock,
  updateTemperature,
  purchaseStock,
  sellStock,
  returnStock,
  damageStock,
} from "../service/inventoryService";

// Move stock between locations
export const useMoveStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: moveStock,
    onSuccess: () => qc.invalidateQueries(["inventory"]),
  });
};

// Update temperature log
export const useUpdateTemperature = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateTemperature,
    onSuccess: () => qc.invalidateQueries(["inventory"]),
  });
};

// Purchase stock
export const usePurchaseStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }) => purchaseStock(itemId, data),
    onSuccess: () => qc.invalidateQueries(["inventory"]),
  });
};

// Sell stock
export const useSellStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }) => sellStock(itemId, data),
    onSuccess: () => qc.invalidateQueries(["inventory"]),
  });
};

// Return stock
export const useReturnStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }) => returnStock(itemId, data),
    onSuccess: () => qc.invalidateQueries(["inventory"]),
  });
};

// Damage stock
export const useDamageStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }) => damageStock(itemId, data),
    onSuccess: () => qc.invalidateQueries(["inventory"]),
  });
};
