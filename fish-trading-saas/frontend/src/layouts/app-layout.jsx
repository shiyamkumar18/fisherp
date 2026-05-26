import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { logoutUser } from "@/services/authService";
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  Users,
  Settings,
  User,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  ChevronRight,
  Fish,
  ShoppingBag,
  BarChart3
} from "lucide-react";

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar, closeSidebar, theme, setTheme } = useUiStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser(); // Invalidate server-side refresh token
    } catch {
      // Ignore API errors — clear local session regardless
    }
    logout();
    navigate("/login");
  };

  const navGroups = [
    {
      title: "Core",
      items: [
        { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { path: "/dashboard/reports", label: "Reports & Analytics", icon: BarChart3 }
      ]
    },
    {
      title: "Transactions",
      items: [
        { path: "/dashboard/orders", label: "Orders Log", icon: FileText },
        { path: "/dashboard/sales", label: "Sales (Billing)", icon: TrendingUp },
        { path: "/dashboard/purchases", label: "Purchases Batch", icon: ShoppingBag },
        { path: "/dashboard/payments", label: "Payments Log", icon: DollarSign }
      ]
    },
    {
      title: "Registry & Inventory",
      items: [
        { path: "/dashboard/products", label: "Products", icon: Package },
        { path: "/dashboard/inventory", label: "Inventory Tracking", icon: Layers },
        { path: "/dashboard/suppliers", label: "Suppliers", icon: Users },
        { path: "/dashboard/customers", label: "Customers/Buyers", icon: Users }
      ]
    },
    {
      title: "Settings",
      items: [
        { path: "/dashboard/profile", label: "My Profile", icon: User },
        { path: "/dashboard/settings", label: "Tenant Settings", icon: Settings }
      ]
    }
  ];

  const currentPath = location.pathname;
  let currentPageLabel = "Dashboard";
  for (const group of navGroups) {
    const item = group.items.find(i => i.path === currentPath);
    if (item) {
      currentPageLabel = item.label;
      break;
    }
  }

  return (
    <div className="flex min-h-screen bg-bg text-textPrimary">
      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="fixed inset-0 z-40 bg-black lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-cyan-400 text-white shadow-md shadow-primary/25">
              <Fish className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
                FisherP
              </span>
              <span className="block text-[9px] text-textSecondary uppercase tracking-widest font-extrabold">
                SaaS Portal
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={closeSidebar}
            className="rounded-lg p-1.5 hover:bg-border/30 lg:hidden cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-5">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <span className="px-4 text-[10px] font-bold uppercase tracking-wider text-textSecondary/50">
                {group.title}
              </span>
              <div className="space-y-0.5">
                {group.items.map((item, itemIdx) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={itemIdx}
                      to={item.path}
                      onClick={closeSidebar}
                      className={({ isActive }) =>
                        isActive ? "sidebar-link sidebar-link-active" : "sidebar-link"
                      }
                      end={item.path === "/dashboard"}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar User Footer */}
        <div className="border-t border-border p-4 bg-border/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
              {user?.username?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-textPrimary">
                {user?.username || "Loading..."}
              </p>
              <p className="truncate text-[10px] text-textSecondary font-semibold">
                {user?.company_name || user?.email || "SaaS Tenant"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface/85 backdrop-blur-md px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleSidebar}
              className="rounded-lg p-2 hover:bg-border/30 lg:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            {/* Breadcrumbs */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-textSecondary hover:text-textPrimary transition-colors cursor-pointer" onClick={() => navigate("/dashboard")}>
                App
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-textSecondary/50" />
              <span className="font-semibold text-textPrimary">{currentPageLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="rounded-xl p-2 hover:bg-border/30 text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>

            {/* User Dropdown Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-border/20 text-left transition-colors cursor-pointer"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-sm shadow-primary/20">
                  {user?.username?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="hidden md:inline text-sm font-semibold text-textPrimary">
                  {user?.username || "Account"}
                </span>
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-surface p-2 shadow-xl z-20"
                    >
                      <div className="px-3 py-2 border-b border-border mb-1.5">
                        <p className="text-[10px] text-textSecondary uppercase tracking-wider font-bold">Role</p>
                        <p className="text-sm font-bold text-textPrimary capitalize">{user?.role || "user"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate("/dashboard/profile");
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-textSecondary hover:bg-border/30 hover:text-textPrimary transition-colors cursor-pointer"
                      >
                        <User className="h-4 w-4" />
                        <span>View Profile</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate("/dashboard/settings");
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-textSecondary hover:bg-border/30 hover:text-textPrimary transition-colors cursor-pointer"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
