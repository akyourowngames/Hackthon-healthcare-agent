"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChatDonePayload,
  EvidenceHit,
  MemoryHit,
  ProcessInputSummary,
  VaidyMessage,
  VaidyStatus,
  getVaidyStatus,
  processInputFolder,
  streamVaidyChat,
} from "@/lib/vaidy-api";

type ChatRecord = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  pending?: boolean;
  model?: string;
  evidence?: EvidenceHit[];
};

const promptChips = [
  "Process input and summarize what changed",
  "What reports are in memory?",
  "Explain the latest report simply",
  "What should I ask my doctor?",
];

const SESSION_KEY = "vaidy_chat_session_id";

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}`;
}

export default function AssistantConsole() {
  const [messages, setMessages] = useState<ChatRecord[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<VaidyStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamLabel, setStreamLabel] = useState("ready");
  const [lastEvidence, setLastEvidence] = useState<EvidenceHit[]>([]);
  const [lastMemory, setLastMemory] = useState<MemoryHit[]>([]);
  const [lastProcess, setLastProcess] = useState<ProcessInputSummary | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const activeAssistantIdRef = useRef("");
  const streamBufferRef = useRef("");
  const flushFrameRef = useRef<number | null>(null);

  const history = useMemo<VaidyMessage[]>(() => {
    return messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .filter((message) => message.content.trim())
      .slice(-10)
      .map((message) => ({ role: message.role as "user" | "assistant", content: message.content }));
  }, [messages]);

  const hasUserMessages = messages.some((message) => message.role === "user");
  const evidenceCount = lastEvidence.length + lastMemory.length;

  const syncSessionId = useCallback((value: unknown) => {
    if (typeof value !== "string" || !value.trim()) return;
    const nextSessionId = value.trim();
    setSessionId(nextSessionId);
    window.localStorage.setItem(SESSION_KEY, nextSessionId);
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const nextStatus = await getVaidyStatus();
      setStatus(nextStatus);
      setStatusError("");
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "API offline");
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const savedSessionId = window.localStorage.getItem(SESSION_KEY);
    if (savedSessionId) {
      setSessionId(savedSessionId);
    }
  }, []);

  useEffect(() => {
    if (!hasUserMessages) return;
    bottomRef.current?.scrollIntoView({ behavior: isStreaming ? "auto" : "smooth", block: "end" });
  }, [hasUserMessages, messages, isStreaming]);

  useEffect(() => {
    const inputElement = inputRef.current;
    if (!inputElement) return;
    inputElement.style.height = "0px";
    inputElement.style.height = `${Math.min(inputElement.scrollHeight, 180)}px`;
  }, [input]);

  const flushStream = useCallback(() => {
    if (flushFrameRef.current !== null) {
      window.cancelAnimationFrame(flushFrameRef.current);
      flushFrameRef.current = null;
    }
    const assistantId = activeAssistantIdRef.current;
    const text = streamBufferRef.current;
    if (!assistantId) return;
    setMessages((current) =>
      current.map((message) => (message.id === assistantId ? { ...message, content: text } : message)),
    );
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushFrameRef.current !== null) return;
    flushFrameRef.current = window.requestAnimationFrame(() => {
      flushFrameRef.current = null;
      flushStream();
    });
  }, [flushStream]);

  const appendSystem = useCallback((content: string) => {
    setMessages((current) => [...current, { id: makeId("system"), role: "system", content }]);
  }, []);

  const processInput = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setStreamLabel("processing");
    try {
      const summary = await processInputFolder(false);
      setLastProcess(summary);
      appendSystem(
        `Input checked. ${summary.processed.length} processed, ${summary.skipped.length} skipped, ${summary.failed.length} failed.`,
      );
      await refreshStatus();
    } catch (error) {
      appendSystem(error instanceof Error ? error.message : "Could not process input.");
    } finally {
      setIsProcessing(false);
      setStreamLabel("ready");
    }
  }, [appendSystem, isProcessing, refreshStatus]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userMessage: ChatRecord = { id: makeId("user"), role: "user", content: trimmed };
      const assistantId = makeId("assistant");
      const assistantMessage: ChatRecord = {
        id: assistantId,
        role: "assistant",
        content: "",
        pending: true,
      };

      activeAssistantIdRef.current = assistantId;
      streamBufferRef.current = "";
      setInput("");
      setIsStreaming(true);
      setStreamLabel("connecting");
      setMessages((current) => [...current, userMessage, assistantMessage]);

      await streamVaidyChat(trimmed, history, false, sessionId, {
        onMeta: (payload) => {
          syncSessionId(payload.session_id);
          setStreamLabel("thinking");
        },
        onChunk: (chunk) => {
          streamBufferRef.current += chunk;
          setStreamLabel("streaming");
          scheduleFlush();
        },
        onDone: (payload: ChatDonePayload) => {
          syncSessionId(payload.session_id);
          if (!streamBufferRef.current) {
            streamBufferRef.current = payload.text || "";
          }
          flushStream();
          setLastEvidence(payload.evidence || []);
          setLastMemory(payload.memory || []);
          setEvidenceOpen(Boolean((payload.evidence && payload.evidence.length) || (payload.memory && payload.memory.length)));
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    content: streamBufferRef.current || payload.text,
                    pending: false,
                    model: payload.model,
                    evidence: payload.evidence || [],
                  }
                : message,
            ),
          );
          setStreamLabel("ready");
        },
        onError: (message) => {
          streamBufferRef.current = message;
          flushStream();
          setMessages((current) =>
            current.map((item) =>
              item.id === assistantId ? { ...item, content: message, pending: false, model: "unavailable" } : item,
            ),
          );
          setStreamLabel("error");
        },
      });

      activeAssistantIdRef.current = "";
      streamBufferRef.current = "";
      setIsStreaming(false);
      refreshStatus();
      inputRef.current?.focus();
    },
    [flushStream, history, isStreaming, refreshStatus, scheduleFlush, sessionId, syncSessionId],
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(input);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    sendMessage(input);
  };

  return (
    <main className="h-screen overflow-hidden bg-[#050608] text-white">
      <div className="flex h-full flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.08] px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 text-white no-underline">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#00d97e] text-[#03120a]">
              <PulseIcon />
            </span>
            <span className="text-[15px] font-extrabold">vaidy</span>
          </Link>

          <div className="flex items-center gap-3 text-xs text-white/50">
            <button
              type="button"
              onClick={processInput}
              disabled={isProcessing}
              className="hidden rounded-lg border border-white/[0.09] px-3 py-2 font-semibold text-white/70 transition hover:border-[#00d97e]/40 hover:text-white disabled:opacity-45 sm:inline-flex"
            >
              {isProcessing ? "Processing" : "Process input"}
            </button>
            <button
              type="button"
              onClick={() => setEvidenceOpen((value) => !value)}
              className="rounded-lg border border-white/[0.09] px-3 py-2 font-semibold text-white/70 transition hover:border-[#00d97e]/40 hover:text-white"
            >
              Evidence {evidenceCount ? evidenceCount : ""}
            </button>
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${statusError ? "bg-red-400" : "bg-[#00d97e]"}`} />
              <span>{statusError ? "offline" : "live"}</span>
            </span>
          </div>
        </header>

        <section className="relative min-h-0 flex-1 overflow-hidden">
          <div className="mx-auto flex h-full max-w-3xl flex-col px-4">
            <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pb-32 pt-6 sm:pb-36 sm:pt-8">
              <div className={hasUserMessages ? "space-y-6 pt-2" : "space-y-7"}>
                {!hasUserMessages ? <Intro status={status} streamLabel={streamLabel} /> : null}
                {messages.map((message) => (
                  <MessageBlock key={message.id} message={message} />
                ))}
                {lastProcess ? <ProcessNote summary={lastProcess} /> : null}
                <div ref={bottomRef} />
              </div>
            </div>
          </div>

          <EvidenceDrawer open={evidenceOpen} evidence={lastEvidence} memory={lastMemory} onClose={() => setEvidenceOpen(false)} />

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#050608] via-[#050608] to-transparent px-4 pb-4 pt-10">
            <div className="mx-auto max-w-3xl">
              {!hasUserMessages ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {promptChips.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendMessage(prompt)}
                      disabled={isStreaming}
                      className="rounded-full border border-white/[0.09] bg-white/[0.035] px-3 py-2 text-xs text-white/58 transition hover:border-[#00d97e]/40 hover:text-white disabled:opacity-40"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              ) : null}
              <form
                onSubmit={submit}
                className="flex items-end gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.055] p-2 shadow-[0_18px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl"
              >
                <button
                  type="button"
                  onClick={processInput}
                  disabled={isProcessing}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white/58 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-40"
                  aria-label="Process input folder"
                  title="Process input folder"
                >
                  <FolderIcon />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={onInputKeyDown}
                  rows={1}
                  placeholder="Ask Vaidy anything about your reports..."
                  className="max-h-44 min-h-11 flex-1 resize-none bg-transparent px-1 py-3 text-[15px] leading-6 text-white outline-none placeholder:text-white/32"
                  disabled={isStreaming}
                />
                <button
                  type="submit"
                  disabled={isStreaming || !input.trim()}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#00d97e] text-[#03120a] transition hover:bg-[#2ff0a0] disabled:cursor-default disabled:opacity-45"
                  aria-label="Send message"
                  title="Send"
                >
                  <SendIcon />
                </button>
              </form>
              <p className="mt-2 text-center text-[11px] text-white/28">
                {statusError
                  ? statusError
                  : `Reports: ${status?.report_count ?? "..."} | Memory: ${status?.memory?.entries ?? "..."} | Stream: ${streamLabel}`}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Intro({ status, streamLabel }: { status: VaidyStatus | null; streamLabel: string }) {
  return (
    <div className="flex min-h-[calc(100vh-260px)] flex-col justify-center pb-6 pt-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00d97e]/75">Vaidy Assistant</p>
      <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight text-white sm:text-5xl">
        Clean report memory, live answers.
      </h1>
      <p className="mt-5 max-w-xl text-[15px] leading-7 text-white/58">
        Drop reports into the input folder, then ask Vaidy to process them, search memory, or explain what the saved evidence says.
      </p>
      <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/45">
        <Chip label="Reports" value={status ? String(status.report_count) : "..."} />
        <Chip label="Memory" value={status?.memory ? String(status.memory.entries) : "..."} />
        <Chip label="Input" value={status ? shortPath(status.input_dir) : "..."} />
        <Chip label="Stream" value={streamLabel} />
      </div>
    </div>
  );
}

