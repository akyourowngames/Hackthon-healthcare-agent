'use client';

import { motion } from 'framer-motion';

const trendSeries = [
  {
    id: 'hemoglobin',
    label: 'Hemoglobin',
    value: '12.4 g/dL',
    status: 'Recovering',
    stroke: 'url(#hemoStroke)',
    glow: 'drop-shadow(0 0 6px rgba(143,213,194,0.28))',
    path: 'M 18 174 C 55 166, 90 152, 128 147 C 168 142, 204 132, 242 126 C 282 120, 320 112, 360 104 C 398 97, 438 90, 478 84',
    points: [
      { x: 18, y: 174 },
      { x: 128, y: 147 },
      { x: 242, y: 126 },
      { x: 360, y: 104 },
      { x: 478, y: 84 },
    ],
  },
  {
    id: 'glucose',
    label: 'Glucose',
    value: '106 mg/dL',
    status: 'Mild spikes',
    stroke: 'url(#glucoseStroke)',
    glow: 'drop-shadow(0 0 6px rgba(108,183,195,0.24))',
    path: 'M 18 132 C 54 116, 93 88, 128 106 C 168 128, 203 154, 242 138 C 280 123, 322 76, 360 97 C 401 122, 438 141, 478 128',
    points: [
      { x: 18, y: 132 },
      { x: 128, y: 106 },
      { x: 242, y: 138 },
      { x: 360, y: 97 },
      { x: 478, y: 128 },
    ],
  },
  {
    id: 'cholesterol',
    label: 'Cholesterol',
    value: '178 mg/dL',
    status: 'Improving',
    stroke: 'url(#cholStroke)',
    glow: 'drop-shadow(0 0 6px rgba(95,188,160,0.22))',
    path: 'M 18 98 C 57 95, 90 103, 128 109 C 165 116, 203 124, 242 122 C 282 120, 322 111, 360 102 C 399 93, 440 91, 478 88',
    points: [
      { x: 18, y: 98 },
      { x: 128, y: 109 },
      { x: 242, y: 122 },
      { x: 360, y: 102 },
      { x: 478, y: 88 },
    ],
  },
] as const;

const anomalyPoints = [
  { id: 'glucose-spike', x: 360, y: 97, label: 'Glucose spike detected' },
  { id: 'hb-dip', x: 128, y: 147, label: 'Hemoglobin dip from baseline' },
];

const biomarkerCards = [
  {
    title: 'Hemoglobin trend',
    value: '+0.8 g/dL',
    note: 'Steady recovery over 90 days',
    tone: 'border-emerald-200/24 bg-emerald-100/[0.06]',
  },
  {
    title: 'Glucose spikes',
    value: '2 flagged',
    note: 'Post-meal variability identified',
    tone: 'border-cyan-200/22 bg-cyan-100/[0.05]',
  },
  {
    title: 'Cholesterol change',
    value: '-14 mg/dL',
    note: 'Downward movement remains consistent',
    tone: 'border-white/15 bg-white/[0.03]',
  },
  {
    title: 'Baseline markers',
    value: '4 tracked',
    note: 'Personal baselines recalibrated monthly',
    tone: 'border-emerald-100/20 bg-emerald-200/[0.04]',
  },
];

