# Todo Completion Check

This backend implements the plan from `todo.md`.

## Completed Items

### Original `todo.md`

- Model and timeout: default NIM image model moved away from Maverick to the verified smaller NVIDIA vision model in `extractor/extraction_policy.md`; timeout is 45 seconds.
- Page filtering: NIM image calls use PyMuPDF page text, numeric evidence, and biomarker aliases from `extractor/biomarker_aliases.md` before selecting pages.
- Image size: default image render DPI is 120 in `extractor/extraction_policy.md`.
- Retry logic: image extraction retries provider calls three times with a five second increasing backoff.
- Interim reports: `report_status` and `PENDING` biomarker flags are supported by schema, normalization, prompt, and metadata markdown.
- Mixed-page prompt: `extractor/nim_prompt.md` tells the model to ignore interpretation, note, legal, and guidance-only rows and to return an empty biomarkers object when no valid rows exist.

### Local Healthcare Agent Tasks

- Local primary embeddings: `healthcare_agent/embedder.py` tries the ONNX embedding path before any online embedding call.
- NVIDIA embedding fallback: the same embedder uses `NVIDIA_EMBEDDING_MODEL` through the NVIDIA-compatible embeddings API only when local ONNX is unavailable.
- ONNX embedding runtime: the backend depends on `onnxruntime`, `tokenizers`, and `huggingface-hub`; it does not add a separate embedding framework runtime.
- Local database: `healthcare_agent/store.py` stores reports, chunks, vectors, and JSON payloads in SQLite plus local `storage/reports`.
- Terminal agent shell: running `python healthcare_agent\cli.py` with no command opens the agent loop instead of failing with an argparse error.
- Input and output folders: reports and documents can be placed in `input/`; processing saves extractor/document artifacts under `output/`.
- Input processing: `healthcare_agent/ingest.py` scans the configured input folder, skips already stored sources, extracts PDFs, imports JSON, and stores TXT or MD documents for read-back.
- Maverick-backed chat: `healthcare_agent/chat.py` uses the configured NVIDIA chat model for normal conversation, with `meta/llama-4-maverick-17b-128e-instruct` as the default.
- Smooth streaming: terminal chat now streams chunks as they arrive instead of waiting for the full model response.
- Low-latency fast lane: casual and report answers use the configured fast model by default, while Maverick remains available as the deep model in markdown and `.env`.
- Warm startup: the shell can warm the fast chat model in a background thread so the first real user reply reaches the warmed path sooner.
- Evidence-aware answers: normal greetings and casual turns no longer dump report chunks; report/document questions get local evidence attached before the chat model responds.
- Terminal CLI: `healthcare_agent/cli.py` provides the shell plus `status`, `process-input`, `ingest`, `import-json`, `list`, `show`, `search`, and `ask`.
- Shared CLI/web agent: the CLI, API, chat UI, upload flow, dashboard, and
  standalone extractor all read and write the same local agent database by
  default.
- Standalone extractor handoff: `python -m extractor.main <file>` stores the
  extracted report into the agent database unless `--no-agent-store` is passed,
  so successful extraction is immediately visible to CLI and web chat.
- Duplicate protection: report storage fingerprints report JSON payloads,
  skips duplicate imports, and exposes `python -m healthcare_agent.cli dedupe`
  for cleanup.
- Fast grounded replies: report inventory, patient-name, report-name,
  extraction-help, and greeting replies are handled locally from
  `healthcare_agent/agent_commands.md` plus the stored report database instead
  of waiting on a model call.
- KING reference: the local-first ONNX then NVIDIA fallback shape follows the pattern inspected in `C:\Users\anime\3D Objects\KING\agent\embedder.py`, adapted to Vaidy's smaller backend.

### Step 3 Product Upgrade

- Anomaly engine: saved reports populate `biomarker_history` and regenerate `anomaly_findings`; `rag/anomaly.py` exposes `analyze_trends(user_id)` for the TODO path.
- Dashboard API: `GET /api/dashboard/{user_id}` returns health score, history, anomaly cards, reports, and chart-ready biomarker timelines.
- Biomarker detail API: `GET /api/biomarker/{user_id}/{biomarker_name}` returns one marker's history and related findings.
- Doctor share: `POST /api/share` creates a seven-day read-only token and `GET /api/share/{token}` returns a printable summary payload.
- Upload flow: `POST /api/upload` accepts PDF, JSON, TXT, or MD files and `GET /api/upload/progress/{job_id}` streams reading, extraction, analysis, and done events.
- Notifications: anomaly-worthy uploads create local notification outbox rows available through `GET /api/notifications/{user_id}`.
- Multilingual chat: chat accepts `language_preference` and the frontend stores English, Hindi, or auto in localStorage.
- Language switch verification: the frontend sends the selected language with
  every chat request, and the fast local path returns Hindi/Hinglish style for
  Hindi preference without a model round trip.
- Chat upload icon: the chat folder button opens a real file chooser, uploads
  the selected file to `/api/upload`, streams progress from
  `/api/upload/progress/{job_id}`, and refreshes local status after completion.
- Frontend API proxy upload: the Next `/api/vaidy/[...path]` proxy forwards raw
  request bytes with `request.arrayBuffer()` so PDF/FormData uploads are not
  converted to text before they reach FastAPI.
