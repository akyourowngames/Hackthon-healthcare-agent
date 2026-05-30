# Vaidy API Contract

Reference of every endpoint and data integration the frontend depends on.
Captured before pulling the upgraded frontend from `main` so the new UI can be
re-wired to the same backend without guesswork.

Two integration surfaces exist:

1. **Backend HTTP API** (FastAPI) — served at `http://127.0.0.1:8000` by default.
2. **Direct Supabase access** — the frontend reads analyzed data straight from
   Supabase tables/storage using the user's auth session.

---

## 1. Connection / Base URL

The old frontend resolved the API base like this:

- Env var `NEXT_PUBLIC_VAIDY_API_URL` (e.g. `http://localhost:8000`).
  - When set, calls go to `${base}/api/<path>`.
  - When empty, calls go to the Next.js proxy at `/api/vaidy/<path>`.
- Next.js proxy route: `frontend/app/api/vaidy/[...path]/route.ts`
  - Forwards `/api/vaidy/<path>` → `${VAIDY_API_URL or http://VAIDY_API_HOST:VAIDY_API_PORT}/api/<path>`.
  - Backend host/port envs: `VAIDY_API_HOST` (default `127.0.0.1`), `VAIDY_API_PORT` (default `8000`).
  - Strips hop-by-hop headers, forwards `content-type` and `accept`, sets `Cache-Control: no-store`.
  - Supports GET and POST. Returns 502 JSON `{ error, cause, target }` if the backend is unreachable.

CORS / host / port / stream keepalive / warmup are configured in
`backend/healthcare_agent/api_policy.md` (env overrides:
`VAIDY_API_HOST`, `VAIDY_API_PORT`, `VAIDY_API_CORS_ORIGINS`,
`VAIDY_API_STREAM_KEEPALIVE_SECONDS`, `VAIDY_API_WARMUP_ON_START`).

---

## 2. Backend HTTP Endpoints

All paths are prefixed with `/api`.

### Health & status

| Method | Path | Query / Body | Response |
| --- | --- | --- | --- |
| GET | `/api/health` | — | `{ ok, database_path, input_dir, output_dir }` |
| GET | `/api/status` | `?session_id=` (optional) | `VaidyStatus` (see types) |
| GET | `/api/supabase/status` | — | `{ enabled, configured, url, async_sync, storage_bucket? }` |

### Reports

| Method | Path | Query / Body | Response |
| --- | --- | --- | --- |
| GET | `/api/reports` | — | `{ reports: ReportRow[] }` |
| GET | `/api/reports/{report_id}` | path int | full report record incl. `report` JSON; 404 if missing |
| POST | `/api/reports/deduplicate` | — | `{ removed, kept, removed_count }` |
| POST | `/api/process-input` | `{ local_only: bool, user_id: str }` | `ProcessInputSummary` |

### Dashboard & analytics

| Method | Path | Query / Body | Response |
| --- | --- | --- | --- |
| GET | `/api/dashboard/{user_id}` | path | `DashboardPayload` |
| GET | `/api/biomarker/{user_id}/{biomarker_name}` | path | `{ user_id, biomarker, history[], anomalies[] }` |
| GET | `/api/notifications/{user_id}` | path | `{ notifications: [] }` |
| GET | `/api/search` | `?q=` (min 1), `?limit=` | `{ hits: EvidenceHit[] }` |

### Chat

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/api/chat` | `ChatRequest` | `ChatDonePayload` |
| POST | `/api/chat/stream` | `ChatRequest` | SSE stream (events: `meta`, `chunk`, `done`, `error`, `ping`) |

`ChatRequest`:
```json
{
  "message": "string (min 1)",
  "history": [{ "role": "user|assistant", "content": "string" }],
  "force_report_context": false,
  "session_id": "",
  "user_id": "supabase-auth-user-id",
  "language_preference": "auto|en|hi",
  "profile": {
    "full_name": "string",
    "city": "string",
    "blood_group": "string",
    "conditions": ["string"],
    "medications": "string"
  }
}
```

SSE event payloads:
- `meta`: `{ status, streaming, session_id }`
- `chunk`: `{ text }`
- `done`: `ChatDonePayload`
- `error`: `{ message }`
- `ping`: `{ time }`

### Memory

| Method | Path | Query / Body | Response |
| --- | --- | --- | --- |
| GET | `/api/memory/status` | — | memory assessment object |
| GET | `/api/memory` | `?limit=50` | `{ entries: [] }` |
| GET | `/api/memory/recall` | `?q=` (min 1), `?session_id=`, `?user_id=`, `?limit=` | `{ hits: MemoryHit[] }` |
| POST | `/api/memory/remember` | `{ text, source, session_id, user_id, importance? }` | result object |

### Sharing

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/api/share` | `{ user_id, report_ids: number[] }` | `ShareLinkPayload` |
| GET | `/api/share/{token}` | path | `ShareSummaryPayload`; 404 missing, 410 expired |

