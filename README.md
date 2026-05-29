# Vaidy Backend

Local-first AI healthcare backend for Indian lab reports.

## Setup

```powershell
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Set `NVIDIA_API_KEY` in `.env`, then run:

```powershell
python -m extractor.main samples/report1.pdf
```

## Extractor

The extraction pipeline saves:

- `output/<pdf-name>/debug_text.txt` for the best local text layer found.
- `output/<pdf-name>/debug_quality.json` for the text quality gate.
- `output/<pdf-name>/<pdf-name>.json` for the clean validated report.
- `output/<pdf-name>/report.json` as the latest report path for that run.

## Extraction Order

1. Extract the local PyMuPDF text layer per page for fast page triage.
2. Convert the PDF to page images with the DPI from `extractor/extraction_policy.md`.
3. Send only locally relevant pages to NVIDIA NIM for structured JSON; scanned PDFs with no text layer still go through image extraction.
4. Retry NIM image calls using the retry settings in `extractor/extraction_policy.md`.
5. Fill missing fields from local text when Docling or PyMuPDF text is usable.
6. Fall back to PaddleOCR plus rule-based parsing when the text layer is poor.
7. Normalize biomarker names from `extractor/biomarker_aliases.md`.
8. Validate output with Pydantic before saving.

The default NIM model, timeout, retry counts, page-filter thresholds, and image
DPI live in `extractor/extraction_policy.md`. The default model is a smaller
available NVIDIA vision model so ordinary reports do not start on Maverick.
Environment variables in `.env` can override NIM provider settings for one
machine without changing code.

## Terminal Healthcare Agent

The terminal agent stores reports and retrieval chunks in a local SQLite
database by default. It does not require Supabase.

```powershell
python healthcare_agent\cli.py
```

When the shell opens, put report files in `input/` and type `process input`.
Supported files are configured in `healthcare_agent/agent_policy.md`; the
default set is PDF, JSON, TXT, and MD. Extraction artifacts are written to
`output/`, while searchable report memory lives in local SQLite. Normal chat
streams token-by-token from the configured NVIDIA chat model. Maverick remains
configured as the deep model, while the default fast lane uses
`meta/llama-3.1-8b-instruct` for low-latency casual and report answers.
Report evidence is attached only for report/document questions.

The same behavior is also available as explicit commands:

```powershell
python -m healthcare_agent.cli status
python -m healthcare_agent.cli process-input --local-only
python -m healthcare_agent.cli ingest samples/report1.pdf --local-only
python -m healthcare_agent.cli import-json outputs/Z615.json --source-path C:\Users\anime\Downloads\Z615.pdf
python -m healthcare_agent.cli dedupe
python -m healthcare_agent.cli list
python -m healthcare_agent.cli search cholesterol
python -m healthcare_agent.cli ask "what biomarkers are high or low"
python -m healthcare_agent.cli ask "hi" --language hi
```

Fast inventory, latest-patient, latest-report-name, upload-help, and greeting
answers are handled locally through phrases in
`healthcare_agent/agent_commands.md`. CLI and web chat therefore read the same
SQLite-backed report memory and do not wait on a model for those common turns.
Standalone extraction also stores successful reports into the same agent
database by default:

```powershell
python -m extractor.main C:\Users\anime\Downloads\Z615.pdf
```

Use `--no-agent-store` when you only want extraction artifacts.

## API Server

Run the same local agent behind an HTTP API:

```powershell
python -m healthcare_agent.api
```

The server defaults to `http://127.0.0.1:8000` and exposes:

- `GET /api/health`
- `GET /api/status`
- `GET /api/supabase/status`
- `POST /api/process-input`
- `POST /api/upload`
- `GET /api/upload/progress/{job_id}`
- `GET /api/reports`
- `GET /api/reports/{report_id}`
- `GET /api/dashboard/{user_id}`
- `GET /api/biomarker/{user_id}/{biomarker_name}`
- `GET /api/notifications/{user_id}`
- `GET /api/search?q=cholesterol`
- `POST /api/chat`
- `POST /api/chat/stream`
- `POST /api/share`
- `GET /api/share/{token}`

The streaming chat endpoint sends server-sent events with `meta`, `chunk`,
`done`, `error`, and `ping` events. Host, port, CORS origins, warmup, and
keepalive settings live in `healthcare_agent/api_policy.md`, with `.env`
overrides for local machines.

## Supabase

Vaidy stays local-first. Supabase is optional and mirrors the local SQLite data
when enabled. Apply `supabase/schema.sql` in Supabase SQL editor, then set:

```powershell
VAIDY_SUPABASE_ENABLED=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VAIDY_SUPABASE_STORAGE_BUCKET=User Data
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=User Data
```

The service role key is for the backend only. The frontend uses the public anon
key for email/password and Google auth. When Supabase is not configured, the app
uses the `local-user` identity from `healthcare_agent/agent_policy.md` so CLI
and web still share the same reports.

Uploads from the web app pass the signed-in Supabase access token to the API so
analyzed report rows, biomarker history, anomaly findings, notifications, and
the original file can sync under that user's account. If you do not pass a user
token, configure a real service-role key; an anon key in `SUPABASE_SERVICE_ROLE_KEY`
can upload files only where storage policy allows it and cannot upsert analyzed
tables by itself.

For email notifications, deploy
`supabase/functions/send-report-notification` and set `RESEND_API_KEY`,
`RESEND_FROM_EMAIL`, and `VAIDY_APP_URL` as Supabase secrets. The function can
send a queued `notification_outbox` row or an explicit notification payload
through Resend.

## Product Surfaces

Saved reports now populate local `biomarker_history`, regenerate
`anomaly_findings`, queue local notification summaries, and power the dashboard
and doctor-share APIs. The anomaly engine detects consistent 3-report trends,
personal baseline breaches, and first-time abnormal readings from local SQLite
history. Knobs for thresholds, score penalties, share expiry, language, and
memory summarization live in `healthcare_agent/agent_policy.md`.

The browser app includes:

- `/auth` for Supabase email/password, Google OAuth, or the local development
  identity when Supabase environment variables are absent.
- `/dashboard` for upload progress, health score, anomaly cards, trend charts,
  and doctor-share link creation.
- `/share/[token]` for a clean read-only doctor view.
- `/chat` with English, Hindi, and auto language preference plus a working
  folder upload button for PDF, JSON, TXT, and MD files.

Demo JSON reports live in `samples/demo_reports/`. Verified demo runs produce
dashboard, share, notification, and Markdown summary artifacts under
`output/demo-verification-<timestamp>/`.

Embedding order is local first:

1. ONNX-packaged model from `healthcare_agent/agent_policy.md`.
2. NVIDIA embedding API fallback when the local ONNX path is unavailable and `NVIDIA_API_KEY` is configured.
3. Local hash vectors as the final offline fallback so the CLI remains usable.

Agent input, output, storage, ONNX model, chat models, streaming, warmup, cache
path, embedding dimension, and search limits live in
`healthcare_agent/agent_policy.md`, with `.env` overrides for local machine
settings.
