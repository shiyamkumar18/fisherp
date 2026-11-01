import { useEffect, useState } from "react";

/**
 * useBranding — Fetches and applies company branding (logo, primary color)
 * Usage: const { company, loading, error } = useBranding();
 * Automatically sets --color-primary CSS variable on load.
 */
export default function useBranding() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchBranding() {
      setLoading(true);
      try {
        const res = await fetch("/api/company/branding", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load branding");
        const data = await res.json();
        setCompany(data.company);
        // Set primary color as CSS variable
        if (data.company?.primary_color) {
          document.documentElement.style.setProperty("--color-primary", data.company.primary_color);
        }
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }
    fetchBranding();
  }, []);

  return { company, loading, error };
}
