export default function OrderFilters() {
  // TODO: Add filter controls
import { useState } from "react";

export default function OrderFilters({ filters, onChange }) {
  const [search, setSearch] = useState(filters?.search || "");
  const [status, setStatus] = useState(filters?.status || "");

  // Handle input changes and notify parent
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    onChange?.({ ...filters, search: e.target.value, status });
  };
  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    onChange?.({ ...filters, search, status: e.target.value });
  };

  return (
    <div className="flex gap-2 mb-4">
      <input
        placeholder="Search..."
        className="input border px-3 py-2 rounded"
        value={search}
        onChange={handleSearchChange}
      />
      <select
        className="input border px-3 py-2 rounded"
        value={status}
        onChange={handleStatusChange}
      >
        <option value="">All Statuses</option>
        <option value="completed">Completed</option>
        <option value="pending">Pending</option>
        <option value="cancelled">Cancelled</option>
        <option value="shipped">Shipped</option>
      </select>
    </div>
  );
}
