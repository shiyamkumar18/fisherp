// ProductsPage.jsx
import React, { useEffect, useState } from "react";
import { fetchProducts, deleteProduct } from "../service/productService";
// import { useNavigate } from "react-router-dom";

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    fetchProducts()
      .then(setProducts)
      .catch((e) => setError(e.message || "Failed to load products"))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      alert("Delete failed");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Products</h1>
        {/* <button onClick={() => navigate('/products/create')} className="btn btn-primary">Add Product</button> */}
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <table className="min-w-full border">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.category_name || product.category}</td>
                <td>{product.unit_type_display || product.unit_type}</td>
                <td>
                  {/* <button onClick={() => navigate(`/products/edit/${product.id}`)} className="btn btn-sm">Edit</button> */}
                  <button onClick={() => handleDelete(product.id)} className="btn btn-sm btn-danger ml-2">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ProductsPage;
