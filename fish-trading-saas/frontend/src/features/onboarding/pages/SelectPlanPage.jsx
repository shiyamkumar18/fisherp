import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../../components/ui/Card";
import PlanCard from "../../subscription/components/PlanCard";

const plans = [
  { id: "basic", name: "Basic", price: 0, features: ["Up to 3 users", "Basic reports"] },
  { id: "pro", name: "Pro", price: 999, features: ["Unlimited users", "Advanced reports", "Priority support"] },
];

export default function SelectPlanPage() {
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  const handleSelect = (plan) => {
    setSelected(plan.id);
    setTimeout(() => {
      navigate("/onboarding/payment", { state: { plan } });
    }, 400); // Small delay for UX
  };

  return (
    <Card className="max-w-2xl mx-auto mt-12 p-6">
      <h2 className="text-xl font-bold mb-6 text-center">Choose a Plan</h2>
      <div className="flex flex-col md:flex-row gap-6 justify-center">
        {plans.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={selected === plan.id}
            onSelect={() => handleSelect(plan)}
          />
        ))}
      </div>
    </Card>
  );
}
