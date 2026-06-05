import MainLayout from "@/components/layout/MainLayout";
import BuyerForm from "../components/BuyerForm";

export default function CreateBuyerPage() {
  return (
    <MainLayout>
      <div className="p-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Add Buyer</h1>
        <BuyerForm />
      </div>
    </MainLayout>
  );
}
