import React, { useState } from "react";
import { exportOrders } from "../service/reportService";

const SalesReport = () => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  // const [summary, setSummary] = useState(null);
  // const [data, setData] = useState([]);
  // const [loading, setLoading] = useState(false);


  const handleExport = () => {
    exportOrders({ from, to });
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Sales Report</h1>
      <div className="flex gap-4 mb-4">
        <div>
          <label>From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input input-bordered" />
        </div>
        <div>
          <label>To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input input-bordered" />
        </div>
        <button onClick={handleExport} className="btn btn-primary self-end">Export Excel</button>
      </div>
      {/* TODO: Show summary totals and table here */}
      <div className="bg-gray-100 p-2 rounded mb-2">Summary: (coming soon)</div>
      <div className="text-gray-500">Report table and summary coming soon.</div>
    </div>
  );
};

export default SalesReport;
