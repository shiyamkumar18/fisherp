import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function SalesPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Sales</h1>
        <p className="mt-1 text-sm text-slate-500">Manage and track all your sales transactions.</p>
      </div>
      <Card className="flex items-center gap-4 p-8 text-slate-400">
        <TrendingUp size={32} />
        <div>
          <p className="text-lg font-bold text-slate-700">Sales Management</p>
          <p className="text-sm">Create, view, and manage your sales records here.</p>
        </div>
      </Card>
    </div>
  );
}
