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
- KING reference: the local-first ONNX then NVIDIA fallback shape follows the pattern inspected in `C:\Users\anime\3D Objects\KING\agent\embedder.py`, adapted to Vaidy's smaller backend.

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
python -m healthcare_agent.cli list
python -m healthcare_agent.cli search cholesterol --limit 3
python -m healthcare_agent.cli ask "what biomarkers are high or low" --limit 5
```

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
