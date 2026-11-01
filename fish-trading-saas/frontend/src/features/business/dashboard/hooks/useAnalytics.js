import { useQuery } from "@tanstack/react-query";
import * as api from "../service/analyticsService";

export const useOverview = () =>
	useQuery({
		queryKey: ["overview"],
		queryFn: async () => {
			const res = await api.getOverview();
			return res.data;
		},
	});

export const useProfitLoss = () =>
	useQuery({
		queryKey: ["profit"],
		queryFn: async () => {
			const res = await api.getProfitLoss();
			return res.data;
		},
	});

export const useSalesTrend = () =>
	useQuery({
		queryKey: ["sales"],
		queryFn: async () => {
			const res = await api.getSalesTrend();
			return res.data;
		},
	});

export const useTopProducts = () =>
	useQuery({
		queryKey: ["products"],
		queryFn: async () => {
			const res = await api.getTopProducts();
			return res.data;
		},
	});

export const useTopBuyers = () =>
	useQuery({
		queryKey: ["buyers"],
		queryFn: async () => {
			const res = await api.getTopBuyers();
			return res.data;
		},
	});
