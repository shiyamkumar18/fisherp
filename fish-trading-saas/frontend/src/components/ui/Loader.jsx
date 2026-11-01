
export default function Loader({ overlay = false, size = 32, className = "" }) {
  const spinner = (
    <svg
      className="animate-spin text-primary"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" role="status" aria-label="Loading">
        {spinner}
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`} role="status" aria-label="Loading">
      {spinner}
      <div className="text-gray-500 mt-2">Loading...</div>
    </div>
  );
}
