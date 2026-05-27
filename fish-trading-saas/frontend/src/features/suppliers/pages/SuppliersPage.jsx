import React from "react";
import { useSuppliers } from "../hooks/useSupplier";
import MainLayout from "@/components/layout/MainLayout";
import SupplierCard from "../components/SupplierCard";


export default function SuppliersPage() {
  const { data, isLoading, isError, error } = useSuppliers();

  // DRF list endpoints commonly return paginated payloads:
  // { count, next, previous, results }
  // Some endpoints may return plain arrays or other wrappers.
  const suppliers =
    data?.results ??
    data?.data ??
    data ??
    [];


  return (
    <MainLayout>
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Suppliers</h1>
        {isLoading && <div className="text-gray-500">Loading...</div>}
        {isError && <div className="text-red-600">
          {error?.message || "Failed to load suppliers."}</div>}
        {!isLoading && !isError && suppliers.length === 0 && (
          <div className="text-gray-500">No suppliers found.</div>
        )}
        <div className="space-y-2">
          {suppliers.map((s) => (
            <SupplierCard key={s.id} supplier={s} />
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
