'use client';

import { motion } from 'framer-motion';

const dashboardStats = [
  { label: 'Reports parsed', value: '124' },
  { label: 'Tracked biomarkers', value: '19' },
  { label: 'Anomaly confidence', value: '93%' },
];

const biomarkers = [
  { label: 'Vitamin D', value: '32 ng/ml', trend: '+4.2%' },
  { label: 'HbA1c', value: '5.4%', trend: '-0.3%' },
  { label: 'CRP', value: '1.1 mg/L', trend: 'Stable' },
];

export default function Hero() {
  return (
    <section className="vaidy-section bg-transparent pt-20 text-white">
      <div className="mx-auto flex w-full max-w-7xl items-center">
        <motion.div
          className="vaidy-shell w-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
        >
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="min-w-0">
              <motion.p
                className="vaidy-pill"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.45 }}
              >
                Vaidy AI
              </motion.p>

              <motion.h1
                className="mt-7 max-w-2xl text-4xl leading-[1.1] font-semibold tracking-[-0.025em] text-balance sm:text-5xl lg:text-6xl"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.55 }}
              >
                Your AI health copilot that remembers every report.
              </motion.h1>

              <motion.p
                className="mt-6 max-w-xl text-base leading-relaxed text-zinc-300 md:text-lg md:leading-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.55 }}
              >
                Upload blood reports. Detect trends. Understand your health in Hindi.
              </motion.p>

              <motion.div
                className="mt-9 flex flex-col gap-3.5 sm:flex-row sm:items-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.36, duration: 0.55 }}
              >
                <motion.button
                  type="button"
                  whileHover={{ y: -1, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                className="vaidy-button-primary w-full sm:w-auto"
                >
                  Upload Report
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ y: -1, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                className="vaidy-button-secondary w-full sm:w-auto"
                >
                  Watch Demo
                </motion.button>
              </motion.div>
            </div>

            <motion.div
              className="min-w-0 w-full max-w-xl justify-self-center lg:justify-self-end"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_16px_54px_rgba(4,13,18,0.44)] backdrop-blur-xl sm:p-5"
              >
                <div className="pointer-events-none absolute -top-20 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-cyan-200/14 blur-[100px]" />

                <div className="relative flex flex-col gap-4">
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-zinc-300 backdrop-blur-xl">
                  <span>Health OS Dashboard</span>
                  <span className="rounded-full bg-emerald-200/15 px-2 py-1 text-[10px] tracking-wide text-emerald-100 uppercase">
                    Live Sync
                  </span>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-xl">
                    <div className="mb-3 flex items-end justify-between gap-4">
                      <p className="text-xs text-zinc-400">Inflammation trend (90 days)</p>
                      <p className="shrink-0 text-xs text-emerald-200/90">Improving</p>
                    </div>
                    <svg viewBox="0 0 320 120" className="h-36 w-full">
                      <defs>
                        <linearGradient id="healthTrendStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6cb7c3" stopOpacity="0.2" />
                          <stop offset="50%" stopColor="#8fd5c2" stopOpacity="0.88" />
                          <stop offset="100%" stopColor="#6cb7c3" stopOpacity="0.2" />
                        </linearGradient>
                      </defs>
                      <motion.path
                        d="M6 97 C 32 82, 62 61, 92 64 C 124 68, 149 94, 181 89 C 212 84, 237 43, 267 47 C 291 50, 304 68, 314 72"
                        fill="none"
                        stroke="rgba(163,210,201,0.22)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0.45 }}
                        animate={{ pathLength: 1, opacity: 0.85 }}
                        transition={{ duration: 1.8, ease: 'easeOut' }}
                      />
                      <motion.path
                        d="M6 92 C 32 76, 62 55, 92 59 C 124 63, 149 89, 181 82 C 212 76, 237 35, 267 41 C 291 45, 304 62, 314 65"
                        fill="none"
                        stroke="url(#healthTrendStroke)"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0.55 }}
                        animate={{ pathLength: 1, opacity: [0.75, 1, 0.8] }}
                        transition={{
                          duration: 2.4,
                          ease: 'easeInOut',
                          repeat: Number.POSITIVE_INFINITY,
                          repeatType: 'mirror',
                        }}
                      />
                    </svg>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {dashboardStats.map((stat) => (
                      <div
                        key={stat.label}
                        className="min-w-0 rounded-xl border border-white/12 bg-white/[0.04] px-2.5 py-2.5 text-left backdrop-blur-md"
                      >
                        <p className="truncate text-[10px] text-zinc-400 sm:text-[11px]">{stat.label}</p>
                        <p className="mt-1 text-xs font-medium text-zinc-100 sm:text-sm">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {biomarkers.map((item) => (
                      <motion.div
                        key={item.label}
                        whileHover={{ y: -1 }}
                        className="rounded-xl border border-emerald-200/18 bg-emerald-100/8 p-3 backdrop-blur-md"
                      >
                        <p className="text-[11px] text-emerald-100/80">{item.label}</p>
                        <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
                        <p className="mt-1 text-[10px] text-emerald-200/90">{item.trend}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
