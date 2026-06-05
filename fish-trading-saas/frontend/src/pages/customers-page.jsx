import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function CustomersPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your customer base and buyer profiles.</p>
      </div>
      <Card className="flex items-center gap-4 p-8 text-slate-400">
        <Users size={32} />
        <div>
          <p className="text-lg font-bold text-slate-700">Customer Management</p>
          <p className="text-sm">Add, view, and manage your buyers and customer accounts here.</p>
        </div>
      </Card>
    </div>
  );
}