function MessageBlock({ message }: { message: ChatRecord }) {
  if (message.role === "system") {
    return <div className="mx-auto max-w-xl rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-center text-sm text-white/50">{message.content}</div>;
  }

  const isUser = message.role === "user";
  return (
    <article className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={isUser ? "max-w-[82%]" : "max-w-full sm:max-w-[92%]"}>
        <div className={`mb-2 text-[11px] font-bold uppercase tracking-[0.16em] ${isUser ? "text-right text-white/30" : "text-[#00d97e]/65"}`}>
          {isUser ? "You" : "Vaidy"}
        </div>
        <div
          className={
            isUser
              ? "rounded-2xl rounded-tr-md border border-[#00d97e]/20 bg-[#00d97e]/12 px-4 py-3 text-sm leading-7 text-white"
              : "text-[15px] leading-8 text-white/82"
          }
        >
          <span className="whitespace-pre-wrap">{message.content || "..."}</span>
          {message.pending ? <span className="ml-1 inline-block animate-pulse text-[#00d97e]">|</span> : null}
        </div>
        {message.model && !isUser ? (
          <p className="mt-3 text-[11px] text-white/22">
            {message.model === "unavailable" ? "local memory fallback" : message.model}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function EvidenceDrawer({
  open,
  evidence,
  memory,
  onClose,
}: {
  open: boolean;
  evidence: EvidenceHit[];
  memory: MemoryHit[];
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="absolute bottom-32 right-4 top-4 z-20 w-[min(360px,calc(100vw-32px))] rounded-2xl border border-white/[0.1] bg-[#090b12]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Evidence</p>
        <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-white/45 hover:bg-white/[0.06] hover:text-white">
          Close
        </button>
      </div>
      <div className="scrollbar-none mt-4 max-h-[calc(100%-48px)] space-y-3 overflow-y-auto overflow-x-hidden">
        {evidence.length || memory.length ? (
          <>
            {memory.map((hit) => (
              <div key={`memory-${hit.id}`} className="rounded-xl border border-[#00d97e]/15 bg-[#00d97e]/[0.045] p-3">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-[#00d97e]">memory</span>
                  <span className="text-white/35">{hit.score.toFixed(4)}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-white/62">{hit.text}</p>
              </div>
            ))}
            {evidence.map((hit) => (
              <div key={`${hit.report_id}-${hit.chunk_id}`} className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-3">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-[#00d97e]">report {hit.report_id}</span>
                  <span className="text-white/35">{hit.score.toFixed(4)}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-white/58">{hit.text}</p>
              </div>
            ))}
          </>
        ) : (
          <p className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-3 text-sm leading-6 text-white/55">
            Evidence and memory will appear here when Vaidy uses saved context.
          </p>
        )}
      </div>
    </div>
  );
}

function ProcessNote({ summary }: { summary: ProcessInputSummary }) {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-[#00d97e]/15 bg-[#00d97e]/[0.055] px-4 py-3 text-sm text-white/65">
      Input checked: {summary.processed.length} processed, {summary.skipped.length} skipped, {summary.failed.length} failed.
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5">
      <span className="text-white/30">{label}: </span>
      <span className="text-white/64">{value}</span>
    </span>
  );
}

function shortPath(value: string) {
  const parts = value.split("\\");
  return parts[parts.length - 1] || value;
}

function PulseIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12h4l2-6 4 12 2-6h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4l2 2h7A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
