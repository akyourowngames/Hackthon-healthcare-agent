"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HEMOGLOBIN_CHART } from "@/lib/mock-dashboard";

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-xl">
      <p className="text-secondary">{label}</p>
      <p className="font-bold text-accent">{payload[0].value} g/dL</p>
    </div>
  );
};

export function HealthChart() {
  return (
    <div className="dashboard-card rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-bold text-primary">Health Trend</h2>
          <p className="text-sm text-muted">Hemoglobin over 6 months</p>
        </div>
        <select
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-secondary outline-none focus:border-accent-primary focus:shadow-accent-glow"
          defaultValue="hemoglobin"
          aria-label="Select biomarker"
        >
          <option value="hemoglobin">Hemoglobin ▾</option>
        </select>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={HEMOGLOBIN_CHART} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="hemoglobinFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1e1e2e" vertical={false} />
            <ReferenceArea y1={12} y2={15.5} fill="#10b981" fillOpacity={0.06} />
            <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[8, 16]} tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#hemoglobinFill)"
              dot={{ fill: "#10b981", r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: "#34d399" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-center text-xs text-accent/60">Shaded band: normal range (12–15.5 g/dL)</p>
    </div>
  );
}
