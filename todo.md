# Step 3 — Full Upgrade, New Features, Polish

## Where You Stand Right Now

You have: PDF extraction + RAG + Chat + Memory + Landing page + Basic chat UI.

What you're missing that makes Vaidy a real product: anomaly detection, multilingual, auth, trend visualization, doctor share, mobile polish, and a dashboard that shows health over time.

Here's everything, in build order.

---

## Priority 1 — Anomaly Detection Engine (Most Important)

This is your biggest differentiator. No other health chatbot does this. This is what the pitch deck calls "the killer demo moment."

### What It Does

After every new report upload, run a comparison against all previous reports for that user. Detect three things:

**Trend alerts** — value moving consistently in one direction across 3+ reports. TSH going up every report for 6 months. Hemoglobin slowly dropping. This is more dangerous than a single high reading.

**Personal baseline breach** — value is within lab reference range but significantly different from the user's own historical average. Lab says TSH normal range is 0.4-4.5. User always tests at 1.2. This report shows 3.8. Still "normal" but 3x their personal baseline. Flag it.

**First time abnormal** — value has never been flagged before and is now HIGH or LOW. Different urgency than a chronic issue.

### Build This In

File: `rag/anomaly.py`

Function: `analyze_trends(user_id)` — pulls all historical biomarker values from Supabase, runs simple analysis, returns a structured list of findings.

For each biomarker with 3+ data points calculate:
- Direction: up, down, stable
- Slope: how fast it's changing
- Personal mean and standard deviation
- Current deviation from personal mean in standard deviations

Anything moving consistently in one direction for 3+ readings = trend alert.
Anything more than 2 standard deviations from personal mean = personal baseline breach.

Store findings in a new Supabase table:

```
anomaly_findings
  id
  user_id
  biomarker
  finding_type    (trend / baseline_breach / first_abnormal)
  severity        (watch / concern / urgent)
  description     text
  data_points     jsonb
  detected_at     timestamp
```

Regenerate this after every upload. Surface findings in chat automatically — when user opens chat after uploading a new report, Vaidy proactively says what it found without being asked.

---

## Priority 2 — Multilingual Support

This is in your pitch deck and you don't have it yet. Hindi and Hinglish support.

### Language Detection

Use `langdetect` library. One function: `detect_language(text)` — returns "hi", "en", or "hinglish". For Hinglish (mixed Hindi-English in Latin script) — if langdetect returns "en" but the text contains common Hindi words like "mera", "kya", "hai", "nahi", "aur" — classify as Hinglish.

### Prompt Modification

Add one line to your system prompt:
```
The user's message language is: {detected_language}.
If Hindi or Hinglish, respond in the same style.
Use simple Hindi words, not formal Sanskrit-heavy Hindi.
Example Hinglish response: "Aapka hemoglobin thoda low hai — 
around 10.2 g/dL. Normal range women ke liye 12-16 hoti hai."
```

Llama 4 Scout handles Hinglish well. Also NIM catalog has `sarvam-m` which is specifically built for Indian languages — add it as a fallback for pure Hindi queries.

### Frontend

Add a language toggle in the chat UI. Three options: English, Hindi, Auto-detect. Store preference in localStorage. Pass it with every chat request.

---

## Priority 3 — User Authentication

Right now you're using a plain user_id string. You need real auth before anything else in production.

Use Supabase Auth — it's already in your stack, free, handles email + Google OAuth.

Three flows only:
- Sign up with email
- Log in with email
- Google OAuth (one button, most users will use this)

Once auth is in, replace all `user_id` strings with the actual Supabase auth user ID. Row-level security on all Supabase tables so users can only see their own data. Two lines of SQL per table.

Junior 1 task — build the login/signup page. Supabase has a pre-built Auth UI component for React. This is literally a 30-minute task even for a beginner.

---

## Priority 4 — Health Dashboard

Right now the only view is chat. Users need a visual overview of their health over time. This is what turns Vaidy from a chatbot into a health product.

### Dashboard Components

**Biomarker trend charts**
For each biomarker that appears in 2+ reports, show a line chart over time. Color coded — green for normal readings, red for high, yellow for borderline. Simple recharts line chart. You already have recharts available in your frontend.

**Report timeline**
You already have a HealthTimeline component. Connect it to real data from Supabase instead of the hardcoded mock data.

**Anomaly alert cards**
Show the findings from your anomaly engine as cards at the top of the dashboard. Severity determines card color. Red for urgent, yellow for watch. Each card has a "Ask Vaidy about this" button that opens chat with the finding pre-loaded as the first message.

**Health score**
A simple 0-100 score calculated from: percentage of biomarkers in normal range + trend direction bonus/penalty. Not medically certified, just a quick glance indicator. Display as a large number with a trend arrow. Disclaimer: "For informational purposes only."

### New Supabase Table

```
biomarker_history
  id
  user_id
  biomarker_name
  value
  unit
  flag
  report_date
  lab_name
```

Populate this from every report upload. This is what powers the charts.

### New API Endpoints

```
GET /dashboard/{user_id}
  returns: recent anomalies, biomarker history, health score

GET /biomarker/{user_id}/{biomarker_name}
  returns: all historical values for one biomarker
```

