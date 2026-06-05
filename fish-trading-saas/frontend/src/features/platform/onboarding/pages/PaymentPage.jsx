import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Card from "../../../components/ui/card";
import Button from "../../../components/ui/button";
import toast from "react-hot-toast";

export default function PaymentPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const plan = location.state?.plan;

  const handlePayment = async () => {
    setLoading(true);
    try {
      // 1. Create payment order on backend
      const res = await fetch("/api/create-payment/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan_id: plan.id }),
      });
      if (!res.ok) throw new Error("Failed to create payment order");
      const data = await res.json();

      // 2. Open Razorpay checkout
      const options = {
        key: "RAZORPAY_KEY", // Replace with env/config
        amount: data.amount,
        currency: data.currency,
        order_id: data.id,
        name: "FisherP Subscription",
        description: `${plan.name} Plan`,
        handler: function (response) {
          toast.success("Payment successful!");
          // Optionally verify payment on backend here
          navigate("/app/dashboard");
        },
        prefill: {},
        theme: { color: "#2563eb" },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto mt-12 p-6 text-center">
      <h2 className="text-xl font-bold mb-2">Payment</h2>
      <p className="mb-4">You selected the <span className="font-semibold">{plan?.name}</span> plan.</p>
      <Button onClick={handlePayment} className="mt-4 w-full" loading={loading} disabled={loading}>
        {loading ? "Processing..." : "Pay & Activate"}
      </Button>
    </Card>
  );
}
