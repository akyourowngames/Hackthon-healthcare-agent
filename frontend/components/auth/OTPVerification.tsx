"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { Mail } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { isDigitChar } from "@/lib/mock-dashboard";
import { useDashboard } from "@/lib/dashboard-context";

type OTPVerificationProps = {
  email: string;
  onBack: () => void;
};

export function OTPVerification({ email, onBack }: OTPVerificationProps) {
  const router = useRouter();
  const { signIn, showToast } = useDashboard();
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [seconds, setSeconds] = useState(60);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = window.setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearInterval(t);
  }, [seconds]);

  const filled = digits.every(Boolean);

  function setDigit(index: number, raw: string) {
    const ch = raw.length ? raw.slice(-1) : "";
    const digit = isDigitChar(ch) ? ch : "";
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < 5) inputs.current[index + 1]?.focus();
  }

  function onKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function verify() {
    if (!filled) return;
    setVerifying(true);
    window.setTimeout(() => {
      signIn(email);
      showToast("Email verified!", "success");
      router.push("/dashboard");
      setVerifying(false);
    }, 600);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="auth-card w-full max-w-md border border-white/[0.08] bg-white/[0.04] p-8 text-center backdrop-blur-xl"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/30"
      >
        <Mail className="h-10 w-10" />
      </motion.div>

      <h1 className="font-heading mt-6 text-2xl font-bold text-white">Check your inbox</h1>
      <p className="mt-2 text-sm text-slate-400">
        We&apos;ve sent a verification link to <strong className="text-white">{email}</strong>. Click the link or enter the code below.
      </p>

      <div className="mt-8 flex justify-center gap-2" aria-label="6 digit verification code">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputs.current[index] = el;
            }}
            value={digit}
            onChange={(e) => setDigit(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(index, e)}
            inputMode="numeric"
            maxLength={1}
            aria-label={`Digit ${index + 1}`}
            className={`h-14 w-11 rounded-lg border bg-[#0d0d12] text-center text-xl font-bold outline-none transition sm:w-12 ${
              digit ? "border-teal-500 text-teal-400" : "border-white/[0.08] focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/30"
            }`}
          />
        ))}
      </div>

      <Button className="mt-6" fullWidth disabled={!filled} loading={verifying} onClick={verify}>
        Verify OTP
      </Button>

      <p className="mt-4 text-sm text-slate-500">
        {seconds > 0 ? (
          <>Resend code in 0:{String(seconds).padStart(2, "0")}</>
        ) : (
          <button type="button" onClick={() => setSeconds(60)} className="font-semibold text-teal-400 hover:text-teal-300">
            Resend code
          </button>
        )}
      </p>

      <button type="button" onClick={onBack} className="mt-4 text-sm text-slate-500 hover:text-white">
        Wrong email? Go back
      </button>
    </motion.div>
  );
}
