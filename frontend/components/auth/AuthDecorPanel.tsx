"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { VaidyLogo } from "@/components/ui/VaidyLogo";

const stats = [
  { value: "12,400+", label: "Reports Analyzed" },
  { value: "4.9★", label: "User Rating" },
];

export function AuthDecorPanel() {
  return (
    <div className="relative hidden min-h-full flex-[1.5] overflow-hidden rounded-2xl border border-white/[0.08] lg:flex lg:flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-600/20 via-emerald-900/10 to-[#0a0a0f]" />
      <div className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-teal-500/20 blur-3xl" />
      <div className="absolute bottom-10 right-0 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl" />

      <div className="relative z-10 flex flex-1 flex-col justify-between p-10">
        <div>
          <VaidyLogo href="/" size="lg" />
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-heading mt-8 max-w-md text-3xl font-bold leading-tight text-white"
          >
            Your health, finally decoded
          </motion.h2>
          <p className="mt-3 max-w-sm text-slate-400">
            Upload reports from Apollo, Thyrocare, or Lal Path Labs. Get plain-language insights in Hindi or English.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-md"
            >
              <p className="text-2xl font-bold text-teal-400">{stat.value}</p>
              <p className="mt-1 text-sm text-slate-400">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <motion.blockquote
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-8 rounded-xl border border-white/[0.06] bg-black/20 p-5 backdrop-blur-sm"
        >
          <div className="mb-3 flex gap-0.5 text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-current" />
            ))}
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            &ldquo;Vaidy explained my Thyrocare report better than my doctor did — in Hindi, in 2 minutes.&rdquo;
          </p>
          <footer className="mt-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/20 text-sm font-bold text-teal-300">
              RM
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Rohit Mehra</p>
              <p className="text-xs text-slate-500">Mumbai · Apollo CBC</p>
            </div>
          </footer>
        </motion.blockquote>
      </div>
    </div>
  );
}
