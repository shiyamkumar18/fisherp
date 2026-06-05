import { Card } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default function PurchasesPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Purchases</h1>
        <p className="mt-1 text-sm text-slate-500">Track and manage all your purchase orders.</p>
      </div>
      <Card className="flex items-center gap-4 p-8 text-slate-400">
        <ClipboardList size={32} />
        <div>
          <p className="text-lg font-bold text-slate-700">Purchase Management</p>
          <p className="text-sm">Create, view, and manage your purchase records here.</p>
        </div>
      </Card>
    </div>
  );
}
