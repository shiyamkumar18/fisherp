import React, { lazy } from "react";

const SuppliersPage = lazy(() => import("./pages/SuppliersPage"));

export const supplierRoutes = [
  {
    path: "/suppliers",
    element: <SuppliersPage />,
  },
];
