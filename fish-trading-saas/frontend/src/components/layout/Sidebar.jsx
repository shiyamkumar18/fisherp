





import useBranding from "../../hooks/useBranding";
import { Home, ShoppingCart, Boxes, FileText, Users, DollarSign, Truck } from "lucide-react";
import useAuthStore from "../../hooks/useAuthStore";

export default function Sidebar() {
  const { company } = useBranding();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { user, impersonation } = useAuthStore();
  const role = impersonation?.role || (impersonation ? "tenant_admin" : user?.role);

  // Role-based menu config
  const menuConfig = {
    admin: [
      { name: "Dashboard", path: "/app/dashboard", icon: Home },
      { name: "Orders", path: "/app/orders", icon: ShoppingCart },
      { name: "Inventory", path: "/app/inventory", icon: Boxes },
      { name: "Purchases", path: "/app/purchases", icon: FileText },
      { name: "Suppliers", path: "/app/suppliers", icon: Truck },
      { name: "Buyers", path: "/app/buyers", icon: Users },
      { name: "Payments", path: "/app/payments", icon: DollarSign },
      { name: "Reports", path: "/app/reports", icon: FileText },
    ],
    staff: [
      { name: "Dashboard", path: "/app/dashboard", icon: Home },
      { name: "Orders", path: "/app/orders", icon: ShoppingCart },
      { name: "Inventory", path: "/app/inventory", icon: Boxes },
      { name: "Buyers", path: "/app/buyers", icon: Users },
      { name: "Payments", path: "/app/payments", icon: DollarSign },
    ],
    manager: [
      { name: "Dashboard", path: "/app/dashboard", icon: Home },
      { name: "Orders", path: "/app/orders", icon: ShoppingCart },
      { name: "Reports", path: "/app/reports", icon: FileText },
    ],
    // Add more roles as needed
  };

  const menu = menuConfig[role] || menuConfig["staff"];

  return (
    <>
      {/* Mobile sidebar toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-white dark:bg-gray-900 rounded shadow p-2 hover:shadow-lg transition"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle sidebar"
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="12" width="18" height="2" rx="1"/><rect x="3" y="6" width="18" height="2" rx="1"/><rect x="3" y="18" width="18" height="2" rx="1"/></svg>
      </button>
      {/* Sidebar */}
      <div
        className={`w-64 max-w-full bg-white border-r h-full flex flex-col fixed md:static top-0 left-0 z-40 transition-transform duration-200 md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-4 border-b flex items-center gap-2 min-h-[64px]">
          {company?.logo ? (
            <img src={company.logo} alt={company.name || "Company Logo"} className="h-10 w-auto max-w-[120px] object-contain" />
          ) : (
            <span className="font-bold text-lg flex items-center gap-2">🐟 FisherP</span>
          )}
        </div>
        <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
          {menu.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 text-base font-medium transition-all duration-150 ${
                  active
                    ? "bg-blue-50 text-blue-600 shadow"
                    : "hover:bg-slate-100 text-slate-700"
                }`}
                style={undefined}
                onClick={() => setOpen(false)}
              >
                {Icon && <Icon size={20} className={active ? "text-accent" : "text-slate-400 group-hover:text-accent transition"} />}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close sidebar"
        />
      )}
    </>
  );
}
