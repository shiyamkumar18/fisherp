import { memo } from "react";
import {
  Bell,
  Fish,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { logoutUser } from "@/services/authService";
import { canAccessRoute } from "@/utils/permissions";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/orders", label: "Orders", icon: ShoppingCart },
  { to: "/products", label: "Products", icon: Package },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
];

const ROLE_BADGE = {
  admin: "bg-violet-100 text-violet-700",
  trader: "bg-blue-100 text-blue-700",
  customer: "bg-cyan-100 text-cyan-700",
};

const SidebarNav = memo(({ role, onClose }) => (
  <nav className="space-y-1">
    {NAV_ITEMS.filter((item) => canAccessRoute(role, item.to)).map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={onClose}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
            isActive
              ? "bg-blue-50 font-bold text-primary"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`
        }
      >
        <item.icon size={16} />
        {item.label}
      </NavLink>
    ))}
  </nav>
));

export default function AppLayout() {
  const { session, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar, closeSidebar, notifications } = useUiStore();
  const navigate = useNavigate();

  const role = session?.user?.role || "customer";
  const roleBadgeCls = ROLE_BADGE[role] || ROLE_BADGE.customer;
  const unreadCount = notifications.length;
  const initials = (session?.user?.username || "U").charAt(0).toUpperCase();

  const handleLogout = async () => {
    await logoutUser();
    logout();
    navigate("/login");
  };

  return (
    <div className="app-shell flex min-h-screen">
      {/* Mobile backdrop — closes sidebar on outside tap */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <Fish size={17} />
            </div>
            <div>
              <p className="text-sm font-extrabold leading-none text-slate-900">FisherP</p>
              <p className="mt-0.5 text-[11px] text-slate-400">Trading SaaS</p>
            </div>
          </div>
          <button
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 md:hidden"
            onClick={closeSidebar}
            aria-label="Close sidebar"
            type="button"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3">
          <SidebarNav role={role} onClose={closeSidebar} />
        </div>

        {/* User info + logout */}
        <div className="border-t border-slate-100 px-4 py-4">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-primary">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-800">
                {session?.user?.username || "User"}
              </p>
              <span
                className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold ${roleBadgeCls}`}
              >
                {role}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Sticky topbar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 md:hidden"
              onClick={toggleSidebar}
              type="button"
              aria-label="Open sidebar"
            >
              <Menu size={16} />
            </button>
            <div className="relative hidden sm:block">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="h-9 w-60 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:bg-white lg:w-72"
                placeholder="Search orders, products…"
                type="search"
                aria-label="Global search"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button
              className="relative rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              type="button"
              aria-label="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Profile pill */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm">
              <p className="font-bold leading-tight text-slate-800">
                {session?.user?.username || "User"}
              </p>
              <p className="text-[11px] leading-tight text-slate-400">{role}</p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
