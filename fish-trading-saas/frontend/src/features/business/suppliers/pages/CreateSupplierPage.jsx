import MainLayout from "@/components/layout/MainLayout";
import SupplierForm from "../components/SupplierForm";

export default function CreateSupplierPage() {
  return (
    <MainLayout>
      <div className="p-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Add Supplier</h1>
        <SupplierForm />
      </div>
    </MainLayout>
  );
}
