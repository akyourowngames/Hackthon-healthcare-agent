"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  AnomalyFinding,
  BiomarkerHistoryRow,
  DashboardPayload,
  ShareLinkPayload,
  createShareLink,
  getDashboard,
  getVaidyStatus,
  streamUploadProgress,
  uploadReportWithProgress,
  UploadStatusPayload,
} from "@/lib/vaidy-api";

type Tab = "overview" | "reports" | "biomarkers" | "settings";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, userId, signOut } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [loading, isAuthenticated, router]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const payload = await getDashboard(userId);
      setDashboard(payload);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dashboard unavailable");
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isAuthenticated && userId) refresh();
  }, [isAuthenticated, userId, refresh]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth");
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050608] text-white">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#00d97e]" />
          <span className="text-sm text-white/50">Loading...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050608] text-white">
      {/* Top nav */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#050608]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 text-white no-underline">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#00d97e] text-[#03120a]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 12h4l2-6 4 12 2-6h6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span className="text-sm font-extrabold tracking-tight">vaidy</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {(["overview", "reports", "biomarkers", "settings"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium capitalize transition ${
                  activeTab === tab
                    ? "bg-white/[0.08] text-white"
                    : "text-white/45 hover:text-white/70"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="hidden rounded-lg border border-[#00d97e]/30 bg-[#00d97e]/[0.08] px-3.5 py-2 text-xs font-bold text-[#00d97e] transition hover:bg-[#00d97e]/[0.15] sm:inline-flex"
            >
              Open Assistant
            </Link>
            <button
              onClick={handleSignOut}
              className="rounded-lg px-3 py-2 text-xs font-medium text-white/40 transition hover:text-white/70"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="flex gap-1 overflow-x-auto border-t border-white/[0.04] px-4 py-2 sm:hidden">
          {(["overview", "reports", "biomarkers", "settings"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                activeTab === tab
                  ? "bg-white/[0.08] text-white"
                  : "text-white/40"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">
            {error}
            <button onClick={refresh} className="ml-3 font-bold text-red-300 hover:text-white">Retry</button>
          </div>
        )}

        {activeTab === "overview" && <OverviewTab dashboard={dashboard} userId={userId} onRefresh={refresh} refreshing={refreshing} />}
        {activeTab === "reports" && <ReportsTab dashboard={dashboard} userId={userId} onRefresh={refresh} />}
        {activeTab === "biomarkers" && <BiomarkersTab dashboard={dashboard} />}
        {activeTab === "settings" && <SettingsTab user={user} userId={userId} />}
      </div>
    </main>
  );
}

