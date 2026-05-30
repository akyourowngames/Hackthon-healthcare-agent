"use client";

import { DragEvent, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { motion } from "framer-motion";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { LAB_OPTIONS, REPORT_TYPE_OPTIONS, type MockReport } from "@/lib/mock-dashboard";
import { useDashboard } from "@/lib/dashboard-context";

type UploadModalProps = {
  open: boolean;
  onClose: () => void;
};

export function UploadModal({ open, onClose }: UploadModalProps) {
  const { addReport, showToast } = useDashboard();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [lab, setLab] = useState<string>(LAB_OPTIONS[0]);
  const [reportType, setReportType] = useState<string>(REPORT_TYPE_OPTIONS[0]);
  const [reportDate, setReportDate] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  function startUpload() {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    const interval = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          window.clearInterval(interval);
          return 100;
        }
        return p + 12;
      });
    }, 200);

    window.setTimeout(() => {
      const newReport: MockReport = {
        id: `r-${Date.now()}`,
        type: reportType,
        category: reportType.split(" ")[0] ?? "Other",
        lab,
        labKey: lab.toLowerCase().includes("apollo")
          ? "apollo"
          : lab.toLowerCase().includes("thyro")
            ? "thyrocare"
            : "other",
        date: reportDate || new Date().toISOString().slice(0, 10),
        status: "Processing",
        finding: "Analysis in progress…",
        biomarkers: [],
      };
      addReport(newReport);
      showToast("Report uploaded — AI analysis started", "success");
      setUploading(false);
      setFile(null);
      setProgress(0);
      onClose();
    }, 2200);
  }

  return (
    <Modal open={open} onClose={onClose} title="Upload Health Report" sheetOnMobile>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${
          dragOver
            ? "border-accent-primary bg-accent-glow"
            : "border-border border-dashed bg-surface hover:border-accent-primary"
        }`}
      >
        <motion.div animate={dragOver ? { y: [0, -4, 0] } : {}} transition={{ repeat: dragOver ? Infinity : 0, duration: 0.6 }}>
          <Upload className="mx-auto h-10 w-10 text-accent" />
        </motion.div>
        <p className="mt-3 text-sm font-semibold text-primary">Drag & drop your report here</p>
        <p className="mt-1 text-sm text-secondary">or click to browse</p>
        <p className="mt-2 text-xs text-slate-600">PDF, JPG, PNG · Max 10MB</p>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      {file ? (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-elevated p-3">
          <FileText className="h-5 w-5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-primary">{file.name}</p>
            <p className="text-xs text-secondary">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button type="button" onClick={() => setFile(null)} className="text-secondary hover:text-primary" aria-label="Remove file">
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Lab Name</span>
          <select value={lab} onChange={(e) => setLab(e.target.value)} className="auth-select w-full min-h-[44px] rounded-lg border border-border bg-surface px-3 text-secondary">
            {LAB_OPTIONS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Report Type</span>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="auth-select w-full min-h-[44px] rounded-lg border border-border bg-surface px-3 text-secondary">
            {REPORT_TYPE_OPTIONS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-slate-400">Report Date</span>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-border bg-surface px-3 text-secondary outline-none focus:ring-2 focus:border-accent-primary focus:shadow-accent-glow"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-slate-400">Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any context for AI analysis..."
            rows={3}
            className="w-full rounded-lg border border-white/[0.08] bg-[#0d0d12] px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:border-accent-primary focus:shadow-accent-glow"
          />
        </label>
      </div>

      {uploading ? (
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-xs text-secondary">
            <span>Analyzing with AI…</span>
            <span>{Math.min(progress, 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-elevated">
            <div className="h-full rounded-full bg-accent-primary transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        </div>
      ) : (
        <Button className="mt-5" fullWidth disabled={!file} onClick={startUpload} leftIcon={<Upload className="h-4 w-4" />}>
          Upload & Analyze
        </Button>
      )}
    </Modal>
  );
}
