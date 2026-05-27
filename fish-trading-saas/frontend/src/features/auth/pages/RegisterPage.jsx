import React, { useEffect, useState } from "react";

export default function RegisterPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-gray-600 mt-2">
            Register UI is currently a stub.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium">Email</span>
              <input
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                type="email"
                placeholder="you@company.com"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">Password</span>
              <input
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                type="password"
                placeholder="••••••••"
              />
            </label>

            <button
              type="button"
              className="w-full rounded-xl bg-blue-600 text-white font-semibold py-2.5 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60"
              disabled={!mounted}
              onClick={() => {
                // stub: replace with real registration call later
                alert("Register is a stub right now.");
              }}
            >
              {mounted ? "Create account" : "Loading..."}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            This page intentionally avoids runtime dependencies so it never renders a blank screen.
          </p>
        </div>
      </div>
    </div>
  );
}

