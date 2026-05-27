import React, { useEffect, useState } from "react";
// import { fetchAuditLogs } from "../service/auditService";

const demoLogs = [
  { id: 1, user: "Shiyam", action: "Created Order", entity: "#123", time: "10:30 AM" },
  { id: 2, user: "Admin", action: "Deleted Product", entity: "#45", time: "11:00 AM" },
  { id: 3, user: "Shiyam", action: "Updated Inventory", entity: "#88", time: "11:15 AM" },
];

export default function AuditLogsPage() {
  // const [logs, setLogs] = useState([]);
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState(null);
  const [logs] = useState(demoLogs);
  const [loading] = useState(false);
  const [error] = useState(null);

  // useEffect(() => {
  //   fetchAuditLogs()
  //     .then(setLogs)
  //     .catch((e) => setError(e.message || "Failed to load logs"))
  //     .finally(() => setLoading(false));
  // }, []);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Audit Logs</h1>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <table className="min-w-full border">
          <thead>
            <tr>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.user}</td>
                <td>{log.action}</td>
                <td>{log.entity}</td>
                <td>{log.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
