// ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";

// Helper to decode JWT (naive, for demo)
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

/**
 * @param {string[]} allowedRoles - array of allowed roles (optional)
 * @param {boolean} platformOnly - if true, only platform users allowed
 * @param {boolean} tenantOnly - if true, only tenant users allowed
 * @param {ReactNode} children - children to render if authorized
 */
export default function ProtectedRoute({ allowedRoles, platformOnly, tenantOnly, children }) {
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  if (!token) return <Navigate to="/login" replace />;
  const user = parseJwt(token);
  if (!user) {
    logout();
    return <Navigate to="/login" replace />;
  }
  // Optionally check for token expiration (exp in seconds)
  if (user.exp && Date.now() / 1000 > user.exp) {
    logout();
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  if (platformOnly && !user.is_platform_user) {
    return <Navigate to="/unauthorized" replace />;
  }
  if (tenantOnly && user.is_platform_user) {
    return <Navigate to="/unauthorized" replace />;
  }
  // Subscription protection
  if (user.subscription_active === false && window.location.pathname !== "/subscription") {
    return <Navigate to="/subscription" replace />;
  }
  // Support both children and Outlet
  return children ? children : <Outlet />;
}
