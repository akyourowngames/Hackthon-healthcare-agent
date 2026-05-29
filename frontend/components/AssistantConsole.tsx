"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChatDonePayload,
  EvidenceHit,
  FreshUpload,
  ProcessInputSummary,
  UploadStatusPayload,
  VaidyMessage,
  VaidyStatus,
  clearActiveReport,
  getVaidyStatus,
  processInputFolder,
  streamUploadProgress,
  streamVaidyChat,
  uploadReportWithProgress,
} from "@/lib/vaidy-api";

type ChatRecord = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  pending?: boolean;
  model?: string;
  evidence?: EvidenceHit[];
  tone?: "info" | "error" | "success";
};

type UploadStage =
  | "queued" | "uploading" | "received" | "reading"
  | "extracting" | "analyzing" | "done" | "error" | "cancelled";

type UploadItem = {
  id: string;
  name: string;
  label: string;
  size: number;
  stage: UploadStage;
  percent: number;
  message: string;
  isImage: boolean;
  reportId?: number;
  error?: string;
};

const promptChips = [
  "Analyze my latest report",
  "What reports are in memory?",
  "Explain the latest report simply",
  "What should I ask my doctor?",
  "Compare my reports over time",
  "What is my health score?",
];

const SESSION_KEY = "vaidy_chat_session_id";
const LANGUAGE_KEY = "vaidy_language_preference";
const USER_KEY = "vaidy_user_id";
const languageOptions = [
  { label: "Auto", value: "auto" },
  { label: "EN", value: "en" },
  { label: "HI", value: "hi" },
];

