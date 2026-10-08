# DEV-TRACE Project Context & Codebase Directory

This document provides a comprehensive mapping of every file, component, service, data model, and API endpoint in the **DEV-TRACE** repository. It is continuously updated with every codebase modification.

---

## 📌 Project Overview
**DEV-TRACE** is an AI/ML-assisted developer evaluation and technical assessment platform. It combines:
1. **Interactive In-Browser Candidate IDE** (Monaco Editor, file explorer, live terminal, and Web/Container execution).
2. **Framework-Isolated Sandboxes** (Django 5.0 in-memory test runner, Express.js / Node 20, Spring Boot Java 17, FastAPI Python 3.11, Flask Python 3.11, Next.js 15 App Router, GCC 12 C++, Eclipse Temurin 17 Java, and Vanilla Web Live Preview).
3. **High-Resolution Telemetry Engine** capturing keystrokes, paste events, focus loss, line diffs, and editor interactions.
4. **AI/ML Evaluation Pipeline** with Random Forest and XGBoost scoring models for candidate proficiency and integrity classification.
5. **Strict Candidate vs. Invigilator Site Isolation** via Server-Side Edge Middleware (`src/middleware.ts`) preventing URL tampering and cross-portal leakage.
6. **Admin & Interviewer Management Deck** for provisioning credentials, configuring framework challenges, and analyzing telemetry sessions.
7. **Payment Ingestion Microservice Challenge** (`devtrace-payment-service`) designed for senior backend debugging (idempotency, distributed locking, floating-point precision, memory leaks, transaction isolation).
8. **Integrated AI Suite** (AI Challenge Generator for test makers, AI Telemetry Evaluator & Integrity Classifier for invigilators, and AI Socratic Mentor for candidates).

---

## 📂 Repository File Tree & File Catalog

```
c:/Users/BharatBK/Documents/projectss/dev/
│
├── package.json                         # Next.js project configuration, dependencies, and build scripts
├── tsconfig.json                        # TypeScript compiler options and path aliases (@/*)
├── next.config.js                       # Next.js framework configuration
├── tailwind.config.js                   # Tailwind CSS styling and theme configuration
├── postcss.config.js                    # PostCSS processing configuration
├── README.md                            # Complete platform overview, challenge catalog, and operational guide
├── CONTEXT.md                           # Exhaustive architectural inventory and file catalog (this file)
├── deep-research-report.md              # Research and design documentation for behavioral ML models
│
├── src/                                 # Main application source directory
│   ├── middleware.ts                    # Edge Route Guard: strictly enforces candidate vs invigilator URL isolation
│   │
│   ├── app/                             # Next.js 15 App Router pages and REST API routes
│   │   ├── layout.tsx                   # Root HTML layout, font setup, and metadata
│   │   ├── page.tsx                     # Landing / Home page redirecting based on session role
│   │   ├── globals.css                  # Global styling, dark theme tokens, and custom scrollbars
│   │   │
│   │   ├── staff/                       # Staff / Invigilator gateway route
│   │   │   └── page.tsx                 # Dynamic server router directing staff to admin/interviewer decks
│   │   │
│   │   ├── login/                       # Candidate authentication view
│   │   │   ├── page.tsx                 # Candidate login form (isolated, no staff links)
│   │   │   └── staff/                   # Staff / Admin & Interviewer authentication
│   │   │       └── page.tsx             # Staff login portal (admin & interviewer credentials only)
│   │   │
│   │   ├── ide/                         # Candidate coding environment
│   │   │   └── page.tsx                 # Monaco IDE with framework runner, test button, and telemetry streamer
│   │   │
│   │   ├── admin/                       # Administrator Control Deck
│   │   │   ├── page.tsx                 # Admin dashboard (candidate & interviewer management, challenge manager)
│   │   │   └── telemetry/               # Detailed candidate telemetry inspection
│   │   │       └── page.tsx             # Session replay, keystroke stats, event graphs, and stability analytics
│   │   │
│   │   ├── interviewer/                 # Interviewer Control Deck
│   │   │   └── page.tsx                 # Interviewer candidate management, test assignment, and live monitor
│   │   │
│   │   ├── python-challenge/            # Direct algorithmic challenge route
│   │   │   └── page.tsx                 # Standalone challenge view
│   │   │
│   │   └── api/                         # Backend Next.js REST API routes
│   │       ├── auth/
│   │       │   ├── login/route.ts       # Unified authentication (role-prefixed session tokens: admin_, interviewer_, candidate_)
│   │       │   ├── logout/route.ts      # Session termination and cookie cleanup
│   │       │   └── me/route.ts          # Current authenticated session resolver
│   │       │
│   │       ├── admin/
│   │       │   ├── candidates/route.ts  # GET candidates list / POST new candidate
│   │       │   ├── candidates/[id]/route.ts # PATCH (Stop/Resume test) / DELETE (Remove candidate, preserve telemetry)
│   │       │   ├── interviewers/route.ts # GET interviewers list / POST new interviewer
│   │       │   ├── interviewers/[id]/route.ts # DELETE interviewer
│   │       │   └── telemetry/route.ts   # POST session telemetry payload / GET telemetry logs (Staff Only)
│   │       │
│   │       ├── telemetry/
│   │       │   └── submit/route.ts      # Dedicated candidate background telemetry submission endpoint
│   │       │
│   │       ├── ai/                      # AI Suite REST Endpoints
│   │       │   ├── generate-challenge/route.ts # AI Test-Maker Challenge Synthesizer
│   │       │   ├── evaluate-candidate/route.ts # AI Telemetry Evaluator & Integrity Classifier
│   │       │   └── assistant/route.ts   # AI Socratic Debugging Mentor & Error Explainer
│   │       │
│   │       └── execute/
│   │           └── route.ts             # Multi-framework isolated sandbox (Django, Express, Spring Boot, FastAPI, Flask, Next.js 15, GCC, Java)
│   │
│   ├── components/                      # Reusable UI Components
│   │   ├── FileExplorer.tsx             # Project file tree navigator with framework-aware file icons
│   │   ├── MockTerminal.tsx             # Interactive console/terminal with colorized outputs & AI Explain Error
│   │   ├── LivePreview.tsx              # Sandboxed iframe browser for HTML/CSS/JS challenges
│   │   ├── CodingQuestion.tsx           # Challenge prompt and instruction drawer
│   │   └── ThemeToggle.tsx              # Dark/Midnight/Light theme switcher
│   │
│   ├── data/                            # Challenge repositories and local JSON storage
│   │   ├── brokenRepo.ts                # Multi-framework challenge definitions (Django, Express, Spring Boot, FastAPI, Flask, Next.js, C++, Java, Web)
│   │   └── db.json                      # Local persistence store (candidates, sessions, telemetry events)
│   │
│   ├── store/                           # Client-side state management
│   │   ├── telemetryStore.ts            # Zustand store recording keystrokes, pastes, focus shifts, and diffs
│   │   └── themeStore.ts                # Zustand store managing theme state (dark, midnight, light)
│   │
│   └── lib/                             # Shared utility functions and services
│       ├── auth.ts                      # Session resolution, password generator, and auth guards
│       ├── db.ts                        # JSON file read/write database helpers
│       └── ai/                          # AI Intelligence Engine
│           └── aiService.ts             # LLM API connector, prompt templates, and intelligent heuristic fallback
│
└── devtrace-payment-service/            # Senior Backend Payment Ingestion Service Challenge
    └── devtrace-payment-service/
        ├── package.json                 # Express, Redis (ioredis), Postgres (pg), TypeScript, Jest
        ├── tsconfig.json                # TypeScript build config
        ├── jest.config.js               # Jest unit and integration test configuration
        ├── ASSESSMENT.md                # Bug matrix, grading rubric, Slack simulation messages & hints
        ├── README.md                    # Payment microservice instructions and run guide
        ├── .env.example                 # Example environment variables
        │
        ├── src/
        │   ├── config/
        │   │   └── redis.ts             # Redis connection manager (singleton vs new connection bug)
        │   ├── middleware/
        │   │   └── rateLimiter.ts       # Rate limiter with memory leak bug
        │   └── services/
        │       ├── paymentProcessor.ts  # Payment pipeline with floating point bug
        │       └── reconciliationWorker.ts # Ledger sync with race condition bugs
        └── tests/
            └── payment.test.ts          # Automated integration test suite
```

