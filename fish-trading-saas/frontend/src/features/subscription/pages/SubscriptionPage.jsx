import React, { useState, useEffect } from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import PlanCard from "../components/PlanCard";
import toast from "react-hot-toast";

// Example plans (replace with API fetch)
const plansData = [
  { id: "basic", name: "Basic", price: 0, features: ["Up to 3 users", "Basic reports"] },
  { id: "pro", name: "Pro", price: 999, features: ["Unlimited users", "Advanced reports", "Priority support"] },
];

export default function SubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // TODO: Fetch plans and current plan from API
    setPlans(plansData);
    setCurrentPlan(null); // Set to user's current plan if available
  }, []);

  const handleRenew = async (plan) => {
    setLoading(true);
    try {
      // Call backend to create payment order for renewal
      const res = await fetch("/api/create-payment/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan_id: plan.id }),
      });
      if (!res.ok) throw new Error("Failed to create payment order");
      const data = await res.json();
      const options = {
        key: "RAZORPAY_KEY",
        amount: data.amount,
        currency: data.currency,
        order_id: data.id,
        name: "FisherP Subscription",
        description: `${plan.name} Plan Renewal`,
        handler: function () {
          toast.success("Subscription renewed!");
          window.location.reload();
        },
        theme: { color: "#2563eb" },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.message || "Renewal failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-12 p-6 text-center">
      <h2 className="text-xl font-bold mb-4">Your plan expired</h2>
      <p className="mb-6 text-gray-600">Renew your subscription to continue using FisherP.</p>
      <div className="flex flex-col md:flex-row gap-6 justify-center mb-6">
        {plans.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={plan.id === currentPlan?.id}
            onSelect={() => handleRenew(plan)}
          />
        ))}
      </div>
      <Button onClick={() => handleRenew(plans[0])} loading={loading} disabled={loading} className="w-full max-w-xs mx-auto">
        {loading ? "Processing..." : "Renew Subscription"}
      </Button>
    </Card>
  );
}
