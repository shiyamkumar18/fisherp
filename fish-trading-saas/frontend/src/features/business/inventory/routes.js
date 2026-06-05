import InventoryPage from "./pages/InventoryPage";
import InventoryDetailsPage from "./pages/InventoryDetailsPage";

export const inventoryRoutes = [
  {
    path: "/inventory",
    element: <InventoryPage />,
  },
  {
    path: "/inventory/:id",
    element: <InventoryDetailsPage />,
  },
];
