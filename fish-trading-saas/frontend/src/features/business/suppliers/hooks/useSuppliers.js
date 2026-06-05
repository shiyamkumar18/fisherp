import { useQuery } from "react-query";
import { apiClient } from "@/services/apiClient";

export function useSuppliers() {
  return useQuery(["suppliers"], async () => {
    const res = await apiClient.get("/suppliers/");
    return res.data.results || res.data;
  });
}
