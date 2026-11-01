
import { useQuery } from "@tanstack/react-query";
import {
  fetchDashboardOverview,
  fetchSalesTrend,
  fetchProfitLoss,
  fetchTopProducts,
  fetchTopBuyers,
  fetchSmartInsights,
} from "../service/dashboardService";


export const useDashboard = () =>
  useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardOverview,
  });

export const useSalesTrend = () =>
  useQuery({
    queryKey: ["sales-trend"],
    queryFn: fetchSalesTrend,
  });

export const useProfitLossData = () =>
  useQuery({
    queryKey: ["profit-loss"],
    queryFn: fetchProfitLoss,
  });

export const useTopProducts = () =>
  useQuery({
    queryKey: ["top-products"],
    queryFn: fetchTopProducts,
  });

export const useCustomerInsights = () =>
  useQuery({
    queryKey: ["top-buyers"],
    queryFn: fetchTopBuyers,
  });

export const useSmartInsights = () =>
  useQuery({
    queryKey: ["smart-insights"],
    queryFn: fetchSmartInsights,
  });
