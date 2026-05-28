"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChatDonePayload,
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
};

type StreamPiece = {
  kind: "text" | "space" | "pause";
  text: string;
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
  const [lastProcess, setLastProcess] = useState<ProcessInputSummary | null>(null);
  const [sessionId, setSessionId] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const activeAssistantIdRef = useRef("");
  const streamBufferRef = useRef("");
  const streamQueueRef = useRef<StreamPiece[]>([]);
  const streamTimerRef = useRef<number | null>(null);
  const receivedStreamRef = useRef("");
  const donePayloadRef = useRef<ChatDonePayload | null>(null);

  const history = useMemo<VaidyMessage[]>(() => {
    return messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .filter((message) => message.content.trim())
      .slice(-10)
      .map((message) => ({ role: message.role as "user" | "assistant", content: message.content }));
  }, [messages]);

  const hasUserMessages = messages.some((message) => message.role === "user");

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

  const updateActiveAssistant = useCallback((content: string) => {
    const assistantId = activeAssistantIdRef.current;
    if (!assistantId) return;
    setMessages((current) =>
      current.map((message) => (message.id === assistantId ? { ...message, content } : message)),
    );
  }, []);

  const completeStreamIfReady = useCallback(() => {
    if (streamQueueRef.current.length || streamTimerRef.current !== null) return;
    const payload = donePayloadRef.current;
    const assistantId = activeAssistantIdRef.current;
    if (!payload || !assistantId) return;

    const finalText = streamBufferRef.current || payload.text || "";
    setMessages((current) =>
      current.map((message) =>
        message.id === assistantId
          ? {
              ...message,
              content: finalText,
              pending: false,
              model: payload.model,
            }
          : message,
      ),
    );
    donePayloadRef.current = null;
    activeAssistantIdRef.current = "";
    receivedStreamRef.current = "";
    streamBufferRef.current = "";
    setStreamLabel("ready");
    setIsStreaming(false);
    refreshStatus();
    inputRef.current?.focus();
  }, [refreshStatus]);

  const drainStreamQueue = useCallback(() => {
    streamTimerRef.current = null;
    const piece = streamQueueRef.current.shift();
    if (!piece) {
      completeStreamIfReady();
      return;
    }

    streamBufferRef.current += piece.text;
    updateActiveAssistant(streamBufferRef.current);
    setStreamLabel("streaming");

    streamTimerRef.current = window.setTimeout(
      drainStreamQueue,
      streamPieceDelay(piece, streamQueueRef.current.length),
    );
  }, [completeStreamIfReady, updateActiveAssistant]);

  const enqueueStreamText = useCallback(
    (text: string) => {
      if (!text) return;
      streamQueueRef.current.push(...splitStreamPieces(text));
      if (streamTimerRef.current === null) {
        drainStreamQueue();
      }
    },
    [drainStreamQueue],
  );

  const stopStreamTimer = useCallback(() => {
    if (streamTimerRef.current === null) return;
    window.clearTimeout(streamTimerRef.current);
    streamTimerRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopStreamTimer();
    };
  }, [stopStreamTimer]);

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
      receivedStreamRef.current = "";
      donePayloadRef.current = null;
      streamQueueRef.current = [];
      stopStreamTimer();
      setInput("");
      setIsStreaming(true);
      setStreamLabel("connecting");
      setMessages((current) => [...current, userMessage, assistantMessage]);

      try {
        await streamVaidyChat(trimmed, history, false, sessionId, {
          onMeta: (payload) => {
            syncSessionId(payload.session_id);
            setStreamLabel("thinking");
          },
          onChunk: (chunk) => {
            receivedStreamRef.current += chunk;
            enqueueStreamText(chunk);
          },
          onDone: (payload: ChatDonePayload) => {
            syncSessionId(payload.session_id);
            donePayloadRef.current = payload;
            const finalText = payload.text || "";
            if (!receivedStreamRef.current && finalText) {
              enqueueStreamText(finalText);
            } else if (
              finalText.length > receivedStreamRef.current.length &&
              finalText.startsWith(receivedStreamRef.current)
            ) {
              enqueueStreamText(finalText.slice(receivedStreamRef.current.length));
            }
            completeStreamIfReady();
          },
          onError: (message) => {
            stopStreamTimer();
            streamQueueRef.current = [];
            donePayloadRef.current = null;
            streamBufferRef.current = message;
            updateActiveAssistant(message);
            setMessages((current) =>
              current.map((item) =>
                item.id === assistantId ? { ...item, content: message, pending: false, model: "unavailable" } : item,
              ),
            );
            activeAssistantIdRef.current = "";
            receivedStreamRef.current = "";
            streamBufferRef.current = "";
            setIsStreaming(false);
            setStreamLabel("error");
            refreshStatus();
            inputRef.current?.focus();
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not reach the API.";
        stopStreamTimer();
        streamQueueRef.current = [];
        donePayloadRef.current = null;
        updateActiveAssistant(message);
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId ? { ...item, content: message, pending: false, model: "unavailable" } : item,
          ),
        );
        activeAssistantIdRef.current = "";
        receivedStreamRef.current = "";
        streamBufferRef.current = "";
        setIsStreaming(false);
        setStreamLabel("error");
        refreshStatus();
        inputRef.current?.focus();
      }
    },
    [
      completeStreamIfReady,
      enqueueStreamText,
      history,
      isStreaming,
      refreshStatus,
      sessionId,
      stopStreamTimer,
      syncSessionId,
      updateActiveAssistant,
    ],
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
        Drop reports into the input folder, then ask Vaidy to process them, search memory, or explain what the saved report memory says.
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
          {isUser ? (
            <span className="whitespace-pre-wrap">{message.content || "..."}</span>
          ) : (
            <AnimatedAssistantText active={Boolean(message.pending)} text={message.content || "..."} />
          )}
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

