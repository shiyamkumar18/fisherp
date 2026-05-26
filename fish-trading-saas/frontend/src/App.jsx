import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import ProtectedRoute from "@/components/shared/protected-route";
import { ToastProvider } from "@/components/shared/toast-provider";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { Skeleton } from "@/components/ui/skeleton";

const LoginPage = lazy(() => import("@/pages/login-page"));
const RegisterPage = lazy(() => import("@/pages/register-page"));
const LandingPage = lazy(() => import("@/pages/landing-page"));
const DashboardPage = lazy(() => import("@/pages/dashboard-page"));
const OrdersPage = lazy(() => import("@/pages/orders-page"));
const ProductsPage = lazy(() => import("@/pages/products-page"));
const SalesPage = lazy(() => import("@/pages/sales-page"));
const PurchasesPage = lazy(() => import("@/pages/purchases-page"));
const InventoryPage = lazy(() => import("@/pages/inventory-page"));
const SuppliersPage = lazy(() => import("@/pages/suppliers-page"));
const CustomersPage = lazy(() => import("@/pages/customers-page"));
const PaymentsPage = lazy(() => import("@/pages/payments-page"));
const ReportsPage = lazy(() => import("@/pages/reports-page"));
const ProfilePage = lazy(() => import("@/pages/profile-page"));
const SettingsPage = lazy(() => import("@/pages/settings-page"));
const NotFoundPage = lazy(() => import("@/pages/not-found-page"));

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
  const { hydrate } = useAuthStore();
  const { theme } = useUiStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  return (
    <ToastProvider>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
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
