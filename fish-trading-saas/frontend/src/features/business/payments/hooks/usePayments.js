import { useMutation, useQuery } from "@tanstack/react-query";
import { createPayment, getPayments } from "../service/paymentService";

export const usePayments = () =>
  useQuery({
    queryKey: ["payments"],
    queryFn: getPayments,
  });

export const useCreatePayment = () =>
  useMutation({
    mutationFn: createPayment,
  });
