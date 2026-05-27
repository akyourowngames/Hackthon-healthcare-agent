'use client';

import { motion } from 'framer-motion';

const biomarkers = ['HbA1c', 'Vitamin D', 'CRP', 'LDL', 'Hemoglobin'];

const flowSteps = [
  {
    title: 'PDF Report',
    detail: 'Lab files, discharge summaries, annual checkups',
    tone: 'from-white/16 to-white/6',
  },
  {
    title: 'OCR Extraction',
    detail: 'Text and biomarkers captured with context',
    tone: 'from-emerald-200/20 to-emerald-100/5',
  },
  {
    title: 'AI Analysis',
    detail: 'Trend mapping, risk hints, and doctor-ready summaries',
    tone: 'from-cyan-200/16 to-cyan-100/5',
  },
  {
    title: 'Health Memory',
    detail: 'Your longitudinal timeline updates instantly',
    tone: 'from-emerald-300/22 to-emerald-200/8',
  },
];

const progressValue = 84;

export default function UploadPreview() {
  return (
    <section className="vaidy-section bg-transparent text-white">
      <div className="mx-auto w-full max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="vaidy-shell"
        >
          <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="min-w-0">
              <p className="vaidy-pill">
                Upload Intelligence
              </p>

              <h2 className="vaidy-title">
                Turn each PDF into structured health memory.
              </h2>
              <p className="vaidy-body">
                Drag in a report and Vaidy extracts biomarkers, maps trends, and appends them to your ongoing health timeline.
              </p>

              <div className="mt-7 rounded-3xl border border-white/12 bg-black/22 p-4 backdrop-blur-xl sm:p-5">
                <button
                  type="button"
                  className="group block w-full rounded-2xl border border-dashed border-white/25 bg-white/[0.03] p-6 text-left transition-colors hover:border-emerald-200/35 hover:bg-emerald-100/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/45"
                  aria-label="Upload PDF report"
                >
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-200/20 bg-emerald-200/10 text-lg">
                      PDF
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white sm:text-base">Drop your report here</p>
                      <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                        PDF only up to 15MB. Encrypted and private by default.
                      </p>
                    </div>
                  </div>
                </button>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <p className="text-xs text-zinc-300 sm:text-sm">Upload in progress</p>
                    <p className="text-xs font-medium text-emerald-200/85 sm:text-sm">{progressValue}%</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/8">
                    <motion.div
                      initial={{ width: '0%' }}
                      whileInView={{ width: `${progressValue}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.1, ease: 'easeOut', delay: 0.12 }}
                      className="h-full rounded-full bg-gradient-to-r from-emerald-200/80 to-cyan-200/55"
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-400 sm:text-xs">Parsing pages and normalizing biomarker ranges...</p>
                </div>

                <div className="mt-5">
                  <p className="mb-2 text-[11px] tracking-wide text-zinc-400 uppercase">Detected biomarkers</p>
                  <div className="flex flex-wrap gap-2">
                    {biomarkers.map((marker) => (
                      <span
                        key={marker}
                        className="rounded-full border border-emerald-200/20 bg-emerald-200/9 px-3 py-1 text-xs text-emerald-100/90"
                      >
                        {marker}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.25 }}
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: 0.12,
                    },
                  },
                }}
                className="relative rounded-3xl border border-white/10 bg-black/20 p-4 backdrop-blur-xl sm:p-5"
              >
                <div className="pointer-events-none absolute bottom-0 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-cyan-200/10 blur-[90px]" />

                <p className="mb-4 text-xs tracking-wide text-zinc-400 uppercase">Intelligence pipeline</p>
                <div className="space-y-3">
                  {flowSteps.map((step, index) => (
                    <motion.article
                      key={step.title}
                      variants={{
                        hidden: { opacity: 0, y: 12 },
                        visible: { opacity: 1, y: 0 },
                      }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                      className="relative"
                    >
                      <div
                        className={`rounded-2xl border border-white/10 bg-gradient-to-r ${step.tone} p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-medium text-white sm:text-base">{step.title}</h3>
                          <span className="rounded-full border border-white/15 bg-black/20 px-2 py-0.5 text-[10px] text-zinc-300">
                            0{index + 1}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-zinc-300 sm:text-sm">{step.detail}</p>
                      </div>

                      {index < flowSteps.length - 1 && (
                        <div className="flex justify-center py-1.5">
                          <motion.span
                            className="h-4 w-px bg-gradient-to-b from-emerald-200/55 to-transparent"
                            animate={{ opacity: [0.35, 0.85, 0.35] }}
                            transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                            aria-hidden="true"
                          />
                        </div>
                      )}
                    </motion.article>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
