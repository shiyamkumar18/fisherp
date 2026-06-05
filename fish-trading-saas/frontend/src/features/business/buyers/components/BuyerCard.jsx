import React from "react";

export default function BuyerCard({ buyer }) {
  return (
    <div className="border rounded p-4 bg-white shadow mb-2 flex flex-col gap-1">
      <h3 className="font-semibold text-lg">{buyer.name}</h3>
      <div className="text-gray-700">{buyer.phone}</div>
      <div className="text-red-500 font-semibold">
        Due: ₹{buyer.outstanding_amount ?? buyer.credit ?? 0}
      </div>
    </div>
  );
}
