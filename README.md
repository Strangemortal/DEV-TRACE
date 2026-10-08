# DEV-TRACE 🚀

> **Intelligent Developer Assessment Platform** | Framework-Isolated Sandboxes (Django, Python, C++, Java, Web) + Real-time IDE Telemetry + AI/ML Behavioral Evaluation

---

## 📌 Overview

**DEV-TRACE** is a technical assessment and developer evaluation platform built for engineering teams, technical recruiters, and coding interviews.

Unlike traditional coding assessment platforms that only check unit test pass rates, DEV-TRACE:
1. **Creates isolated framework environments for each specific test** (e.g. dedicated Django 5.0 in-memory test runner sandbox, GCC C++ compiler, Eclipse Temurin Java JDK, or Python runtimes).
2. **Collects real-time IDE telemetry** (5,000–10,000+ keystroke, paste, focus, and diff events per session).
3. **Applies Machine Learning models** (Random Forest & XGBoost) to classify candidate technical proficiency and detect autonomous vs. AI-assisted coding behaviors.
4. **Provides an enterprise control deck** for Admins and Interviewers to provision candidate credentials and inspect telemetry replays.
5. **Includes a microservice challenge** (`devtrace-payment-service`) targeting concurrency, distributed locking, idempotency, floating-point math, and memory leak debugging.

---

## ✨ Core Features

### 1. 🏗️ Framework-Isolated Test Environments
When a candidate starts a challenge, the platform spins up an environment tailored specifically to that framework:
- **Django Framework Sandbox** (`framework: "django"`):
  - Automatically provisions multi-file projects (`models.py`, `views.py`, `tests.py`, `settings.py`, `manage.py`, `serializers.py`).
  - Self-contained in-memory SQLite database configuration.
  - Test runner executes `python manage.py test --noinput` inside the sandbox with full assertion reports.
- **Python Sandbox** (`category: "python"`): Python 3.9/3.11 isolated container.
- **C++ Sandbox** (`category: "cpp"`): GCC 12 container compiling with `g++` and running binaries.
- **Java Sandbox** (`category: "java"`): Eclipse Temurin 17 JDK container compiling with `javac` and running JVM classes.
- **Web Live Preview** (`category: "web"`): Real-time sandboxed browser frame for HTML5, CSS3, and JavaScript challenges.

### 2. 💻 Monaco Editor & Candidate IDE
- VS Code-like editing experience with syntax highlighting for Python, C++, Java, HTML, CSS, JavaScript, and Markdown.
- Multi-file workspace navigation with framework-specific file icons (`FileExplorer.tsx`).
- Integrated color-coded terminal with command support and instant test feedback (`MockTerminal.tsx`).
- Real-time stability score and session timer HUD.

### 3. 🤖 AI/ML Behavioral Telemetry & Evaluation
- **High-Density Telemetry Collection**: Captures fine-grained IDE interactions (keystrokes, pastes, focus loss, tab switching, edit diffs).
- **Feature Engineering Pipeline**: Transforms raw events into 50+ behavioral metrics (typing speed, pasting density, code stability, refactoring coefficient, build frequency).
- **Technical Proficiency Classifier**: Predicts candidate skill tier (**Novice**, **Intermediate**, or **Advanced**).
- **Algorithmic Integrity Classifier**: Categorizes problem-solving style into **Autonomous**, **AI-Assisted**, or **AI-Carried**.

### 4. 🛡️ Admin & Interviewer Control Decks
- Multi-role authentication (Admin, Interviewer, Candidate).
- Candidate credential generator with automated password generation and challenge assignment.
- Telemetry Session Inspector with visual stability charts, event timelines, and code diff logs.

---

## 📂 Repository File Directory

