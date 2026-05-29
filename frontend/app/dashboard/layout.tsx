"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import { useAuth } from "@/lib/auth-context";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Sidebar, MobileBottomNav } from "@/components/dashboard/Sidebar";
import { ToastContainer } from "@/components/ui/Toast";

function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { signedIn, signIn } = useDashboard();
  const { isAuthenticated, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated && !signedIn) {
      signIn();
    }
  }, [loading, isAuthenticated, signedIn, signIn]);

  const canAccess = signedIn || (isSupabaseConfigured && isAuthenticated);

  useEffect(() => {
    if (!loading && !canAccess) {
      router.replace("/auth");
    }
  }, [loading, canAccess, router]);

  if (loading || !canAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-slate-500">
        Loading dashboard…
      </div>
    );
  }

  const padLeft = collapsed ? "lg:pl-16" : "lg:pl-60";

  return (
    <div className="app-bg min-h-screen bg-[#0a0a0f] text-slate-100">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className={`min-h-screen pb-20 transition-[padding] duration-300 ${padLeft} lg:pb-0`}>
        {children}
      </div>
      <MobileBottomNav />
      <ToastContainer />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