function ProcessNote({ summary }: { summary: ProcessInputSummary }) {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-[#00d97e]/15 bg-[#00d97e]/[0.055] px-4 py-3 text-sm text-white/65">
      Input checked: {summary.processed.length} processed, {summary.skipped.length} skipped, {summary.failed.length} failed.
    </div>
  );
}

function AnimatedAssistantText({ active, text }: { active: boolean; text: string }) {
  const segments = splitTextSegments(text);
  return (
    <span className="whitespace-pre-wrap">
      {segments.map((segment, index) =>
        segment.kind === "space" ? (
          <span key={`${index}-space`}>{segment.text}</span>
        ) : (
          <span key={`${index}-${segment.text}`} className="stream-token">
            {segment.text}
          </span>
        ),
      )}
      {active ? <span className="stream-caret" aria-hidden="true" /> : null}
    </span>
  );
}

function splitTextSegments(text: string) {
  const segments: Array<{ kind: "text" | "space"; text: string }> = [];
  let current = "";
  let currentKind: "text" | "space" | "pause" | "" = "";
  for (const character of text) {
    let nextKind: "text" | "space" | "pause" = "text";
    if (isSpaceCharacter(character)) {
      nextKind = "space";
    } else if (isPauseCharacter(character)) {
      nextKind = "pause";
    }

    if (currentKind && nextKind !== currentKind) {
      segments.push({ kind: currentKind === "space" ? "space" : "text", text: current });
      current = "";
    }
    current += character;
    currentKind = nextKind;
  }
  if (currentKind) {
    segments.push({ kind: currentKind === "space" ? "space" : "text", text: current });
  }
  return segments;
}

function splitStreamPieces(text: string) {
  const pieces: StreamPiece[] = [];
  let current = "";
  let currentKind: StreamPiece["kind"] | "" = "";

  for (const character of text) {
    let nextKind: StreamPiece["kind"] = "text";
    if (isSpaceCharacter(character)) {
      nextKind = "space";
    } else if (isPauseCharacter(character)) {
      nextKind = "pause";
    }

    if (currentKind && nextKind !== currentKind) {
      pieces.push({ kind: currentKind, text: current });
      current = "";
    }
    current += character;
    currentKind = nextKind;
  }

  if (currentKind) {
    pieces.push({ kind: currentKind, text: current });
  }

  return pieces;
}

function streamPieceDelay(piece: StreamPiece, remaining: number) {
  if (piece.kind === "space") return remaining > 60 ? 16 : 28;
  if (piece.kind === "pause") return remaining > 60 ? 70 : 128;
  if (piece.text.length <= 2) return remaining > 60 ? 46 : 72;
  return remaining > 60 ? 58 : 94;
}

function isSpaceCharacter(character: string) {
  return character === " " || character === "\n" || character === "\t";
}

function isPauseCharacter(character: string) {
  return character === "." || character === "," || character === "?" || character === "!" || character === ";" || character === ":";
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
