export function Skeleton({ className = "h-4 w-full" }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}
