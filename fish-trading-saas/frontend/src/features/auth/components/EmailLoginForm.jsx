// EmailLoginForm.jsx
import { useState } from "react";
import { useLogin } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function EmailLoginForm() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const { mutate, isLoading, error } = useLogin();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    mutate(form, {
      onSuccess: (data) => {
        if (data.user.is_platform_user) {
          navigate("/admin/dashboard");
        } else {
          navigate("/app/dashboard");
        }
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-xs mx-auto">
      <Input
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={e => setForm({ ...form, email: e.target.value })}
        required
        autoComplete="username"
      />
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          placeholder="Password"
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
          required
          autoComplete="current-password"
        />
        <button
          type="button"
          aria-label={showPassword ? "Hide password" : "Show password"}
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-gray-400 hover:text-gray-700"
          tabIndex={-1}
        >
          {showPassword ? '🙈' : '👁️'}
        </button>
      </div>
      {error && <div className="text-red-600 text-sm">{error.message || "Login failed"}</div>}
      <Button type="submit" loading={isLoading} fullWidth>
        {isLoading ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  );
}
