import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function ProtectedAdminRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="p-8 text-center">Checking access...</div>;
  if (!user || !user.is_platform_user) {
    return <Navigate to="/app/dashboard" replace />;
  }
  return <Outlet />;
}
