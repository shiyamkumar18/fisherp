export default function UserTable() {
  // Placeholder: Fetch and render users
  return (
    <table>
      <thead>
        <tr>
          <th>Email</th>
          <th>Role</th>
          <th>Company</th>
        </tr>
      </thead>
      <tbody>
        {data.map((u) => (
          <tr key={u.id}>
            <td>{u.email}</td>
            <td>{u.role}</td>
            <td>{u.company}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
import { useUsers } from "../hooks/useAdmin";

export default function UserTable() {
  const { data, isLoading, isError, error } = useUsers();
  const users = Array.isArray(data) ? data : data?.users || data?.data || [];
  return (
    <div className="bg-white rounded shadow p-4 overflow-x-auto">
      <h3 className="font-bold mb-2">Users</h3>
      {isLoading && <div className="text-gray-500">Loading...</div>}
      {isError && <div className="text-red-600">{error?.message || "Failed to load users."}</div>}
      {!isLoading && !isError && users.length === 0 && <div className="text-gray-400">No users found</div>}
      {!isLoading && !isError && users.length > 0 && (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left font-semibold">Email</th>
              <th className="px-3 py-2 text-left font-semibold">Role</th>
              <th className="px-3 py-2 text-left font-semibold">Company</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-b-0">
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.role}</td>
                <td className="px-3 py-2">{u.company}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
