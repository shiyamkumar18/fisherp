import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { canAccessRoute } from "@/utils/permissions";

export default function ProtectedRoute({ children }) {
  const { user, token } = useAuthStore();
  const location = useLocation();
  const session = token ? { user } : null;

  if (!session) return <Navigate to="/login" replace />;

  const role = session.user?.role || "customer";
  if (!canAccessRoute(role, location.pathname)) {
    // If they have an invalid role (e.g. from a previous caching bug), force logout to self-heal
    if (role === "customer") {
      useAuthStore.getState().logout();
      return <Navigate to="/login" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
