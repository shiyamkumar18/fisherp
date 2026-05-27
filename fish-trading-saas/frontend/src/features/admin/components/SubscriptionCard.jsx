export default function SubscriptionCard() {
  // Placeholder: Fetch and render subscriptions
  return (
    <div className="card">
      <h3>{sub.company}</h3>
      <p>{sub.plan}</p>
      <p>{sub.status}</p>
    </div>
  );
}
import { useSubscriptions } from "../hooks/useAdmin";

export default function SubscriptionCard() {
  const { data, isLoading, isError, error } = useSubscriptions();
  const subs = Array.isArray(data) ? data : data?.subscriptions || data?.data || [];
  return (
    <div className="bg-white rounded shadow p-4">
      <h3 className="font-bold mb-2">Subscriptions</h3>
      {isLoading && <div className="text-gray-500">Loading...</div>}
      {isError && <div className="text-red-600">{error?.message || "Failed to load subscriptions."}</div>}
      {!isLoading && !isError && subs.length === 0 && <div className="text-gray-400">No subscriptions found</div>}
      {!isLoading && !isError && subs.length > 0 && (
        <ul className="text-sm">
          {subs.map((sub) => (
            <li key={sub.id} className="mb-2 border-b last:border-b-0 pb-2">
              <div className="font-semibold">{sub.company}</div>
              <div className="text-gray-500">{sub.plan}</div>
              <div className={sub.status === "active" ? "text-green-700" : "text-gray-400"}>{sub.status}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
