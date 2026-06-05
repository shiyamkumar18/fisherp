import React, { useState, useEffect } from "react";
import { updateProduct, fetchProducts } from "../service/productService";

const unitOptions = [
  { value: "kg", label: "Kilogram" },
  { value: "box", label: "Box" },
  { value: "piece", label: "Piece" },
  { value: "bucket", label: "Bucket" },
  { value: "tonne", label: "Tonne" },
];

const EditProductPage = ({ productId }) => {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchProducts().then((products) => {
      const product = products.find((p) => p.id === productId);
      setForm(product);
      setLoading(false);
    });
  }, [productId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await updateProduct(productId, form);
      setSuccess("Product updated!");
    } catch (e) {
      setError(e.message || "Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!form) return <div>Product not found</div>;

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Product</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Name</label>
          <input name="name" value={form.name} onChange={handleChange} required className="input input-bordered w-full" />
        </div>
        <div>
          <label className="block mb-1">Category</label>
          <input name="category" value={form.category} onChange={handleChange} required className="input input-bordered w-full" />
          {/* TODO: Replace with category dropdown from API */}
        </div>
        <div>
          <label className="block mb-1">Unit</label>
          <select name="unit_type" value={form.unit_type} onChange={handleChange} className="input input-bordered w-full">
            {unitOptions.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>
        {form.unit_type === "box" && (
          <div>
            <label className="block mb-1">Box Weight (kg)</label>
            <input name="box_weight_kg" value={form.box_weight_kg} onChange={handleChange} type="number" step="0.01" className="input input-bordered w-full" />
          </div>
        )}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block mb-1">Min Price (per kg)</label>
            <input name="min_price_per_kg" value={form.min_price_per_kg} onChange={handleChange} type="number" step="0.01" className="input input-bordered w-full" />
          </div>
          <div className="flex-1">
            <label className="block mb-1">Max Price (per kg)</label>
            <input name="max_price_per_kg" value={form.max_price_per_kg} onChange={handleChange} type="number" step="0.01" className="input input-bordered w-full" />
          </div>
          <div className="flex-1">
            <label className="block mb-1">Avg Price (per kg)</label>
            <input name="avg_price_per_kg" value={form.avg_price_per_kg} onChange={handleChange} type="number" step="0.01" className="input input-bordered w-full" />
          </div>
        </div>
        <div>
          <label className="inline-flex items-center">
            <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
            <span className="ml-2">Active</span>
          </label>
        </div>
        {error && <div className="text-red-600">{error}</div>}
        {success && <div className="text-green-600">{success}</div>}
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Saving..." : "Save"}</button>
      </form>
    </div>
  );
};

export default EditProductPage;