### Upload (multipart + SSE progress)

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/api/upload` | multipart form | `{ job_id, file_path, file_label, session_id, progress_url }` |
| GET | `/api/upload/progress/{job_id}` | path | SSE stream (events: `status`, `done`, `error`, `ping`); 404 if job unknown |

`/api/upload` form fields:
- `file` (required, the binary)
- `local_only` ("true"/"false")
- `user_id` (Supabase user id; falls back to default)
- `session_id`
- `relative_path` (display label; defaults to filename)
- `supabase_access_token` (user JWT, used for Supabase storage/table sync under that user)

Upload SSE `status` stages: `received` → `reading` → `extracting` → `duplicate` (when the file/report already exists) → `analyzing` → `done`.
`done` payload: `{ stage: "done", message, result, file_label }` where `result`
includes `report_id`, `kind`, `duplicate?`, `biomarkers`, `findings`, `health_score`, `anomalies`, `is_image`.

### Sessions

| Method | Path | Query / Body | Response |
| --- | --- | --- | --- |
| POST | `/api/sessions/{session_id}/clear-active-report` | `?user_id=` | `{ ok, session_id }` |
| POST | `/api/sessions/{session_id}/attach-report` | `{ report_id: int, user_id?: string }` | `{ ok, session_id, fresh_upload, report }` |
| GET | `/api/sessions/{session_id}/fresh-upload` | `?user_id=` | `{ ok, fresh_upload, report }` |
| GET | `/api/sessions/{session_id}/messages` | `?limit=&user_id=` | `{ messages: [] }` |

---

## 3. Direct Supabase Access (frontend → Supabase)

The dashboard reads analyzed data straight from Supabase using the signed-in
user's session (RLS enforced). Requires envs:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` (default `User Data`).

The dashboard/profile/chat frontend must not persist profile, report, memory,
language, or session identity in browser local storage. Signed-in user data is
read from Supabase and scoped by `auth.uid()::text = user_id`.

IMPORTANT: queries must carry the user's JWT for RLS. The old frontend built a
per-request client with `Authorization: Bearer <access_token>` (see
`getAuthClient` in `frontend/lib/supabase-data.ts`). A bare anon client returns
0 rows because of the `auth.uid()::text = user_id` policies.

### Tables (all filtered by `user_id = auth.uid()::text`)

| Table | Read pattern | Notes |
| --- | --- | --- |
| `reports` | `select * eq user_id order created_at desc` | `local_report_id`, `report_json`, `biomarker_count`, `report_status` |
| `user_profiles` | `select * eq user_id maybeSingle` / `upsert on user_id` | settings page source of truth; hydrated from Google metadata on login |
| `biomarker_history` | `select * eq user_id order report_date asc` | numeric biomarker rows |
| `anomaly_findings` | `select * eq user_id order detected_at desc` | includes `finding_type='image_finding'` for scans |
| `share_links` | `select * eq user_id order created_at desc` | |
| `notification_outbox` | (delete on report delete) | queued email notifications |

### Storage bucket `User Data`

- List: `storage.from(bucket).list(<safeUser>, { limit: 100, sortBy created_at desc })`
- Signed URL: `createSignedUrl(<safeUser>/<file>, 600)`
- Public URL: `getPublicUrl(<safeUser>/<file>)`
- Remove: `remove([<safeUser>/<file>])`
- `<safeUser>` = user id with `/\:*?"<>|` replaced by `_`.

### Delete report (frontend cascade)

`deleteReport(reportId, userId, sourcePath)`:
1. delete `notification_outbox` where `local_report_id` + `user_id`
2. delete `biomarker_history` where `local_report_id` + `user_id`
3. delete `reports` where `id` + `user_id`
4. remove storage object `<safeUser>/<basename(sourcePath)>`

Backend mirror helpers (server-side, service role): `delete_reports`,
`sync_findings_for_user` in `backend/healthcare_agent/supabase_sync.py`.

---

## 4. Backend RLS requirement (Supabase SQL)

Policies must target the `authenticated` role explicitly, or reads return empty:

```sql
create policy "auth_can_read_own_reports" on public.reports
  for select to authenticated using ((auth.uid())::text = user_id);
-- same shape for biomarker_history, anomaly_findings, share_links, notification_outbox
```

Service-role key (backend only) bypasses RLS for sync/upsert/delete.
Never put the service-role key in the frontend.

---

## 5. TypeScript Types (from old frontend/lib/vaidy-api.ts)

These are the response shapes the new frontend should expect. Keep in sync if
the backend changes.

