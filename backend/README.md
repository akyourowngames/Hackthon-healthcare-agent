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
python -m healthcare_agent.cli list
python -m healthcare_agent.cli search cholesterol
python -m healthcare_agent.cli ask "what biomarkers are high or low"
```

Embedding order is local first:

1. ONNX-packaged model from `healthcare_agent/agent_policy.md`.
2. NVIDIA embedding API fallback when the local ONNX path is unavailable and `NVIDIA_API_KEY` is configured.
3. Local hash vectors as the final offline fallback so the CLI remains usable.

Agent input, output, storage, ONNX model, chat models, streaming, warmup, cache
path, embedding dimension, and search limits live in
`healthcare_agent/agent_policy.md`, with `.env` overrides for local machine
settings.
