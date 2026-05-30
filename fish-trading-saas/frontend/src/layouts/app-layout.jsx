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
  Monitor,
  Menu,
  X,
  ChevronRight,
  Fish,
  ShoppingBag,
  BarChart3,
  MoreHorizontal
} from "lucide-react";
import VoiceAssistant from "@/components/shared/voice-assistant";
import { canAccessRoute } from "@/utils/permissions";

export default function AppLayout() {
  const { user, logout, entitlements = [] } = useAuthStore();
  const { sidebarOpen, toggleSidebar, closeSidebar, theme, toggleTheme } = useUiStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser(); // Invalidate server-side refresh token
    } catch {
      // Ignore API errors — clear local session regardless
    }
    logout();
    navigate("/login");
  };

  const allNavGroups = [
    {
      title: "Core",
      items: [
        { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        ...(entitlements.includes("advanced_analytics") ? [{ path: "/dashboard/reports", label: "Reports & Analytics", icon: BarChart3 }] : [])
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
  
  const role = user?.role || "guest";
  
  // Filter nav groups based on RBAC permissions
  const navGroups = allNavGroups.map(group => ({
    ...group,
    items: group.items.filter(item => canAccessRoute(role, item.path))
  })).filter(group => group.items.length > 0);

  const operatorNavGroups = [
    {
      title: "Core",
      items: [
        { path: "/dashboard", label: "Platform Dashboard", icon: LayoutDashboard }
      ]
    },
    {
      title: "Settings",
      items: [
        { path: "/dashboard/profile", label: "My Profile", icon: User }
      ]
    }
  ];

  const activeNavGroups = user?.role === "platform_operator" ? operatorNavGroups : navGroups;

  const currentPath = location.pathname;
  let currentPageLabel = "Dashboard";
  for (const group of activeNavGroups) {
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
      </AnimatePresence>      {/* Sidebar Navigation - Hidden on Mobile, Visible on Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 hidden md:flex md:flex-col md:static md:translate-x-0 bg-surface border-r border-border ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/20">
              <Fish className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-textPrimary leading-none">
                FisherP
              </span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                SaaS Portal
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={closeSidebar}
            className="rounded-lg p-1.5 hover:bg-border/30 md:hidden cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-5">
          {activeNavGroups.map((group, idx) => (
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
                        isActive ? "sidebar-link sidebar-link-active shadow-sm" : "sidebar-link hover:-translate-y-0.5 hover:shadow-sm"
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
              className="rounded-lg p-2 hover:bg-border/30 hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-textSecondary hover:text-textPrimary transition-colors cursor-pointer hidden sm:block" onClick={() => navigate("/dashboard")}>
                App
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-textSecondary/50 hidden sm:block" />
              <span className="font-semibold text-textPrimary">{currentPageLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-xl p-2 hover:bg-border/30 text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
              title={
                theme === "light"
                  ? "Theme: Light (Switch to Dark)"
                  : theme === "dark"
                  ? "Theme: Dark (Switch to System)"
                  : "Theme: System (Switch to Light)"
              }
            >
              {theme === "light" ? (
                <Sun className="h-5 w-5" />
              ) : theme === "dark" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Monitor className="h-5 w-5" />
              )}
            </button>

            {/* User Dropdown Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-border/20 text-left transition-colors cursor-pointer"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white font-extrabold text-sm shadow-sm shadow-primary/20 transition-transform group-hover:scale-105">
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
        <main className="flex-1 overflow-y-auto p-4 md:p-8 mobile-bottom-safe">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </main>
        {entitlements.includes("ai_assistant") && <VoiceAssistant />}
        
        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 min-h-[72px] bg-surface/95 backdrop-blur-xl border-t border-border z-40 flex items-center justify-around pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(0,0,0,0.05)]">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full py-2 space-y-1 transition-all ${isActive ? "text-primary scale-110" : "text-textSecondary hover:text-textPrimary"}`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[10px] font-extrabold tracking-wide">Home</span>
          </NavLink>
          
          <NavLink
            to="/dashboard/purchases"
            className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full py-2 space-y-1 transition-all ${isActive ? "text-primary scale-110" : "text-textSecondary hover:text-textPrimary"}`}
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="text-[10px] font-extrabold tracking-wide">Buy</span>
          </NavLink>

          <NavLink
            to="/dashboard/sales"
            className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full py-2 space-y-1 transition-all ${isActive ? "text-primary scale-110" : "text-textSecondary hover:text-textPrimary"}`}
          >
            <TrendingUp className="h-5 w-5" />
            <span className="text-[10px] font-extrabold tracking-wide">Sell</span>
          </NavLink>

          <NavLink
            to="/dashboard/inventory"
            className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full py-2 space-y-1 transition-all ${isActive ? "text-primary scale-110" : "text-textSecondary hover:text-textPrimary"}`}
          >
            <Layers className="h-5 w-5" />
            <span className="text-[10px] font-extrabold tracking-wide">Stock</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setMoreMenuOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full py-2 space-y-1 text-textSecondary hover:text-textPrimary transition-all active:scale-95"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-extrabold tracking-wide">More</span>
          </button>
        </div>

        {/* Mobile "More" Bottom Sheet Modal */}
        <AnimatePresence>
          {moreMenuOpen && (
            <>
              <div className="md:hidden fixed inset-0 bg-secondary/50 z-50" onClick={() => setMoreMenuOpen(false)} />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="md:hidden fixed bottom-0 left-0 right-0 bg-surface rounded-t-3xl border-t border-border z-50 p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-textPrimary">More Options</h3>
                  <button onClick={() => setMoreMenuOpen(false)} className="p-2 bg-border/20 rounded-full">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-6">
                  {navGroups.map((group, idx) => (
                    <div key={idx} className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary/70">
                        {group.title}
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        {group.items.map((item, itemIdx) => {
                          const Icon = item.icon;
                          return (
                            <NavLink
                              key={itemIdx}
                              to={item.path}
                              onClick={() => setMoreMenuOpen(false)}
                              className={({ isActive }) =>
                                `flex items-center gap-2 p-3 rounded-xl text-sm font-bold transition-colors ${
                                  isActive ? "bg-primary/10 text-primary border border-primary/20" : "bg-surface border border-border text-textSecondary"
                                }`
                              }
                            >
                              <Icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 p-3 mt-4 rounded-xl text-sm font-bold bg-danger/10 text-danger border border-danger/20"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
