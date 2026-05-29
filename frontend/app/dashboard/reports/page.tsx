"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  LayoutGrid,
  List,
  ArrowUpDown,
  FileUp,
} from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { ReportCard } from "@/components/dashboard/ReportCard";
import { UploadModal } from "@/components/dashboard/UploadModal";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useDashboard } from "@/lib/dashboard-context";
import { formatReportDate, LAB_COLORS, type MockReport } from "@/lib/mock-dashboard";

const FILTER_TYPES = ["All", "CBC", "Lipid", "Thyroid", "Liver", "Kidney", "Diabetes", "Vitamins"] as const;

type SortKey = "newest" | "oldest" | "lab";

export default function ReportsPage() {
  const { reports, removeReport, showToast } = useDashboard();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...reports];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.type.toLowerCase().includes(q) ||
          r.lab.toLowerCase().includes(q) ||
          r.finding.toLowerCase().includes(q)
      );
    }
    if (filter !== "All") {
      list = list.filter((r) => r.category.toLowerCase().includes(filter.toLowerCase()));
    }
    list.sort((a, b) => {
      if (sort === "oldest") return a.date.localeCompare(b.date);
      if (sort === "lab") return a.lab.localeCompare(b.lab);
      return b.date.localeCompare(a.date);
    });
    return list;
  }, [reports, search, filter, sort]);

  function confirmDelete(id: string) {
    if (deleteId === id) {
      removeReport(id);
      setDeleteId(null);
      showToast("Report deleted", "info");
    } else {
      setDeleteId(id);
    }
  }

  return (
    <>
      <Header title="My Reports" breadcrumb={["Home", "Dashboard", "Reports"]} />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 px-4 py-6 sm:px-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">
              {reports.length} reports stored · All encrypted
            </p>
          </div>
          <Button leftIcon={<Upload className="h-4 w-4" />} onClick={() => setUploadOpen(true)}>
            Upload New Report
          </Button>
        </div>

        <div className="dashboard-card space-y-4 rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
          <input
            type="search"
            placeholder="Search by report type, lab, or biomarker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0d0d12] px-4 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-teal-500/30"
          />
          <div className="flex flex-wrap gap-2">
            {FILTER_TYPES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`min-h-[44px] rounded-full border px-4 text-sm font-medium transition ${
                  filter === f
                    ? "border-teal-500 bg-teal-500/15 text-teal-300"
                    : "border-white/[0.08] text-slate-500 hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0d0d12] px-3 text-sm text-slate-300"
              aria-label="Sort reports"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="lab">Lab Name</option>
            </select>
            <div className="flex rounded-lg border border-white/[0.08] p-1">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={`flex h-9 w-9 items-center justify-center rounded-md ${view === "grid" ? "bg-teal-500/20 text-teal-400" : "text-slate-500"}`}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={`flex h-9 w-9 items-center justify-center rounded-md ${view === "list" ? "bg-teal-500/20 text-teal-400" : "text-slate-500"}`}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyReports onUpload={() => setUploadOpen(true)} />
        ) : view === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((report) => (
              <div key={report.id}>
                <ReportCard report={report} onDelete={confirmDelete} />
                {deleteId === report.id ? (
                  <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    Tap delete again to confirm removal.
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <ReportsTable reports={filtered} onDelete={confirmDelete} deleteId={deleteId} />
        )}

        <section className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-400">2.3 GB of 5 GB used · 46%</span>
            <button type="button" className="font-semibold text-teal-400 hover:text-teal-300">
              Upgrade Plan →
            </button>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[46%] rounded-full bg-gradient-to-r from-teal-500 to-emerald-500" />
          </div>
        </section>
      </motion.div>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </>
  );
}

function EmptyReports({ onUpload }: { onUpload: () => void }) {
  return (
    <section className="flex flex-col items-center rounded-xl border border-dashed border-white/[0.1] py-16 text-center">
      <svg className="h-24 w-24 text-teal-500/80" viewBox="0 0 120 120" fill="none" aria-hidden>
        <rect x="28" y="20" width="64" height="80" rx="12" fill="rgba(20,184,166,0.12)" stroke="currentColor" strokeWidth="2" />
        <path d="M60 50v24M48 62h24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M60 38l8 8-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h2 className="mt-6 font-heading text-xl font-bold text-white">No reports yet</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Upload your first report and let Vaidy decode your health
      </p>
      <Button className="mt-6" onClick={onUpload} leftIcon={<FileUp className="h-4 w-4" />}>
        Upload First Report
      </Button>
    </section>
  );
}

function ReportsTable({
  reports,
  onDelete,
  deleteId,
}: {
  reports: MockReport[];
  onDelete: (id: string) => void;
  deleteId: string | null;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-[#111118] text-slate-500">
          <tr>
            {["Report Type", "Lab", "Date", "Status", "Key Findings", "Actions"].map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">
                <span className="inline-flex items-center gap-1">
                  {h}
                  {h !== "Actions" && h !== "Key Findings" ? <ArrowUpDown className="h-3 w-3 opacity-50" /> : null}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reports.map((report, i) => (
            <tr
              key={report.id}
              className={`border-t border-white/[0.06] ${i % 2 === 1 ? "bg-white/[0.02]" : ""}`}
            >
              <td className="px-4 py-3 font-medium text-white">{report.type}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: LAB_COLORS[report.labKey] }} />
                  {report.lab}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500">{formatReportDate(report.date)}</td>
              <td className="px-4 py-3">
                <Badge variant={statusBadgeVariant(report.status)}>{report.status}</Badge>
              </td>
              <td className="max-w-[200px] truncate px-4 py-3 text-slate-400">{report.finding}</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onDelete(report.id)}
                  className={`text-xs font-medium ${deleteId === report.id ? "text-red-400" : "text-slate-500 hover:text-red-400"}`}
                >
                  {deleteId === report.id ? "Confirm" : "Delete"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
