"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      router.push("/dashboard");
      return;
    }

    const handleCallback = async () => {
      // Check for error in URL params (Supabase returns errors as query params)
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      if (errorParam) {
        setError(errorDescription || errorParam);
        return;
      }

      // Check for authorization code in query params (PKCE flow)
      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
        router.push("/dashboard");
        return;
      }

      // For implicit flow, Supabase client auto-detects the hash fragment
      // via detectSessionInUrl: true. Just wait for the session.
      // Give it a moment to process the hash
      let attempts = 0;
      const maxAttempts = 10;
      const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push("/dashboard");
          return;
        }
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkSession, 500);
        } else {
          setError("Could not complete sign-in. Please try again.");
        }
      };

      // Small delay to let Supabase process the URL
      setTimeout(checkSession, 300);
    };

    handleCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050608] px-4 text-white">
        <div className="max-w-md text-center">
          <p className="text-4xl">⚠️</p>
          <h1 className="mt-4 text-xl font-bold">Sign-in failed</h1>
          <p className="mt-2 text-sm text-white/50">{error}</p>
          <button
            onClick={() => router.push("/auth")}
            className="mt-6 rounded-xl bg-[#00d97e] px-6 py-3 text-sm font-bold text-[#03120a] transition hover:bg-[#2ff0a0]"
          >
            Back to sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050608] text-white">
      <div className="flex flex-col items-center gap-4">
        <span className="h-3 w-3 animate-pulse rounded-full bg-[#00d97e]" />
        <p className="text-sm text-white/50">Completing sign in...</p>
      </div>
    </main>
  );
}
