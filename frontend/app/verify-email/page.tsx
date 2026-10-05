"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

import OtpInput from "@/components/OptInput";
import { supabase } from "@/lib/supabase/supabaseClient";

export default function page () {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

   useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendCooldown((previous) => previous - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!email) {
      toast.error("Email address is missing.");
      router.replace("/signup");
    }
  }, [email, router]);

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Email address is missing.");
      return;
    }

    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (error) {
        console.error("OTP verification error:", error);
        toast.error(error.message || "Invalid or expired verification code.");
        return;
      }

      console.log("OTP verified successfully:", data);
      toast.success("Email verified successfully!");

      await fetch("/api/auth/clear-cookie", {
        method: "POST",
      });

      await supabase.auth.signOut();
      router.replace("/login");
    } catch (error) {
      console.error("VERIFY EMAIL ERROR:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error("Email address is missing.");
      return;
    }

    if (resendCooldown > 0) {
      return;
    }

    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        console.error("RESEND ERROR:", error);
        toast.error(error.message || "Unable to resend verification code.");
        return;
      }

      setOtp("");
      setResendCooldown(60);

      toast.success("New verification code sent!");
    } catch (error) {
      console.error("RESEND CODE ERROR:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen">
      <div className="fixed z-0 w-full h-full inset-0">
        <img src="./images/background.png" alt="background" className="h-full w-full object-cover"/>
      </div>

      <div className="relative text-white max-w-xs md:min-w-lg space-y-3">
        <div className="flex items-center justify-center gap-2">
          <img src="./Logo.svg" alt="webchat logo" className="w-20 h-20 drop-shadow-[0_0_16px_#c568f5]"/>
          <span className="text-5xl font-semibold bg-gradient-to-br from-[#c568f5] via-[#68a8ff] to-[#4ee7e8]
            bg-clip-text text-transparent [text-shadow:0_0_30px_#4ee7e8]"
          >
            WebChat
          </span>
        </div>

        <div className="text-center text-3xl font-semibold">
          Verify Your Email
        </div>

        <div className="mb-8">
          <div className="text-center text-gray-400">
            Enter the 6-digit verification code we sent to
          </div>
          <p className="text-center text-cyan-500">
            {email}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3 mb-3 md:mb-4">
          <OtpInput
            value={otp}
            onChange={(value) => {
              setOtp(value);
            }}
            disabled={loading}
          />
          <button type="submit" className="max-w-xs mx-auto mt-1 w-full text-center px-4 py-2 rounded-lg text-white cursor-pointer mt-8
            bg-gradient-to-r from-[#9f20e3] via-[#3B82F6] to-[#00D2D3] [box-shadow:0_0_12px_rgba(159,32,227,0.3),0_0_18px_rgba(59,130,246,0.2),0_0_24px_rgba(0,210,211,0.3)]">
            {loading && (
              <Loader2
                size={18}
                className="animate-spin"
              />
            )}

            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>
        
        <div className="flex flex-col justify-center items-center">
          <div className="text-gray-400">
            Didn't receive the code?{" "}
          </div>
          {resendCooldown > 0 ? (
            <div className="text-gray-500">
              Resend code in {resendCooldown}s
            </div>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || loading}
              className="cursor-pointer text-cyan-500 transition hover:text-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resending ? "Sending..." : "Resend Code"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}