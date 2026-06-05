import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { BusinessDashboard } from "@/components/dashboard/tenant/BusinessDashboard";

export default function DashboardPage() {
  const { user, impersonation } = useAuthStore();
  const isPlatformStaff = ["platform_operator", "platform_support", "platform_super_admin"].includes(user?.role) && !impersonation;

  if (isPlatformStaff) {
    // Redirect to the new Enterprise Platform Console
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <BusinessDashboard />;
}
