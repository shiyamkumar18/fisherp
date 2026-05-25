import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Building2, Mail, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginUser } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/shared/toast-provider";
import { config } from "@/config";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { push } = useToast();

  const [form, setForm] = useState({ company_name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const session = await loginUser(form);
      login(session);
      push({ message: "Welcome back." });
      navigate("/dashboard");
    } catch (apiError) {
      setError(apiError.message);
      push({ message: apiError.message, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const params = new URLSearchParams();
    params.set("redirect_uri", window.location.origin + "/login");
    if (form.company_name.trim()) {
      params.set("company_name", form.company_name.trim());
    }
    window.location.href = `${config.apiBaseUrl}/auth/google/login/?${params.toString()}`;
  };

  return (
    <div className="grid min-h-screen place-items-center bg-bg bg-gradient-to-br from-primary/5 to-cyan-500/5 p-4">
      <Card className="w-full max-w-md select-none">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">Use your account to access the fish trading dashboard.</p>

        {/* Google Sign-in */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="mt-6 flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:shadow-sm"
        >
          <svg viewBox="0 0 48 48" className="h-5 w-5">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Sign in with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or sign in with credentials
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          {/* Company Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-textSecondary" htmlFor="company_name">
              Company Name <span className="text-[10px] text-textSecondary/70">(optional)</span>
            </label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="company_name"
                className="pl-9"
                placeholder="e.g. Fresh Fish Traders"
                autoComplete="organization"
                value={form.company_name}
                onChange={(e) => setForm((prev) => ({ ...prev, company_name: e.target.value }))}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-textSecondary" htmlFor="email">Email Address</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                className="pl-9"
                placeholder="you@company.com"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>

          {/* Password with toggle */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-textSecondary" htmlFor="password">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                className="pl-9 pr-10"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-semibold text-blue-600 hover:underline">
            Create your workspace
          </Link>
        </p>
      </Card>
    </div>
  );
}
