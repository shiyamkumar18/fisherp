import MainLayout from "@/components/layout/MainLayout";
import PaymentForm from "../components/PaymentForm";

export default function RecordPaymentPage() {
  return (
    <MainLayout>
      <div className="p-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Record Payment</h1>
        <PaymentForm />
      </div>
    </MainLayout>
  );
}
