import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import ProtectedRoute from "@/components/shared/protected-route";
import { ToastProvider } from "@/components/shared/toast-provider";
import { useAuthStore } from "@/store/authStore";
import { Skeleton } from "@/components/ui/skeleton";

const LoginPage = lazy(() => import("@/pages/login-page"));
const DashboardPage = lazy(() => import("@/pages/dashboard-page"));
const OrdersPage = lazy(() => import("@/pages/orders-page"));
const ProductsPage = lazy(() => import("@/pages/products-page"));
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

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <ToastProvider>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="products" element={<ProductsPage />} />
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
