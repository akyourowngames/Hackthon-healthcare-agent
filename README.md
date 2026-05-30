<div align="center">

<br/>

<img src="https://img.shields.io/badge/vaidy-AI%20Health%20Copilot-34d399?style=for-the-badge" alt="Vaidy"/>

# Vaidy

### Your AI Health Copilot — Built for India 🇮🇳

*Not a chatbot. A health brain that reads your reports, remembers your history, and explains everything in plain language.*

<br/>

[![Live Demo](https://img.shields.io/badge/Live%20Demo-vaidy.vercel.app-34d399?style=flat-square&logo=vercel&logoColor=white)](https://vaidy.vercel.app/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Hackthon--healthcare--agent-181717?style=flat-square&logo=github)](https://github.com/akyourowngames/Hackthon-healthcare-agent.git)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer%20Motion-12-0055FF?style=flat-square&logo=framer&logoColor=white)](https://www.framer.com/motion/)

</div>

---

## 🖼️ Preview

<div align="center">
  <a href="https://vaidy.vercel.app/" target="_blank">
    <img src="https://raw.githubusercontent.com/akyourowngames/Hackthon-healthcare-agent/main/vaidy-landing.png" alt="Vaidy Landing Page — Your health, finally decoded." width="100%"/>
  </a>
  <br/>
  <sub>Live at <a href="https://vaidy.vercel.app/">vaidy.vercel.app</a></sub>
</div>

---

## 📖 Overview

India has 1.4 billion people and a significant gap between medical knowledge and patients. Lab reports arrive full of jargon, reference ranges are context-free, and most people have no easy way to understand what their own health data means.

**Vaidy** bridges that gap. It acts as a personal health intelligence layer — reading any diagnostic report you upload, building a longitudinal health timeline, detecting trends across visits, and answering your questions in plain language. Supports all major Indian diagnostic labs including Apollo, Thyrocare, Lal Path Labs, Dr. Lal and 50+ more.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📄 **Reads Any Report** | Blood tests, MRIs, prescriptions — in English or Hindi |
| 🧠 **Remembers Everything** | Builds your personal health timeline automatically |
| 💬 **Plain Language Always** | No jargon. Explanations anyone can follow |
| 📈 **Trend Detection** | Spots patterns and anomalies across reports over time |
| 🤖 **Ask Anything** | Chat with your full health history like a conversation |
| 🇮🇳 **India-First** | Understands Apollo, Thyrocare, Lal Path Labs, Dr. Lal & 50+ Indian lab formats |

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| [Next.js](https://nextjs.org/) | 14 (App Router) | React framework, SSR/SSG |
| [React](https://react.dev/) | 18 | UI library |
| [TypeScript](https://www.typescriptlang.org/) | 5 | Type safety |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4 | Utility-first styling |
| [Framer Motion](https://www.framer.com/motion/) | 12 | Animations & transitions |
| [Inter](https://fonts.google.com/specimen/Inter) | — | Typography (via `next/font`) |

### Design System
- **Color palette** — Deep void black (`#050508`) background with emerald (`#34d399`) and teal (`#5eead4`) accent colors
- **Glass morphism** — Frosted glass cards using `backdrop-blur` and semi-transparent borders
- **Custom animations** — `float`, `pulse-glow`, `shimmer`, `wave` keyframes in Tailwind config and CSS
- **Responsive** — Mobile-first layout, collapsible navigation, horizontal-scroll timeline on small screens

---

## 🚀 Getting Started

### Prerequisites

- Node.js `>= 18.17.0`
- npm / yarn / pnpm / bun

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/akyourowngames/Hackthon-healthcare-agent.git
cd Hackthon-healthcare-agent/frontend

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Create production build
npm run start    # Serve production build locally
npm run lint     # Run ESLint
```

---

## 📁 Project Structure

```
frontend/
├── app/
│   ├── globals.css          # Global styles, CSS variables, keyframe animations
│   ├── layout.tsx           # Root layout with Inter font & metadata
│   └── page.tsx             # Main page — assembles all sections
│
├── components/
│   ├── Navbar.tsx           # Sticky navbar with animated mobile menu
│   ├── Hero.tsx             # Full-screen hero with glow orbs & particle field
│   ├── GlowOrbs.tsx         # Animated radial gradient background orbs
│   ├── ParticleField.tsx    # Deterministic SVG particle animation
│   ├── UploadPreview.tsx    # Drag-and-drop report upload UI
│   ├── ExplainDemo.tsx      # Typewriter AI explanation demo
│   ├── HealthTimeline.tsx   # Horizontal scrollable health history timeline
│   ├── FeatureCards.tsx     # 6-card animated feature grid
│   ├── FinalCTA.tsx         # Conversion section with animated CTA button
│   └── Footer.tsx           # Footer with navigation links
│
├── public/                  # Static assets (SVG icons)
├── tailwind.config.ts       # Extended design tokens (colors, fonts, animations)
├── postcss.config.mjs       # PostCSS configuration
├── next.config.mjs          # Next.js configuration
└── tsconfig.json            # TypeScript configuration
```

---

## 🎨 Design Highlights

### Animations
- **Particle Field** — Uses a seeded pseudo-random number generator so particles render identically on server and client (no hydration mismatch)
- **Shimmer Border** — CSS `::before` pseudo-element with animated `background-position` creates a traveling light effect on the upload card
- **Glow Orbs** — Layered `float` and `wave` animations create organic, depth-of-field-like background motion in the hero
- **Typewriter Effect** — `useEffect` interval drives character-by-character text reveal with regex-based keyword highlighting

### Accessibility
- All interactive elements have `focus-visible` ring styles
- Decorative SVGs marked `aria-hidden="true"`
- Mobile navigation toggle has `aria-expanded` and `aria-controls`
- Timeline rendered as a semantic `<ol>` with `<article>` cards

---

## 🌐 Deployment

The project is deployed on **Vercel** via automatic GitHub integration.

To deploy your own instance:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from the frontend directory
cd frontend
vercel
```

Or connect your fork to [vercel.com](https://vercel.com) for automatic deployments on every push to `main`.

---

## 🗺️ Roadmap

- [ ] Backend API integration for real report parsing (OCR + LLM pipeline)
- [ ] Hindi language UI support
- [ ] Persistent health profile with authentication
- [ ] PDF / image report ingestion (Apollo, Thyrocare, AIIMS formats)
- [ ] Doctor-facing summary export
- [ ] WhatsApp / SMS report upload flow for feature-phone users
- [ ] Trend graphs with interactive charts (Recharts / D3)

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

```bash
# Fork the repo, then:
git checkout -b feature/your-feature-name
git commit -m "feat: add your feature"
git push origin feature/your-feature-name
# Open a Pull Request
```

Please follow the existing code style — TypeScript strict mode, Tailwind utility classes, and Framer Motion for all animations.

---

## 📄 License

This project was built for a healthcare hackathon. See [LICENSE](LICENSE) for details.

---

<div align="center">

Made with ❤️ for India &nbsp;·&nbsp; Built at a Healthcare Hackathon

**[vaidy.vercel.app](https://vaidy.vercel.app/)**

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
