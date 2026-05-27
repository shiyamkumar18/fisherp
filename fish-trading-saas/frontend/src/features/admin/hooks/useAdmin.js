import { useQuery } from "@tanstack/react-query";
import * as api from "../service/adminService";

export const useCompanies = () =>
  useQuery({
    queryKey: ["companies"],
    queryFn: async () => (await api.getCompanies()).data,
  });

export const useSubscriptions = () =>
  useQuery({
    queryKey: ["subs"],
    queryFn: async () => (await api.getSubscriptions()).data,
  });

export const useUsers = () =>
  useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.getUsers()).data,
  });

export const useAdminStats = () =>
  useQuery({
    queryKey: ["stats"],
    queryFn: async () => (await api.getAdminStats()).data,
  });
