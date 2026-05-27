import Loader from "./Loader";

export default function Button({
  children,
  loading = false,
  fullWidth = false,
  className = "",
  ...props
}) {
  const base =
    "bg-primary hover:bg-primaryHover text-white px-4 py-2 rounded-lg shadow-sm transition-all duration-200 font-medium flex items-center justify-center gap-2 hover:scale-105 hover:shadow-lg disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary" +
    (fullWidth ? " w-full" : "");
  return (
    <button
      className={`${base} ${className}`}
      disabled={loading || props.disabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? <Loader className="w-4 h-4 animate-spin" /> : children}
    </button>
  );
}