const DEFAULT_ACCEPT = ".pdf,.json,.txt,.md,.png,.jpg,.jpeg,.webp,.heic,.bmp,.tif,.tiff";
const FLUSH_INTERVAL_MS = 30;

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatBytes(size: number) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AssistantConsole() {
  const [messages, setMessages] = useState<ChatRecord[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<VaidyStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamLabel, setStreamLabel] = useState("ready");
  const [lastProcess, setLastProcess] = useState<ProcessInputSummary | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [userId, setUserId] = useState("local-user");
  const [languagePreference, setLanguagePreference] = useState("auto");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [freshUpload, setFreshUpload] = useState<FreshUpload | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const activeAssistantIdRef = useRef("");
  const streamBufferRef = useRef("");
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef("");
  const dragDepthRef = useRef(0);
  const lastFlushedLenRef = useRef(0);

  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  const history = useMemo<VaidyMessage[]>(() => {
    return messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .filter((m) => m.content.trim())
      .slice(-10)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  }, [messages]);

  const hasUserMessages = messages.some((m) => m.role === "user");
  const activeUploads = uploads.filter(
    (i) => i.stage !== "done" && i.stage !== "error" && i.stage !== "cancelled",
  );
  const connectionLabel = statusError ? "offline" : status ? "live" : "connecting";
  const connectionDotClass = statusError ? "bg-red-400" : status ? "bg-[#00d97e]" : "bg-amber-300";

  const syncSessionId = useCallback((value: unknown) => {
    if (typeof value !== "string" || !value.trim()) return;
    const next = value.trim();
    setSessionId(next);
    sessionIdRef.current = next;
    window.localStorage.setItem(SESSION_KEY, next);
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await getVaidyStatus(sessionIdRef.current);
      setStatus(s);
      setFreshUpload(s.fresh_upload ?? null);
      const saved = window.localStorage.getItem(USER_KEY);
      setUserId((s.supabase?.configured && saved) ? saved : s.default_user_id || "local-user");
      setStatusError("");
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : "API offline");
    }
  }, []);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  useEffect(() => {
    const saved = window.localStorage.getItem(SESSION_KEY);
    if (saved) { setSessionId(saved); sessionIdRef.current = saved; }
    const lang = window.localStorage.getItem(LANGUAGE_KEY);
    if (lang) setLanguagePreference(lang);
    const ask = new URLSearchParams(window.location.search).get("ask");
    if (ask) setInput(ask);
  }, []);

  useEffect(() => {
    const sync = () => document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
    sync();
    window.visualViewport?.addEventListener("resize", sync);
    window.addEventListener("resize", sync);
    return () => { window.visualViewport?.removeEventListener("resize", sync); window.removeEventListener("resize", sync); };
  }, []);

  useEffect(() => {
    if (!hasUserMessages) return;
    bottomRef.current?.scrollIntoView({ behavior: isStreaming ? "auto" : "smooth", block: "end" });
  }, [hasUserMessages, messages, isStreaming]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  // --- Streaming flush: interval-based for smooth updates ---
  const startFlushInterval = useCallback(() => {
    if (flushIntervalRef.current) return;
    lastFlushedLenRef.current = 0;
    flushIntervalRef.current = setInterval(() => {
      const id = activeAssistantIdRef.current;
      const buf = streamBufferRef.current;
      if (!id || buf.length === lastFlushedLenRef.current) return;
      lastFlushedLenRef.current = buf.length;
      setMessages((cur) => cur.map((m) => m.id === id ? { ...m, content: buf } : m));
    }, FLUSH_INTERVAL_MS);
  }, []);

  const stopFlushInterval = useCallback(() => {
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }
    // Final flush
    const id = activeAssistantIdRef.current;
    const buf = streamBufferRef.current;
    if (id && buf) {
      setMessages((cur) => cur.map((m) => m.id === id ? { ...m, content: buf } : m));
    }
  }, []);

  useEffect(() => {
    return () => { if (flushIntervalRef.current) clearInterval(flushIntervalRef.current); chatAbortRef.current?.abort(); };
  }, []);

  const appendSystem = useCallback((content: string, tone: ChatRecord["tone"] = "info") => {
    setMessages((cur) => [...cur, { id: makeId("sys"), role: "system", content, tone }]);
  }, []);

  const patchUpload = useCallback((id: string, patch: Partial<UploadItem>) => {
    setUploads((cur) => cur.map((i) => i.id === id ? { ...i, ...patch } : i));
  }, []);

  const processInput = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true); setStreamLabel("processing");
    try {
      const s = await processInputFolder(false, userId);
      setLastProcess(s);
      appendSystem(`Input checked. ${s.processed.length} processed, ${s.skipped.length} skipped, ${s.failed.length} failed.`);
      await refreshStatus();
    } catch (e) { appendSystem(e instanceof Error ? e.message : "Could not process input.", "error"); }
    finally { setIsProcessing(false); setStreamLabel("ready"); }
  }, [appendSystem, isProcessing, refreshStatus, userId]);

  const uploadOneFile = useCallback(async (file: File, relativePath: string) => {
    const itemId = makeId("up");
    const label = relativePath || file.name;
    setUploads((cur) => [...cur, { id: itemId, name: file.name, label, size: file.size, stage: "queued", percent: 0, message: "Queued", isImage: /\.(png|jpe?g|webp|heic|bmp|tiff?)$/i.test(file.name) }]);
    try {
      patchUpload(itemId, { stage: "uploading", message: "Uploading", percent: 1 });
      const started = await uploadReportWithProgress(file, {
        localOnly: false, userId, sessionId: sessionIdRef.current, relativePath: label,
        onUploadProgress: (loaded, total) => {
          const pct = total ? Math.min(99, Math.round((loaded / total) * 100)) : 0;
          patchUpload(itemId, { stage: "uploading", percent: pct, message: `Uploading ${pct}%` });
        },
      });
      syncSessionId(started.session_id);
      await streamUploadProgress(started.job_id, {
        onStatus: (p: UploadStatusPayload) => {
          const raw = String(p.stage || "reading");
          if (raw === "ping" || raw === "queued") return;
          patchUpload(itemId, { stage: raw as UploadStage, message: p.message || raw, percent: raw === "analyzing" ? 95 : 80, isImage: Boolean(p.is_image) });
        },
        onDone: (p: UploadStatusPayload) => {
          const result = (p.result as Record<string, unknown>) || {};
          patchUpload(itemId, { stage: "done", percent: 100, message: "Analyzed", reportId: Number(result.report_id) || undefined });
          const insight = uploadInsight(result, label);
          if (insight) appendSystem(insight, "success");
        },
        onError: (msg) => { patchUpload(itemId, { stage: "error", message: "Failed", error: msg }); appendSystem(`${label}: ${msg}`, "error"); },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed.";
      patchUpload(itemId, { stage: "error", message: "Failed", error: msg });
      appendSystem(`${label}: ${msg}`, "error");
    }
  }, [appendSystem, patchUpload, syncSessionId, userId]);

  const uploadFiles = useCallback(async (incoming: Array<{ file: File; path: string }>) => {
    if (!incoming.length) return;
    setIsProcessing(true); setStreamLabel("uploading");
    const supported = status?.supported_extensions;
    const accepted: Array<{ file: File; path: string }> = [];
    for (const entry of incoming) {
      const dot = entry.file.name.lastIndexOf(".");
      const ext = dot >= 0 ? entry.file.name.slice(dot).toLowerCase() : "";
      if (supported && supported.length && !supported.includes(ext)) { appendSystem(`Skipped ${entry.path} (unsupported ${ext || "unknown"}).`, "error"); continue; }
      accepted.push(entry);
    }
    if (accepted.length > 1) appendSystem(`Uploading ${accepted.length} files...`);
    try { for (const e of accepted) await uploadOneFile(e.file, e.path); await refreshStatus(); }
    finally { setIsProcessing(false); setStreamLabel("ready"); if (fileInputRef.current) fileInputRef.current.value = ""; if (folderInputRef.current) folderInputRef.current.value = ""; }
  }, [appendSystem, refreshStatus, status?.supported_extensions, uploadOneFile]);

  const handleFileList = useCallback((fl: FileList | null) => {
    if (!fl || !fl.length) return;
    const entries: Array<{ file: File; path: string }> = [];
    for (const f of Array.from(fl)) entries.push({ file: f, path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name });
    uploadFiles(entries);
  }, [uploadFiles]);

  const openFileUpload = () => fileInputRef.current?.click();
  const openFolderUpload = () => folderInputRef.current?.click();
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDragEnter = (e: React.DragEvent) => { e.preventDefault(); dragDepthRef.current += 1; setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); dragDepthRef.current = Math.max(0, dragDepthRef.current - 1); if (dragDepthRef.current === 0) setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); dragDepthRef.current = 0; setIsDragging(false); handleFileList(e.dataTransfer?.files || null); };
  const clearFreshUpload = useCallback(async () => { setFreshUpload(null); await clearActiveReport(sessionIdRef.current); refreshStatus(); }, [refreshStatus]);

  // --- Send message with smooth streaming ---
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    const userMsg: ChatRecord = { id: makeId("u"), role: "user", content: trimmed };
    const aId = makeId("a");
    const aMsg: ChatRecord = { id: aId, role: "assistant", content: "", pending: true };
    const ctrl = new AbortController();
    chatAbortRef.current = ctrl;
    activeAssistantIdRef.current = aId;
    streamBufferRef.current = "";
    lastFlushedLenRef.current = 0;
    setInput(""); setIsStreaming(true); setStreamLabel("connecting");
    setMessages((cur) => [...cur, userMsg, aMsg]);
    startFlushInterval();
    try {
      await streamVaidyChat(trimmed, history, false, sessionIdRef.current, languagePreference, {
        signal: ctrl.signal,
        onMeta: (p) => { syncSessionId(p.session_id); setStreamLabel("thinking"); },
        onChunk: (chunk) => { streamBufferRef.current += chunk; setStreamLabel("streaming"); },
        onDone: (p: ChatDonePayload) => {
          syncSessionId(p.session_id);
          stopFlushInterval();
          const final = streamBufferRef.current || p.text || "";
          setMessages((cur) => cur.map((m) => m.id === aId ? { ...m, content: final, pending: false, model: p.model, evidence: p.evidence } : m));
          setStreamLabel("ready");
          if (p.used_report_context) setFreshUpload(null);
        },
        onError: (msg) => {
          stopFlushInterval();
          const fallback = streamBufferRef.current || msg;
          setMessages((cur) => cur.map((m) => m.id === aId ? { ...m, content: fallback, pending: false, model: msg === "Cancelled" ? "stopped" : "unavailable" } : m));
          setStreamLabel(msg === "Cancelled" ? "stopped" : "error");
        },
      });
    } catch (e) {
      stopFlushInterval();
      const msg = e instanceof Error ? e.message : "Could not reach the API.";
      setMessages((cur) => cur.map((m) => m.id === aId ? { ...m, content: msg, pending: false, model: "unavailable" } : m));
      setStreamLabel("error");
    }
    chatAbortRef.current = null; activeAssistantIdRef.current = ""; streamBufferRef.current = "";
    stopFlushInterval(); setIsStreaming(false); refreshStatus(); inputRef.current?.focus();
  }, [history, isStreaming, languagePreference, refreshStatus, startFlushInterval, stopFlushInterval, syncSessionId]);

  const stopStreaming = useCallback(() => { chatAbortRef.current?.abort(); }, []);
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); sendMessage(input); };
  const onInputKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } };
  const selectLanguage = (v: string) => { setLanguagePreference(v); window.localStorage.setItem(LANGUAGE_KEY, v); };

  return (
    <main className="relative h-[var(--app-height,100vh)] overflow-hidden bg-[#050608] text-white" onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      {isDragging && (
        <div className="pointer-events-none absolute inset-3 z-40 grid place-items-center rounded-3xl border-2 border-dashed border-[#00d97e]/60 bg-[#02100a]/80 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-lg font-bold text-[#00d97e]">Drop to analyze</p>
            <p className="mt-1 text-sm text-white/55">PDF, images, X-rays, scans, or a whole folder</p>
          </div>
        </div>
      )}
      <div className="flex h-full flex-col">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.08] px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 text-white no-underline">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#00d97e] text-[#03120a]"><PulseIcon /></span>
            <span className="text-sm font-extrabold tracking-tight">vaidy</span>
          </Link>
          <div className="flex items-center gap-2.5 text-[11px] text-white/50">
            <Link href="/dashboard" className="hidden rounded-lg border border-white/[0.09] px-2.5 py-1.5 font-semibold text-white/70 transition hover:border-[#00d97e]/40 hover:text-white sm:inline-flex">
              Dashboard
            </Link>
            <div className="hidden rounded-lg border border-white/[0.08] bg-white/[0.035] p-0.5 sm:flex">
              {languageOptions.map((o) => (
                <button key={o.value} type="button" onClick={() => selectLanguage(o.value)} className={`rounded-md px-2 py-1 font-semibold transition ${languagePreference === o.value ? "bg-[#00d97e] text-[#03120a]" : "text-white/50 hover:text-white"}`}>{o.label}</button>
              ))}
            </div>
            <span className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${connectionDotClass}`} />{connectionLabel}</span>
          </div>
        </header>

        {/* Chat area */}
        <section className="relative min-h-0 flex-1 overflow-hidden">
          <div className="mx-auto flex h-full max-w-3xl flex-col px-4">
            <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pb-52 pt-6 sm:pb-56 sm:pt-8">
              <div className={hasUserMessages ? "space-y-5 pt-2" : "space-y-7"}>
                {!hasUserMessages && <Intro status={status} streamLabel={streamLabel} />}
                {messages.map((m) => <MessageBlock key={m.id} message={m} />)}
                {lastProcess && <ProcessNote summary={lastProcess} />}
                <div ref={bottomRef} />
              </div>
            </div>
          </div>

          {/* Bottom panel */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#050608] via-[#050608]/95 to-transparent px-4 pb-3 pt-8">
            <div className="mx-auto max-w-3xl space-y-2">
              {uploads.length > 0 && <UploadTray uploads={uploads} onDismiss={(id) => setUploads((c) => c.filter((i) => i.id !== id))} />}
              {freshUpload && !activeUploads.length && <FreshUploadChip fresh={freshUpload} onClear={clearFreshUpload} />}
              {!hasUserMessages && !uploads.length && (
                <div className="flex flex-wrap gap-1.5">
                  {promptChips.map((p) => (
                    <button key={p} type="button" onClick={() => sendMessage(p)} disabled={isStreaming} className="rounded-full border border-white/[0.09] bg-white/[0.035] px-3 py-1.5 text-[11px] text-white/55 transition hover:border-[#00d97e]/40 hover:text-white disabled:opacity-40">{p}</button>
                  ))}
                </div>
              )}
              <form onSubmit={submit} className="flex items-end gap-1.5 rounded-2xl border border-white/[0.1] bg-white/[0.055] p-1.5 shadow-[0_18px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl">
                <input ref={fileInputRef} type="file" multiple accept={DEFAULT_ACCEPT} className="hidden" onChange={(e) => handleFileList(e.target.files)} />
                <input ref={folderInputRef} type="file" multiple className="hidden" {...{ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>} onChange={(e) => handleFileList(e.target.files)} />
                <button type="button" onClick={openFileUpload} disabled={isProcessing} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white/55 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-40" aria-label="Upload files" title="Upload files"><UploadIcon /></button>
                <button type="button" onClick={openFolderUpload} disabled={isProcessing} className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl text-white/55 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-40 sm:grid" aria-label="Upload folder" title="Upload folder"><FolderIcon /></button>
                <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onInputKeyDown} rows={1} placeholder="Ask Vaidy anything, or drop a report..." className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-1 py-2.5 text-sm leading-6 text-white outline-none placeholder:text-white/30" disabled={isStreaming} />
                {isStreaming ? (
                  <button type="button" onClick={stopStreaming} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.09] text-white transition hover:bg-white/[0.16]" aria-label="Stop" title="Stop"><StopIcon /></button>
                ) : (
                  <button type="submit" disabled={!input.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#00d97e] text-[#03120a] transition hover:bg-[#2ff0a0] disabled:cursor-default disabled:opacity-45" aria-label="Send" title="Send"><SendIcon /></button>
                )}
              </form>
              <p className="text-center text-[10px] text-white/25">
                {statusError ? statusError : status ? `Reports: ${status.report_count} · Memory: ${status.memory?.entries ?? "..."} · ${streamLabel}` : `Connecting... · ${streamLabel}`}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

// --- Sub-components ---

function Intro({ status, streamLabel }: { status: VaidyStatus | null; streamLabel: string }) {
  return (
    <div className="flex min-h-[calc(100vh-320px)] flex-col justify-center pb-6 pt-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#00d97e]/70">Vaidy Health Agent</p>
      <h1 className="mt-3 max-w-2xl text-2xl font-extrabold leading-tight text-white sm:text-4xl">
        Upload anything.<br />Get answers that remember.
      </h1>
      <p className="mt-4 max-w-lg text-sm leading-7 text-white/50">
        Drop a blood report, prescription, X-ray, CT scan, or a whole folder. Vaidy reads it, links it to this chat, and answers in plain language.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-white/40">
        <Chip label="Reports" value={status ? String(status.report_count) : "..."} />
        <Chip label="Memory" value={status?.memory ? String(status.memory.entries) : "..."} />
        <Chip label="Stream" value={streamLabel} />
      </div>
    </div>
  );
}

function MessageBlock({ message }: { message: ChatRecord }) {
  if (message.role === "system") {
    const cls = message.tone === "error" ? "border-red-400/20 bg-red-400/[0.05] text-red-200/75"
      : message.tone === "success" ? "border-[#00d97e]/20 bg-[#00d97e]/[0.06] text-white/70"
      : "border-white/[0.07] bg-white/[0.03] text-white/45";
    return <div className={`mx-auto max-w-xl rounded-xl border px-3.5 py-2.5 text-center text-xs ${cls}`}>{message.content}</div>;
  }
  const isUser = message.role === "user";
  return (
    <article className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={isUser ? "max-w-[80%]" : "max-w-full sm:max-w-[90%]"}>
        <div className={`mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] ${isUser ? "text-right text-white/25" : "text-[#00d97e]/60"}`}>
          {isUser ? "You" : "Vaidy"}
        </div>
        <div className={isUser
          ? "rounded-2xl rounded-tr-md border border-[#00d97e]/18 bg-[#00d97e]/10 px-3.5 py-2.5 text-[13px] leading-7 text-white"
          : "text-[14px] leading-7 text-white/80"
        }>
          {isUser ? (
            <span className="whitespace-pre-wrap">{message.content}</span>
          ) : message.pending && !message.content ? (
            <ThinkingDots />
          ) : (
            <MarkdownText text={message.content} />
          )}
        </div>
        {message.evidence && message.evidence.length > 0 && !isUser && <EvidenceRow evidence={message.evidence} />}
        {message.model && !isUser && (
          <p className="mt-2 text-[10px] text-white/20">
            {message.model === "unavailable" ? "local fallback" : message.model === "stopped" ? "stopped" : message.model}
          </p>
        )}
      </div>
    </article>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00d97e]/60" style={{ animationDelay: "0ms" }} />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00d97e]/60" style={{ animationDelay: "200ms" }} />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00d97e]/60" style={{ animationDelay: "400ms" }} />
    </span>
  );
}

function MarkdownText({ text }: { text: string }) {
  // Simple markdown: bold, bullet lists, line breaks
  const lines = text.split("\n");
  return (
    <span className="whitespace-pre-wrap">
      {lines.map((line, i) => {
        const trimmed = line.trimStart();
        const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("• ");
        const content = isBullet ? trimmed.slice(2) : line;
        const formatted = formatInline(content);
        if (isBullet) {
          return <span key={i} className="block pl-3 before:absolute before:-ml-3 before:content-['•'] before:text-[#00d97e]/50">{formatted}{i < lines.length - 1 && "\n"}</span>;
        }
        return <span key={i}>{formatted}{i < lines.length - 1 && "\n"}</span>;
      })}
    </span>
  );
}

function formatInline(text: string) {
  // Bold: **text**
  const parts: Array<string | { bold: string }> = [];
  let remaining = text;
  while (remaining.length > 0) {
    const start = remaining.indexOf("**");
    if (start < 0) { parts.push(remaining); break; }
    if (start > 0) parts.push(remaining.slice(0, start));
    const end = remaining.indexOf("**", start + 2);
    if (end < 0) { parts.push(remaining.slice(start)); break; }
    parts.push({ bold: remaining.slice(start + 2, end) });
    remaining = remaining.slice(end + 2);
  }
  return parts.map((p, i) => typeof p === "string" ? <span key={i}>{p}</span> : <strong key={i} className="font-semibold text-white">{p.bold}</strong>);
}

function EvidenceRow({ evidence }: { evidence: EvidenceHit[] }) {
  const labels = Array.from(new Set(evidence.map((h) => {
    const p = [`#${h.report_id}`]; if (h.patient_name) p.push(h.patient_name); if (h.report_date) p.push(h.report_date);
    return p.join(" · ");
  }).filter(Boolean))).slice(0, 3);
  if (!labels.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {labels.map((l) => <span key={l} className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2 py-0.5 text-[9px] text-white/35">{l}</span>)}
    </div>
  );
}

function UploadTray({ uploads, onDismiss }: { uploads: UploadItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="space-y-1 rounded-xl border border-white/[0.07] bg-white/[0.025] p-1.5">
      {uploads.slice(-5).map((item) => <UploadRow key={item.id} item={item} onDismiss={onDismiss} />)}
      {uploads.length > 5 && <p className="px-2 text-[9px] text-white/30">+{uploads.length - 5} more</p>}
    </div>
  );
}

function UploadRow({ item, onDismiss }: { item: UploadItem; onDismiss: (id: string) => void }) {
  const done = item.stage === "done";
  const failed = item.stage === "error" || item.stage === "cancelled";
  const barCls = failed ? "bg-red-400/70" : done ? "bg-[#00d97e]" : "bg-[#00d97e]/60 animate-pulse";
  return (
    <div className="rounded-lg px-2 py-1.5">
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/[0.05] text-white/50">{item.isImage ? <ScanIcon /> : <DocIcon />}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium text-white/70">{item.label}</p>
          <p className="text-[9px] text-white/30">{formatBytes(item.size)}{formatBytes(item.size) ? " · " : ""}{stageLabel(item.stage, item.isImage)}</p>
        </div>
        {(done || failed) && <button type="button" onClick={() => onDismiss(item.id)} className="text-[9px] text-white/30 hover:text-white/60">✕</button>}
      </div>
      <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-white/[0.05]">
        <div className={`h-full rounded-full transition-all duration-500 ${barCls}`} style={{ width: `${item.percent}%` }} />
      </div>
    </div>
  );
}

function FreshUploadChip({ fresh, onClear }: { fresh: FreshUpload; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#00d97e]/18 bg-[#00d97e]/[0.05] px-3 py-2 text-[11px] text-white/60">
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[#00d97e] animate-pulse" />
        Report #{fresh.report_id} linked — say &ldquo;analyze this&rdquo; and I&apos;ll use it
      </span>
      <button type="button" onClick={onClear} className="text-white/30 hover:text-white/60">Unlink</button>
    </div>
  );
}

function ProcessNote({ summary }: { summary: ProcessInputSummary }) {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-[#00d97e]/12 bg-[#00d97e]/[0.04] px-3.5 py-2.5 text-xs text-white/55">
      Input: {summary.processed.length} processed, {summary.skipped.length} skipped, {summary.failed.length} failed.
    </div>
  );
}

function uploadInsight(result: Record<string, unknown> | undefined, label: string) {
  if (!result) return "";
  const summary = typeof result.summary === "string" ? result.summary.trim() : "";
  const score = result.health_score as Record<string, unknown> | undefined;
  const anomalies = Array.isArray(result.anomalies) ? result.anomalies : [];
  const biomarkers = Number(result.biomarkers) || 0;
  const findings = Number(result.findings) || 0;
  const parts = [`✓ ${label}`];
  if (biomarkers) parts.push(`${biomarkers} biomarkers`);
  if (findings) parts.push(`${findings} findings`);
  if (summary) parts.push(summary);
  const scoreText = score && typeof score.score !== "undefined" ? `Score: ${score.score}/100.` : "";
  if (scoreText) parts.push(scoreText);
  if (anomalies.length) {
    const first = anomalies[0] as Record<string, unknown>;
    parts.push(`${first.severity}: ${first.biomarker} — ${first.description}`);
    if (anomalies.length > 1) parts.push(`+${anomalies.length - 1} more`);
  }
  return parts.join(" · ");
}

function stageLabel(stage: UploadStage, isImage: boolean) {
  const map: Record<string, string> = { queued: "Queued", uploading: "Uploading", received: "Received", reading: "Reading", extracting: isImage ? "Analyzing image" : "Extracting", analyzing: "Analyzing trends", done: "Done", error: "Failed", cancelled: "Cancelled" };
  return map[stage] || stage;
}

function Chip({ label, value }: { label: string; value: string }) {
  return <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10px]"><span className="text-white/25">{label}: </span><span className="text-white/55">{value}</span></span>;
}

function shortPath(v: string) { const p = v.split("\\"); return p[p.length - 1] || v; }

// --- Icons ---
function PulseIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12h4l2-6 4 12 2-6h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function SendIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function StopIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" /></svg>; }
function UploadIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V4m0 0L7 9m5-5 5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function FolderIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4l2 2h7A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>; }
function DocIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M13 3v5h5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>; }
function ScanIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M4 12h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>; }
