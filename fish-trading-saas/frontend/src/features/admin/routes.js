// Platform admin routes (placeholder)
import ProtectedAdminRoute from "./ProtectedAdminRoute";
import AdminDashboard from "./pages/AdminDashboard";
import CompaniesPage from "./pages/CompaniesPage";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import UsersPage from "./pages/UsersPage";

export const adminRoutes = [
  {
    path: "/admin",
    element: <ProtectedAdminRoute />, // Protect all admin routes
    children: [
      { path: "dashboard", element: <AdminDashboard /> },
      { path: "companies", element: <CompaniesPage /> },
      { path: "subscriptions", element: <SubscriptionsPage /> },
      { path: "users", element: <UsersPage /> },
    ],
  },
];
