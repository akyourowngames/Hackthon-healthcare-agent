Good. You have a real sample now. Let me diagnose exactly what's happening before giving you the fix plan.

## Implementation Notes

- The active NIM model is now `nvidia/llama-3.1-nemotron-nano-vl-8b-v1` because the configured provider did not list `meta/llama-4-scout-17b-16e-instruct` and returned 404 for it. This keeps the intended move away from Maverick while using a model that was verified live.
- Runtime values now live in `extractor/extraction_policy.md`, with `.env` as the local override surface.
- Page triage uses local PyMuPDF text, numeric structure, and biomarker aliases from `extractor/biomarker_aliases.md`; it does not use an added keyword list.
- Interim report status and `PENDING` biomarker flags are supported through schema, normalization, prompt, and markdown metadata fields.

## New Agent Tasks

- Keep local embeddings primary and use NVIDIA embeddings only as the online fallback.
- Use ONNX runtime for the local embedding path instead of a separate embedding framework runtime.
- Store reports, extracted JSON, chunks, and vectors in a local SQLite database and local storage folder for now.
- Provide a terminal healthcare-agent CLI for ingesting, listing, searching, showing, and asking over reports.
- Follow the local-first embedding shape inspected in `C:\Users\anime\3D Objects\KING`.

## New Agent Implementation Notes

- `healthcare_agent/agent_policy.md` owns agent storage and embedding settings.
- `healthcare_agent/embedder.py` attempts ONNX first, NVIDIA embeddings second, and a local offline hash vector only as a last-resort runtime safety path.
- `healthcare_agent/store.py` writes SQLite state under `storage/health_agent.db` and report JSON copies under `storage/reports`.
- `healthcare_agent/cli.py` exposes `status`, `ingest`, `import-json`, `list`, `show`, `search`, and `ask`.
- Verification showed a real CLI ingest storing chunks with provider `local_onnx`.

---

## Agent Runtime Addendum

The backend agent must be usable from the terminal without remembering a
subcommand first.

- Running `python healthcare_agent\cli.py` opens the Vaidy agent shell.
- Reports and documents live in `input/`.
- Saying `process input` in the shell processes supported files from `input/`.
- PDF extraction artifacts and imported document JSON artifacts save under
  `output/`.
- Stored report memory lives in SQLite and can be read back with `list reports`,
  `show report <id>`, search questions, or normal questions.
- Normal chat uses the configured NVIDIA chat model, defaulting to Maverick.
- Casual messages like `hi` chat normally; report questions attach local report
  evidence before the model answers.

## Diagnosis — Two Separate Problems

**Problem 1 — Timeout on Dr Lal PDF**
`llama-4-maverick` is a massive model. On NIM free tier it queues under load and times out on complex multi-page PDFs. Nothing wrong with your code — wrong model choice.

**Problem 2 — Dr Lal PDF is genuinely hard**
Looking at it: page 2 is blank, pages 3/5 have test names but NO result values filled in (interim report), page 4 and 6 are pure interpretation/legal text with zero biomarkers. You're sending all 6 pages to the model unnecessarily. That's wasted tokens, wasted time, and triggers timeouts.

---

## Fix Plan — Exact Steps

### Fix 1 — Switch Model Immediately

Change from `meta/llama-4-maverick-17b-128e-instruct` to `meta/llama-4-scout-17b-16e-instruct`.

Scout is smaller, faster, fits free tier better, and follows JSON instruction prompts more reliably than Maverick for structured extraction tasks. Maverick is overkill here.

Also increase your timeout from 12s to 45s as a safety net.

---

### Fix 2 — Smart Page Filtering Before Sending to NIM

This is the biggest improvement you can make. Don't send every page to the model. Before any API call, run a quick local check on each page using PyMuPDF's raw text extraction. If a page has less than 50 characters of text, or contains keywords like "interpretation", "note", "important instructions", "treatment goal" but no numeric values — skip it entirely.

Logic in plain terms:
```
For each page:
  extract raw text with PyMuPDF (free, instant, no API)
  if text length < 50 chars → skip (blank/scanned header)
  if text has numbers AND test-like words → send to NIM
  else → skip (interpretation/legal page)
```

This alone will cut your API calls from 6 to 2-3 for a Dr Lal report.

---

### Fix 3 — Reduce Image Size Before Sending

You're likely converting at 200+ DPI. Drop to 120 DPI for the NIM call. The model doesn't need pixel-perfect resolution, it needs readable text. Smaller image = faster upload = less timeout risk. If extraction quality drops, go back to 150 DPI max.

---

### Fix 4 — Retry Logic With Backoff

Wrap your NIM call in a retry loop. Three attempts, 5 second wait between each. If all three fail, log the page as failed and move on — don't crash the whole pipeline for one page.

```
attempt 1 → wait 5s → attempt 2 → wait 10s → attempt 3 → log failure
```

---

### Fix 5 — Handle Interim Reports

The Dr Lal PDF is marked "Interim" — results aren't filled in yet. Your extractor will return empty values for those biomarkers. That's correct behavior but you need to handle it gracefully. Add a flag in your JSON output:

```json
{
  "report_status": "interim",
  "biomarkers": {
    "cholesterol_total": {
      "value": null,
      "unit": "mg/dL",
      "ref_range": "<200",
      "flag": "PENDING"
    }
  }
}
```

Don't treat null values as extraction failures. They're valid data points — the report was genuinely incomplete.

---

### Fix 6 — Better Prompt for Mixed Pages

Your current prompt probably says "extract biomarkers from this page." Upgrade it to be more specific:

```
This is a page from an Indian pathology lab report (Dr Lal, SRL, Thyrocare, etc).
Extract ONLY rows that have: test name + numeric result value + unit.
Ignore interpretation tables, risk stratification tables, doctor notes,
legal disclaimers, and any row where the result value is blank or missing.
Return ONLY raw JSON, no markdown, no backticks, no explanation.
If no valid biomarker rows exist on this page, return: {"biomarkers": {}}
```

The last line is critical — it gives the model a valid empty response to return instead of hallucinating or timing out trying to extract from a legal disclaimer page.

---

## Updated Pipeline Flow

```
PDF comes in
    ↓
PyMuPDF extracts raw text per page (free, instant)
    ↓
Page filter: skip blank, skip interpretation-only pages
    ↓
Convert remaining pages to 120 DPI images
    ↓
Send each to llama-4-scout with new prompt
    ↓
Retry up to 3x on timeout
    ↓
Merge results across pages
    ↓
Mark null values as PENDING not errors
    ↓
Normalize names
    ↓
Pydantic validate
    ↓
Save JSON
```

---

## Expected Result After These Fixes

**Bharat Health Lab PDF** — already works, keep working.

**Dr Lal PDF** — will now correctly output:
- Patient: DUMMY, 25yr Male, Dr Lal PathLabs
- ApoB: 46 mg/dL, normal range 46-174
- hsCRP: 1.00 mg/L, flag HIGH (ref <1.00)
- Lipid profile: all null + PENDING (interim)
- HbA1c: null + PENDING (interim)
- Troponin: null + PENDING (pending results)

---
