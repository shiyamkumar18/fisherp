import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import React from "react";

export default function InventoryFilters() {
  // TODO: Wire up filter logic
  return (
    <div className="flex gap-3 mb-4 items-end">
      <div className="flex-1">
        <Input placeholder="Search..." />
      </div>
      <div>
        <select className="w-full border p-2 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none">
          <option value="">All Statuses</option>
          <option value="low">Low Stock</option>
          <option value="ok">OK</option>
          <option value="expiring">Expiring Soon</option>
        </select>
      </div>
      <Button>Filter</Button>
    </div>
  );
}