- Supabase connection: optional Supabase settings live in `.env.example` and
  `healthcare_agent/agent_policy.md`; `supabase/schema.sql` defines reports,
  biomarker history, anomaly findings, share links, notification outbox, and
  read RLS policies; the backend mirrors local report/share data through
  Supabase REST when enabled.
- Supabase email function: `supabase/functions/send-report-notification/`
  contains a deployable Edge Function that reads a queued notification or
  explicit payload, resolves the Supabase Auth email, and sends through Resend.
- Smart context: report questions are semantically classified into specific biomarker, trend, general health, report comparison, or other; trend/general answers use structured health timeline context instead of dumping all chunks.
- Conversation memory: sessions keep a rolling conversation summary after the configured exchange interval.
- Frontend pages: `/auth`, `/dashboard`, and `/share/[token]` are implemented alongside the existing `/chat`.
- Page filtering correction: NIM page selection uses local text length and numeric structure, not biomarker alias or keyword lists.
- Demo reports: `samples/demo_reports/` contains three reports that trigger trend, baseline, first-abnormal, share, dashboard, and notification flows.

## Verification

Run from `backend/`:

```bash
python -m pytest -q
python -m compileall -q extractor healthcare_agent tests
python -m extractor.main samples/report1.pdf --local-only --output-dir output/verify-report1-local
python -m extractor.main samples/report2.pdf --local-only --output-dir output/verify-report2-local
python -m extractor.main samples/report3.pdf --local-only --output-dir output/verify-report3-local
python -m extractor.main samples/scanned_report.pdf --local-only --output-dir output/verify-scanned-local
python -m healthcare_agent.cli status
python healthcare_agent/cli.py
python -m healthcare_agent.cli process-input --local-only
python -m healthcare_agent.cli ingest samples/report1.pdf --local-only --output-dir output/agent-report1-local
python -m healthcare_agent.cli import-json outputs/Z615.json --source-path C:\Users\anime\Downloads\Z615.pdf
python -m healthcare_agent.cli dedupe
python -m healthcare_agent.cli list
python -m healthcare_agent.cli search cholesterol --limit 3
python -m healthcare_agent.cli ask "what biomarkers are high or low" --limit 5
python -m healthcare_agent.cli ask "hi" --language hi
```

Additional verification completed from the repo root:

```bash
python -m pytest -q
python -m compileall -q extractor healthcare_agent rag tests
npm run lint
npm run build
python -m extractor.main "..\samples\report1.pdf" --local-only --output-dir "..\output\verify-cwd-extractor" --no-agent-store
```

Backend mirror verification:

```bash
cd backend
python -m pytest -q
python -m compileall -q extractor healthcare_agent rag tests
```

Demo artifacts were generated at:

```text
output/demo-verification-20260528-220546/dashboard.json
output/demo-verification-20260528-220546/share_link.json
output/demo-verification-20260528-220546/share_summary.json
output/demo-verification-20260528-220546/notifications.json
output/demo-verification-20260528-220546/demo_report.md
```

The latest isolated demo run returned:

```json
{
  "health_score": 25,
  "anomaly_count": 8,
  "history_rows": 9,
  "share_reports": 1,
  "notification_count": 2
}
```

Live API probe against that isolated demo database returned:

```json
{
  "health_ok": true,
  "dashboard_score": 25,
  "anomaly_count": 8,
  "share_reports": 1,
  "notification_count": 2
}
```

Upload SSE verification returned `event: done`, stored one report, and produced
three biomarker history rows from `samples/demo_reports/rohan_2026_01.json`.

Current shared-agent verification showed CLI inventory returning the imported
Z615 report from the same SQLite database used by the API and frontend:

```text
report 3: DUMMY | 23/7/2024 | Z6152301 | biomarkers=27 | source=Z615.pdf
```

Fast local answer benchmark for report inventory and greeting turns stayed near
0.05 seconds inside the running Python process and returned model
`local-fast`.

Live API verification saved
`output/live-api-verify-20260528-214715/summary.json` and proved report
inventory at 0.068 seconds, Hindi greeting at 0.04 seconds, upload SSE
`event: done`, Supabase status reporting unconfigured locally, and 27 dashboard
biomarker rows for the imported Z615 report.

Live frontend proxy verification saved
`output/live-frontend-verify-20260528-220141/summary.json` and proved
`/api/vaidy/status`, `/api/vaidy/chat`, `/api/vaidy/upload`, and
`/api/vaidy/upload/progress/{job_id}` all reach the same backend agent. The
same check confirmed the rendered chat page has the upload title, Auto/HI
language controls, the hidden file input, PDF acceptance, localStorage language
preference, and raw proxy body forwarding.

Live upload-anomaly verification saved
`output/live-upload-anomaly-verify-20260528-221947/summary.json`. It uploaded
the three demo reports through `/api/upload`, produced 9 biomarker history rows,
8 dashboard anomaly findings, and confirmed the third upload `event: done`
payload contains `health_score` and `anomalies` for proactive chat feedback.

Live streaming latency probe after warmup:

```bash
warmup_seconds=3.148
first_chunk_seconds=0.671
model=meta/llama-3.1-8b-instruct
total_seconds=0.794
```

With `NVIDIA_API_KEY` configured, this was also verified from the source backend
with:

```bash
python -m extractor.main samples/report2.pdf --output-dir outputs/verify-report2-nim-status-final
```

The live NIM run returned `Source: nim` and `Biomarkers: 5`.
