import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { canAccessRoute } from "@/utils/permissions";

export default function ProtectedRoute({ children }) {
  const { session, isHydrated } = useAuthStore();
  const location = useLocation();

  if (!isHydrated) return null;
  if (!session) return <Navigate to="/login" replace />;

  const role = session.user?.role || "customer";
  if (!canAccessRoute(role, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
