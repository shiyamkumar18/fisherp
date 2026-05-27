// Financial summary cards for dashboard
import { useOverview } from "../hooks/useAnalytics";
import Card from "@/components/ui/Card";
import { TrendingUp, TrendingDown, DollarSign, PieChart } from "lucide-react";

function formatCurrency(amount) {
	if (typeof amount !== "number") return "-";
	return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function FinancialCards() {
	const { data, isLoading, isError, error } = useOverview();
	if (isLoading) {
		return <div className="p-4 text-gray-500">Loading financial summary...</div>;
	}
	if (isError) {
		return <div className="p-4 text-red-600">{error?.message || "Failed to load summary."}</div>;
	}
	const summary = data || {};
	const cards = [
		{
			label: "Revenue",
			value: formatCurrency(summary.revenue),
			icon: <TrendingUp className="text-green-600" size={24} />,
			color: "text-green-700",
		},
		{
			label: "Expenses",
			value: formatCurrency(summary.expenses),
			icon: <TrendingDown className="text-red-500" size={24} />,
			color: "text-red-600",
		},
		{
			label: "Profit",
			value: formatCurrency(summary.profit),
			icon: <PieChart className="text-blue-600" size={24} />,
			color: "text-blue-700",
		},
		{
			label: "Outstanding",
			value: formatCurrency(summary.outstanding),
			icon: <DollarSign className="text-yellow-500" size={24} />,
			color: "text-yellow-700",
		},
	];
	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
			{cards.map((card) => (
				<Card key={card.label} className="flex flex-col items-center gap-2 p-5">
					<div className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 mb-1">{card.icon}</div>
					<h3 className="text-xs font-medium text-secondary mb-1 uppercase tracking-wide">{card.label}</h3>
					<p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
				</Card>
			))}
		</div>
	);
}
