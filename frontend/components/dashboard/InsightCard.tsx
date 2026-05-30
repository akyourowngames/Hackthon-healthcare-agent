"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { INSIGHTS, type MockInsight } from "@/lib/mock-dashboard";

const borderMap = {
  good: "border-l-status-normal",
  watch: "border-l-status-warning",
  concern: "border-l-status-critical",
};

const dotMap = {
  good: "🟢",
  watch: "🟡",
  concern: "🔴",
};

export function InsightCard({ insight, index = 0 }: { insight: MockInsight; index?: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`insight-card rounded-xl border border-border border-l-4 bg-surface p-4 ${borderMap[insight.tone]}`}
    >
      <p className="font-semibold text-primary">
        {dotMap[insight.tone]} {insight.headline}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-secondary">{insight.body}</p>
      <Link href="/chat" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-secondary">
        Ask AI about this →
      </Link>
    </motion.article>
  );
}

export function InsightsSection() {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-accent" />
        <h2 className="font-heading text-lg font-bold text-primary">Vaidy&apos;s Insights</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {INSIGHTS.map((insight, i) => (
          <InsightCard key={insight.id} insight={insight} index={i} />
        ))}
      </div>
    </section>
  );
}
