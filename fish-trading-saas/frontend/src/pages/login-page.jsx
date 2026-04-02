import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginUser } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/shared/toast-provider";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { push } = useToast();

  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.username || !form.password) {
      setError("Username and password are required.");
      return;
    }

    setLoading(true);
    try {
      const session = await loginUser(form);
      login(session);
      push({ message: "Welcome back." });
      navigate("/");
    } catch (apiError) {
      setError(apiError.message);
      push({ message: apiError.message, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-cyan-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">Use your account to access the fish trading dashboard.</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm text-slate-600" htmlFor="username">Username</label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-600" htmlFor="password">Password</label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