/* ─── Overview Tab ─────────────────────────────────────────────────────── */
function OverviewTab({
  dashboard,
  userId,
  onRefresh,
  refreshing,
}: {
  dashboard: DashboardPayload | null;
  userId: string;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const score = dashboard?.health_score;
  const anomalies = dashboard?.anomalies || [];
  const topBiomarkers = (dashboard?.biomarkers || []).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Welcome + quick actions */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Health Dashboard</h1>
          <p className="mt-1 text-sm text-white/45">
            {dashboard ? `${dashboard.reports.length} reports · ${anomalies.length} findings` : "Loading your health data..."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-xs font-bold text-white/60 transition hover:border-white/[0.2] hover:text-white disabled:opacity-40"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <ShareButton userId={userId} dashboard={dashboard} />
        </div>
      </div>

      {/* Score + Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreCard score={score?.score} label="Health Score" suffix="/100" color="emerald" />
        <StatCard value={dashboard?.reports.length ?? 0} label="Reports" icon="📄" />
        <StatCard value={score?.latest_biomarkers ?? 0} label="Biomarkers Tracked" icon="🧬" />
        <StatCard value={score?.finding_count ?? 0} label="Active Findings" icon="⚠️" />
      </div>

      {/* Upload zone */}
      <UploadZone userId={userId} onDone={onRefresh} />

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold">Anomaly Alerts</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {anomalies.slice(0, 6).map((finding) => (
              <AnomalyCard key={`${finding.id}-${finding.biomarker}`} finding={finding} />
            ))}
          </div>
        </section>
      )}

      {/* Top biomarkers */}
      {topBiomarkers.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold">Key Biomarkers</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {topBiomarkers.map((b) => (
              <BiomarkerCard key={b.name} name={b.name} latest={b.latest} history={b.history} points={b.points} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── Reports Tab ──────────────────────────────────────────────────────── */
function ReportsTab({
  dashboard,
  userId,
  onRefresh,
}: {
  dashboard: DashboardPayload | null;
  userId: string;
  onRefresh: () => void;
}) {
  const reports = dashboard?.reports || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Your Reports</h1>
        <span className="text-sm text-white/40">{reports.length} total</span>
      </div>

      <UploadZone userId={userId} onDone={onRefresh} />

      {reports.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
          <p className="text-4xl">📋</p>
          <p className="mt-4 text-lg font-bold text-white/60">No reports yet</p>
          <p className="mt-2 text-sm text-white/35">Upload a blood report, prescription, or scan to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report, idx) => (
            <ReportRow key={String(report.id || idx)} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportRow({ report }: { report: Record<string, unknown> }) {
  const name = String(report.patient_name || "Unknown");
  const date = String(report.report_date || "No date");
  const lab = String(report.lab_name || "Unknown lab");
  const biomarkers = Number(report.biomarker_count || 0);
  const id = Number(report.id || report.local_report_id || 0);

  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:border-white/[0.12]">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#00d97e]/[0.08] text-[#00d97e]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M13 3v5h5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{name}</p>
        <p className="mt-0.5 text-xs text-white/40">{date} · {lab} · {biomarkers} biomarkers</p>
      </div>
      <Link
        href={`/chat?ask=${encodeURIComponent(`Explain report #${id} in simple terms`)}`}
        className="shrink-0 rounded-lg border border-white/[0.08] px-3 py-1.5 text-[11px] font-bold text-white/50 transition hover:border-[#00d97e]/30 hover:text-[#00d97e]"
      >
        Ask Vaidy
      </Link>
    </div>
  );
}

/* ─── Biomarkers Tab ───────────────────────────────────────────────────── */
function BiomarkersTab({ dashboard }: { dashboard: DashboardPayload | null }) {
  const biomarkers = dashboard?.biomarkers || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Biomarker Trends</h1>
      {biomarkers.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
          <p className="text-4xl">🧬</p>
          <p className="mt-4 text-lg font-bold text-white/60">No biomarker data yet</p>
          <p className="mt-2 text-sm text-white/35">Upload at least one report to see trends.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {biomarkers.map((b) => (
            <BiomarkerCard key={b.name} name={b.name} latest={b.latest} history={b.history} points={b.points} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Settings Tab ─────────────────────────────────────────────────────── */
function SettingsTab({ user, userId }: { user: { email?: string } | null; userId: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Settings</h1>
      <div className="max-w-lg space-y-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/35">Account</p>
          <div className="mt-3 space-y-2">
            <InfoRow label="Email" value={user?.email || "Local mode"} />
            <InfoRow label="User ID" value={userId} />
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/35">Data</p>
          <p className="mt-3 text-sm text-white/50">
            All your health data is stored securely. Reports are processed locally and synced to your account.
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/35">Links</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/privacy" className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-white/50 hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-white/50 hover:text-white">Terms of Service</Link>
            <Link href="/contact" className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-white/50 hover:text-white">Contact</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-white/[0.02] px-3 py-2">
      <span className="text-xs font-semibold text-white/40">{label}</span>
      <span className="truncate text-xs text-white/70">{value}</span>
    </div>
  );
}

/* ─── Shared Components ────────────────────────────────────────────────── */

function ScoreCard({ score, label, suffix, color }: { score: number | undefined; label: string; suffix: string; color: string }) {
  const displayScore = score ?? "--";
  const ringPercent = typeof score === "number" ? score : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#00d97e]/70">{label}</p>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-5xl font-black">{displayScore}</span>
        <span className="pb-1.5 text-sm text-white/35">{suffix}</span>
      </div>
      {/* Progress ring background */}
      <div className="absolute -right-4 -top-4 h-24 w-24 opacity-20">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/10" />
          <circle
            cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8"
            className="text-[#00d97e]"
            strokeDasharray={`${ringPercent * 2.51} 251`}
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}

function StatCard({ value, label, icon }: { value: number; label: string; icon: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs text-white/40">{label}</p>
    </div>
  );
}

function AnomalyCard({ finding }: { finding: AnomalyFinding }) {
  const severityColors: Record<string, string> = {
    urgent: "border-red-400/20 bg-red-400/[0.04]",
    concern: "border-amber-400/20 bg-amber-400/[0.04]",
    watch: "border-[#00d97e]/20 bg-[#00d97e]/[0.04]",
  };
  const severityTextColors: Record<string, string> = {
    urgent: "text-red-300",
    concern: "text-amber-300",
    watch: "text-[#00d97e]",
  };
  const cls = severityColors[finding.severity] || severityColors.watch;
  const textCls = severityTextColors[finding.severity] || severityTextColors.watch;

  return (
    <article className={`rounded-xl border p-4 ${cls}`}>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${textCls}`}>
          {finding.severity}
        </span>
      </div>
      <h3 className="mt-2 text-sm font-bold capitalize">{finding.biomarker}</h3>
      <p className="mt-1.5 text-xs leading-5 text-white/50">{finding.description}</p>
      <Link
        href={`/chat?ask=${encodeURIComponent(finding.description)}`}
        className="mt-3 inline-flex text-[11px] font-bold text-[#00d97e] hover:underline"
      >
        Ask Vaidy →
      </Link>
    </article>
  );
}

function BiomarkerCard({
  name,
  latest,
  history,
  points,
}: {
  name: string;
  latest: BiomarkerHistoryRow;
  history: BiomarkerHistoryRow[];
  points: number;
}) {
  const flagColor = latest?.flag === "high" || latest?.flag === "H"
    ? "text-red-300"
    : latest?.flag === "low" || latest?.flag === "L"
      ? "text-amber-300"
      : "text-[#00d97e]";

  return (
    <article className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold capitalize">{name}</h3>
          <p className="mt-1 text-xs text-white/40">
            <span className={flagColor}>{latest?.value ?? "--"}</span> {latest?.unit || ""}
            {latest?.ref_range ? ` (ref: ${latest.ref_range})` : ""}
          </p>
        </div>
        <span className="rounded-md border border-white/[0.06] px-2 py-0.5 text-[10px] text-white/35">{points} pts</span>
      </div>
      <MiniChart rows={history} />
    </article>
  );
}

function MiniChart({ rows }: { rows: Array<{ value: number | null; flag: string }> }) {
  const values = rows.map((r) => r.value).filter((v): v is number => typeof v === "number");
  if (values.length < 2) {
    return <div className="mt-4 h-16 rounded-lg bg-white/[0.02] p-3 text-[10px] text-white/25">Need 2+ data points for trend</div>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 85 - ((v - min) / spread) * 70;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="mt-4 h-16 w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke="#00d97e" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * 100;
        const y = 85 - ((v - min) / spread) * 70;
        return <circle key={i} cx={x} cy={y} r="2" fill="#fff" vectorEffect="non-scaling-stroke" />;
      })}
    </svg>
  );
}

function UploadZone({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setUploadMsg(`Uploading ${file.name}...`);
    try {
      const started = await uploadReportWithProgress(file, { userId });
      await streamUploadProgress(started.job_id, {
        onStatus: (p: UploadStatusPayload) => setUploadMsg(String(p.message || p.stage || "Processing...")),
        onDone: () => { setUploadMsg("Done! Report analyzed."); onDone(); },
        onError: (msg) => setUploadMsg(`Error: ${msg}`),
      });
    } catch (err) {
      setUploadMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] || null);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0] || null);
  };

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`block cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
        isDragging
          ? "border-[#00d97e]/60 bg-[#00d97e]/[0.06]"
          : "border-white/[0.08] bg-white/[0.015] hover:border-[#00d97e]/30 hover:bg-white/[0.025]"
      }`}
    >
      <input className="hidden" type="file" accept=".pdf,.json,.txt,.md,.png,.jpg,.jpeg,.webp" onChange={onInputChange} disabled={uploading} />
      <div className="mx-auto w-fit rounded-xl bg-[#00d97e]/[0.1] p-3">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#00d97e]"><path d="M12 16V4m0 0L7 9m5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <p className="mt-3 text-sm font-bold text-white/70">
        {uploading ? "Processing..." : "Drop a report here or click to upload"}
      </p>
      <p className="mt-1 text-xs text-white/35">
        {uploadMsg || "PDF, images, JSON — blood reports, prescriptions, scans"}
      </p>
    </label>
  );
}

function ShareButton({ userId, dashboard }: { userId: string; dashboard: DashboardPayload | null }) {
  const [shareUrl, setShareUrl] = useState("");
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      const reportIds = (dashboard?.reports || []).map((r) => Number(r.id || r.local_report_id || 0)).filter(Boolean);
      const result = await createShareLink(userId, reportIds.slice(0, 5));
      setShareUrl(result.url);
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(result.url);
      }
    } catch {
      // silently fail
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        disabled={sharing || !dashboard?.reports?.length}
        className="rounded-xl bg-[#00d97e] px-4 py-2.5 text-xs font-extrabold text-[#03120a] transition hover:bg-[#2ff0a0] disabled:opacity-40"
      >
        {sharing ? "Creating..." : shareUrl ? "Copied!" : "Share with Doctor"}
      </button>
      {shareUrl && (
        <p className="absolute right-0 top-full mt-2 w-64 truncate rounded-lg border border-white/[0.08] bg-[#0a0d16] px-3 py-2 text-[10px] text-white/50">
          {shareUrl}
        </p>
      )}
    </div>
  );
}
