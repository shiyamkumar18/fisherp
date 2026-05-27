import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSuppliers, createSupplier, updateSupplier, markPreferredSupplier } from "../service/supplierService";

export const useSuppliers = () => useQuery({
  queryKey: ["suppliers"],
  queryFn: getSuppliers,
});

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSupplier,
    onSuccess: () => queryClient.invalidateQueries(["suppliers"]),
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateSupplier(id, data),
    onSuccess: () => queryClient.invalidateQueries(["suppliers"]),
  });
};

export const useMarkPreferredSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markPreferredSupplier,
    onSuccess: () => queryClient.invalidateQueries(["suppliers"]),
  });
};
