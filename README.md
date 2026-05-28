# Vaidy

> Your AI Health Copilot, Built for India.

Vaidy reads blood reports from Apollo, Thyrocare, Lal Path Labs, Dr. Lal and
50+ other labs, detects trends across your biomarkers, and explains everything
in plain Hindi or English without jargon or chatbot guesswork.

Live: [vaidy.vercel.app](https://vaidy.vercel.app)

---

## What Vaidy does

- Reads many health document formats: PDFs, images, prescriptions, blood tests, MRIs, and echoes
- Builds a searchable health record across time
- Explains results in plain English or Hindi
- Spots biomarker trends across months and years
- Lets users ask natural questions about their health history
- Focuses on Indian lab formats, reference ranges, diets, and context

## Repository layout

```text
Vaidy/
|-- frontend/        Next.js 14 landing site and waitlist
`-- backend/         Python report parsing and biomarker extraction pipeline
```

## Frontend

The marketing site is a Next.js 14 App Router project styled with Tailwind CSS
and animated with Framer Motion.

### Tech stack

- [Next.js 14](https://nextjs.org) App Router
- React 18 and TypeScript
- Tailwind CSS
- Framer Motion
- Vercel deployment

### Pages

- `/` landing page
- `/contact`
- `/privacy`
- `/terms`

### Getting started

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

### Scripts

| Command         | What it does                  |
| --------------- | ----------------------------- |
| `npm run dev`   | Start the dev server          |
| `npm run build` | Production build              |
| `npm run start` | Run the production build      |
| `npm run lint`  | Lint with `eslint-config-next` |

## Backend

The backend extracts structured biomarkers from Indian lab reports, saves
validated JSON output, and provides a terminal healthcare-agent CLI with local
SQLite report memory. Runtime model, timeout, retry, page-filter, and image
DPI settings are controlled through `backend/extractor/extraction_policy.md`.
Agent storage and embeddings are controlled through
`backend/healthcare_agent/agent_policy.md`.

```bash
cd backend
python -m pip install -r requirements.txt
cp .env.example .env
python healthcare_agent/cli.py
```

Set `NVIDIA_API_KEY` in `backend/.env` for NIM extraction. Without it, use
`--local-only` to verify local text and OCR fallbacks.

```bash
python -m pytest -q
python -m healthcare_agent.cli process-input --local-only
python -m extractor.main samples/report1.pdf --local-only --output-dir output/report1
python -m healthcare_agent.cli ingest samples/report1.pdf --local-only
python -m healthcare_agent.cli ask "what biomarkers are high or low"
```

For the terminal agent flow, place reports or documents in `backend/input/`,
type `process input`, and read back the saved local memory with `list reports`,
`show report <id>`, search, or normal questions. Artifacts are written under
`backend/output/`. Normal chat streams from the configured NVIDIA chat model.
Maverick remains available as the deep model, while the default fast lane uses
`meta/llama-3.1-8b-instruct` for smoother casual and report answers.

## Roadmap

- Report upload plus biomarker extraction pipeline
- Multilingual explanations, Hindi first and then regional languages
- Longitudinal trend dashboard
- Doctor-share view with one-link summaries

## Contributing

The codebase is small and friendly. Open an issue or PR if you spot a bug, a
typo, or have an idea. For feature work, please start a discussion first so we
can align on scope.

## License

TBD. Until then, all rights reserved by the Vaidy team.
