import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchProducts } from "@/services/productService";
import { useToast } from "@/components/shared/toast-provider";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const { push } = useToast();

  useEffect(() => {
    setLoading(true);
    fetchProducts()
      .then((data) => setProducts(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const addMockProduct = () => {
    if (!name.trim()) return;
    setProducts((prev) => [...prev, { id: Date.now(), fish_name: name, category: "Custom", status: "In Stock", stockKg: 0 }]);
    setName("");
    push({ message: "Product added." });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl">Product Management</h2>
      <Card>
        <div className="mb-4 flex flex-col gap-2 md:flex-row">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add product name" />
          <Button onClick={addMockProduct}>Add Product</Button>
        </div>

        {error ? <p className="text-red-600">{error}</p> : null}
        {loading ? <p className="text-slate-500">Loading products...</p> : null}
        {!loading && !products.length ? <p className="text-slate-500">No products available.</p> : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-3">Name</th>
                <th className="py-3">Category</th>
                <th className="py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-3">{item.fish_name || item.name}</td>
                  <td className="py-3">{item.category || "General"}</td>
                  <td className="py-3">{item.status || "In Stock"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
