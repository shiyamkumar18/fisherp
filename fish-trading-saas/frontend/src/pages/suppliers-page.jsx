import { Card } from "@/components/ui/card";
import { Truck } from "lucide-react";

export default function SuppliersPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your supplier contacts and relationships.</p>
      </div>
      <Card className="flex items-center gap-4 p-8 text-slate-400">
        <Truck size={32} />
        <div>
          <p className="text-lg font-bold text-slate-700">Supplier Management</p>
          <p className="text-sm">Add, edit, and track your fish suppliers here.</p>
        </div>
      </Card>
    </div>
  );
}
