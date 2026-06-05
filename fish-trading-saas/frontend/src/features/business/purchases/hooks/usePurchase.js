import { useMutation, useQuery } from "@tanstack/react-query";
import { createPurchase, getPurchases } from "../service/purchaseService";

export const usePurchases = () =>
  useQuery({
    queryKey: ["purchases"],
    queryFn: getPurchases,
  });

export const useCreatePurchase = () =>
  useMutation({
    mutationFn: createPurchase,
  });
