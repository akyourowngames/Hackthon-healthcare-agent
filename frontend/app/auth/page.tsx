"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"info" | "error" | "success">("info");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated && isSupabaseConfigured) {
      router.push("/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  const setMessage = (msg: string, type: "info" | "error" | "success" = "info") => {
    setStatus(msg);
    setStatusType(type);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean) { setMessage("Enter your email.", "error"); return; }
    if (!password.trim() && isSupabaseConfigured) { setMessage("Enter your password.", "error"); return; }

    setSubmitting(true);
    setMessage("");

    if (!isSupabaseConfigured) {
      window.localStorage.setItem("vaidy_user_id", "local-user");
      setMessage("Running in local mode. Redirecting...", "success");
      setTimeout(() => router.push("/dashboard"), 500);
      setSubmitting(false);
      return;
    }

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: clean,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        setMessage("Account created! Check your email to confirm, then sign in.", "success");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: clean,
          password,
        });
        if (error) throw error;
        setMessage("Signed in! Redirecting...", "success");
        setTimeout(() => router.push("/dashboard"), 300);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      setMessage(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      window.localStorage.setItem("vaidy_user_id", "local-user");
      router.push("/dashboard");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) setMessage(error.message, "error");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050608] px-4 py-8 text-white">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="mb-8 inline-flex items-center gap-2.5 text-white no-underline">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#00d97e] text-[#03120a]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 12h4l2-6 4 12 2-6h6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="text-lg font-extrabold tracking-tight">vaidy</span>
        </Link>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#00d97e]/70">
            {isSupabaseConfigured ? "Secure Authentication" : "Local Development Mode"}
          </p>
          <h1 className="mt-3 text-2xl font-extrabold">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-white/45">
            {mode === "signup"
              ? "Start tracking your health with AI-powered insights."
              : "Sign in to access your health dashboard."}
          </p>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={signInWithGoogle}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3.5 text-sm font-semibold text-white/80 transition hover:border-white/[0.18] hover:bg-white/[0.07]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.08]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">or</span>
            <div className="h-px flex-1 bg-white/[0.08]" />
          </div>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 rounded-xl border border-white/[0.08] bg-white/[0.025] p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-lg px-3 py-2 text-sm font-bold transition ${mode === "login" ? "bg-[#00d97e] text-[#03120a]" : "text-white/50 hover:text-white"}`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-lg px-3 py-2 text-sm font-bold transition ${mode === "signup" ? "bg-[#00d97e] text-[#03120a]" : "text-white/50 hover:text-white"}`}
            >
              Sign up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="mt-5 space-y-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#00d97e]/50 focus:ring-1 focus:ring-[#00d97e]/20 transition"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#00d97e]/50 focus:ring-1 focus:ring-[#00d97e]/20 transition"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#00d97e] px-4 py-3.5 text-sm font-extrabold text-[#03120a] transition hover:bg-[#2ff0a0] disabled:opacity-50"
            >
              {submitting ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          {/* Status message */}
          {status && (
            <div className={`mt-4 rounded-xl px-4 py-3 text-xs leading-5 ${
              statusType === "error" ? "border border-red-400/20 bg-red-400/[0.06] text-red-200" :
              statusType === "success" ? "border border-[#00d97e]/20 bg-[#00d97e]/[0.06] text-[#00d97e]" :
              "border border-white/[0.08] bg-white/[0.03] text-white/60"
            }`}>
              {status}
            </div>
          )}

          {/* Footer link */}
          <p className="mt-5 text-center text-xs text-white/35">
            {mode === "login" ? (
              <>Don&apos;t have an account? <button type="button" onClick={() => setMode("signup")} className="text-[#00d97e] hover:underline">Sign up</button></>
            ) : (
              <>Already have an account? <button type="button" onClick={() => setMode("login")} className="text-[#00d97e] hover:underline">Log in</button></>
            )}
          </p>
        </div>

        <p className="mt-4 text-center text-[10px] text-white/20">
          By continuing, you agree to our <Link href="/terms" className="underline hover:text-white/40">Terms</Link> and <Link href="/privacy" className="underline hover:text-white/40">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}
