import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export default function ProtectedAdminRoute() {
  const { user, impersonation } = useAuthStore();
  
  const isPlatformStaff = ["platform_operator", "platform_support", "platform_super_admin"].includes(user?.role);

  // Allow access only if they are platform staff and NOT currently impersonating a tenant.
  // If they are impersonating, they should be in the tenant UI (/dashboard).
  if (!user || !isPlatformStaff || impersonation) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