export default function Timeline() {
  return (
    <section className="vaidy-section bg-transparent text-white">
      <div className="mx-auto w-full max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="vaidy-shell"
        >
          <div className="max-w-3xl">
            <p className="vaidy-pill">
              Health Timeline
            </p>
            <h2 className="vaidy-title">
              A cinematic view of your biomarker trajectory.
            </h2>
            <p className="vaidy-body max-w-3xl">
              Follow hemoglobin trends, glucose spikes, and cholesterol changes with personal baselines and anomaly
              detection in one calm timeline.
            </p>
          </div>

          <div className="mt-8 space-y-5">
            <motion.article
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="overflow-hidden rounded-3xl border border-white/12 bg-black/22 p-4 backdrop-blur-xl sm:p-5 md:p-6"
              aria-label="Biomarker trend chart with baseline and anomalies"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs tracking-wide text-zinc-400 uppercase">90 day biomarker trajectory</p>
                  <p className="mt-1 text-sm text-zinc-200">Baseline set from your personal clinical history</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {trendSeries.map((series) => (
                    <span
                      key={series.id}
                      className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[11px] text-zinc-200"
                    >
                      {series.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
                <div className="w-full overflow-x-auto">
                  <svg
                    viewBox="0 0 500 210"
                    role="img"
                    aria-label="Line chart showing hemoglobin, glucose, and cholesterol changes over time"
                    className="h-[220px] min-w-[480px] w-full"
                  >
                    <defs>
                      <linearGradient id="hemoStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6cb7c3" stopOpacity="0.2" />
                        <stop offset="50%" stopColor="#8fd5c2" stopOpacity="0.82" />
                        <stop offset="100%" stopColor="#6cb7c3" stopOpacity="0.22" />
                      </linearGradient>
                      <linearGradient id="glucoseStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#86c6d4" stopOpacity="0.18" />
                        <stop offset="50%" stopColor="#6cb7c3" stopOpacity="0.74" />
                        <stop offset="100%" stopColor="#86c6d4" stopOpacity="0.2" />
                      </linearGradient>
                      <linearGradient id="cholStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#7dc8aa" stopOpacity="0.18" />
                        <stop offset="50%" stopColor="#5fbca0" stopOpacity="0.68" />
                        <stop offset="100%" stopColor="#7dc8aa" stopOpacity="0.18" />
                      </linearGradient>
                    </defs>

                    <line x1="18" y1="118" x2="478" y2="118" stroke="rgba(164,202,192,0.4)" strokeDasharray="6 6" />
                    <text x="24" y="111" fill="rgba(202,230,223,0.85)" fontSize="10">
                      Baseline
                    </text>

                    {[52, 84, 118, 152, 184].map((y) => (
                      <line key={y} x1="18" y1={y} x2="478" y2={y} stroke="rgba(255,255,255,0.07)" />
                    ))}

                    {trendSeries.map((series, index) => (
                      <g key={series.id}>
                        <motion.path
                          d={series.path}
                          fill="none"
                          stroke={series.stroke}
                          strokeWidth="3"
                          strokeLinecap="round"
                          style={{ filter: series.glow }}
                          initial={{ pathLength: 0, opacity: 0.2 }}
                          whileInView={{ pathLength: 1, opacity: 0.92 }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.35, ease: 'easeInOut', delay: index * 0.12 }}
                        />

                        {series.points.map((point, pointIndex) => (
                          <motion.g
                            key={`${series.id}-${point.x}-${point.y}`}
                            initial={{ opacity: 0, scale: 0.85 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 + pointIndex * 0.06 + index * 0.06, duration: 0.35 }}
                          >
                            <motion.circle
                              cx={point.x}
                              cy={point.y}
                              r="4"
                              fill="rgba(244,244,245,0.9)"
                              className="transition-opacity"
                              whileHover={{ r: 5.5 }}
                            />
                            <circle cx={point.x} cy={point.y} r="9" fill="rgba(108,183,195,0.14)" />
                          </motion.g>
                        ))}
                      </g>
                    ))}

                    {anomalyPoints.map((point) => (
                      <g key={point.id}>
                        <motion.circle
                          cx={point.x}
                          cy={point.y}
                          r="5.5"
                          fill="rgba(244,226,149,0.9)"
                          stroke="rgba(255,255,255,0.8)"
                          strokeWidth="1"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                        />
                        <title>{point.label}</title>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>
            </motion.article>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {biomarkerCards.map((card, index) => (
                <motion.article
                  key={card.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, ease: 'easeOut', delay: index * 0.07 }}
                  whileHover={{ y: -2 }}
                  className={`rounded-2xl border p-4 backdrop-blur-md ${card.tone}`}
                >
                  <p className="text-[11px] tracking-wide text-zinc-400 uppercase">{card.title}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{card.value}</p>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-300">{card.note}</p>
                </motion.article>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {trendSeries.map((series) => (
                <div key={series.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] text-zinc-400">{series.label}</p>
                  <p className="mt-1 text-sm font-medium text-white">{series.value}</p>
                  <p className="mt-1 text-[11px] text-emerald-200/85">{series.status}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
