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
  language: string;
  retrieval_intent: string;
};

export type FreshUpload = {
  report_id: number;
  active_report_at: string;
  age_seconds: number;
};

export type VaidyStatus = {
  ok: boolean;
  report_count: number;
  input_dir: string;
  output_dir: string;
  reports_dir: string;
  database_path: string;
  default_user_id: string;
  chat_model: string;
  chat_fast_model: string;
  chat_report_model: string;
  chat_streaming: boolean;
  supported_extensions: string[];
  image_extensions: string[];
  fresh_upload?: FreshUpload | null;
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
  supabase?: {
    enabled: boolean;
    configured: boolean;
    url: string;
    async_sync: boolean;
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

export type BiomarkerHistoryRow = {
  id: number;
  user_id: string;
  report_id: number;
  biomarker_name: string;
  value: number | null;
  unit: string;
  flag: string;
  ref_range: string;
  report_date: string;
  lab_name: string;
  created_at: string;
};

export type AnomalyFinding = {
  id: number;
  user_id: string;
  biomarker: string;
  finding_type: string;
  severity: "watch" | "concern" | "urgent" | string;
  description: string;
  data_points: Array<Record<string, unknown>>;
  metrics: Record<string, unknown>;
  detected_at: string;
};

export type DashboardPayload = {
  user_id: string;
  health_score: {
    score: number;
    latest_biomarkers: number;
    abnormal_latest: number;
    finding_count: number;
  };
  anomalies: AnomalyFinding[];
  biomarkers: Array<{
    name: string;
    latest: BiomarkerHistoryRow;
    history: BiomarkerHistoryRow[];
    points: number;
  }>;
  history: BiomarkerHistoryRow[];
  reports: Array<Record<string, unknown>>;
};

export type ShareLinkPayload = {
  token: string;
  user_id: string;
  report_ids: number[];
  expires_at: string;
  url: string;
};

export type ShareSummaryPayload = {
  token: string;
  expired: boolean;
  created_at: string;
  expires_at: string;
  view_count: number;
  user_id: string;
  reports: Array<Record<string, unknown>>;
  anomalies: AnomalyFinding[];
  health_score: DashboardPayload["health_score"];
  history: BiomarkerHistoryRow[];
};

export type UploadStartPayload = {
  job_id: string;
  file_path: string;
  file_label: string;
  session_id: string;
  progress_url: string;
};

export type UploadStatusPayload = {
  stage: string;
  message?: string;
  file_label?: string;
  is_image?: boolean;
  result?: Record<string, unknown>;
};

type StreamHandlers = {
  onMeta?: (payload: Record<string, unknown>) => void;
  onChunk: (text: string) => void;
  onDone: (payload: ChatDonePayload) => void;
  onError: (message: string) => void;
  signal?: AbortSignal;
};

type UploadProgressHandlers = {
  onStatus: (payload: UploadStatusPayload) => void;
  onDone: (payload: UploadStatusPayload) => void;
  onError: (message: string) => void;
  signal?: AbortSignal;
};

type UploadStartHandlers = {
  onUploadProgress?: (loaded: number, total: number) => void;
  signal?: AbortSignal;
};

export function vaidyApiBase() {
  const configured = process.env.NEXT_PUBLIC_VAIDY_API_URL || process.env.NEXT_PUBLIC_API_URL;
  let base = configured && configured.trim() ? configured.trim() : "";
  while (base.endsWith("/")) {
    base = base.slice(0, -1);
  }
  return base;
}

function vaidyBackendUrl(path: string) {
  const base = vaidyApiBase();
  if (!base) {
    return `/api/vaidy${path}`;
  }
  return `${base}${path}`;
}

function vaidyApiUrl(path: string) {
  const base = vaidyApiBase();
  if (!base) {
    return `/api/vaidy${path}`;
  }
  return `${base}/api${path}`;
}

export async function checkVaidyHealth(timeoutMs = 2000): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(vaidyBackendUrl("/health"), {
      cache: "no-store",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function getVaidyStatus(sessionId = ""): Promise<VaidyStatus> {
  const suffix = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
  const response = await fetch(vaidyApiUrl(`/status${suffix}`), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Status failed with ${response.status}`);
  }
  return response.json();
}

export async function processInputFolder(localOnly = false, userId = ""): Promise<ProcessInputSummary> {
  const response = await fetch(vaidyApiUrl("/process-input"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ local_only: localOnly, user_id: userId }),
  });
  if (!response.ok) {
    throw new Error(`Process input failed with ${response.status}`);
  }
  return response.json();
}

export async function getDashboard(userId: string): Promise<DashboardPayload> {
  const response = await fetch(vaidyApiUrl(`/dashboard/${encodeURIComponent(userId)}`), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Dashboard failed with ${response.status}`);
  }
  return response.json();
}

export async function createShareLink(userId: string, reportIds: number[] = []): Promise<ShareLinkPayload> {
  const response = await fetch(vaidyApiUrl("/share"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, report_ids: reportIds }),
  });
  if (!response.ok) {
    throw new Error(`Share failed with ${response.status}`);
  }
  return response.json();
}

export async function getShareSummary(token: string): Promise<ShareSummaryPayload> {
  const response = await fetch(vaidyApiUrl(`/share/${encodeURIComponent(token)}`), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Share summary failed with ${response.status}`);
  }
  return response.json();
}

export async function clearActiveReport(sessionId: string): Promise<void> {
  if (!sessionId) return;
  await fetch(vaidyApiUrl(`/sessions/${encodeURIComponent(sessionId)}/clear-active-report`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

export async function getSessionFreshUpload(sessionId: string): Promise<{
  fresh_upload: FreshUpload | null;
  report: Record<string, unknown> | null;
}> {
  if (!sessionId) {
    return { fresh_upload: null, report: null };
  }
  const response = await fetch(vaidyApiUrl(`/sessions/${encodeURIComponent(sessionId)}/fresh-upload`), {
    cache: "no-store",
  });
  if (!response.ok) {
    return { fresh_upload: null, report: null };
  }
  const payload = await response.json();
  return {
    fresh_upload: (payload?.fresh_upload as FreshUpload | null) || null,
    report: (payload?.report as Record<string, unknown> | null) || null,
  };
}

export function uploadReportWithProgress(
  file: File,
  options: {
    localOnly?: boolean;
    userId?: string;
    sessionId?: string;
    relativePath?: string;
  } & UploadStartHandlers = {},
): Promise<UploadStartPayload> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", vaidyApiUrl("/upload"));
    xhr.responseType = "json";
    if (options.signal) {
      const abortHandler = () => {
        xhr.abort();
      };
      if (options.signal.aborted) {
        abortHandler();
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      options.signal.addEventListener("abort", abortHandler, { once: true });
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && options.onUploadProgress) {
        options.onUploadProgress(event.loaded, event.total || file.size);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const payload = (xhr.response || {}) as UploadStartPayload;
        if (!payload.job_id) {
          reject(new Error("Upload returned no job id"));
          return;
        }
        resolve(payload);
        return;
      }
      const detail =
        xhr.response && typeof xhr.response === "object" && xhr.response.detail
          ? String(xhr.response.detail)
          : `Upload failed with ${xhr.status}`;
      reject(new Error(detail));
    };
    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    const form = new FormData();
    form.append("file", file);
    form.append("local_only", String(Boolean(options.localOnly)));
    if (options.userId) form.append("user_id", options.userId);
    if (options.sessionId) form.append("session_id", options.sessionId);
    if (options.relativePath) form.append("relative_path", options.relativePath);
    xhr.send(form);
  });
}

export async function uploadReport(
  file: File,
  localOnly = false,
  userId = "",
  sessionId = "",
): Promise<UploadStartPayload> {
  return uploadReportWithProgress(file, { localOnly, userId, sessionId });
}

export async function streamVaidyChat(
  message: string,
  history: VaidyMessage[],
  forceReportContext: boolean,
  sessionId: string,
  languagePreference: string,
  handlers: StreamHandlers,
) {
  let response: Response;
  try {
    response = await fetch(vaidyApiUrl("/chat/stream"), {
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
        language_preference: languagePreference,
      }),
      signal: handlers.signal,
    });
  } catch (error) {
    if (handlers.signal?.aborted) {
      handlers.onError("Cancelled");
      return;
    }
    handlers.onError(error instanceof Error ? error.message : "Could not reach the API.");
    return;
  }

  if (!response.ok || !response.body) {
    handlers.onError(`Chat stream failed with ${response.status}`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = consumeSseBuffer(buffer, handlers);
    }
    buffer += decoder.decode();
    consumeSseBuffer(buffer, handlers);
  } catch (error) {
    if (handlers.signal?.aborted) {
      handlers.onError("Cancelled");
      return;
    }
    handlers.onError(error instanceof Error ? error.message : "Stream interrupted.");
  }
}

export async function streamUploadProgress(
  jobId: string,
  handlers: UploadProgressHandlers,
) {
  let response: Response;
  try {
    response = await fetch(vaidyApiUrl(`/upload/progress/${encodeURIComponent(jobId)}`), {
      headers: { Accept: "text/event-stream" },
      signal: handlers.signal,
    });
  } catch (error) {
    if (handlers.signal?.aborted) {
      handlers.onError("Cancelled");
      return;
    }
    handlers.onError(error instanceof Error ? error.message : "Could not reach the API.");
    return;
  }
  if (!response.ok || !response.body) {
    handlers.onError(`Upload progress failed with ${response.status}`);
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = consumeUploadSseBuffer(buffer, handlers);
    }
    buffer += decoder.decode();
    consumeUploadSseBuffer(buffer, handlers);
  } catch (error) {
    if (handlers.signal?.aborted) {
      handlers.onError("Cancelled");
      return;
    }
    handlers.onError(error instanceof Error ? error.message : "Progress stream interrupted.");
  }
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

function consumeUploadSseBuffer(buffer: string, handlers: UploadProgressHandlers) {
  let working = buffer;
  let boundary = working.indexOf("\n\n");
  while (boundary >= 0) {
    const block = working.slice(0, boundary);
    working = working.slice(boundary + 2);
    const parsed = parseSseBlock(block);
    if (parsed.eventName === "status" || parsed.eventName === "ping") {
      handlers.onStatus(parsed.payload as UploadStatusPayload);
    } else if (parsed.eventName === "done") {
      handlers.onDone(parsed.payload as UploadStatusPayload);
    } else if (parsed.eventName === "error") {
      const message =
        typeof parsed.payload === "object" && parsed.payload !== null && "message" in parsed.payload
          ? String((parsed.payload as { message?: unknown }).message || "Upload failed.")
          : "Upload failed.";
      handlers.onError(message);
    }
    boundary = working.indexOf("\n\n");
  }
  return working;
}

function parseSseBlock(block: string) {
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
  return { eventName, payload: parsePayload(dataLines.join("\n")) };
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