---

## 🔒 Security & Route Isolation Architecture

1. **Next.js Edge Middleware (`src/middleware.ts`)**:
   - Inspects `devtrace_session` cookie on every incoming request before rendering.
   - **Candidates** trying to visit `/admin`, `/interviewer`, `/staff`, or `/api/admin/*` are immediately blocked and 307 redirected to `/ide`.
   - **Staff** trying to visit `/ide` or `/login` are redirected to `/admin` or `/interviewer`.
   - **Unauthenticated** users are redirected to `/login` (candidates) or `/login/staff` (staff).

2. **Role-Prefixed Session Tokens**:
   - `admin_<uuid>` → Full Administrator permissions.
   - `interviewer_<uuid>` → Interviewer / Invigilator permissions.
   - `candidate_<uuid>` → Assessment sandbox only.

---

## 🤖 AI Suite Modules & Multi-Provider LLM Integration

The AI subsystem in `src/lib/ai/aiService.ts` features automatic multi-provider fallback:
- **OpenRouter (`OPENROUTER_API_KEY` & `OPENROUTER_MODEL`)**: First-priority provider giving access to Claude 3.5 Sonnet, Gemini 2.0 Flash, Llama 3.3 70B, GPT-4o, etc.
- **Google Gemini (`GEMINI_API_KEY`)**: Second-priority direct provider.
- **OpenAI (`OPENAI_API_KEY`)**: Third-priority direct provider.
- **Built-in Zero-Config Intelligence Engine**: Guaranteed fallback requiring 0 external keys, returning structured Socratic hints, evaluations, and challenge templates.

1. **AI Test-Maker / Challenge Generator**:
   - Synthesizes industry-grade multi-file project repositories with seeded production bugs (concurrency, float precision, idempotency, rate limiting, and cache staleness) for any framework (Django, FastAPI, Spring Boot, Node/Express, Flask, Next.js).
   - Generates rich incident briefs formatted with context, architecture breakdown, bug symptoms, acceptance criteria, and test runner guides.
   - Studio in `/admin` includes one-click blueprints (Stripe-style payment, Amazon-style cart, Cloudflare-style limiter) and dual preview (Problem Brief vs Code).
2. **AI Candidate Evaluator & Behavioral Integrity Analyzer**:
   - Transforms raw telemetry (keystroke timing, paste bursts, stability index) into proficiency tiering, AI-assisted probability, anomaly timelines, and custom interview questions.
3. **AI Socratic Mentor & Error Explainer**:
   - Delivers progressive guidance in the IDE without revealing direct solutions, plus stack trace interpretation.
4. **Candidate Problem Specification Drawer**:
   - Interactive formatted specification drawer in Candidate IDE (`/ide`) allowing candidates to inspect incident criteria, constraints, and test runner commands in real time.
