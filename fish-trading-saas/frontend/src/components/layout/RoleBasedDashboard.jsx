import React from "react";
import AdminDashboard from "../dashboards/AdminDashboard";
import StaffDashboard from "../dashboards/StaffDashboard";
import ManagerDashboard from "../dashboards/ManagerDashboard";
import { useUser } from "../../hooks/useUser";
import Loader from "../ui/Loader";
import ErrorBox from "../ui/ErrorBox";

/**
 * RoleBasedDashboard — Renders dashboard based on user role
 * Usage: <RoleBasedDashboard />
 */
export default function RoleBasedDashboard() {
  const { user, loading, error } = useUser();

  if (loading) return <Loader />;
  if (error) return <ErrorBox message={error.message || "Failed to load user"} />;
  if (!user) return null;

  switch (user.role) {
    case "admin":
      return <AdminDashboard />;
    case "staff":
      return <StaffDashboard />;
    case "manager":
      return <ManagerDashboard />;
    default:
      return <div className="p-8 text-gray-500">No dashboard for your role.</div>;
  }
}
