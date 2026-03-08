# Littlebird.ai — Competitive MVP Scope Breakdown

## What Littlebird Is

Littlebird is an always-on, OS-level AI productivity assistant that acts as a "digital twin." It passively observes what's on your active screen (documents, browser tabs, meetings), builds a contextual memory of your work, and lets you query that memory through an AI chat. It auto-generates task lists, daily journals, and meeting summaries — all without manual input. Mac-first, with iOS/Android companion apps. Currently in beta (free), with a Basic and Plus tier planned.

---

## Feature Map → MVP Prioritization

### Tier 1: Core MVP (Ship This First)

These are the features that define the product and without which there is no product.

**1. Screen Context Capture Engine**
- Read text/elements from the active window (not screen recording — accessibility APIs + OCR)
- Respect privacy boundaries: ignore minimized apps, private/incognito windows, password fields
- Pause/resume toggle for the user
- **Tech:** macOS Accessibility API, optional OCR fallback, local text extraction pipeline
- **Scope:** ~4–6 weeks for a senior eng

**2. Local Context Store + Embedding Pipeline**
- Chunk captured text → embed → store in a local vector database
- Timestamp and tag by app source (e.g., "Chrome," "VS Code," "Slack")
- Support deletion by time window (last hour, last day, all)
- **Tech:** SQLite for metadata, local vector DB (e.g., LanceDB, Chroma), sentence-transformer embeddings
- **Scope:** ~3–4 weeks

**3. AI Chat Interface (Query Your Memory)**
- Chat UI where the user asks questions and the system retrieves relevant context via RAG
- Basic conversation history
- **Tech:** RAG pipeline (embed query → vector search → LLM synthesis), local or cloud LLM (OpenAI / Claude API)
- **Scope:** ~3–4 weeks

**4. Meeting Transcription + Summarization**
- Capture system audio during meetings (Zoom, Google Meet, Teams)
- Transcribe → summarize → store as searchable context
- **Tech:** macOS audio capture (virtual audio device or ScreenCaptureKit), Whisper for transcription, LLM for summary
- **Scope:** ~3–4 weeks

**5. Desktop App Shell (Mac)**
- Menu bar app with tray icon
- Settings panel (pause, privacy controls, delete data)
- Chat window (floating or docked)
- **Tech:** Electron or Tauri (Tauri preferred for size/performance), Swift for native hooks
- **Scope:** ~3–4 weeks (parallel with above)

---

### Tier 2: Differentiation Layer (Ship Within 2–4 Weeks After MVP)

These turn the product from a "Rewind clone" into something with its own identity.

**6. Auto-Generated Daily Journals**
- End-of-day summary: what you worked on, meetings attended, docs touched
- Editable, exportable (Markdown/PDF)
- **Scope:** ~1–2 weeks (leverages existing context store + LLM)

**7. Smart Task Extraction**
- Detect action items from meetings and screen context
- Surface them as a task list in the UI
- **Scope:** ~2 weeks

**8. Personalized Schedule Briefings**
- Pull calendar events (Google Calendar / Outlook integration)
- Generate "here's what's coming up and what you need to know" briefings
- **Scope:** ~2 weeks

---

### Tier 3: Growth & Stickiness (Post-Launch Iteration)

**9. Third-Party Integrations (Notion, Slack)**
- OAuth-based connections
- Pull data from these tools into the unified context store
- **Scope:** ~2–3 weeks per integration

**10. Multi-Model Support**
- Let users switch between text generation, image understanding, and web search within the chat
- **Scope:** ~2 weeks

**11. Workflow Automation (Natural Language Routines)**
- "Every Friday, compile a summary of this week's meetings and email it to me"
- Natural language → scheduled action pipeline
- **Scope:** ~4–6 weeks (complex, can defer)

**12. Mobile Companion App (iOS/Android)**
- Query your memory on the go
- Push notification briefings
- **Scope:** ~6–8 weeks (React Native or Flutter)

**13. Windows Support**
- Port screen capture + audio capture to Win32/WinRT APIs
- **Scope:** ~6–8 weeks

---

## MVP Tech Stack Recommendation

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Desktop shell | Tauri (Rust + WebView) | Tiny bundle, native perf, good macOS support |
| Native hooks | Swift module | Accessibility API, audio capture via ScreenCaptureKit |
| Context store | SQLite + LanceDB | Local-first, no infra needed, fast vector search |
| Embeddings | `all-MiniLM-L6-v2` (local) or OpenAI `text-embedding-3-small` | Balance of speed vs quality |
| Transcription | Whisper (local `whisper.cpp`) | Privacy-friendly, no audio leaves device |
| LLM | Claude API or OpenAI API | Cloud for quality; option to add local models later |
| Frontend | React (inside Tauri WebView) | Fast iteration, large talent pool |
| Auth/backend | Supabase or Firebase | User accounts, sync, billing — minimal backend to build |

---

## MVP Cost & Timeline Estimate

| | Solo Dev / Small Team (2–3) | Funded Team (5–6) |
|--|-------|------|
| Tier 1 (Core MVP) | 10–14 weeks | 5–7 weeks |
| Tier 2 (Differentiation) | +4–6 weeks | +2–3 weeks |
| Total to competitive beta | ~16–20 weeks | ~8–10 weeks |
| Estimated monthly burn (cloud + infra) | $500–$2K | $3–8K |
| Per-user LLM cost | ~$0.50–$2/month | Same |

---

## Critical Risks & Moat Analysis

**Where Littlebird's moat is thin (your opportunity):**
- Screen capture + RAG is becoming commoditized (Rewind/Limitless, Augment, Recall by Microsoft)
- No deep integrations yet (only Notion + Slack) — you can leapfrog with more connectors
- Mac-only — Windows-first or cross-platform is a real differentiator
- Still in beta — no established user lock-in

**Where Littlebird's moat is strong (don't compete here initially):**
- Brand positioning as "digital twin" is clean and resonant
- SOC 2 certification — takes time and money to replicate
- Privacy-first design (they've clearly invested in this narrative)

**Biggest risks for your MVP:**
- **Privacy perception** — screen capture is creepy if not handled perfectly. Invest heavily in onboarding UX that builds trust.
- **LLM costs at scale** — RAG queries add up. Consider local models (Llama 3, Mixtral) as a cost hedge.
- **Apple's sandboxing** — macOS accessibility permissions are a UX friction point. Smooth onboarding here is make-or-break.
- **Retention** — passive tools have low engagement. The journal + task features are what bring people back daily.

---

## Recommended MVP Scope (If You Ship One Thing)

If you need to validate the concept with minimal build:

**Build a "Meeting Memory" vertical MVP:**
1. Menu bar app that captures meeting audio
2. Transcribes and summarizes automatically
3. Stores summaries in a searchable local database
4. AI chat to ask "what did we discuss about pricing in last Tuesday's call?"

This is ~4–6 weeks for one strong engineer, validates the core value prop (contextual AI memory), and avoids the complexity of full screen capture. If it gets traction, expand to full screen context from there.
