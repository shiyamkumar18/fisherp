import { Card } from "@/components/ui/card";
import { FileBarChart } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">Generate and view business reports.</p>
      </div>
      <Card className="flex items-center gap-4 p-8 text-slate-400">
        <FileBarChart size={32} />
        <div>
          <p className="text-lg font-bold text-slate-700">Reports &amp; Analytics</p>
          <p className="text-sm">P&amp;L statements, sales trends, and custom business reports.</p>
        </div>
      </Card>
    </div>
  );
}
