import { useQuery } from "@tanstack/react-query";
import { getInventory, getLowStock, getExpiringSoon } from "../service/inventoryService";

// Main inventory list (optionally with filters)
export const useInventory = (params) =>
  useQuery({
    queryKey: ["inventory", params],
    queryFn: () => getInventory(params),
    keepPreviousData: true,
    staleTime: 60_000,
  });

// Low stock items
export const useLowStock = () =>
  useQuery({
    queryKey: ["inventory-low-stock"],
    queryFn: getLowStock,
    staleTime: 60_000,
  });

// Expiring soon items
export const useExpiringSoon = () =>
  useQuery({
    queryKey: ["inventory-expiring-soon"],
    queryFn: getExpiringSoon,
    staleTime: 60_000,
  });
