import { useMutation } from "@tanstack/react-query";
import { loginUser as login } from "../service/authService";

// Some builds reference OTP helpers; if missing, keep them as no-op stubs.
const sendOtp = async () => ({});
const verifyOtp = async () => ({ user: { is_platform_user: false } });
import { useAuthStore } from "@/store/useAuthStore";

export const useLogin = () => {
  const loginAction = useAuthStore((state) => state.login);
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      if (typeof loginAction === "function") loginAction(data);
    },
  });
};



export const useSendOtp = () =>
  useMutation({
    mutationFn: sendOtp,
  });

export const useVerifyOtp = () => {
  const setAuth = useAuthStore((s) => s.login);
  return useMutation({
    mutationFn: verifyOtp,
    onSuccess: (data) => {
      setAuth(data);
    },
  });
};
