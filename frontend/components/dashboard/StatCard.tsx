"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClassName?: string;
  delay?: number;
};

export function StatCard({ label, value, icon: Icon, iconClassName = "text-teal-400", delay = 0 }: StatCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="dashboard-card group rounded-xl border border-white/[0.08] bg-white/[0.04] p-5 transition hover:border-teal-500/30 hover:shadow-[0_8px_32px_rgba(20,184,166,0.08)] hover:-translate-y-0.5"
    >
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/10 ${iconClassName}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </motion.article>
  );
}
