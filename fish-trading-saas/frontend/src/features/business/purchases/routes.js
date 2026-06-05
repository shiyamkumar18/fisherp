// Purchase feature routes
export const purchaseRoutes = [
  {
    path: "/purchases/new",
    element: () => import("./pages/CreatePurchasePage.jsx"),
    exact: true,
  },
  {
    path: "/purchases",
    element: () => import("./pages/PurchaseListPage.jsx"),
    exact: true,
  },
];
