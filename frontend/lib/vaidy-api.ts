export type VaidyRole = "user" | "assistant";

export type VaidyMessage = {
  role: VaidyRole;
  content: string;
};

export type EvidenceHit = {
  report_id: number;
  chunk_id: number;
  score: number;
  text: string;
  patient_name: string;
  report_date: string;
  lab_name: string;
};

export type MemoryHit = {
  id: number;
  text: string;
  score: number;
  source: string;
  session_id: string;
  importance: number;
  created_at: string;
  last_seen_at: string;
  access_count: number;
};

export type ChatDonePayload = {
  text: string;
  used_report_context: boolean;
  model: string;
  evidence: EvidenceHit[];
  memory: MemoryHit[];
  session_id: string;
};

export type VaidyStatus = {
  ok: boolean;
  report_count: number;
  input_dir: string;
  output_dir: string;
  reports_dir: string;
  database_path: string;
  chat_model: string;
  chat_fast_model: string;
  chat_report_model: string;
  chat_streaming: boolean;
  supported_extensions: string[];
  memory?: {
    enabled: boolean;
    ok: boolean;
    sessions: number;
    messages: number;
    entries: number;
    vectors: number;
    duplicates: number;
    recall_limit: number;
    context_chars: number;
  };
};

export type ProcessInputSummary = {
  input_dir: string;
  output_dir: string;
  touched: number;
  processed: Array<Record<string, unknown>>;
  skipped: Array<Record<string, unknown>>;
  failed: Array<Record<string, unknown>>;
};

type StreamHandlers = {
  onMeta?: (payload: Record<string, unknown>) => void;
  onChunk: (text: string) => void;
  onDone: (payload: ChatDonePayload) => void;
  onError: (message: string) => void;
};

export function vaidyApiBase() {
  const configured = process.env.NEXT_PUBLIC_VAIDY_API_URL;
  let base = configured && configured.trim() ? configured.trim() : "http://localhost:8000";
  while (base.endsWith("/")) {
    base = base.slice(0, -1);
  }
  return base;
}

export async function getVaidyStatus(): Promise<VaidyStatus> {
  const response = await fetch(`${vaidyApiBase()}/api/status`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Status failed with ${response.status}`);
  }
  return response.json();
}

export async function processInputFolder(localOnly = false): Promise<ProcessInputSummary> {
  const response = await fetch(`${vaidyApiBase()}/api/process-input`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ local_only: localOnly }),
  });
  if (!response.ok) {
    throw new Error(`Process input failed with ${response.status}`);
  }
  return response.json();
}

export async function streamVaidyChat(
  message: string,
  history: VaidyMessage[],
  forceReportContext: boolean,
  sessionId: string,
  handlers: StreamHandlers,
) {
  const response = await fetch(`${vaidyApiBase()}/api/chat/stream`, {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      history,
      force_report_context: forceReportContext,
      session_id: sessionId,
    }),
  });

  if (!response.ok || !response.body) {
    handlers.onError(`Chat stream failed with ${response.status}`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = consumeSseBuffer(buffer, handlers);
  }

  buffer += decoder.decode();
  consumeSseBuffer(buffer, handlers);
}

function consumeSseBuffer(buffer: string, handlers: StreamHandlers) {
  let working = buffer;
  let boundary = working.indexOf("\n\n");
  while (boundary >= 0) {
    const block = working.slice(0, boundary);
    working = working.slice(boundary + 2);
    handleSseBlock(block, handlers);
    boundary = working.indexOf("\n\n");
  }
  return working;
}

function handleSseBlock(block: string, handlers: StreamHandlers) {
  if (!block.trim()) return;

  let eventName = "message";
  const dataLines: string[] = [];

  for (const rawLine of block.split("\n")) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }

  const rawData = dataLines.join("\n");
  const payload = parsePayload(rawData);
  if (eventName === "meta") {
    handlers.onMeta?.(payload);
    return;
  }
  if (eventName === "chunk") {
    const text = String(payload.text || "");
    if (text) handlers.onChunk(text);
    return;
  }
  if (eventName === "done") {
    handlers.onDone(payload as ChatDonePayload);
    return;
  }
  if (eventName === "error") {
    handlers.onError(String(payload.message || "The agent stream failed."));
  }
}

function parsePayload(rawData: string): Record<string, unknown> {
  if (!rawData) return {};
  try {
    const parsed = JSON.parse(rawData);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    return { text: rawData };
  }
  return {};
}
