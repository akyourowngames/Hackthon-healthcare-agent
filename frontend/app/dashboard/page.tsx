"use client";

import Link from "next/link";
import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardPayload,
  createShareLink,
  getDashboard,
  getVaidyStatus,
  streamUploadProgress,
  uploadReport,
} from "@/lib/vaidy-api";

const USER_KEY = "vaidy_user_id";

export default function DashboardPage() {
  const [userId, setUserId] = useState("local-user");
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState("");
  const [uploadLabel, setUploadLabel] = useState("ready");
  const [shareUrl, setShareUrl] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (activeUserId: string) => {
    setLoading(true);
    try {
      const payload = await getDashboard(activeUserId);
      setDashboard(payload);
      setError("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Dashboard unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getVaidyStatus()
      .then((status) => {
        const saved = window.localStorage.getItem(USER_KEY);
        const nextUserId = status.supabase?.configured && saved ? saved : status.default_user_id;
        setUserId(nextUserId || "local-user");
        refresh(nextUserId || "local-user");
      })
      .catch(() => {
        const saved = window.localStorage.getItem(USER_KEY) || "local-user";
        setUserId(saved);
        refresh(saved);
      });
  }, [refresh]);

  const upload = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setUploadLabel(`${file.name} selected`);
      setShareUrl("");
      try {
        const started = await uploadReport(file, false, userId);
        await streamUploadProgress(started.job_id, {
          onStatus: (payload) => setUploadLabel(String(payload.message || payload.stage || "working")),
          onDone: async () => {
            setUploadLabel("done");
            await refresh(userId);
          },
          onError: (message) => {
            setUploadLabel("error");
            setError(message);
          },
        });
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Upload failed");
        setUploadLabel("error");
      }
    },
    [refresh, userId],
  );

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    upload(event.target.files?.[0] || null);
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    upload(event.dataTransfer.files?.[0] || null);
  };

  const createShare = async () => {
    const reportId = Number(dashboard?.reports?.[0]?.id || 0);
    const result = await createShareLink(userId, reportId ? [reportId] : []);
    setShareUrl(result.url);
  };

  const topBiomarkers = useMemo(() => (dashboard?.biomarkers || []).slice(0, 6), [dashboard]);

  return (
    <main className="min-h-screen bg-[#050608] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-5">
          <Link href="/" className="flex items-center gap-3 text-white no-underline">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#00d97e] text-[#03120a] font-black">V</span>
            <span className="font-extrabold">vaidy</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm text-white/55">
            <Link href="/chat" className="rounded-lg px-3 py-2 hover:bg-white/[0.06] hover:text-white">Chat</Link>
            <Link href="/auth" className="rounded-lg px-3 py-2 hover:bg-white/[0.06] hover:text-white">Account</Link>
          </nav>
        </header>

        <section className="grid gap-5 py-6 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#00d97e]/80">Health Score</p>
              <div className="mt-4 flex items-end gap-3">
                <span className="text-6xl font-black">{dashboard?.health_score.score ?? "--"}</span>
                <span className="pb-2 text-sm text-white/45">/ 100</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/50">
                {dashboard
                  ? `${dashboard.health_score.abnormal_latest} abnormal latest readings, ${dashboard.health_score.finding_count} active findings.`
                  : loading
                    ? "Loading..."
                    : "No dashboard data yet."}
              </p>
            </div>

            <label
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
              className="block cursor-pointer rounded-lg border border-dashed border-[#00d97e]/35 bg-[#00d97e]/[0.055] p-5 transition hover:border-[#00d97e]/70"
            >
              <input className="hidden" type="file" accept=".pdf,.json,.txt,.md" onChange={onInputChange} />
              <span className="text-sm font-bold text-[#00d97e]">Upload report</span>
              <span className="mt-2 block text-sm leading-6 text-white/60">{uploadLabel}</span>
            </label>

            <button
              type="button"
              onClick={createShare}
              className="w-full rounded-lg bg-[#00d97e] px-4 py-3 text-sm font-extrabold text-[#03120a] transition hover:bg-[#2ff0a0]"
            >
              Share with doctor
            </button>
            {shareUrl ? (
              <Link href={shareUrl} className="block rounded-lg border border-white/[0.08] bg-white/[0.035] p-3 text-sm text-white/70">
                {shareUrl}
              </Link>
            ) : null}
          </aside>

          <section className="space-y-5">
            {error ? (
              <div className="rounded-lg border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-200">{error}</div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-3">
              {(dashboard?.anomalies || []).slice(0, 6).map((finding) => (
                <article key={`${finding.id}-${finding.biomarker}`} className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-4">
                  <p className={`text-xs font-black uppercase tracking-[0.14em] ${finding.severity === "urgent" ? "text-red-300" : finding.severity === "concern" ? "text-amber-300" : "text-[#00d97e]"}`}>
                    {finding.severity}
                  </p>
                  <h2 className="mt-3 text-base font-bold">{finding.biomarker}</h2>
                  <p className="mt-2 text-sm leading-6 text-white/58">{finding.description}</p>
                  <Link href={`/chat?ask=${encodeURIComponent(finding.description)}`} className="mt-4 inline-flex rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-bold text-white/70 hover:text-white">
                    Ask Vaidy
                  </Link>
                </article>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {topBiomarkers.map((biomarker) => (
                <article key={biomarker.name} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold capitalize">{biomarker.name}</h2>
                      <p className="mt-1 text-sm text-white/45">
                        Latest: {biomarker.latest?.value ?? "--"} {biomarker.latest?.unit}
                      </p>
                    </div>
                    <span className="rounded-md border border-white/[0.08] px-2 py-1 text-xs text-white/50">{biomarker.points} points</span>
                  </div>
                  <MiniChart rows={biomarker.history} />
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function MiniChart({ rows }: { rows: Array<{ value: number | null; flag: string }> }) {
  const values = rows.map((row) => row.value).filter((value): value is number => typeof value === "number");
  if (values.length < 2) {
    return <div className="mt-5 h-28 rounded-lg bg-white/[0.025] p-4 text-sm text-white/35">Need two reports for a trend.</div>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 86 - ((value - min) / spread) * 72;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className="mt-5 h-32 w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke="#00d97e" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      {values.map((value, index) => {
        const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
        const y = 86 - ((value - min) / spread) * 72;
        return <circle key={`${value}-${index}`} cx={x} cy={y} r="2.4" fill="#ffffff" vectorEffect="non-scaling-stroke" />;
      })}
    </svg>
  );
}
