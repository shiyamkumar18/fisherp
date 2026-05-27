import { useCompanies } from "../hooks/useAdmin";

export default function CompanyTable() {
  const { data, isLoading, isError, error } = useCompanies();
  const companies = Array.isArray(data) ? data : data?.companies || data?.data || [];
  return (
    <div className="bg-white rounded shadow p-4 overflow-x-auto">
      <h3 className="font-bold mb-2">Companies</h3>
      {isLoading && <div className="text-gray-500">Loading...</div>}
      {isError && <div className="text-red-600">{error?.message || "Failed to load companies."}</div>}
      {!isLoading && !isError && companies.length === 0 && <div className="text-gray-400">No companies found</div>}
      {!isLoading && !isError && companies.length > 0 && (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left font-semibold">Name</th>
              <th className="px-3 py-2 text-left font-semibold">Plan</th>
              <th className="px-3 py-2 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-b last:border-b-0">
                <td className="px-3 py-2">{c.name}</td>
                <td className="px-3 py-2">{c.plan}</td>
                <td className="px-3 py-2">
                  <span className={c.active ? "text-green-700 font-semibold" : "text-gray-400"}>
                    {c.active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
