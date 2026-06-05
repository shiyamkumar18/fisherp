import React from "react";
import InventoryActions from "./InventoryActions";
import Badge from "@/components/ui/Badge";

export default function InventoryTable({ data = [] }) {
  if (!data || data.length === 0)
    return <div className="p-6 text-muted text-center">No inventory items found.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white shadow rounded-lg text-sm">
        <thead>
          <tr className="border-b bg-slate-50">
            <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted">Fish</th>
            <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted">Stock</th>
            <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted">Status</th>
            <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id} className="border-b transition-colors hover:bg-slate-50">
              <td className="px-6 py-3">{item.fish || item.name}</td>
              <td className="px-6 py-3">{item.available_qty ?? 0} kg</td>
              <td className="px-6 py-3">
                {item.low_stock ? (
                  <Badge status="danger">Low</Badge>
                ) : item.expiring_soon ? (
                  <Badge status="pending">Expiring</Badge>
                ) : (
                  <Badge status="success">OK</Badge>
                )}
              </td>
              <td className="px-6 py-3">
                <InventoryActions item={item} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
