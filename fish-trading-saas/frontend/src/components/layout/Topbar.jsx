export default function Topbar() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="h-14 bg-white border-b shadow-sm flex items-center justify-between px-6">
      <h2 className="font-semibold text-slate-700 text-lg">{user?.companyName || "Dashboard"}</h2>
      <div className="flex items-center gap-4">
        <button className="hover:bg-slate-100 p-2 rounded-full transition-all duration-200 hover:scale-[1.08]" aria-label="Notifications">🔔</button>
        <img
          src="/avatar.png"
          className="w-8 h-8 bg-slate-300 rounded-full border border-gray-200 transition-all duration-200 hover:scale-[1.08]"
          alt="User avatar"
        />
      </div>
    </div>
  );
}
