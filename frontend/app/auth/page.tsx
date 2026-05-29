"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

const USER_KEY = "vaidy_user_id";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState("local-user");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [status, setStatus] = useState("");

  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  while (supabaseUrl.endsWith("/")) {
    supabaseUrl = supabaseUrl.slice(0, -1);
  }
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supabaseReady = Boolean(supabaseUrl && supabaseAnonKey);

  useEffect(() => {
    const saved = window.localStorage.getItem(USER_KEY);
    if (saved) setUserId(saved);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    if (supabaseReady && password.trim()) {
      try {
        const endpoint = mode === "signup" ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password";
        const response = await fetch(`${supabaseUrl}${endpoint}`, {
          method: "POST",
          headers: {
            apikey: supabaseAnonKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: clean, password }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(String(payload.error_description || payload.msg || payload.message || response.status));
        }
        const nextUserId = String(payload.user?.id || payload.id || clean);
        window.localStorage.setItem(USER_KEY, nextUserId);
        if (payload.access_token) {
          window.localStorage.setItem("vaidy_supabase_access_token", String(payload.access_token));
        }
        setUserId(nextUserId);
        setStatus(mode === "signup" ? "Signup started. Check email if confirmation is enabled." : "Signed in with Supabase.");
        return;
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Supabase auth failed.");
        return;
      }
    }
    const nextUserId = "local-user";
    window.localStorage.setItem(USER_KEY, nextUserId);
    setUserId(nextUserId);
    setStatus("Using local development identity.");
  };

  const useLocalGoogle = () => {
    if (supabaseReady) {
      const redirect = encodeURIComponent(`${window.location.origin}/dashboard`);
      window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${redirect}`;
      return;
    }
    const nextUserId = "local-user";
    window.localStorage.setItem(USER_KEY, nextUserId);
    setUserId(nextUserId);
    setStatus("Using local Google-style development identity.");
  };

  return (
    <main className="min-h-screen bg-[#050608] px-4 py-8 text-white">
      <div className="mx-auto max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-white/70 hover:text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#00d97e] text-[#03120a]">V</span>
          vaidy
        </Link>
        <section className="mt-10 rounded-lg border border-white/[0.08] bg-white/[0.035] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#00d97e]/80">Account</p>
          <h1 className="mt-3 text-3xl font-black">Sign in</h1>
          <div className="mt-5 grid grid-cols-2 rounded-lg border border-white/[0.08] bg-white/[0.035] p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-md px-3 py-2 text-sm font-bold ${mode === "login" ? "bg-[#00d97e] text-[#03120a]" : "text-white/55"}`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-md px-3 py-2 text-sm font-bold ${mode === "signup" ? "bg-[#00d97e] text-[#03120a]" : "text-white/55"}`}
            >
              Sign up
            </button>
          </div>
          <form onSubmit={submit} className="mt-6 space-y-3">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#00d97e]/60"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={supabaseReady ? "Password" : "Password optional in local mode"}
              className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#00d97e]/60"
            />
            <button type="submit" className="w-full rounded-lg bg-[#00d97e] px-4 py-3 text-sm font-extrabold text-[#03120a]">
              {supabaseReady ? (mode === "signup" ? "Create Supabase account" : "Log in with Supabase") : "Continue locally"}
            </button>
          </form>
          <button
            type="button"
            onClick={useLocalGoogle}
            className="mt-3 w-full rounded-lg border border-white/[0.1] px-4 py-3 text-sm font-bold text-white/70 hover:text-white"
          >
            {supabaseReady ? "Continue with Google" : "Continue with local Google"}
          </button>
          <p className="mt-4 text-xs leading-5 text-white/42">
            {supabaseReady ? "Supabase Auth is configured." : "Supabase env is not configured, so this page uses local development identity."}
          </p>
          {status ? <p className="mt-3 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-white/60">{status}</p> : null}
          <p className="mt-5 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-white/45">Active user: {userId}</p>
          <Link href="/dashboard" className="mt-4 inline-flex rounded-lg border border-white/[0.08] px-4 py-3 text-sm font-bold text-white/70 hover:text-white">
            Open dashboard
          </Link>
        </section>
      </div>
    </main>
  );
}
