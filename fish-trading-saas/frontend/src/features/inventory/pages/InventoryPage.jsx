import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useInventory } from "../hooks/useInventory";
import InventoryTable from "../components/InventoryTable";
import InventoryFilters from "../components/InventoryFilters";
import LowStockAlert from "../components/LowStockAlert";

export default function InventoryPage() {
  const [filters, setFilters] = useState({});
  const { data, isLoading, isError, error } = useInventory(filters);

  // Optionally show low stock alert if present in data
  const lowStockItems = data?.low_stock || [];

  return (
    <MainLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Inventory</h1>
        <InventoryFilters filters={filters} onChange={setFilters} />
        {isLoading && <div className="p-4">Loading inventory...</div>}
        {isError && (
          <div className="p-4 text-red-600">
            Error: {error?.message || "Failed to load inventory."}
          </div>
        )}
        <LowStockAlert items={lowStockItems} />
        <InventoryTable data={data?.data || data} />
      </div>
    </MainLayout>
  );
}
