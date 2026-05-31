<div align="center">

<br/>

```
 ██╗   ██╗ █████╗ ██╗██████╗ ██╗   ██╗
 ██║   ██║██╔══██╗██║██╔══██╗╚██╗ ██╔╝
 ██║   ██║███████║██║██║  ██║ ╚████╔╝
 ╚██╗ ██╔╝██╔══██║██║██║  ██║  ╚██╔╝
  ╚████╔╝ ██║  ██║██║██████╔╝   ██║
   ╚═══╝  ╚═╝  ╚═╝╚═╝╚═════╝    ╚═╝
```

### Your AI Health Copilot — Built for India 🇮🇳

*Not a chatbot. A health brain that reads your reports, remembers your history,<br/>and explains everything in plain language.*

<br/>

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-vaidy.vercel.app-34d399?style=for-the-badge&logoColor=white)](https://vaidy.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-Hackthon--healthcare--agent-181717?style=for-the-badge&logo=github)](https://github.com/akyourowngames/Hackthon-healthcare-agent)
[![License](https://img.shields.io/badge/License-Hackathon%20Build-f59e0b?style=for-the-badge)](#license)

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Optional-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=flat-square&logo=vercel)](https://vercel.com/)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [The Problem](#-the-problem)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup)
- [Environment Variables](#-environment-variables)
- [Usage](#-usage)
  - [Web App](#web-app)
  - [CLI](#terminal-cli)
  - [API Server](#api-server)
- [API Reference](#-api-reference)
- [Supabase Integration](#-supabase-integration-optional)
- [Design System](#-design-system)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🧠 Overview

**Vaidy** is a full-stack, AI-powered personal health intelligence platform built specifically for the Indian healthcare ecosystem. It ingests any diagnostic report — blood tests, MRIs, prescriptions — extracts structured biomarker data, builds a longitudinal health timeline, and lets patients and doctors have a real conversation with their health history.

Vaidy operates **local-first**: all data lives in a local SQLite database by default, with optional Supabase cloud sync for cross-device access and doctor sharing. It surfaces three product interfaces: a polished Next.js web app, a streaming REST API, and a powerful terminal CLI — all sharing the same underlying intelligence engine.

> **Built at a Healthcare Hackathon** to bridge India's gap between medical data and patient understanding.

---

## 🇮🇳 The Problem

India has **1.4 billion people** and a massive, persistent gap between the medical knowledge locked inside diagnostic reports and the patients who receive them. Lab reports arrive full of jargon, reference ranges are stripped of context, and most people have no practical way to understand what their own health data actually means.

Most existing solutions are:
- Generic (not tuned to Indian labs like Apollo, Thyrocare, Lal Path Labs)
- English-only (ignoring 500M+ Hindi speakers)
- Cloud-dependent (not viable for low-connectivity users)
- Stateless (no memory across visits)

**Vaidy** solves all of these. It supports **50+ Indian lab formats**, bilingual English/Hindi chat, offline-first local storage, and a persistent health timeline that grows smarter with every report.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📄 **Universal Report Parsing** | Blood tests, MRIs, prescriptions — PDF, image, JSON, or text |
| 🏥 **50+ Indian Lab Formats** | Apollo, Thyrocare, Lal Path Labs, Dr. Lal, AIIMS, and more |
| 🧠 **Persistent Health Memory** | Builds your longitudinal health timeline across every visit |
| 💬 **Plain-Language Explanations** | No jargon — answers anyone can understand |
| 📈 **Smart Anomaly Detection** | Spots consistent 3-report trends, baseline breaches, and first-time abnormals |
| 🤖 **Streaming AI Chat** | Ask anything about your full history; responses stream token-by-token |
| 🌐 **Bilingual** | English and Hindi with automatic language preference detection |
| 🩺 **Doctor Share Links** | Generate clean, expiring read-only views for your doctor |
| 📊 **Health Score Dashboard** | Visual health score, biomarker trend charts, anomaly cards |
| 🔔 **Email Notifications** | Report summaries delivered via Resend + Supabase Edge Functions |
| 💾 **Local-First** | Full functionality without any cloud setup; SQLite as primary store |
| ☁️ **Optional Cloud Sync** | Mirror everything to Supabase for multi-device and auth |
| 🖥️ **Terminal CLI** | Full agent power from the command line — no browser needed |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          VAIDY PLATFORM                             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   FRONTEND (Next.js 16)                      │  │
│  │  /auth  /dashboard  /chat  /share/[token]                    │  │
│  │  React 19 · TypeScript · Tailwind 4 · Three.js · Zustand     │  │
│  └────────────────────┬─────────────────────────────────────────┘  │
│                       │ HTTP / SSE                                  │
│  ┌────────────────────▼─────────────────────────────────────────┐  │
│  │               BACKEND API (FastAPI)                          │  │
│  │  /api/upload  /api/chat/stream  /api/dashboard  /api/share   │  │
│  └──────┬───────────────────────────────────────────────────────┘  │
│         │                                                           │
│  ┌──────▼─────────────────────────────────────────────────────┐   │
│  │                  INTELLIGENCE CORE                          │   │
│  │                                                             │   │
│  │  ┌─────────────────────┐   ┌────────────────────────────┐  │   │
│  │  │  EXTRACTOR PIPELINE │   │     HEALTHCARE AGENT       │  │   │
│  │  │                     │   │                            │  │   │
│  │  │  PyMuPDF (text)     │   │  RAG Memory (SQLite)       │  │   │
│  │  │  → NVIDIA NIM vision│   │  ONNX Embeddings (local)   │  │   │
│  │  │  → Docling fallback │   │  NVIDIA LLM (streaming)    │  │   │
│  │  │  → PaddleOCR (scan) │   │  Anomaly Engine            │  │   │
│  │  │  → Pydantic validate│   │  Language Detection        │  │   │
│  │  └─────────────────────┘   └────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                       │                                             │
│  ┌────────────────────▼─────────────────────────────────────────┐  │
│  │                      DATA LAYER                              │  │
│  │                                                              │  │
│  │   SQLite (local-first) ←──────────→ Supabase (optional)     │  │
│  │   biomarker_history · anomaly_findings · notification_outbox │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Extraction Pipeline (5-Stage Fallback Chain)

```
PDF Input
   │
   ▼
① PyMuPDF — Extract local text layer per page (fast triage)
   │  (page triage passes)
   ▼
② PDF → Images — DPI conversion for visual extraction
   │
   ▼
③ NVIDIA NIM — Vision model for structured JSON extraction
   │  (NIM unavailable or poor quality)
   ▼
④ Docling — Document parsing from local text layer
   │  (poor text layer)
   ▼
⑤ PaddleOCR + Rule-based — Scanned/image-only PDFs
   │
   ▼
Biomarker Name Normalization (aliases.md)
   │
   ▼
Pydantic Schema Validation → SQLite Storage
```

### Embedding Priority Chain

```
① Local ONNX model (offline, fastest)
      ↓ (unavailable)
② NVIDIA Embedding API (cloud, accurate)
      ↓ (no API key)
③ Hash vectors (final offline fallback — CLI always works)
```

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Role |
|---|---|---|
| [Next.js](https://nextjs.org/) | 16 (App Router) | React framework, SSR/SSG, API proxy |
| [React](https://react.dev/) | 19 | UI library |
| [TypeScript](https://www.typescriptlang.org/) | 5 | Type safety |
| [Tailwind CSS](https://tailwindcss.com/) | 4 | Utility-first styling |
| [Framer Motion](https://www.framer.com/motion/) | 12 | Animations & transitions |
| [Three.js](https://threejs.org/) + [R3F](https://r3f.docs.pmnd.rs/) | latest | 3D visual effects |
| [GSAP](https://gsap.com/) | 3.14 | Advanced scroll/timeline animations |
| [Lenis](https://lenis.darkroom.engineering/) | 1.3 | Smooth scroll |
| [Zustand](https://zustand-demo.pmnd.rs/) | 5 | Global state management |
| [Supabase JS](https://supabase.com/docs/reference/javascript) | 2 | Auth + realtime data |
| [Lucide React](https://lucide.dev/) | latest | Icon system |

### Backend

| Technology | Version | Role |
|---|---|---|
| [Python](https://python.org/) | 3.11+ | Runtime |
| [FastAPI](https://fastapi.tiangolo.com/) | 0.110+ | REST API + SSE streaming |
| [PyMuPDF](https://pymupdf.readthedocs.io/) | 1.24+ | PDF text extraction |
| [ONNX Runtime](https://onnxruntime.ai/) | 1.17+ | Local embedding inference |
| [HuggingFace Hub](https://huggingface.co/) | 0.20+ | Model download & management |
| [Docling](https://github.com/DS4SD/docling) | 2.0+ | Advanced document parsing |
| [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) | 2.7 | OCR for scanned PDFs |
| [LangDetect](https://github.com/Mimino666/langdetect) | 1.0.9 | Language auto-detection |
| [Pydantic](https://docs.pydantic.dev/) | 2.0+ | Data validation & schema |
| [SQLite](https://sqlite.org/) | built-in | Local-first data store |

### AI / ML

| Service | Usage |
|---|---|
| [NVIDIA NIM](https://developer.nvidia.com/nim) — Vision Model | Structured extraction from report images |
| [NVIDIA NIM](https://developer.nvidia.com/nim) — `llama-3.1-8b-instruct` | Fast-lane casual & report chat |
| [NVIDIA NIM](https://developer.nvidia.com/nim) — Maverick | Deep analysis queries |
| Local ONNX Model | Offline semantic embeddings |
| Hash Vectors | Final offline embedding fallback |

### Infrastructure

| Service | Usage |
|---|---|
| [Supabase](https://supabase.com/) | Optional: Auth, database sync, file storage |
| [Supabase Edge Functions](https://supabase.com/docs/guides/functions) | Email notification delivery |
| [Resend](https://resend.com/) | Transactional email (report summaries) |
| [Vercel](https://vercel.com/) | Frontend deployment (automatic from `main`) |

---

## 📁 Project Structure

```
Hackthon-healthcare-agent/
│
├── frontend/                          # Next.js 16 web application
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             # Root layout, font config, metadata
│   │   │   ├── page.tsx               # Landing page
│   │   │   ├── globals.css            # Global styles, CSS variables, keyframes
│   │   │   ├── login/                 # Auth pages
│   │   │   ├── signup/
│   │   │   └── dashboard/             # Main dashboard (health score, charts, share)
│   │   ├── components/
│   │   │   ├── sections/              # Page-level sections (Hero, Features, CTA…)
│   │   │   ├── dashboard/             # Dashboard-specific components
│   │   │   ├── layout/                # Navbar, Footer
│   │   │   ├── effects/               # GlowOrbs, ParticleField, 3D effects
│   │   │   └── ui/                    # Reusable primitives
│   │   ├── contexts/                  # React context providers
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── lib/                       # Supabase client, API utilities
│   │   └── stores/                    # Zustand stores
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   └── vercel.json
│
├── backend/                           # Python FastAPI backend + AI agent
│   ├── healthcare_agent/              # Core agent module
│   │   ├── api.py                     # FastAPI application & all endpoints
│   │   ├── cli.py                     # Terminal CLI interface
│   │   ├── chat.py                    # LLM chat engine (streaming SSE)
│   │   ├── ingest.py                  # Report ingestion pipeline
│   │   ├── memory.py                  # SQLite RAG memory store
│   │   ├── embedder.py                # ONNX / NVIDIA / hash embedding chain
│   │   ├── insights.py                # Anomaly detection engine
│   │   ├── language.py                # Bilingual support (EN/HI)
│   │   ├── store.py                   # Local SQLite operations
│   │   ├── supabase_db.py             # Supabase table operations
│   │   ├── supabase_sync.py           # Local↔Supabase sync layer
│   │   ├── fast_agent.py              # Fast-path local answers (no LLM)
│   │   ├── agent_policy.md            # 🔧 Agent configuration knobs
│   │   ├── agent_commands.md          # 🔧 Fast-path command patterns
│   │   ├── api_policy.md              # 🔧 API server configuration
│   │   └── chat_policy.md             # 🔧 Chat model configuration
│   │
│   ├── extractor/                     # Report extraction pipeline
│   │   ├── main.py                    # Pipeline entry point
│   │   ├── nim_extractor.py           # NVIDIA NIM vision extraction
│   │   ├── docling_parser.py          # Docling document parsing
│   │   ├── ocr_parser.py              # PaddleOCR fallback
│   │   ├── normalizer.py              # Biomarker name normalization
│   │   ├── schema.py                  # Pydantic output schema
│   │   ├── extraction_policy.md       # 🔧 Extractor configuration
│   │   ├── biomarker_aliases.md       # 🔧 Name normalization rules
│   │   └── nim_prompt.md              # 🔧 NVIDIA NIM prompts
│   │
│   ├── rag/                           # Retrieval-augmented generation
│   ├── supabase/                      # DB schema & Edge Functions
│   │   ├── schema.sql                 # Complete Supabase schema
│   │   └── functions/
│   │       └── send-report-notification/
│   ├── samples/                       # Demo reports for testing
│   ├── tests/                         # Pytest test suite
│   └── requirements.txt
│
└── docs/
    └── API_CONTRACT.md                # Full frontend↔backend API spec
```

> **💡 Configuration-as-Markdown**: All agent, extractor, and API tuning knobs live in `.md` policy files — not in code. Change thresholds, model names, prompts, and feature flags by editing Markdown, never Python.

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | `>= 18.17.0` | For frontend |
| Python | `>= 3.11` | For backend |
| NVIDIA API Key | — | Required for NIM extraction & LLM chat |
| Supabase Project | — | Optional — app works fully without it |

---

### Frontend Setup

```bash
# 1. Clone the repository
git clone https://github.com/akyourowngames/Hackthon-healthcare-agent.git
cd Hackthon-healthcare-agent/frontend

# 2. Install dependencies
npm install

# 3. Copy and configure environment variables
cp .env.example .env.local
# Edit .env.local (see Environment Variables section)

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Available scripts:**

```bash
npm run dev      # Start dev server with hot reload
npm run build    # Create production build
npm run start    # Serve production build locally
npm run lint     # Run ESLint
```

---

### Backend Setup

```bash
cd Hackthon-healthcare-agent/backend

# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Copy and configure environment variables
copy .env.example .env    # Windows
cp .env.example .env      # macOS / Linux

# 3. Set your NVIDIA_API_KEY in .env

# 4. Start the API server
python -m healthcare_agent.api
# → Server running at http://127.0.0.1:8000
```

**Verify the server is running:**

```bash
curl http://127.0.0.1:8000/api/health
```

---

## 🔑 Environment Variables

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_VAIDY_API_URL` | No | Backend API base URL (default: `http://localhost:8000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Supabase public anon key (for auth) |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | Optional | Storage bucket name (e.g. `User Data`) |

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `NVIDIA_API_KEY` | **Yes** | NVIDIA NIM API key for extraction and chat |
| `VAIDY_SUPABASE_ENABLED` | Optional | Set `true` to enable Supabase sync |
| `SUPABASE_URL` | Optional | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Supabase service role key (backend only — never expose publicly) |
| `VAIDY_SUPABASE_STORAGE_BUCKET` | Optional | Storage bucket name |
| `VAIDY_API_HOST` | Optional | API bind host (default: `127.0.0.1`) |
| `VAIDY_API_PORT` | Optional | API bind port (default: `8000`) |
| `VAIDY_API_CORS_ORIGINS` | Optional | Comma-separated allowed CORS origins |

### Supabase Edge Function Secrets

```bash
# Set via Supabase CLI before deploying send-report-notification
supabase secrets set RESEND_API_KEY=your_resend_key
supabase secrets set RESEND_FROM_EMAIL=vaidy@yourdomain.com
supabase secrets set VAIDY_APP_URL=https://vaidy.vercel.app
```

---

## 💡 Usage

### Web App

Once both servers are running, visit [http://localhost:3000](http://localhost:3000):

| Route | Description |
|---|---|
| `/` | Landing page — feature overview |
| `/auth` | Sign in (email/password or Google OAuth) |
| `/dashboard` | Health score, anomaly cards, trend charts, doctor-share link |
| `/chat` | Streaming AI chat with your full health history |
| `/share/[token]` | Clean, expiring read-only doctor view |

> Without Supabase configured, the app uses the `local-user` identity and stores all data locally. No sign-in needed for development.

---

### Terminal CLI

The CLI shares the same agent database as the web app — they read and write the same SQLite store.

```bash
cd backend

# Start interactive shell
python healthcare_agent/cli.py
# → Type 'process input' after placing reports in input/

# Or use explicit one-shot commands:

# Ingest a report
python -m healthcare_agent.cli ingest samples/report1.pdf

# Search your health history
python -m healthcare_agent.cli search cholesterol

# Ask the AI a question
python -m healthcare_agent.cli ask "what biomarkers are high or low"

# Ask in Hindi
python -m healthcare_agent.cli ask "मेरी रिपोर्ट कैसी है" --language hi

# Standalone extraction (without agent storage)
python -m extractor.main /path/to/report.pdf --no-agent-store

# Import a pre-extracted JSON
python -m healthcare_agent.cli import-json outputs/Z615.json \
  --source-path /path/to/original.pdf

# Utility commands
python -m healthcare_agent.cli status
python -m healthcare_agent.cli list
python -m healthcare_agent.cli dedupe
```

---

### API Server

The API server exposes the full agent capability over HTTP with Server-Sent Events for streaming chat.

```bash
python -m healthcare_agent.api
# → Running at http://127.0.0.1:8000
# → Interactive docs at http://127.0.0.1:8000/docs
```

---

## 📡 API Reference

All endpoints are prefixed with `/api`.

### Health & Status

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Server health, paths check |
| `GET` | `/api/status` | Agent status, report count, session info |
| `GET` | `/api/supabase/status` | Supabase connection status |

### Reports

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/reports` | List all stored reports |
| `GET` | `/api/reports/{report_id}` | Get full report with biomarker JSON |
| `POST` | `/api/upload` | Upload a report file (PDF, JSON, TXT, MD) |
| `GET` | `/api/upload/progress/{job_id}` | Poll upload/extraction progress |
| `POST` | `/api/process-input` | Process all files in the `input/` directory |
| `POST` | `/api/reports/deduplicate` | Remove duplicate report entries |

### Dashboard & Analytics

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/dashboard/{user_id}` | Health score, anomaly cards, biomarker summary |
| `GET` | `/api/biomarker/{user_id}/{biomarker_name}` | Full biomarker history + anomalies |
| `GET` | `/api/notifications/{user_id}` | Queued notification summaries |
| `GET` | `/api/search?q={query}` | Semantic search across all stored reports |

### Chat

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat` | Single-turn chat (blocking) |
| `POST` | `/api/chat/stream` | Streaming chat (SSE) |

**Streaming Chat SSE Events:**

| Event | Payload | Description |
|---|---|---|
| `meta` | `{ status, streaming, session_id }` | Stream opened |
| `chunk` | `{ text }` | Token chunk |
| `done` | `ChatDonePayload` | Stream complete |
| `error` | `{ message }` | Stream error |
| `ping` | `{ time }` | Keepalive heartbeat |

### Doctor Share

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/share` | Create an expiring share link |
| `GET` | `/api/share/{token}` | Retrieve shared report data (public) |

---

## ☁️ Supabase Integration (Optional)

Vaidy is **local-first** — it runs completely without Supabase. Enable it to unlock cross-device sync, authentication, and cloud storage.

**1. Apply the schema:**

```sql
-- In Supabase SQL Editor
-- Run: supabase/schema.sql
```

**2. Set environment variables** (see [Environment Variables](#-environment-variables))

**3. Deploy email notification function:**

```bash
supabase functions deploy send-report-notification
```

**Synced tables:** `analyzed_reports`, `biomarker_history`, `anomaly_findings`, `notification_outbox`, `report_files` (storage)

> When Supabase is not configured, the app automatically falls back to the `local-user` identity — CLI and web app continue to share the same SQLite store with no authentication required.

---

## 🎨 Design System

Vaidy uses a custom dark design language built on Tailwind CSS 4.

**Color Palette:**

| Token | Hex | Usage |
|---|---|---|
| Background | `#050508` | Deep void black — primary surface |
| Accent Emerald | `#34d399` | Primary action, highlights |
| Accent Teal | `#5eead4` | Secondary highlights, gradients |
| Muted | `#6b7280` | Subdued text, borders |

**Animation System:**

| Name | Effect | Used in |
|---|---|---|
| `float` | Organic vertical drift | GlowOrbs, hero elements |
| `pulse-glow` | Breathing glow | CTAs, active indicators |
| `shimmer` | Traveling light sweep | Upload card border |
| `wave` | Organic horizontal oscillation | Background orbs |

**Key Techniques:**
- **Glass morphism** — `backdrop-blur` + semi-transparent borders for cards
- **Particle Field** — Seeded PRNG ensures identical server/client render (zero hydration mismatch)
- **Typewriter effect** — `useEffect` interval with regex-based keyword highlighting
- **Smooth scroll** — Lenis for physics-based inertia scrolling

---

## 🗺️ Roadmap

- [x] Multi-format PDF/image report extraction
- [x] 50+ Indian lab format support
- [x] Streaming AI chat (English + Hindi)
- [x] Longitudinal health timeline & anomaly detection
- [x] Doctor-share link generation
- [x] Health score dashboard
- [x] Email notifications via Resend
- [x] Terminal CLI with full agent capability
- [x] Local SQLite + optional Supabase sync
- [ ] Hindi language UI (full interface localization)
- [ ] Mobile-first PWA with offline support
- [ ] WhatsApp / SMS report upload for feature-phone users
- [ ] Interactive biomarker trend charts (Recharts / D3)
- [ ] Doctor-facing PDF summary export
- [ ] Regional language support (Tamil, Telugu, Marathi, Bengali)
- [ ] Prescription parsing and drug interaction alerts
- [ ] Integration with DigiLocker / ABHA health ID

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/<your-username>/Hackthon-healthcare-agent.git

# 3. Create a feature branch
git checkout -b feature/your-feature-name

# 4. Make your changes, following existing conventions:
#    - Frontend: TypeScript strict mode, Tailwind utility classes, Framer Motion for animation
#    - Backend: Add new config knobs to policy .md files (not hardcoded in Python)
#    - Tests: Add pytest tests in backend/tests/

# 5. Commit with a clear message
git commit -m "feat: describe your change concisely"

# 6. Push and open a Pull Request
git push origin feature/your-feature-name
```

**Key conventions:**
- Backend configuration lives in `.md` policy files, never hardcoded in Python
- New biomarker aliases go in `extractor/biomarker_aliases.md`
- Agent fast-path patterns go in `healthcare_agent/agent_commands.md`
- Always run `pytest` before submitting: `cd backend && python -m pytest`

---

## 📄 License

This project was built for a healthcare hackathon and is shared for educational and portfolio purposes.

---

<div align="center">

Made with ❤️ for India &nbsp;·&nbsp; Built at a Healthcare Hackathon

**[vaidy.vercel.app](https://vaidy.vercel.app/)**

*Vaidy — because your health data should speak your language.*

</div>
