import React from "react";
import Button from "../../../components/ui/button";

export default function PlanCard({ plan, selected, onSelect }) {
  return (
    <div className={`border rounded-xl shadow p-6 flex-1 min-w-[220px] ${selected ? "border-primary ring-2 ring-primary" : "border-gray-200"}`}>
      <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
      <div className="text-2xl font-bold mb-2">{plan.price === 0 ? "Free" : `₹${plan.price}/mo`}</div>
      <ul className="mb-4 text-sm text-gray-600 list-disc list-inside">
        {plan.features.map(f => <li key={f}>{f}</li>)}
      </ul>
      <Button variant={selected ? "primary" : "outline"} onClick={onSelect} disabled={selected} className="w-full">
        {selected ? "Current Plan" : "Choose Plan"}
      </Button>
    </div>
  );
}
