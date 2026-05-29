"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      router.push("/dashboard");
      return;
    }

    let cancelled = false;

    const handleCallback = async () => {
      // Check for error returned by the provider / Supabase
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      if (errorParam) {
        setError(errorDescription || errorParam);
        return;
      }

      // PKCE flow: authorization code in query params
      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
        router.replace("/dashboard");
        return;
      }

      // Implicit flow or already-established session: poll for the session
      let attempts = 0;
      const poll = async () => {
        if (cancelled) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace("/dashboard");
          return;
        }
        attempts += 1;
        if (attempts < 12) {
          setTimeout(poll, 500);
        } else {
          setError("Could not complete sign-in. Please try again.");
        }
      };
      setTimeout(poll, 300);
    };

    handleCallback();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (error) {
    return (
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
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <span className="h-3 w-3 animate-pulse rounded-full bg-[#00d97e]" />
      <p className="text-sm text-white/50">Completing sign in...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050608] px-4 text-white">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-4">
            <span className="h-3 w-3 animate-pulse rounded-full bg-[#00d97e]" />
            <p className="text-sm text-white/50">Loading...</p>
          </div>
        }
      >
        <CallbackHandler />
      </Suspense>
    </main>
  );
}