```ts
type VaidyRole = "user" | "assistant";
type VaidyMessage = { role: VaidyRole; content: string };

type EvidenceHit = {
  report_id: number; chunk_id: number; score: number; text: string;
  patient_name: string; report_date: string; lab_name: string;
};

type MemoryHit = {
  id: number; text: string; score: number; source: string; session_id: string;
  importance: number; created_at: string; last_seen_at: string; access_count: number;
};

type ChatDonePayload = {
  text: string; used_report_context: boolean; model: string;
  evidence: EvidenceHit[]; memory: MemoryHit[]; session_id: string;
  language: string; retrieval_intent: string;
};

type FreshUpload = { report_id: number; active_report_at: string; age_seconds: number };

type VaidyStatus = {
  ok: boolean; report_count: number; input_dir: string; output_dir: string;
  reports_dir: string; database_path: string; default_user_id: string;
  chat_model: string; chat_fast_model: string; chat_report_model: string;
  chat_streaming: boolean; supported_extensions: string[]; image_extensions: string[];
  fresh_upload?: FreshUpload | null;
  memory?: { enabled: boolean; ok: boolean; sessions: number; messages: number;
    entries: number; vectors: number; duplicates: number; recall_limit: number; context_chars: number };
  supabase?: { enabled: boolean; configured: boolean; url: string; async_sync: boolean; storage_bucket?: string };
};

type ProcessInputSummary = {
  input_dir: string; output_dir: string; touched: number;
  processed: Record<string, unknown>[]; skipped: Record<string, unknown>[]; failed: Record<string, unknown>[];
};

type BiomarkerHistoryRow = {
  id: number; user_id: string; report_id: number; biomarker_name: string;
  value: number | null; unit: string; flag: string; ref_range: string;
  report_date: string; lab_name: string; created_at: string;
};

type AnomalyFinding = {
  id: number; user_id: string; biomarker: string; finding_type: string;
  severity: "watch" | "concern" | "urgent" | string; description: string;
  data_points: Record<string, unknown>[]; metrics: Record<string, unknown>; detected_at: string;
};

type DashboardPayload = {
  user_id: string;
  health_score: { score: number; latest_biomarkers: number; abnormal_latest: number; finding_count: number };
  anomalies: AnomalyFinding[];
  biomarkers: { name: string; latest: BiomarkerHistoryRow; history: BiomarkerHistoryRow[]; points: number }[];
  history: BiomarkerHistoryRow[];
  reports: Record<string, unknown>[];
};

type ShareLinkPayload = { token: string; user_id: string; report_ids: number[]; expires_at: string; url: string };

type ShareSummaryPayload = {
  token: string; expired: boolean; created_at: string; expires_at: string; view_count: number;
  user_id: string; reports: Record<string, unknown>[]; anomalies: AnomalyFinding[];
  health_score: DashboardPayload["health_score"]; history: BiomarkerHistoryRow[];
};

type UploadStartPayload = { job_id: string; file_path: string; file_label: string; session_id: string; progress_url: string };
type UploadStatusPayload = { stage: string; message?: string; file_label?: string; is_image?: boolean; result?: Record<string, unknown> };
```

### Supabase row types (from old frontend/lib/supabase-data.ts)

```ts
type SupabaseReport = {
  id: number; local_report_id: number; user_id: string; patient_name: string;
  report_date: string; lab_name: string; report_status: string; biomarker_count: number;
  source_path: string; report_json: Record<string, unknown>; created_at: string;
};
type SupabaseBiomarker = {
  id: number; local_id: number; user_id: string; local_report_id: number;
  biomarker_name: string; value: number | null; unit: string; flag: string;
  ref_range: string; report_date: string; lab_name: string; created_at: string;
};
type SupabaseAnomaly = {
  id: number; local_id: number; user_id: string; biomarker: string;
  finding_type: string; severity: string; description: string;
  data_points: unknown[]; metrics: Record<string, unknown>; detected_at: string;
};
type SupabaseShareLink = {
  id: string; user_id: string; report_ids: number[]; created_at: string;
  expires_at: string; view_count: number;
};
```

---

## 6. Frontend → endpoint usage map (old UI)

Functions in `frontend/lib/vaidy-api.ts`:

- `getVaidyStatus(sessionId?)` → GET `/status`
- `processInputFolder(localOnly, userId)` → POST `/process-input`
- `getDashboard(userId)` → GET `/dashboard/{userId}`
- `createShareLink(userId, reportIds)` → POST `/share`
- `getShareSummary(token)` → GET `/share/{token}`
- `clearActiveReport(sessionId)` → POST `/sessions/{sessionId}/clear-active-report`
- `getSessionFreshUpload(sessionId)` → GET `/sessions/{sessionId}/fresh-upload`
- `uploadReportWithProgress(file, opts)` → POST `/upload` (XHR, upload progress)
- `streamUploadProgress(jobId, handlers)` → GET `/upload/progress/{jobId}` (SSE)
- `streamVaidyChat(...)` → POST `/chat/stream` (SSE)

Direct Supabase (`frontend/lib/supabase-data.ts`):
- `ensureUserProfile / fetchUserProfile / upsertUserProfile`
- `fetchUserReports / fetchUserBiomarkers / fetchUserAnomalies / fetchUserShareLinks`
- `listUserFiles / getReportFileUrl / deleteReport`
- Auth/session via `frontend/lib/supabase.ts` + `frontend/lib/auth-context.tsx`.
