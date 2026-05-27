import MainLayout from "@/components/layout/MainLayout";
import LedgerTable from "../components/LedgerTable";

export default function LedgerPage() {
  return (
    <MainLayout>
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Ledger</h1>
        <LedgerTable />
      </div>
    </MainLayout>
  );
}
