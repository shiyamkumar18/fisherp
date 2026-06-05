import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBuyers, createBuyer, updateBuyer, getBuyerLedger } from "../service/buyerService";

export const useBuyers = () => useQuery({
  queryKey: ["buyers"],
  queryFn: getBuyers,
});

export const useCreateBuyer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBuyer,
    onSuccess: () => queryClient.invalidateQueries(["buyers"]),
  });
};

export const useUpdateBuyer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateBuyer(id, data),
    onSuccess: () => queryClient.invalidateQueries(["buyers"]),
  });
};

export const useBuyerLedger = (id) => useQuery({
  queryKey: ["buyer-ledger", id],
  queryFn: () => getBuyerLedger(id),
  enabled: !!id,
});
