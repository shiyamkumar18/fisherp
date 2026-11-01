

import { useSuppliers } from "@/features/business/suppliers/hooks/useSuppliers";
import { useFish } from "@/features/business/products/hooks/useFish";
import { createPurchase } from "../service/purchaseService";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";


export default function PurchaseForm() {
  const { data: suppliers = [], isLoading: loadingSuppliers } = useSuppliers();
  const { data: fishList = [], isLoading: loadingFish } = useFish();
  const [form, setForm] = useState({
    supplier: "",
    fish: "",
    number_of_packages: "",
    package_weight: "",
    price_per_kg: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const totalWeight = Number(form.number_of_packages) * Number(form.package_weight);
  const totalAmount = totalWeight * Number(form.price_per_kg);

  const initialState = { supplier: "", fish: "", number_of_packages: "", package_weight: "", price_per_kg: "" };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (!form.supplier || !form.fish || !form.number_of_packages || !form.package_weight || !form.price_per_kg) {
      setError("All fields are required");
      setLoading(false);
      return;
    }
    try {
      const response = await createPurchase({
        supplier: form.supplier,
        fish: form.fish,
        number_of_packages: Number(form.number_of_packages),
        package_weight: Number(form.package_weight),
        price_per_kg: Number(form.price_per_kg),
      });
      toast.success("PO Created: " + (response?.purchase_number || "Success"));
      setForm(initialState);
      setTimeout(() => navigate("/app/purchases"), 1200);
    } catch (e) {
      setError(e.message || "Failed to create purchase");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-1 font-semibold">Supplier</label>
        <select
          className="input border px-2 py-1 rounded w-full"
          name="supplier"
          value={form.supplier}
          onChange={handleChange}
          required
        >
          <option value="">Select Supplier</option>
          {loadingSuppliers ? <option>Loading...</option> : suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block mb-1 font-semibold">Fish</label>
        <select
          className="input border px-2 py-1 rounded w-full"
          name="fish"
          value={form.fish}
          onChange={handleChange}
          required
        >
          <option value="">Select Fish</option>
          {loadingFish ? <option>Loading...</option> : fishList.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block mb-1">Packages</label>
          <input
            type="number"
            name="number_of_packages"
            value={form.number_of_packages}
            onChange={handleChange}
            min="1"
            className="input input-bordered w-full"
            required
          />
        </div>
        <div className="flex-1">
          <label className="block mb-1">Weight/Package (kg)</label>
          <input
            type="number"
            name="package_weight"
            value={form.package_weight}
            onChange={handleChange}
            min="0.01"
            step="0.01"
            className="input input-bordered w-full"
            required
          />
        </div>
        <div className="flex-1">
          <label className="block mb-1">Price/kg</label>
          <input
            type="number"
            name="price_per_kg"
            value={form.price_per_kg}
            onChange={handleChange}
            min="0.01"
            step="0.01"
            className="input input-bordered w-full"
            required
          />
        </div>
      </div>
      <div className="font-semibold">Total Weight: {isNaN(totalWeight) ? 0 : totalWeight} kg</div>
      <div className="font-semibold">Total Amount: ₹{isNaN(totalAmount) ? 0 : totalAmount}</div>
      {error && <div className="text-red-600">{error}</div>}
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? "Saving..." : "Save Purchase"}
      </button>
    </form>
  );
}
