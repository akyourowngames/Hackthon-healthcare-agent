"use client";

import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Droplets,
  FileText,
  HeartPulse,
  TrendingDown,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const summaryCards = [
  {
    label: "Last report",
    value: "Oct 15, 2024",
    icon: CalendarDays,
    tone: "border-sky-300/20 bg-sky-300/10 text-sky-200",
  },
  {
    label: "Biomarkers tracked",
    value: "12",
    icon: Activity,
    tone: "border-teal-300/20 bg-teal-300/10 text-teal-200",
  },
  {
    label: "Flagged values",
    value: "2",
    icon: AlertTriangle,
    tone: "border-red-300/20 bg-red-300/10 text-red-200",
  },
  {
    label: "Overall status",
    value: "Needs attention",
    icon: HeartPulse,
    tone: "border-amber-300/20 bg-amber-300/10 text-amber-200",
    badge: true,
  },
];

const hemoglobinTrend = [
  { month: "Apr", hemoglobin: 13.1 },
  { month: "Jun", hemoglobin: 12.4 },
  { month: "Jul", hemoglobin: 11.9 },
  { month: "Aug", hemoglobin: 12.1 },
  { month: "Sep", hemoglobin: 11.6 },
  { month: "Oct", hemoglobin: 11.2 },
];

const biomarkers = [
  {
    biomarker: "Hemoglobin",
    value: "11.2 g/dL",
    range: "13.5-17.5",
    status: "🔴 Low",
    style: "border-red-300/20 bg-red-300/10 text-red-200",
  },
  {
    biomarker: "Platelets",
    value: "420,000 /μL",
    range: "150K-400K",
    status: "🟡 Mildly high",
    style: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  },
  {
    biomarker: "WBC",
    value: "7,200 /μL",
    range: "4,500-11,000",
    status: "🟢 Normal",
    style: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  },
  {
    biomarker: "RBC",
    value: "4.1 M/μL",
    range: "4.5-5.9",
    status: "🔴 Low",
    style: "border-red-300/20 bg-red-300/10 text-red-200",
  },
  {
    biomarker: "MCV",
    value: "78 fL",
    range: "80-100",
    status: "🟡 Borderline low",
    style: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  },
];

const timeline = [
  {
    date: "Oct 15 2024",
    text: "CBC report uploaded - 2 flags found",
    icon: AlertTriangle,
    style: "bg-amber-300 text-amber-950",
  },
  {
    date: "Jul 3 2024",
    text: "CBC report uploaded - 1 flag found",
    icon: CircleDot,
    style: "bg-sky-300 text-sky-950",
  },
  {
    date: "Apr 10 2024",
    text: "CBC report uploaded - no flags",
    icon: CheckCircle2,
    style: "bg-emerald-300 text-emerald-950",
  },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101217]/95 shadow-2xl shadow-black/30">
          <div className="border-b border-white/[0.08] bg-white/[0.025] px-5 py-6 sm:px-7 lg:px-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-teal-200">
                  <Droplets className="h-3.5 w-3.5" />
                  Rohan's blood health
                </div>
                <h1 className="mt-4 font-heading text-3xl font-bold text-white sm:text-4xl">
                  Health dashboard
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  CBC trends, flagged biomarkers, and report history from the latest uploaded results.
                </p>
              </div>

              <div className="flex w-full items-center gap-3 rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-amber-100 sm:w-auto">
                <TrendingDown className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-bold">Hemoglobin is trending down</p>
                  <p className="text-xs text-amber-100/70">Latest value sits below the normal range</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-4 lg:p-8">
            {summaryCards.map(({ label, value, icon: Icon, tone, badge }) => (
              <article
                key={label}
                className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-5 shadow-lg shadow-black/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-400">{label}</p>
                    {badge ? (
                      <span className="mt-3 inline-flex rounded-full border border-amber-300/30 bg-amber-300/15 px-3 py-1 text-sm font-bold text-amber-200">
                        {value}
                      </span>
                    ) : (
                      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
                    )}
                  </div>
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="trends" className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <article className="rounded-2xl border border-white/[0.08] bg-[#101217]/95 p-5 shadow-2xl shadow-black/30 sm:p-7 lg:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-heading text-xl font-bold text-white">Hemoglobin trend (g/dL)</h2>
                <p className="mt-1 text-sm text-slate-400">Normal range: 13.5-17.5 g/dL</p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-red-300/20 bg-red-300/10 px-3 py-1 text-xs font-bold text-red-200">
                <span className="h-2 w-2 rounded-full bg-red-300" />
                Below normal
              </span>
            </div>

            <div className="mt-8 h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hemoglobinTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    domain={[10.5, 14]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    tickCount={6}
                    width={42}
                  />
                  <Tooltip
                    cursor={{ stroke: "rgba(45,212,191,0.25)", strokeWidth: 1 }}
                    contentStyle={{
                      background: "#151922",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#e2e8f0",
                    }}
                    labelStyle={{ color: "#ffffff", fontWeight: 700 }}
                    formatter={(value) => [value === undefined ? "" : `${value} g/dL`, "Hemoglobin"]}
                  />
                  <ReferenceLine
                    y={13.5}
                    stroke="#fbbf24"
                    strokeDasharray="7 7"
                    strokeWidth={2}
                    label={{
                      value: "Lower normal 13.5",
                      fill: "#fcd34d",
                      fontSize: 12,
                      position: "insideTopRight",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="hemoglobin"
                    stroke="#2dd4bf"
                    strokeWidth={4}
                    dot={{ r: 5, fill: "#0f172a", stroke: "#2dd4bf", strokeWidth: 3 }}
                    activeDot={{ r: 7, fill: "#2dd4bf", stroke: "#ffffff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article
            id="timeline"
            className="rounded-2xl border border-white/[0.08] bg-[#101217]/95 p-5 shadow-2xl shadow-black/30 sm:p-7 lg:p-8"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-xl font-bold text-white">Health timeline</h2>
                <p className="mt-1 text-sm text-slate-400">Past CBC report activity</p>
              </div>
              <FileText className="h-5 w-5 text-slate-500" />
            </div>

            <div className="mt-8">
              {timeline.map(({ date, text, icon: Icon, style }, index) => (
                <div key={date} className="relative flex gap-4 pb-8 last:pb-0">
                  {index < timeline.length - 1 ? (
                    <span className="absolute left-[18px] top-10 h-full w-px bg-white/[0.1]" />
                  ) : null}
                  <span className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-bold text-white">{date}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101217]/95 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-2 border-b border-white/[0.08] px-5 py-5 sm:px-7 lg:px-8">
            <h2 className="font-heading text-xl font-bold text-white">Flagged biomarkers</h2>
            <p className="text-sm text-slate-400">
              Latest CBC values compared against standard adult male reference ranges.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="border-b border-white/[0.08] bg-white/[0.025] text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold sm:px-7 lg:px-8">Biomarker</th>
                  <th className="px-5 py-4 font-semibold">Your value</th>
                  <th className="px-5 py-4 font-semibold">Normal range</th>
                  <th className="px-5 py-4 font-semibold sm:px-7 lg:px-8">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {biomarkers.map(({ biomarker, value, range, status, style }) => (
                  <tr key={biomarker} className="transition hover:bg-white/[0.025]">
                    <td className="px-5 py-4 text-sm font-bold text-white sm:px-7 lg:px-8">{biomarker}</td>
                    <td className="px-5 py-4 text-sm text-slate-200">{value}</td>
                    <td className="px-5 py-4 text-sm text-slate-400">{range}</td>
                    <td className="px-5 py-4 sm:px-7 lg:px-8">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${style}`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
