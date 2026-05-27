export default function StatCard({ title, value, change, changeType = "up" }) {
  const changeColor = changeType === "down" ? "text-red-500" : "text-green-500";
  const arrow = changeType === "down" ? "↓" : "↑";
  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm transition-all duration-200 hover:shadow-md">
      <p className="text-sm text-secondary">{title}</p>
      <h2 className="text-xl font-semibold mt-1">{value}</h2>
      {change && (
        <p className={`text-xs mt-1 ${changeColor}`}>
          {change} {arrow}
        </p>
      )}
    </div>
  );
}
