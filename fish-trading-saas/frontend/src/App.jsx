import { Suspense, lazy, useEffect, useRef } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import ProtectedRoute from "@/components/shared/protected-route";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { ToastProvider } from "@/components/shared/toast-provider";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import Skeleton from "@/components/ui/skeleton";
import { adminRoutes } from "@/features/platform/admin/routes";

const LoginPage = lazy(() => import("@/features/platform/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/features/platform/auth/pages/RegisterPage"));
const LandingPage = lazy(() => import("@/features/core/landing/pages/LandingPage"));
const DashboardPage = lazy(() => import("@/features/business/dashboard/pages/DashboardPage"));
const HomePortal = lazy(() => import("@/features/business/dashboard/pages/HomePortal"));

function DashboardRoot() {
  const isSimple = localStorage.getItem("is_simple_ux") === "true";
  return isSimple ? <HomePortal /> : <DashboardPage />;
}
const OrdersPage = lazy(() => import("@/features/business/orders/pages/OrdersPage"));
const ProductsPage = lazy(() => import("@/features/business/products/pages/ProductsPage"));
const SalesPage = lazy(() => import("@/features/business/sales/pages/SalesPage"));
const PurchasesPage = lazy(() => import("@/features/business/purchases/pages/PurchasesPage"));
const PurchaseDetailPage = lazy(() => import("@/features/business/purchases/pages/PurchaseDetailPage"));
const SaleDetailPage = lazy(() => import("@/features/business/sales/pages/SaleDetailPage"));
const InventoryPage = lazy(() => import("@/features/business/inventory/pages/InventoryPage"));
const SuppliersPage = lazy(() => import("@/features/business/suppliers/pages/SuppliersPage"));
const CustomersPage = lazy(() => import("@/features/business/customers/pages/CustomersPage"));
const PaymentsPage = lazy(() => import("@/features/business/payments/pages/PaymentsPage"));
const PaymentDetailPage = lazy(() => import("@/features/business/payments/pages/PaymentDetailPage"));
const ReportsPage = lazy(() => import("@/features/business/reports/pages/ReportsPage"));
const ProfilePage = lazy(() => import("@/features/platform/profile/pages/ProfilePage"));
const SettingsPage = lazy(() => import("@/features/platform/settings/pages/SettingsPage"));
const TenantSupportPage = lazy(() => import("@/features/platform/support/pages/TenantSupportPage"));
const NotFoundPage = lazy(() => import("@/features/core/errors/pages/NotFoundPage"));

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
  const isFirstMount = useRef(true);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (withTransition) => {
      if (withTransition) {
        root.classList.add("theme-transition");
      }

      const isDark =
        theme === "dark" ||
        (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }

      if (withTransition) {
        return setTimeout(() => {
          root.classList.remove("theme-transition");
        }, 300);
      }
      return null;
    };

    const timeoutId = applyTheme(!isFirstMount.current);
    isFirstMount.current = false;

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => {
        applyTheme(true);
      };
      mediaQuery.addEventListener("change", listener);
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        mediaQuery.removeEventListener("change", listener);
      };
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
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
                <ErrorBoundary>
                  <AppLayout />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardRoot />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="sales/new" element={<SaleDetailPage />} />
            <Route path="sales/:id" element={<SaleDetailPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="purchases/new" element={<PurchaseDetailPage />} />
            <Route path="purchases/:id" element={<PurchaseDetailPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="payments/:id" element={<PaymentDetailPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="support" element={<TenantSupportPage />} />
          </Route>
          
          {/* Map Admin Routes */}
          {adminRoutes.map((route, i) => (
            <Route key={i} path={route.path} element={route.element}>
              {route.children?.map((child, j) => (
                <Route key={j} path={child.path} element={child.element}>
                  {child.children?.map((sub, k) => (
                    <Route key={k} path={sub.path} element={sub.element} />
                  ))}
                </Route>
              ))}
            </Route>
          ))}

          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}
