"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShareSummaryPayload, getShareSummary } from "@/lib/vaidy-api";

export default function SharePage({ params }: { params: { token: string } }) {
  const [summary, setSummary] = useState<ShareSummaryPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getShareSummary(params.token)
      .then((payload) => {
        setSummary(payload);
        setError("");
      })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Share unavailable"));
  }, [params.token]);

  const report = summary?.reports?.[0]?.report as Record<string, unknown> | undefined;
  const biomarkers = report?.biomarkers && typeof report.biomarkers === "object"
    ? Object.entries(report.biomarkers as Record<string, Record<string, unknown>>)
    : [];

  return (
    <main className="min-h-screen bg-[#f7faf9] px-4 py-8 text-[#14201a]">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between border-b border-[#d7e2dd] pb-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#00875a]">Vaidy doctor share</p>
            <h1 className="mt-2 text-3xl font-black">Report summary</h1>
          </div>
          <Link href="/" className="text-sm font-bold text-[#00875a]">Vaidy</Link>
        </header>

        {error ? <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        {summary ? (
          <section className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Info label="Patient" value={String(report?.patient_name || "Not listed")} />
              <Info label="Date" value={String(report?.report_date || "Not listed")} />
              <Info label="Lab" value={String(report?.lab_name || "Not listed")} />
            </div>

            <section className="rounded-lg border border-[#d7e2dd] bg-white p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#00875a]">Health score</p>
                  <p className="mt-2 text-5xl font-black">{summary.health_score?.score ?? "--"}</p>
                </div>
                <p className="max-w-sm text-right text-sm leading-6 text-[#5f6d67]">
                  {summary.health_score?.abnormal_latest ?? 0} abnormal latest readings, {summary.anomalies.length} active findings.
                </p>
              </div>
            </section>

            <section className="rounded-lg border border-[#d7e2dd] bg-white p-5">
              <h2 className="text-lg font-black">Anomaly findings</h2>
              <div className="mt-4 space-y-3">
                {summary.anomalies.length ? summary.anomalies.map((finding) => (
                  <article key={`${finding.id}-${finding.biomarker}`} className="rounded-lg border border-[#e2ebe7] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[#00875a]">{finding.severity}</p>
                    <h3 className="mt-2 font-black">{finding.biomarker}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#5f6d67]">{finding.description}</p>
                  </article>
                )) : <p className="text-sm text-[#5f6d67]">No anomaly findings are currently stored.</p>}
              </div>
            </section>

            <section className="rounded-lg border border-[#d7e2dd] bg-white p-5">
              <h2 className="text-lg font-black">Latest biomarkers</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="border-b border-[#e2ebe7] text-xs uppercase tracking-[0.08em] text-[#6f7d77]">
                    <tr>
                      <th className="py-2">Marker</th>
                      <th className="py-2">Value</th>
                      <th className="py-2">Range</th>
                      <th className="py-2">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {biomarkers.map(([name, value]) => (
                      <tr key={name} className="border-b border-[#edf3f0]">
                        <td className="py-3 font-bold capitalize">{name}</td>
                        <td className="py-3">{String(value.value ?? "--")} {String(value.unit ?? "")}</td>
                        <td className="py-3">{String(value.ref_range ?? "--")}</td>
                        <td className="py-3">{String(value.flag ?? "--")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        ) : !error ? (
          <p className="mt-6 text-sm text-[#5f6d67]">Loading share...</p>
        ) : null}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#d7e2dd] bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[#6f7d77]">{label}</p>
      <p className="mt-2 font-bold">{value}</p>
    </div>
  );
}
