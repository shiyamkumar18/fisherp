import React, { Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { dashboardRoutes } from "@/features/business/dashboard/routes";
import { supplierRoutes } from "@/features/business/suppliers/routes";
import { orderRoutes } from "@/features/business/orders/routes";
import Loader from "../components/ui/Loader";
import AuthCallback from "@/features/platform/platform/auth/pages/AuthCallback";
import ProtectedRoute from "@/features/platform/platform/auth/components/ProtectedRoute";
import MainLayout from "../components/layout/MainLayout";
import { ErrorBoundary } from "../components/shared/ErrorBoundary";

export default function AppRouter() {
  return (
    <ErrorBoundary>
      <Router>
        <MainLayout>
          <Suspense fallback={<Loader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/unauthorized" element={<div className="p-8 text-red-500">Unauthorized</div>} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Protected tenant routes */}
              <Route element={<ProtectedRoute tenantOnly={true} />}>
                <Route path="/app/dashboard" element={<DashboardPage />} />
                {/* Add more /app/* tenant routes here */}
              </Route>

              {/* Protected platform routes */}
              <Route element={<ProtectedRoute platformOnly={true} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                {/* Add more /admin/* platform routes here */}
              </Route>

              {/* Other feature routes (public or protected as needed) */}
              {[
                ...dashboardRoutes,
                ...supplierRoutes,
                ...orderRoutes,
              ].map((route, idx) => (
                <Route key={idx} path={route.path} element={route.element} />
              ))}
            </Routes>
          </Suspense>
        </MainLayout>
      </Router>
    </ErrorBoundary>
  );
}
