"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  MessageSquare,
  TrendingUp,
  BarChart2,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { VaidyLogo } from "@/components/ui/VaidyLogo";
import { useDashboard } from "@/lib/dashboard-context";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Home, exact: true },
  { href: "/dashboard/reports", label: "My Reports", icon: FileText },
  { href: "/chat", label: "AI Assistant", icon: MessageSquare, badge: "Beta" },
  { href: "/dashboard#timeline", label: "Health Timeline", icon: TrendingUp },
  { href: "/dashboard#trends", label: "Biomarker Trends", icon: BarChart2 },
  { href: "/dashboard/profile", label: "Settings", icon: Settings },
];

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
};

export function Sidebar({ collapsed, onToggle, mobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut: mockSignOut } = useDashboard();
  const { signOut: supabaseSignOut } = useAuth();

  async function logout() {
    if (isSupabaseConfigured) await supabaseSignOut();
    mockSignOut();
    router.push("/auth");
  }

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const width = collapsed && !mobile ? "w-16" : "w-60";
  const hidden = mobile ? "" : "hidden lg:flex";

  return (
    <aside
      className={`${hidden} ${width} fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/[0.08] bg-[#0a0a0f]/95 px-3 py-5 backdrop-blur-xl transition-[width] duration-300`}
    >
      <div className={`flex items-center ${collapsed && !mobile ? "justify-center" : "justify-between px-2"}`}>
        {collapsed && !mobile ? (
          <VaidyLogo href="/dashboard" size="sm" />
        ) : (
          <VaidyLogo href="/dashboard" size="md" />
        )}
        {!mobile ? (
          <button
            type="button"
            onClick={onToggle}
            className="hidden rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white lg:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        ) : null}
      </div>

      <nav className="mt-8 flex-1 space-y-1">
        {nav.map(({ href, label, icon: Icon, badge, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href.split("#")[0]);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`dashboard-nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "border-l-[3px] border-l-teal-500 bg-white/[0.04] text-teal-400"
                  : "border-l-[3px] border-l-transparent text-slate-500 hover:bg-white/[0.03] hover:text-slate-200"
              } ${collapsed && !mobile ? "justify-center px-2" : ""}`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {(!collapsed || mobile) && (
                <>
                  <span className="flex-1">{label}</span>
                  {badge ? (
                    <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-teal-400">
                      {badge}
                    </span>
                  ) : null}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={`mt-auto border-t border-white/[0.08] pt-4 ${collapsed && !mobile ? "px-0" : "px-2"}`}>
        {(!collapsed || mobile) && (
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-sm font-bold text-teal-400">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{profile.name}</p>
              <p className="truncate text-xs text-slate-500">{profile.email}</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={logout}
          className={`dashboard-logout flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-red-500/10 hover:text-red-400 ${collapsed && !mobile ? "justify-center" : ""}`}
        >
          <LogOut className="h-5 w-5" />
          {(!collapsed || mobile) && "Logout"}
        </button>
      </div>
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const items = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/dashboard/reports", icon: FileText, label: "Reports" },
    { href: "/chat", icon: MessageSquare, label: "AI" },
    { href: "/dashboard/profile", icon: Settings, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-white/[0.08] bg-[#0a0a0f]/95 backdrop-blur-xl lg:hidden">
      {items.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium ${
              active ? "text-teal-400" : "text-slate-500"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
