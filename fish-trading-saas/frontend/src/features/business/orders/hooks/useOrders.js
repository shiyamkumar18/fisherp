import { useQuery } from "@tanstack/react-query";
import { getOrders } from "../service/orderService";

/**
 * React Query hook to fetch orders with params (pagination, search, filters)
 */
export const useOrders = (params = {}) =>
  useQuery({
    queryKey: ["orders", params],
    queryFn: () => getOrders(params),
    keepPreviousData: true,
    staleTime: 60_000,
  });
