"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, Clock, Activity, Flame, Upload, MessageSquare } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { ReportCard } from "@/components/dashboard/ReportCard";
import { HealthChart } from "@/components/dashboard/HealthChart";
import { InsightsSection } from "@/components/dashboard/InsightCard";
import { useDashboard } from "@/lib/dashboard-context";

function HealthScoreRing({ score }: { score: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;

  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
      <svg className="-rotate-90" width="112" height="112" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <motion.circle
          cx="56"
          cy="56"
          r={r}
          fill="none"
          stroke="#14b8a6"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-xs text-slate-500">Health Score</p>
        <p className="text-xl font-bold text-white">{score}/100</p>
      </div>
      <span className="absolute inset-0 animate-pulse rounded-full ring-2 ring-teal-500/20" />
    </div>
  );
}

export default function DashboardPage() {
  const { profile, reports } = useDashboard();
  const recent = reports.slice(0, 3);
  const firstName = profile.name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <Header title="Dashboard" breadcrumb={["Home", "Dashboard"]} />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 px-4 py-6 sm:px-6"
      >
        <section className="dashboard-card flex flex-col gap-6 rounded-xl border border-white/[0.08] border-l-4 border-l-teal-500 bg-white/[0.04] p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold text-white">
              {greeting}, {firstName} 👋
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
              You have 3 reports analyzed this month. Your hemoglobin is trending upward — great progress!
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/dashboard/reports"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 px-5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(20,184,166,0.2)] transition hover:brightness-110"
              >
                Upload New Report →
              </Link>
              <Link
                href="/chat"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-teal-500/40 px-5 text-sm font-semibold text-teal-300 transition hover:bg-teal-500/10"
              >
                <MessageSquare className="h-4 w-4" />
                Ask AI a Question →
              </Link>
            </div>
          </div>
          <HealthScoreRing score={profile.healthScore} />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Reports" value={String(reports.length)} icon={FileText} delay={0.05} />
          <StatCard label="Last Analyzed" value="2 days ago" icon={Clock} delay={0.1} />
          <StatCard label="Biomarkers Tracked" value="47" icon={Activity} delay={0.15} />
          <StatCard
            label="Streak"
            value="6 months"
            icon={Flame}
            iconClassName="text-amber-400"
            delay={0.2}
          />
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-white">Recent Reports</h2>
            <Link href="/dashboard/reports" className="text-sm font-semibold text-teal-400 hover:text-teal-300">
              View All →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recent.map((report) => (
              <ReportCard key={report.id} report={report} compact />
            ))}
          </div>
        </section>

        <HealthChart />
        <InsightsSection />
      </motion.div>
    </>
  );
}
