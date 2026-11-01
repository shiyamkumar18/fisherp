// Platform admin routes
import { Navigate } from "react-router-dom";
import ProtectedAdminRoute from "./ProtectedAdminRoute";
import PlatformAdminLayout from "./components/PlatformAdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import CompaniesPage from "./pages/CompaniesPage";
import SubscriptionManagementPage from "./pages/SubscriptionManagementPage";
import SubscriptionDetailsPage from "./pages/SubscriptionDetailsPage";
import UsersPage from "./pages/UsersPage";
import SupportDeskPage from "./pages/SupportDeskPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import RevenueIntelligencePage from "./pages/RevenueIntelligencePage";
import DiagnosticsPage from "./pages/DiagnosticsPage";
import GrowthFunnelPage from "./pages/GrowthFunnelPage";
import AlertCenterPage from "./pages/AlertCenterPage";

export const adminRoutes = [
  {
    path: "/admin",
    element: <ProtectedAdminRoute />, // Protect all admin routes
    children: [
      {
        path: "",
        element: <PlatformAdminLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard",    element: <AdminDashboard /> },
          { path: "companies",    element: <CompaniesPage /> },
          { path: "subscriptions",element: <SubscriptionManagementPage /> },
          { path: "subscriptions/:id",element: <SubscriptionDetailsPage /> },
          { path: "users",        element: <UsersPage /> },
          { path: "support",      element: <SupportDeskPage /> },
          { path: "revenue",      element: <RevenueIntelligencePage /> },
          { path: "security",     element: <AuditLogsPage /> },
          { path: "diagnostics",  element: <DiagnosticsPage /> },
          { path: "growth",       element: <GrowthFunnelPage /> },
          { path: "alerts",       element: <AlertCenterPage /> },
        ]
      }
    ],
  },
];

