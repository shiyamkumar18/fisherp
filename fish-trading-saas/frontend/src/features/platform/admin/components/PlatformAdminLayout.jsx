import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { 
  Activity, Users, LifeBuoy, BarChart3, 
  ShieldAlert, Stethoscope, TrendingUp, 
  UserCog, BellRing, Search, Command, CreditCard
} from "lucide-react";
import clsx from "clsx";
import { api } from "@/services/core/apiClient";

const NAV_ITEMS = [
  { label: "Live Operations", path: "/admin/dashboard", icon: Activity },
  { label: "Tenant Intelligence", path: "/admin/companies", icon: Users },
  { label: "Subscriptions", path: "/admin/subscriptions", icon: CreditCard },
  { label: "Support Command", path: "/admin/support", icon: LifeBuoy },
  { label: "Revenue Analytics", path: "/admin/revenue", icon: BarChart3 },
  { label: "Security & Audit", path: "/admin/security", icon: ShieldAlert },
  { label: "Diagnostics", path: "/admin/diagnostics", icon: Stethoscope },
  { label: "Growth Funnel", path: "/admin/growth", icon: TrendingUp },
  { label: "Staff Ops", path: "/admin/users", icon: UserCog },
  { label: "Alerts", path: "/admin/alerts", icon: BellRing },
];

export default function PlatformAdminLayout() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      setIsSearching(true);
      api.get(`/platform/enterprise/search/?q=${encodeURIComponent(searchQuery)}`)
        .then(res => setSearchResults(res.data.results || []))
        .catch(console.error)
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-300 font-sans flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#111] border-r border-white/10 flex flex-col h-screen shrink-0">
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Command size={16} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white tracking-wide">FisherP Ops</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Command Center</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all duration-200",
                  isActive
                    ? "bg-white/10 text-white font-medium"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                )
              }
            >
              <item.icon size={16} className={clsx("shrink-0")} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={() => navigate('/app/dashboard')}
            className="w-full py-2 px-3 text-xs bg-white/5 hover:bg-white/10 text-slate-300 rounded border border-white/10 transition-colors"
          >
            Exit to App
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-14 shrink-0 border-b border-white/10 bg-[#111]/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center text-sm text-slate-400">
            <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-medium border border-emerald-500/30 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Systems Operational
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tenants, tickets (Ctrl+K)..." 
                className="bg-black/50 border border-white/10 text-sm text-slate-200 rounded-md pl-9 pr-4 py-1.5 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 w-64 transition-all"
              />
              
              {/* Search Results Dropdown */}
              {searchQuery.length >= 2 && (
                <div className="absolute top-full mt-2 w-full bg-[#161616] border border-white/10 rounded-md shadow-2xl z-50 py-2">
                  {isSearching ? (
                    <div className="px-4 py-2 text-xs text-slate-500">Searching...</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((res, i) => (
                      <div key={i} className="px-4 py-2 hover:bg-white/5 cursor-pointer flex flex-col">
                        <span className="text-xs text-white font-medium">{res.name}</span>
                        <span className="text-[10px] text-indigo-400">{res.type}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-xs text-slate-500">No results found</div>
                  )}
                </div>
              )}
            </div>
            
            <div className="h-7 w-7 rounded-full bg-indigo-900 flex items-center justify-center border border-indigo-500/30 cursor-pointer">
              <span className="text-xs font-bold text-indigo-200">OP</span>
            </div>
          </div>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
