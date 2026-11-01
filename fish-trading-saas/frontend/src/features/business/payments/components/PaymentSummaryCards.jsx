import React from "react";

export default function PaymentSummaryCards({ summary }) {
  const received = Number(summary?.received ?? 0);
  const paid = Number(summary?.paid ?? 0);
  const netCash = received - paid;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-green-100 text-green-800 rounded p-4 flex flex-col items-center">
        <h3 className="font-bold text-lg mb-1">Total Received</h3>
        <p className="text-2xl font-mono">₹{received.toLocaleString()}</p>
      </div>
      <div className="bg-yellow-100 text-yellow-800 rounded p-4 flex flex-col items-center">
        <h3 className="font-bold text-lg mb-1">Total Paid</h3>
        <p className="text-2xl font-mono">₹{paid.toLocaleString()}</p>
      </div>
      <div className="bg-blue-100 text-blue-800 rounded p-4 flex flex-col items-center">
        <h3 className="font-bold text-lg mb-1">Net Cash</h3>
        <p className="text-2xl font-mono">₹{netCash.toLocaleString()}</p>
      </div>
    </div>
  );
}
