
import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import ProtectedRoute from "@/components/shared/protected-route";
import { ToastProvider } from "@/components/shared/toast-provider";
import { useAuthStore } from "@/store/authStore";
import Skeleton from "@/components/ui/Skeleton";

// Feature pages imports (all lazy)
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const LandingPage = lazy(() => import("@/features/landing/pages/LandingPage"));
const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));
const OrdersPage = lazy(() => import("@/features/orders/pages/OrdersPage"));
const ProductsPage = lazy(() => import("@/features/products/pages/ProductsPage"));
const PurchasesPage = lazy(() => import("@/features/purchases/pages/PurchaseListPage"));
const InventoryPage = lazy(() => import("@/features/inventory/pages/InventoryPage"));
const SuppliersPage = lazy(() => import("@/features/suppliers/pages/SuppliersPage"));
const PaymentsPage = lazy(() => import("@/features/payments/pages/PaymentsPage"));
const ProfilePage = lazy(() => import("@/features/profile/pages/ProfilePage"));
const SettingsPage = lazy(() => import("@/features/settings/pages/SettingsPage"));

// Placeholders for missing feature pages
const SalesPage = lazy(() => import("@/features/sales/pages/SalesPage"));
const CustomersPage = lazy(() => import("@/features/customers/pages/CustomersPage"));
const ReportsPage = lazy(() => import("@/features/reports/pages/ReportsPage"));
const RegisterPage = lazy(() => import("@/features/auth/pages/RegisterPage"));
const NotFoundPage = lazy(() => import("@/features/errors/pages/NotFoundPage"));

function Fallback() {
  return (
    <div className="p-6">
      <Skeleton className="h-8 w-56" />
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, idx) => <Skeleton key={idx} className="h-24" />)}
      </div>
    </div>
  );
}

export default function App() {
  const authStore = useAuthStore();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  // Removed hydrate effect: useAuthStore does not provide hydrate

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  return (
    <ToastProvider>
      <div className="fixed top-4 right-4 z-50">
        <button
          className="px-3 py-1 rounded-xl bg-gray-200 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 shadow"
          onClick={() => setDarkMode((d) => !d)}
          aria-label="Toggle dark mode"
        >
          {darkMode ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/app/*"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}
