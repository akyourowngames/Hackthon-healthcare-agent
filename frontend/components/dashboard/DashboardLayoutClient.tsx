"use client";

import { useState, type ReactNode } from "react";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import { Sidebar, MobileBottomNav } from "@/components/dashboard/Sidebar";
import { ToastContainer } from "@/components/ui/Toast";

function DashboardShell({ children }: { children: ReactNode }) {
  useDashboard();
  const [collapsed, setCollapsed] = useState(false);
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

export function DashboardLayoutClient({ children }: { children: ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
