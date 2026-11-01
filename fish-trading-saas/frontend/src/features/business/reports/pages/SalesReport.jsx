import React from "react";
import Card from "../../../components/ui/card";
import ExportButton from "../../../components/ui/ExportButton";

export default function SalesReport({ data = [], exportUrl }) {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Sales Report</h2>
        {exportUrl && <ExportButton url={exportUrl} label="Export Excel" />}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={2} className="p-6 text-center text-gray-400">No sales data</td>
              </tr>
            ) : (
              data.map((d) => (
                <tr key={d.date} className="border-t">
                  <td className="p-3">{d.date}</td>
                  <td className="p-3">₹{d.total}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
