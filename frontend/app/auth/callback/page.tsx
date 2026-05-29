"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      router.replace("/dashboard");
      return;
    }

    let cancelled = false;

    // With implicit flow, Supabase JS auto-detects the hash fragment
    // and establishes the session. We just poll until it's ready.
    const waitForSession = async () => {
      // Check if there's an error in the hash (e.g. #error=access_denied)
      const hash = window.location.hash;
      if (hash.includes("error")) {
        const params = new URLSearchParams(hash.replace("#", ""));
        const desc = params.get("error_description") || params.get("error") || "Sign-in was cancelled.";
        setError(decodeURIComponent(desc.replace(/\+/g, " ")));
        return;
      }

      // Poll for session — Supabase client processes the hash automatically
      let attempts = 0;
      const poll = async () => {
        if (cancelled) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace("/dashboard");
          return;
        }
        attempts += 1;
        if (attempts < 20) {
          setTimeout(poll, 400);
        } else {
          setError("Could not complete sign-in. Please try again.");
        }
      };

      // Give Supabase a moment to parse the hash
      setTimeout(poll, 200);
    };

    waitForSession();
    return () => { cancelled = true; };
  }, [router]);

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
