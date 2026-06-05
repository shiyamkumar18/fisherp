// GoogleLoginButton.jsx
import React, { useState } from "react";

export default function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);
  const handleGoogleLogin = () => {
    setLoading(true);
    window.location.href =
      (import.meta.env.VITE_API_URL || "") + "/auth/google/";
  };

  return (
    <button
      onClick={handleGoogleLogin}
      className="btn bg-red-500 text-white mt-4 flex items-center justify-center"
      disabled={loading}
      aria-label="Continue with Google"
      type="button"
    >
      <svg width="20" height="20" viewBox="0 0 48 48" className="mr-2" aria-hidden="true"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C35.64 2.36 30.18 0 24 0 14.82 0 6.73 5.48 2.69 13.44l7.98 6.2C12.13 13.13 17.62 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.5c0-1.64-.15-3.22-.43-4.74H24v9.04h12.42c-.54 2.9-2.18 5.36-4.64 7.04l7.18 5.59C43.27 37.27 46.1 31.4 46.1 24.5z"/><path fill="#FBBC05" d="M10.67 28.04A14.5 14.5 0 019.5 24c0-1.4.23-2.76.64-4.04l-7.98-6.2A23.93 23.93 0 000 24c0 3.77.9 7.34 2.5 10.5l8.17-6.46z"/><path fill="#EA4335" d="M24 48c6.18 0 11.36-2.04 15.14-5.54l-7.18-5.59c-2 1.36-4.56 2.18-7.96 2.18-6.38 0-11.87-3.63-14.33-8.94l-8.17 6.46C6.73 42.52 14.82 48 24 48z"/></g></svg>
      {loading ? "Redirecting..." : "Continue with Google"}
    </button>
  );
}
