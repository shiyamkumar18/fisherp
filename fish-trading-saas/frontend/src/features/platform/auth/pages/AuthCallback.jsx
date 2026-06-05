import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.login);

  useEffect(() => {
    const token = params.get("token");
    const user = params.get("user");
    let userObj = null;
    try {
      if (user) userObj = JSON.parse(decodeURIComponent(user));
    } catch {}

    if (token) {
      setAuth({ token, user: userObj });
      // Smart redirect based on user role/platform
      if (userObj?.is_platform_user) {
        navigate("/admin/dashboard");
      } else {
        navigate("/app/dashboard");
      }
    } else {
      navigate("/login");
    }
  }, []);

  return <p>Logging you in...</p>;
}
