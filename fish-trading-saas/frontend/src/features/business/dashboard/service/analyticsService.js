import { api } from "@/services/core/apiClient";

export const getOverview = () =>
	api.get("/dashboard/overview/");

export const getProfitLoss = () =>
	api.get("/dashboard/profit-loss/");

export const getSalesTrend = () =>
	api.get("/dashboard/sales-trend/");

export const getTopProducts = () =>
	api.get("/dashboard/top-products/");

export const getTopBuyers = () =>
	api.get("/dashboard/top-buyers/");
