import { useMutation } from "@tanstack/react-query";
import { createOrder } from "../service/orderService";

export const useCreateOrder = (options = {}) =>
  useMutation({
    mutationFn: createOrder,
    ...options,
  });