---

## Priority 5 — Doctor Share Feature

One of the highest-value features you can build. Let users share a clean report summary with their doctor via a link.

### How It Works

User clicks "Share with Doctor" button. System generates a unique read-only link. Doctor opens link, sees a clean one-page summary with: patient basics, all biomarkers from latest report, trend graphs for anything abnormal, Vaidy's anomaly findings in plain language.

Link expires in 7 days. No login required for the doctor.

### Implementation

New Supabase table:
```
share_links
  id          uuid (this is the link token)
  user_id
  report_ids  array of report ids to include
  created_at
  expires_at
  view_count
```

New endpoint:
```
POST /share
  - creates share link
  - returns the link URL

GET /share/{token}
  - public, no auth
  - returns formatted report summary
```

New frontend page: `/share/[token]` — clean, printable layout. No navigation, no branding clutter. Just the medical data.

---

## Priority 6 — Upload Flow Polish

Right now upload is a CLI command. Make it a real product experience.

### Frontend Upload Flow

Replace the fake upload animation in your landing page with a real working flow:

Step 1 — Drag and drop or click to upload PDF. Show file name and size.

Step 2 — Progress indicator with real status updates. "Reading report... Extracting biomarkers... Analyzing trends... Done." Use Server-Sent Events from your FastAPI backend to stream progress updates.

Step 3 — Results screen. Show extracted biomarkers in a clean table. Highlight abnormal values in red. Show any anomaly findings detected. Two buttons: "View Dashboard" and "Ask Vaidy".

### Backend Changes

Add a `/upload/progress/{job_id}` SSE endpoint that streams status updates during processing. Frontend polls this after upload starts.

---

## Priority 7 — Report Memory Improvements

Your current memory is basic. Upgrade it.

### Smart Context Injection

Right now you inject all retrieved chunks. Be smarter about it.

When user asks about a specific biomarker — retrieve only chunks for that biomarker across all reports. Don't dump everything.

When user asks a trend question ("has my cholesterol improved?") — retrieve specifically the biomarker_history data, not the raw report chunks. Build a text summary of the trend and inject that.

When user asks a general question ("am I healthy?") — inject the anomaly findings + health score + long term profile. Not individual biomarker chunks.

Build an intent classifier — one NIM call with a simple prompt that classifies the question into: specific_biomarker, trend_question, general_health, report_comparison, other. Then route to the right retrieval strategy.

### Conversation Summarization

After every 10 exchanges, summarize the conversation so far using NIM and replace the raw messages with the summary. This prevents the context window from filling up on long conversations while preserving important information.

---

## Priority 8 — Mobile Polish

Your landing page is decent on mobile. Your chat UI probably isn't. Fix these:

Chat input sticks to bottom of screen on mobile using CSS `position: fixed`. Keyboard appearance on mobile pushes content up — handle this with a `visualViewport` resize listener. Message bubbles have enough padding to be thumb-tappable. File upload works on mobile with camera option for taking photos of physical reports.

---

## Priority 9 — Notification System

Simple but high value. When a new report is uploaded and anomalies are detected, send an email summary.

Use Supabase Edge Functions + Resend (free tier is 3000 emails/month). Email template:

```
Subject: Vaidy found 2 things to watch in your latest report

Your TSH has been rising for 3 consecutive reports.
Your Triglycerides are HIGH at 210 mg/dL.

[View full analysis] [Ask Vaidy]
```

That's it. No spam. Only send when something is actually worth noting.

---

## Full Build Order

```
Week 1:
  Day 1-2: Anomaly detection engine
  Day 3:   Multilingual support
  Day 4:   Supabase auth integration
  Day 5:   Biomarker history table + population

Week 2:
  Day 1-2: Health dashboard (charts + timeline + anomaly cards)
  Day 3:   Upload flow polish with progress streaming
  Day 4:   Doctor share feature
  Day 5:   Smart context injection for memory

Week 3:
  Day 1:   Conversation summarization
  Day 2:   Mobile polish
  Day 3:   Email notifications
  Day 4-5: Bug fixing, testing on 5 different real PDFs
```

---

## Junior Tasks This Phase

**Junior 1 (frontend):**
- Build login/signup page using Supabase Auth UI component
- Build dashboard layout with placeholder charts
- Build the doctor share page (read-only, printable)
- Mobile CSS fixes for chat UI

**Junior 2 (beginner):**
- Set up Supabase row-level security SQL for all tables
- Set up Resend account and test email template
- Collect 5 more real Indian lab PDFs for testing
- Write the SQL for all new tables

---

## What Done Looks Like

User signs in with Google. Uploads 3 blood reports from past year. Dashboard shows their biomarker trends over time. Vaidy proactively says "your TSH has been rising for 3 reports — worth discussing with your doctor." User types in Hinglish, Vaidy responds in Hinglish. User shares a link with their doctor. Doctor opens it, sees everything cleanly without logging in.

That's a real product. That's a 9.1 hackathon score made into something people actually use.

Say done when this phase is complete and I'll give you Step 4 — production deployment and scale.