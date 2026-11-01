// Feature routes for products
import React from "react";

const ProductsPage = React.lazy(() => import("./pages/ProductsPage"));

export default [
  {
    path: "/products",
    element: <ProductsPage />,
    // Add children or route guards as needed
  },
];
