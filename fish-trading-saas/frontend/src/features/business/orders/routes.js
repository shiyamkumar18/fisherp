import React from "react";

const OrdersPage = React.lazy(() => import("./pages/OrdersPage"));
const CreateOrderPage = React.lazy(() => import("./pages/CreateOrderPage"));

export const orderRoutes = [
  {
    path: "/app/orders",
    element: <OrdersPage />,
  },
  {
    path: "/app/orders/create",
    element: <CreateOrderPage />,
  },
];
