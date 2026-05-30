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

export function StatCard({ label, value, icon: Icon, iconClassName = "text-accent", delay = 0 }: StatCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="dashboard-card group rounded-xl border border-border bg-surface p-5 transition hover:border-accent-primary hover:shadow-[0_8px_32px_var(--accent-glow)] hover:-translate-y-0.5"
    >
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-accent-glow ${iconClassName}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
    </motion.article>
  );
}
