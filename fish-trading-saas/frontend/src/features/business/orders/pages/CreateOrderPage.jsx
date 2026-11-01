import MainLayout from "@/components/layout/MainLayout";
import OrderForm from "../components/OrderForm";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function CreateOrderPage() {
  const navigate = useNavigate();
  const [orderSaved, setOrderSaved] = useState(false);

  const handleSuccess = () => {
    setOrderSaved(true);
    setTimeout(() => {
      navigate("/orders");
    }, 1200);
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Create Order</h1>
          <button
            className="btn btn-secondary px-4 py-2 rounded"
            onClick={() => navigate("/orders")}
            type="button"
          >
            Back to Orders
          </button>
        </div>
        <OrderForm onSuccess={handleSuccess} />
        {orderSaved && (
          <div className="text-green-600 font-medium mt-4">Order saved! Redirecting...</div>
        )}
      </div>
    </MainLayout>
  );
}
