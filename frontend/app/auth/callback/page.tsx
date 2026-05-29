"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      router.push("/dashboard");
      return;
    }

    // Supabase handles the hash fragment automatically via detectSessionInUrl
    // Just wait for the session to be established then redirect
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/dashboard");
      } else {
        // Wait a moment for Supabase to process the hash
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            router.push("/dashboard");
          } else {
            router.push("/auth");
          }
        }, 1500);
      }
    };

    checkSession();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050608] text-white">
      <div className="flex flex-col items-center gap-4">
        <span className="h-3 w-3 animate-pulse rounded-full bg-[#00d97e]" />
        <p className="text-sm text-white/50">Completing sign in...</p>
      </div>
    </main>
  );
}
