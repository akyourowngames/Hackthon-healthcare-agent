"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuthDecorPanel } from "@/components/auth/AuthDecorPanel";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { OTPVerification } from "@/components/auth/OTPVerification";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import { useAuth } from "@/lib/auth-context";
import { isSupabaseConfigured } from "@/lib/supabase";

type AuthView = "signin" | "signup" | "verify";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signedIn } = useDashboard();
  const { isAuthenticated, loading } = useAuth();
  const [view, setView] = useState<AuthView>("signin");
  const [verifyEmail, setVerifyEmail] = useState("ananya@example.com");

  useEffect(() => {
    const param = searchParams.get("view");
    if (param === "signup") setView("signup");
    if (param === "verify") setView("verify");
  }, [searchParams]);

  const canAccessDashboard = signedIn || (isSupabaseConfigured && isAuthenticated);

  useEffect(() => {
    if (!loading && canAccessDashboard) {
      router.replace("/dashboard");
    }
  }, [loading, canAccessDashboard, router]);

  return (
    <main className="auth-bg min-h-screen text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-4 lg:flex-row lg:items-stretch lg:p-8">
        <AuthDecorPanel />

        <div className="flex flex-1 items-center justify-center py-6 lg:max-w-[42%]">
          <AnimatePresence mode="wait">
            {view === "verify" ? (
              <motion.div
                key="verify"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <OTPVerification email={verifyEmail} onBack={() => setView("signup")} />
              </motion.div>
            ) : view === "signup" ? (
              <motion.div
                key="signup"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <SignUpForm
                  onSwitchToSignIn={() => setView("signin")}
                  onSuccess={(email) => {
                    setVerifyEmail(email);
                    setView("verify");
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="signin"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <SignInForm onSwitchToSignUp={() => setView("signup")} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <DashboardProvider>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-slate-500">Loading…</div>}>
        <AuthContent />
      </Suspense>
    </DashboardProvider>
  );
}
