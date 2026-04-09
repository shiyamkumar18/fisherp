import { Card } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

export default function PaymentsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="mt-1 text-sm text-slate-500">Track all incoming and outgoing payments.</p>
      </div>
      <Card className="flex items-center gap-4 p-8 text-slate-400">
        <CreditCard size={32} />
        <div>
          <p className="text-lg font-bold text-slate-700">Payment Tracking</p>
          <p className="text-sm">View payment history, pending dues, and manage transactions here.</p>
        </div>
      </Card>
    </div>
  );
}
