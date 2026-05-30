"use client";

import Link from "next/link";
import { Eye, MessageCircle, Download, Trash2 } from "lucide-react";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { LAB_COLORS, formatReportDate, type MockReport } from "@/lib/mock-dashboard";

type ReportCardProps = {
  report: MockReport;
  onDelete?: (id: string) => void;
  compact?: boolean;
};

export function ReportCard({ report, onDelete, compact }: ReportCardProps) {
  const stripeColor =
    report.status === "Analyzed"
      ? "bg-accent-primary"
      : report.status === "Processing"
        ? "bg-amber-500"
        : "bg-slate-600";

  const labColor = LAB_COLORS[report.labKey];

  return (
    <article className="report-card group relative overflow-hidden rounded-xl border border-border bg-surface transition hover:scale-[1.02] hover:border-accent-primary hover:shadow-[0_12px_40px_var(--accent-glow)]">
      <div className={`h-1 ${stripeColor}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-primary"
            style={{ backgroundColor: `${labColor}33`, color: labColor }}
          >
            {report.lab.split(" ")[0]}
          </span>
          <Badge variant={statusBadgeVariant(report.status)}>{report.status}</Badge>
        </div>

        <h3 className="mt-3 font-semibold text-primary">{report.type}</h3>
        <p className="mt-1 text-sm text-slate-500">{formatReportDate(report.date)}</p>

        {!compact && (
          <>
            <p className="mt-3 text-xs text-slate-400">{report.finding}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {report.biomarkers.slice(0, 3).map((b) => (
                <span
                  key={b.name}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    b.flag === "normal"
                      ? "bg-status-normal/10 text-status-normal"
                      : "bg-red-500/10 text-red-300"
                  }`}
                >
                  {b.name}: {b.value}
                </span>
              ))}
            </div>
          </>
        )}

        <div className="mt-4 flex gap-2 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
          <Link
            href="/dashboard/reports"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-secondary hover:border-accent-primary hover:text-accent"
            aria-label="View"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <Link
            href="/chat"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-secondary hover:text-accent"
            aria-label="Chat"
          >
            <MessageCircle className="h-4 w-4" />
          </Link>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-secondary hover:text-primary"
            aria-label="Download"
          >
            <Download className="h-4 w-4" />
          </button>
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(report.id)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 hover:border-red-500/40 hover:text-red-400"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {!compact && (
          <div className="mt-3 flex gap-3 border-t border-white/[0.06] pt-3 lg:hidden">
            <Link href="/dashboard/reports" className="text-xs font-semibold text-accent">
              View Analysis
            </Link>
            <Link href="/chat" className="text-xs text-slate-500">
              Chat with AI
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
