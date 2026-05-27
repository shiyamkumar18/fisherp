import MainLayout from "@/components/layout/MainLayout";
import PaymentList from "../components/PaymentList";

export default function PaymentsPage() {
  return (
    <MainLayout>
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Payments</h1>
        <PaymentList />
      </div>
    </MainLayout>
  );
}
