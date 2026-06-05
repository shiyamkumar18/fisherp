import { useQuery } from "react-query";
import { apiClient } from "@/services/apiClient";

export function useFish() {
  return useQuery(["fish"], async () => {
    const res = await apiClient.get("/fish/");
    return res.data.results || res.data;
  });
}
