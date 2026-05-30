"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Search, ChevronRight } from "lucide-react";
import { useDashboard } from "@/lib/dashboard-context";

type HeaderProps = {
  title: string;
  breadcrumb?: string[];
};

export function Header({ title, breadcrumb = ["Home", "Dashboard"] }: HeaderProps) {
  const { profile } = useDashboard();
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-[#0a0a0f]/80 px-4 py-4 backdrop-blur-xl sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="mb-1 flex items-center gap-1 text-xs text-slate-500">
            {breadcrumb.map((crumb, i) => (
              <span key={crumb} className="flex items-center gap-1">
                {i > 0 ? <ChevronRight className="h-3 w-3" /> : null}
                <span className={i === breadcrumb.length - 1 ? "text-slate-300" : ""}>{crumb}</span>
              </span>
            ))}
          </nav>
          <h1 className="font-heading text-xl font-bold text-primary sm:text-2xl">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden flex-1 sm:block sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              placeholder="Search reports, biomarkers..."
              className="w-full min-h-[44px] rounded-lg border border-border bg-surface py-2 pl-10 pr-4 text-sm text-primary outline-none placeholder:text-muted focus:border-accent-primary focus:shadow-accent-glow"
            />
          </div>

          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface text-secondary hover:text-primary"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-accent-primary" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-glow text-sm font-bold text-accent ring-1 ring-accent-primary/25"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              {initials}
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-[#16161e] py-2 shadow-xl"
              >
                <p className="border-b border-border px-4 py-2 text-sm font-semibold text-primary">{profile.name}</p>
                <Link href="/dashboard/profile" className="block px-4 py-2 text-sm text-secondary hover:bg-elevated hover:text-primary" role="menuitem">
                  View Profile
                </Link>
                <Link href="/dashboard/profile" className="block px-4 py-2 text-sm text-secondary hover:bg-elevated hover:text-primary" role="menuitem">
                  Settings
                </Link>
                <Link href="/auth" className="block px-4 py-2 text-sm text-red-400 hover:bg-red-500/10" role="menuitem">
                  Sign Out
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
