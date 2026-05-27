import React from "react";
import MainLayout from "@/components/layout/MainLayout";
import PurchaseForm from "../components/PurchaseForm";

export default function CreatePurchasePage() {
  return (
    <MainLayout>
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Create Purchase</h1>
        <PurchaseForm />
      </div>
    </MainLayout>
  );
}
