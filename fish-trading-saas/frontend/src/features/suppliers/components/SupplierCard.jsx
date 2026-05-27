import React from "react";

export default function SupplierCard({ supplier }) {
  return (
    <div className="border rounded p-4 bg-white shadow mb-2 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-lg">{supplier.name}</h3>
        {supplier.is_preferred && (
          <span className="text-green-600 font-bold text-xs bg-green-100 px-2 py-1 rounded">Preferred</span>
        )}
      </div>
      <div className="text-gray-700">{supplier.phone}</div>
      {supplier.credit !== undefined && (
        <div className="text-sm text-gray-500">Credit: ₹{supplier.credit}</div>
      )}
    </div>
  );
}
