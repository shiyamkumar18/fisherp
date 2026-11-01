// Smart insights panel for dashboard
import { useSmartInsights } from "../hooks/useAnalytics";

import Card from "@/components/ui/card";

export default function InsightsPanel() {
	const { data, isLoading, isError, error } = useSmartInsights?.() ?? {};
	const insights = Array.isArray(data) ? data : data?.insights || data?.data || [];
	return (
		<Card className="transition-all duration-200 hover:shadow-md">
			<h3 className="font-medium text-base mb-2">Insights</h3>
			{isLoading && <div className="text-gray-500">Loading...</div>}
			{isError && <div className="text-red-600">{error?.message || "Failed to load insights."}</div>}
			{!isLoading && !isError && insights.length === 0 && <div className="text-gray-400">No insights available</div>}
			{!isLoading && !isError && insights.length > 0 && (
				<ul className="text-sm mt-2 space-y-1">
					{insights.map((i, idx) => (
						<li key={idx} className="">⚡ {typeof i === "string" ? i : i.text || JSON.stringify(i)}</li>
					))}
				</ul>
			)}
		</Card>
	);
}
