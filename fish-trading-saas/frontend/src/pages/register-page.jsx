import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Building2, Mail, Lock, User, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/shared/toast-provider";
import { apiClient } from "@/services/apiClient";

const strengthColors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-emerald-500"];
const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

function getPasswordStrength(value) {
  let s = 0;
  if (value.length >= 8) s++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) s++;
  if (/[0-9]/.test(value)) s++;
  if (/[^a-zA-Z0-9]/.test(value)) s++;
  return s;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { push } = useToast();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    company_name: "",
    email: "",
    phone: "",
    password: "",
    password_confirm: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const set = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = "First name is required";
    if (!form.last_name.trim()) errs.last_name = "Last name is required";
    if (!form.company_name.trim()) errs.company_name = "Company name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email";
    if (!form.phone.trim()) errs.phone = "Phone is required";
    else if (form.phone.replace(/\D/g, "").length < 10) errs.phone = "Enter a valid phone number";
    if (!form.password) errs.password = "Password is required";
    else if (form.password.length < 8) errs.password = "At least 8 characters";
    if (!form.password_confirm) errs.password_confirm = "Please confirm your password";
    else if (form.password !== form.password_confirm) errs.password_confirm = "Passwords do not match";
    if (!agreed) errs.terms = "You must agree to the terms";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        company_name: form.company_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        password_confirm: form.password_confirm,
      };
      await apiClient.post("/register/", payload);
      push({ message: "Account created! Redirecting to login…" });
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      const msg =
        err?.response?.data?.errors?.detail ||
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Registration failed. Please try again.";
      setError(msg);
      push({ message: msg, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(form.password);

  return (
    <div className="grid min-h-screen place-items-center bg-bg bg-gradient-to-br from-primary/5 to-cyan-500/5 p-4">
      <Card className="w-full max-w-lg select-none">
        <h1 className="text-2xl font-bold">Create Account</h1>
        <p className="mt-2 text-sm text-slate-600">
          Join FisherP and start managing your fish trading business.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-textSecondary" htmlFor="first_name">First Name *</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="first_name" className="pl-9" placeholder="John" value={form.first_name} onChange={set("first_name")} />
              </div>
              {fieldErrors.first_name && <p className="text-xs text-red-500">{fieldErrors.first_name}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-textSecondary" htmlFor="last_name">Last Name *</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="last_name" className="pl-9" placeholder="Doe" value={form.last_name} onChange={set("last_name")} />
              </div>
              {fieldErrors.last_name && <p className="text-xs text-red-500">{fieldErrors.last_name}</p>}
            </div>
          </div>

          {/* Company Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-textSecondary" htmlFor="company_name">Company Name *</label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input id="company_name" className="pl-9" placeholder="Your Company Ltd" autoComplete="organization" value={form.company_name} onChange={set("company_name")} />
            </div>
            {fieldErrors.company_name && <p className="text-xs text-red-500">{fieldErrors.company_name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-textSecondary" htmlFor="reg_email">Email *</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input id="reg_email" type="email" className="pl-9" placeholder="you@company.com" autoComplete="email" value={form.email} onChange={set("email")} />
            </div>
            {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-textSecondary" htmlFor="reg_phone">Phone *</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input id="reg_phone" type="tel" className="pl-9" placeholder="+91 98765 43210" autoComplete="tel" value={form.phone} onChange={set("phone")} />
            </div>
            {fieldErrors.phone && <p className="text-xs text-red-500">{fieldErrors.phone}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-textSecondary" htmlFor="reg_password">Password *</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="reg_password"
                type={showPassword ? "text" : "password"}
                className="pl-9 pr-10"
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                value={form.password}
                onChange={set("password")}
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
            {form.password && (
              <div className="flex items-center gap-2">
                <div className="flex h-1 flex-1 gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-full flex-1 rounded-full transition-colors ${strength >= i ? strengthColors[i] : "bg-slate-200"}`} />
                  ))}
                </div>
                <span className="text-xs text-slate-500">{strengthLabels[strength]}</span>
              </div>
            )}
            {fieldErrors.password && <p className="text-xs text-red-500">{fieldErrors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-textSecondary" htmlFor="reg_password_confirm">Confirm Password *</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="reg_password_confirm"
                type={showConfirm ? "text" : "password"}
                className="pl-9 pr-10"
                placeholder="Re-enter password"
                autoComplete="new-password"
                value={form.password_confirm}
                onChange={set("password_confirm")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password_confirm && <p className="text-xs text-red-500">{fieldErrors.password_confirm}</p>}
          </div>

          {/* Terms */}
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => { setAgreed(e.target.checked); setFieldErrors((prev) => ({ ...prev, terms: "" })); }}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-blue-600"
            />
            I agree to the Terms of Service and Privacy Policy
          </label>
          {fieldErrors.terms && <p className="text-xs text-red-500">{fieldErrors.terms}</p>}

          <Button className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create Account"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
