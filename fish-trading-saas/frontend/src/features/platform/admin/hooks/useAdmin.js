import { useState, useEffect } from "react";
import * as api from "../service/adminService";

function useBasicQuery(queryFn) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    queryFn()
      .then((res) => {
        if (mounted) {
          setData(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setIsError(true);
          setError(err);
          setIsLoading(false);
        }
      });
    return () => { mounted = false; };
  }, []);

  return { data, isLoading, isError, error };
}

export const useCompanies = () => useBasicQuery(async () => (await api.getCompanies()).data);
export const useSubscriptions = () => useBasicQuery(async () => (await api.getSubscriptions()).data);
export const useUsers = () => useBasicQuery(async () => (await api.getUsers()).data);
export const useAdminStats = () => useBasicQuery(async () => (await api.getAdminStats()).data);
