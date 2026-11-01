import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSendOtp, useVerifyOtp } from "../hooks/useAuth";

export default function PhoneLoginForm() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);

  const sendOtpMutation = useSendOtp();
  const verifyOtpMutation = useVerifyOtp();
  const navigate = useNavigate();

  const handleSendOtp = () => {
    if (!/^\d{10,15}$/.test(phone)) return;
    sendOtpMutation.mutate(phone, {
      onSuccess: () => setStep(2),
    });
  };

  const handleVerify = () => {
    if (!otp) return;
    verifyOtpMutation.mutate(
      { phone, otp },
      {
        onSuccess: (data) => {
          if (data?.user?.is_platform_user) navigate("/admin/dashboard");
          else navigate("/app/dashboard");
        },
      }
    );
  };

  return (
    <div>
      {step === 1 && (
        <>
          <input
            placeholder="Phone Number"
            className="input"
            onChange={(e) => setPhone(e.target.value)}
            value={phone}
          />
          {sendOtpMutation.isError && (
            <div className="error">
              {sendOtpMutation.error?.response?.data?.error || "Failed to send OTP"}
            </div>
          )}
          <button
            onClick={handleSendOtp}
            className="btn mt-2"
            disabled={sendOtpMutation.isLoading || !/^\d{10,15}$/.test(phone)}
          >
            {sendOtpMutation.isLoading ? "Sending..." : "Send OTP"}
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <input
            placeholder="Enter OTP"
            className="input"
            onChange={(e) => setOtp(e.target.value)}
            value={otp}
          />
          {verifyOtpMutation.isError && (
            <div className="error">
              {verifyOtpMutation.error?.response?.data?.error || "OTP verification failed"}
            </div>
          )}
          <button
            onClick={handleVerify}
            className="btn mt-2"
            disabled={verifyOtpMutation.isLoading || !otp}
          >
            {verifyOtpMutation.isLoading ? "Verifying..." : "Verify & Login"}
          </button>
        </>
      )}
    </div>
  );
}

