'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

type Language = 'EN' | 'HI';

const reportRows = [
  { marker: 'Hemoglobin', value: '11.1 g/dL', range: '12.0 - 15.0', status: 'low' },
  { marker: 'RBC Count', value: '4.02 M/uL', range: '4.2 - 5.4', status: 'low' },
  { marker: 'Vitamin B12', value: '238 pg/mL', range: '200 - 900', status: 'watch' },
  { marker: 'HbA1c', value: '5.4 %', range: '< 5.7', status: 'normal' },
];

const anomalyChips = [
  { label: 'Hemoglobin drop (3 months)', severity: 'high' },
  { label: 'RBC below baseline', severity: 'medium' },
  { label: 'B12 trending low-normal', severity: 'low' },
] as const;

const demoText = 'Bhai, teri hemoglobin 3 mahine se gir rahi hai. Ye pattern normal nahi hai.';

export default function ExplainDemo() {
  const [language, setLanguage] = useState<Language>('HI');
  const [typedCount, setTypedCount] = useState(0);

  const visibleText = useMemo(() => {
    if (language === 'HI') {
      return demoText.slice(0, typedCount);
    }

    const englishText =
      'Your hemoglobin has been dropping for 3 months. This pattern is not typical and should be reviewed early.';
    return englishText.slice(0, typedCount);
  }, [language, typedCount]);

  const activeText = language === 'HI'
    ? demoText
    : 'Your hemoglobin has been dropping for 3 months. This pattern is not typical and should be reviewed early.';

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTypedCount((prev) => {
        if (prev >= activeText.length) {
          window.clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 24);

    return () => window.clearInterval(timer);
  }, [activeText]);

  return (
    <section className="vaidy-section bg-transparent text-white">
      <div className="mx-auto w-full max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="vaidy-shell"
        >
          <div className="grid items-start gap-7 lg:grid-cols-2 lg:gap-10">
            <div className="min-w-0">
              <p className="vaidy-pill">
                Explain My Report
              </p>
              <h2 className="vaidy-title">
                Instant clinical context in your language.
              </h2>
              <p className="vaidy-body">
                Vaidy highlights important biomarker shifts and explains what changed in simple, human terms.
              </p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, ease: 'easeOut', delay: 0.1 }}
                className="mt-7 rounded-3xl border border-white/12 bg-black/22 p-4 backdrop-blur-xl sm:p-5"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-xs tracking-wide text-zinc-400 uppercase">Report preview</p>
                  <span className="rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[10px] text-zinc-300">
                    CBC - Last 3 months
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                  <div className="grid grid-cols-3 gap-2 border-b border-white/10 px-4 py-2 text-[11px] tracking-wide text-zinc-400 uppercase">
                    <span>Biomarker</span>
                    <span>Value</span>
                    <span>Range</span>
                  </div>

                  <div className="divide-y divide-white/8">
                    {reportRows.map((row) => {
                      const tone =
                        row.status === 'low'
                          ? 'border-l-emerald-200/75 bg-emerald-200/[0.10]'
                          : row.status === 'watch'
                            ? 'border-l-cyan-200/45 bg-cyan-200/[0.08]'
                            : 'border-l-transparent bg-transparent';

                      return (
                        <div
                          key={row.marker}
                          className={`grid grid-cols-3 gap-2 border-l-2 px-4 py-3 text-xs sm:text-sm ${tone}`}
                        >
                          <span className="truncate text-zinc-100">{row.marker}</span>
                          <span className="truncate text-zinc-200">{row.value}</span>
                          <span className="truncate text-zinc-400">{row.range}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="min-w-0">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                className="relative rounded-3xl border border-white/10 bg-black/20 p-4 backdrop-blur-xl sm:p-5"
              >
                <div className="pointer-events-none absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 rounded-full bg-cyan-200/10 blur-[80px]" />

                <div className="relative">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs tracking-wide text-zinc-400 uppercase">AI explanation</p>
                    <div className="inline-flex rounded-full border border-white/12 bg-white/[0.03] p-1">
                      {(['EN', 'HI'] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => {
                            setTypedCount(0);
                            setLanguage(lang);
                          }}
                          className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                            language === lang
                              ? 'bg-emerald-200/75 text-emerald-950'
                              : 'text-zinc-300 hover:text-white'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="rounded-2xl border border-emerald-200/20 bg-emerald-100/[0.07] p-4 text-sm leading-relaxed text-emerald-50 sm:text-base">
                      <span>{visibleText}</span>
                      <motion.span
                        aria-hidden="true"
                        className="ml-0.5 inline-block h-4 w-[2px] bg-cyan-200/85 align-middle"
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                      />
                    </div>

                    <div className="mt-4">
                      <p className="mb-2 text-[11px] tracking-wide text-zinc-400 uppercase">Anomaly indicators</p>
                      <div className="flex flex-wrap gap-2">
                        {anomalyChips.map((chip) => {
                          const tone =
                            chip.severity === 'high'
                              ? 'border-emerald-200/40 bg-emerald-200/16 text-emerald-100'
                              : chip.severity === 'medium'
                                ? 'border-cyan-200/20 bg-cyan-100/10 text-zinc-100'
                                : 'border-white/15 bg-white/[0.05] text-zinc-200';

                          return (
                            <span
                              key={chip.label}
                              className={`rounded-full border px-3 py-1 text-xs ${tone}`}
                            >
                              {chip.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