```
├── package.json                         # Project dependencies, scripts, and build metadata
├── tsconfig.json                        # TypeScript configuration and path aliases
├── next.config.js                       # Next.js 15 application configuration
├── tailwind.config.js                   # Tailwind CSS styling and theme configuration
├── README.md                            # Complete platform overview and operational guide
├── docs/                                # Project documentation, research reports, and datasets
│   ├── CONTEXT.md                       # Detailed file map and architectural context
│   ├── DATASETS.md                      # Academic benchmarks & dataset specifications
│   ├── RESEARCH_AND_BENCHMARKS.md       # Empirical benchmark and concurrency report
│   └── deep-research-report.md          # Behavioral ML design and research report
│
├── src/                                 # Next.js Source Code
│   ├── app/
│   │   ├── page.tsx                     # Landing / route redirector
│   │   ├── layout.tsx                   # Main HTML layout and typography
│   │   ├── globals.css                  # Dark-mode styling tokens and UI utilities
│   │   ├── login/page.tsx               # Candidate login portal
│   │   ├── login/staff/page.tsx         # Admin / Interviewer login portal
│   │   ├── ide/page.tsx                 # Candidate IDE with framework runner & telemetry
│   │   ├── admin/page.tsx               # Administrator dashboard & candidate manager
│   │   ├── admin/telemetry/page.tsx     # Telemetry inspection & session analytics
│   │   ├── interviewer/page.tsx         # Interviewer dashboard
│   │   │
│   │   └── api/
│   │       ├── auth/                    # Login, session verification, and logout routes
│   │       ├── admin/                   # Candidate & interviewer CRUD, telemetry ingestion
│   │       └── execute/route.ts         # Framework sandbox runner (Django, Python, C++, Java)
│   │
│   ├── components/
│   │   ├── FileExplorer.tsx             # File tree component with framework-aware icons
│   │   ├── MockTerminal.tsx             # Interactive colorized terminal emulator
│   │   ├── LivePreview.tsx              # Sandboxed browser iframe for web challenges
│   │   └── CodingQuestion.tsx           # Problem description drawer
│   │
│   ├── data/
│   │   ├── brokenRepo.ts                # Challenge repositories (Django, Python, C++, Java, Web)
│   │   └── db.json                      # Local JSON persistence database
│   │
│   └── store/
│       └── telemetryStore.ts            # Zustand telemetry state manager
│
└── devtrace-payment-service/            # Concurrent Payment Ingestion Microservice Challenge
    └── devtrace-payment-service/
        ├── package.json                 # Express, Redis, PostgreSQL, Jest dependencies
        ├── ASSESSMENT.md                # Bug matrix, grading rubric, simulated Slack hints
        ├── README.md                    # Microservice running instructions
        ├── src/
        │   ├── config/redis.ts          # Redis client manager
        │   ├── middleware/rateLimiter.ts # Rate limiter with seeded memory leak
        │   ├── services/paymentProcessor.ts # Ingestion pipeline & floating point bugs
        │   └── services/reconciliationWorker.ts # Ledger worker with concurrency bugs
        └── tests/payment.test.ts        # Automated integration test suite
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.x or v20.x recommended)
- **npm** or **yarn**
- *(Optional for containerized sandbox)*: **Podman** or **Docker** (fallback executes locally if container daemon is not present).

### Installation & Run

1. **Clone the repository & install dependencies:**
   ```bash
   git clone https://github.com/Strangemortal/DEV-TRACE.git
   cd dev
   npm install
   ```

2. **Start the Next.js development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Access Portals:**
   - **Candidate IDE**: [http://localhost:3000/login](http://localhost:3000/login)
   - **Staff / Admin Deck**: [http://localhost:3000/login/staff](http://localhost:3000/login/staff) *(Default Admin username: `admin`, password: `password123`)*

---

## 🧪 Available Assessment Challenges

| Challenge ID | Challenge Name | Framework / Language | Difficulty | Sandbox Environment |
|---|---|---|---|---|
| `django-orm-store` | **Django Store & Coupon Calculator** | **Django 5.0** | Intermediate | Isolated Django In-Memory Sandbox (`python manage.py test`) |
| `express-auth-api` | **Express.js REST API & Rate Limiter** | **Node.js / Express** | Intermediate | Isolated Node 20 Sandbox (`node test.js`) |
| `spring-boot-order-service` | **Spring Boot Order Service & Tax Calc** | **Java 17 / Spring Boot** | Advanced | Isolated JDK 17 Sandbox (`javac *.java && java OrderApplicationTests`) |
| `fastapi-async-crud` | **FastAPI Async CRUD & Pydantic Validator** | **Python 3.11 / FastAPI** | Intermediate | Isolated FastAPI Sandbox (`python test_main.py`) |
| `flask-inventory-api` | **Flask RESTful Inventory & Blueprint** | **Python 3.11 / Flask** | Beginner | Isolated Flask Sandbox (`python test_app.py`) |
| `nextjs-api-cache` | **Next.js 15 Server Actions & API Cache** | **Next.js 15 App Router** | Intermediate | Isolated Next.js Sandbox (`node test_actions.js`) |
| `python-challenge` | Python String Reversal | Python 3.9 | Beginner | Python Alpine Sandbox |
| `python-data-analyzer` | Data Analyzer Pro (Python Fixes) | Python 3.9 | Intermediate | Python Alpine Sandbox |
| `python-secret-validator` | Secret Code Validator (Regex) | Python 3.9 | Advanced | Python Alpine Sandbox |
| `cpp-array-reversal` | Array Reversal Pointer Bug | C++ | Beginner | GCC 12 Container |
| `cpp-linked-list` | Linked List Sum Fix | C++ | Intermediate | GCC 12 Container |
| `cpp-shape-calculator` | Shape Calculator Polymorphism | C++ | Advanced | GCC 12 Container |
| `java-string-ops` | String Operations Fix | Java | Beginner | Eclipse Temurin 17 JDK |
| `java-grade-calculator` | Grade Calculator Float Cast | Java | Intermediate | Eclipse Temurin 17 JDK |
| `java-bank-account` | Bank Account OOP & Overdraft | Java | Advanced | Eclipse Temurin 17 JDK |
| `acme-corp` | AcmeCorp Landing Page | Vanilla Web | Beginner | Web Live Preview |
| `todo-app` | TaskMaster Pro Logic | Vanilla Web | Intermediate | Web Live Preview |
| `weather-dash` | WeatherDash API Promises | Vanilla Web | Advanced | Web Live Preview |

---

## 💳 Payment Ingestion Microservice (`devtrace-payment-service`)

A realistic microservice challenge designed to assess senior backend engineering competency:
- **Bug 1: IEEE-754 Floating Point Math**: Dollar calculations losing precision.
- **Bug 2: Concurrency & Missing Distributed Lock**: Race conditions and double-charges under high traffic.
- **Bug 3: Unhandled Async Rejections**: Background worker crashing during queue drain.
- **Bug 4: Memory Leak in Rate Limiter**: Unbounded module-level `Map` exhausting pod memory.
- **Bug 5: Missing Transaction Isolation**: Lost updates on concurrent PostgreSQL ledger writes.

To run the payment service challenge:
```bash
cd devtrace-payment-service/devtrace-payment-service
npm install
npm test
```

---

## 📡 REST API Reference

- `POST /api/auth/login` — Candidate authentication
- `POST /api/auth/staff-login` — Administrator & Interviewer authentication
- `GET /api/auth/me` — Resolve active user session
- `POST /api/admin/candidates` — Generate candidate account with assigned challenge
- `GET /api/admin/candidates` — Retrieve all registered candidates
- `POST /api/admin/telemetry` — Ingest session telemetry dump
- `GET /api/admin/telemetry` — Retrieve session telemetry logs
- `POST /api/execute` — Execute code inside framework-isolated sandbox (Django, Python, C++, Java)

## 🎪 Exhibition & Expo Features (v2.4)

DEV-TRACE features a complete **Exhibition Showcase Deck** designed for hackathons, engineering symposiums, and live judging:
1. **Public Exhibition Hub (`/`)**: 1-click launchers for Candidate IDE, Invigilator War Room, and Live Simulation without login friction.
2. **Interactive Anti-Cheat Laboratory**: Hands-on typing playground allowing judges to simulate human typing vs. instant LLM paste bursts.
3. **6-Axis Behavioral Biometrics Radar**: SVG radar chart displaying Keystroke Rhythm, Paste Integrity, Focus Retention, Iterative Testing, Socratic Autonomy, and Stability Velocity.
4. **FAANG-Grade Executive Candidate Dossier**: Printable audit report with hiring recommendations (`STRONG HIRE`, `HIRE`, `LEAN NO`, `INTEGRITY RISK`), complexity matrix, and AI-tailored technical grilling questions.
5. **Live Candidate Simulator**: 1-click injection of live telemetry sessions into `/admin/telemetry` (Scenario A: AI Copypaster caught in real-time; Scenario B: 10x Methodical Architect).

---

## 📊 Benchmark Datasets & Research Directory

For complete documentation on the research datasets, download links, and ML feature extraction scripts used to benchmark DEV-TRACE, see:  
👉 [**docs/DATASETS.md**](file:///c:/Users/BharatBK/Documents/projectss/dev/docs/DATASETS.md)

- **Real-World SWE Benchmarks**: Princeton SWE-bench, Defects4J.
- **AI Code vs. Human Benchmarks**: OpenAI HumanEval, Google MBPP, UC Berkeley APPS, DeepMind CodeContests, HumanEval-X.
- **Code Plagiarism & IDE Telemetry**: PAN SOCO Corpus, ProgSnap2 Standard.
- **Native Dataset**: Local multi-framework incident repositories in [`src/data/db.json`](file:///c:/Users/BharatBK/Documents/projectss/dev/src/data/db.json).

---

## 📄 License
This project is licensed under the MIT License.
