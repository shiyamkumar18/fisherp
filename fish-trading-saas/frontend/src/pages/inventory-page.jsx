import { Card } from "@/components/ui/card";
import { Warehouse } from "lucide-react";

export default function InventoryPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="mt-1 text-sm text-slate-500">Monitor stock levels and manage your inventory.</p>
      </div>
      <Card className="flex items-center gap-4 p-8 text-slate-400">
        <Warehouse size={32} />
        <div>
          <p className="text-lg font-bold text-slate-700">Inventory Management</p>
          <p className="text-sm">Track fish stock, categories, and warehouse quantities here.</p>
        </div>
      </Card>
    </div>
  );
}
