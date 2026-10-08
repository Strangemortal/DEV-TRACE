/**
 * DEV-TRACE EXHIBITION SHOWCASE — INTERACTIVE CLIENT ENGINE
 * Handles live backend ping, 1-click launchers, anti-cheat playground,
 * and 6-axis biometric radar canvas rendering.
 */

// Configuration: Default port for main DevTrace Next.js server
let DEVTRACE_URL = "http://localhost:3000";

// Check query param for custom engine URL (e.g., ?engine=http://192.168.1.5:3000)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("engine")) {
  DEVTRACE_URL = urlParams.get("engine");
}

/* ==========================================================================
   1. Live Backend Engine Health Check
   ========================================================================== */
async function checkEngineHealth() {
  const statusPill = document.getElementById("engineStatusPill");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    // Ping the main DevTrace auth endpoint
    const res = await fetch(`${DEVTRACE_URL}/api/auth/me`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok || res.status === 200 || res.status === 401) {
      statusDot.className = "status-dot online";
      statusText.textContent = "DevTrace Engine: Online (:3000)";
      statusPill.title = `Connected to DevTrace core at ${DEVTRACE_URL}`;
      return true;
    } else {
      throw new Error("HTTP " + res.status);
    }
  } catch (err) {
    statusDot.className = "status-dot";
    statusText.textContent = "DevTrace Engine: Standby";
    statusPill.title = `Start 'npm run dev' on port 3000 to enable live test runners`;
    return false;
  }
}

// Initial health check + periodic poll every 8 seconds
checkEngineHealth();
setInterval(checkEngineHealth, 8000);

/* ==========================================================================
   2. 1-Click Interactive Demo Launchers
   ========================================================================== */
function launchDemo(role, repoId = "python-challenge") {
  const targetUrl = `${DEVTRACE_URL}/api/auth/demo?role=${role}&repoId=${repoId}`;
  window.open(targetUrl, "_blank");
}

function openPortal(path) {
  window.open(`${DEVTRACE_URL}${path}`, "_blank");
}

/* ==========================================================================
   3. Interactive Anti-Cheat & Telemetry Playground
   ========================================================================== */
const playgroundState = {
  text: "",
  keystrokes: 0,
  pastes: 0,
  stability: 100,
  tabSwitches: 0,
  fullscreenExits: 0,
  events: [],
  startTime: null,
};

const textarea = document.getElementById("playgroundInput");
const keystrokeCountEl = document.getElementById("keystrokeCount");
const wpmCountEl = document.getElementById("wpmCount");
const stabilityScoreEl = document.getElementById("stabilityScore");
const stabilityBarFill = document.getElementById("stabilityBarFill");
const stabilityBadge = document.getElementById("stabilityBadge");
const eventFeed = document.getElementById("eventFeed");

function updatePlaygroundUI() {
  keystrokeCountEl.textContent = `${playgroundState.keystrokes} Keys`;

  // Approximate WPM
  if (playgroundState.startTime) {
    const elapsedMinutes = (Date.now() - playgroundState.startTime) / 60000;
    const words = playgroundState.text.trim().split(/\s+/).filter(Boolean).length;
    const wpm = elapsedMinutes > 0 ? Math.round(words / elapsedMinutes) : 0;
    wpmCountEl.textContent = `${Math.min(wpm, 180)} WPM`;
  }

  // Stability Score Gauge
  const score = Math.max(10, Math.min(100, playgroundState.stability));
  stabilityScoreEl.textContent = `${score}%`;
  stabilityBarFill.style.width = `${score}%`;

  if (score >= 80) {
    stabilityScoreEl.style.color = "var(--accent-emerald)";
    stabilityBarFill.style.backgroundColor = "var(--accent-emerald)";
    stabilityBadge.textContent = "AUTONOMOUS (SAFE)";
    stabilityBadge.style.background = "rgba(16, 185, 129, 0.15)";
    stabilityBadge.style.color = "#34d399";
  } else if (score >= 55) {
    stabilityScoreEl.style.color = "var(--accent-amber)";
    stabilityBarFill.style.backgroundColor = "var(--accent-amber)";
    stabilityBadge.textContent = "SUSPICIOUS ANOMALY";
    stabilityBadge.style.background = "rgba(245, 158, 11, 0.15)";
    stabilityBadge.style.color = "#fbbf24";
  } else {
    stabilityScoreEl.style.color = "var(--accent-rose)";
    stabilityBarFill.style.backgroundColor = "var(--accent-rose)";
    stabilityBadge.textContent = "INTEGRITY BREACH";
    stabilityBadge.style.background = "rgba(244, 63, 94, 0.18)";
    stabilityBadge.style.color = "#fda4af";
  }
}

function logPlaygroundEvent(type, meta = {}, isAlert = false) {
  const ts = new Date().toLocaleTimeString();
  const event = { type, ts, meta, isAlert };
  playgroundState.events.unshift(event);

  const entry = document.createElement("div");
  entry.className = `event-entry ${isAlert ? "alert" : ""}`;
  entry.innerHTML = `
    <span><strong>[${ts}]</strong> ${type} ${meta.msg ? `— ${meta.msg}` : ""}</span>
    <span>${meta.val || ""}</span>
  `;

  if (eventFeed.firstChild) {
    eventFeed.insertBefore(entry, eventFeed.firstChild);
  } else {
    eventFeed.appendChild(entry);
  }

  // Cap feed size
  if (eventFeed.children.length > 25) {
    eventFeed.removeChild(eventFeed.lastChild);
  }
}

// Typing listener
if (textarea) {
  textarea.addEventListener("input", (e) => {
    if (!playgroundState.startTime) {
      playgroundState.startTime = Date.now();
    }

    const newLen = textarea.value.length;
    const oldLen = playgroundState.text.length;
    const diff = newLen - oldLen;
    playgroundState.text = textarea.value;

    if (diff > 0) {
      playgroundState.keystrokes += diff;
      // Natural typing recovers stability slightly
      playgroundState.stability = Math.min(100, playgroundState.stability + 0.5);

      if (playgroundState.keystrokes % 10 === 0) {
        logPlaygroundEvent("KEYSTROKE_BATCH", { msg: `Synced 10 characters`, val: `+${diff}` });
      }
    }
    updatePlaygroundUI();
  });
}

// Action: Simulate ChatGPT Paste Injection
function simulateAiPaste() {
  const aiSnippet = `def optimal_idempotency_handler(tx_id: str, amount_cents: int) -> dict:\n    # Generated solution via LLM\n    acquired = redis.set(f"lock:{tx_id}", "held", nx=True, ex=30)\n    if not acquired: return {"status": "CONFLICT", "code": 409}\n    ledger.update_balance(amount_cents)\n    return {"status": "SETTLED"}`;

  textarea.value += (textarea.value ? "\n\n" : "") + aiSnippet;
  playgroundState.text = textarea.value;
  playgroundState.pastes += 1;
  playgroundState.stability = Math.max(22, playgroundState.stability - 45);

  logPlaygroundEvent("PASTE_DETECTED", { msg: "248 chars injected in 0ms", val: "ANOMALY: 96% AI Likelihood" }, true);
  updatePlaygroundUI();
}

// Action: Simulate Tab Switch
function simulateTabSwitch() {
  playgroundState.tabSwitches += 1;
  playgroundState.stability = Math.max(30, playgroundState.stability - 20);

  logPlaygroundEvent("TAB_SWITCH", { msg: `Strike #${playgroundState.tabSwitches} - Focus Lost`, val: "-20% Stability" }, true);
  updatePlaygroundUI();
}

// Action: Simulate Fullscreen Exit
function simulateFullscreenExit() {
  playgroundState.fullscreenExits += 1;
  playgroundState.stability = Math.max(25, playgroundState.stability - 25);

  logPlaygroundEvent("FULLSCREEN_EXIT", { msg: `Strike #${playgroundState.fullscreenExits} - Escaped Fullscreen`, val: "-25% Stability" }, true);
  updatePlaygroundUI();
}

// Action: Reset Playground
function resetPlayground() {
  playgroundState.text = "";
  playgroundState.keystrokes = 0;
  playgroundState.pastes = 0;
  playgroundState.stability = 100;
  playgroundState.tabSwitches = 0;
  playgroundState.fullscreenExits = 0;
  playgroundState.startTime = null;
  textarea.value = "";
  eventFeed.innerHTML = "";
  logPlaygroundEvent("SESSION_RESET", { msg: "Playground restored to clean 100% baseline" });
  updatePlaygroundUI();
}

/* ==========================================================================
   4. Interactive 6-Axis Biometric Radar Chart (HTML5 Canvas)
   ========================================================================== */
const radarAxes = [
  "Typing Cadence",
  "Paste Volume Ratio",
  "TDD Iteration Frequency",
  "Focus Retention",
  "Complexity Quotient",
  "Autonomous Authorship",
];

const archetypes = {
  senior: {
    name: "Senior Autonomous Engineer",
    badge: "98% Autonomous",
    color: "#3b82f6",
    scores: [0.92, 0.98, 0.88, 0.95, 0.9, 0.96],
    desc: "Natural human inter-keystroke cadence (120-180ms), zero sudden code burst insertions, methodical incremental test runs, and continuous editor window retention.",
  },
  ai_carried: {
    name: "AI-Carried Script Ingestion",
    badge: "36% Flagged",
    color: "#f43f5e",
    scores: [0.25, 0.15, 0.3, 0.2, 0.45, 0.18],
    desc: "Severe paste anomalies (200+ characters injected at zero interval), frequent prolonged window focus blurs (tab-switching to external LLMs), and near-zero iteration.",
  },
  junior: {
    name: "Methodical Junior Debugger",
    badge: "84% Autonomous",
    color: "#10b981",
    scores: [0.75, 0.92, 0.94, 0.82, 0.65, 0.86],
    desc: "High edit rate with heavy incremental deletions, continuous test suite assertion checks, zero bulk clipboard pastes, and high window focus stability.",
  },
};

let currentArchetypeKey = "senior";
let currentRadarValues = [...archetypes.senior.scores];
let targetRadarValues = [...archetypes.senior.scores];

function initRadarCanvas() {
  const canvas = document.getElementById("radarCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const size = 360;
  canvas.width = size;
  canvas.height = size;

  function render() {
    ctx.clearRect(0, 0, size, size);
    const center = size / 2;
    const radius = 130;
    const totalAxes = radarAxes.length;

    // Smooth lerp values toward target
    for (let i = 0; i < totalAxes; i++) {
      currentRadarValues[i] += (targetRadarValues[i] - currentRadarValues[i]) * 0.12;
    }

    // 1. Draw Background Concentric Webs (Polygons)
    const levels = 4;
    for (let l = 1; l <= levels; l++) {
      const r = (radius / levels) * l;
      ctx.beginPath();
      for (let i = 0; i < totalAxes; i++) {
        const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 2. Draw Axis Lines & Labels
    for (let i = 0; i < totalAxes; i++) {
      const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);

      // Axis Line
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(x, y);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.stroke();

      // Axis Text Label
      const labelDist = radius + 22;
      const lx = center + labelDist * Math.cos(angle);
      const ly = center + labelDist * Math.sin(angle);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(radarAxes[i], lx, ly);
    }

    // 3. Draw Data Polygon
    const arch = archetypes[currentArchetypeKey];
    ctx.beginPath();
    for (let i = 0; i < totalAxes; i++) {
      const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
      const r = radius * currentRadarValues[i];
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    // Fill
    ctx.fillStyle = arch.color === "#f43f5e" ? "rgba(244, 63, 94, 0.25)" : arch.color === "#10b981" ? "rgba(16, 185, 129, 0.25)" : "rgba(59, 130, 246, 0.25)";
    ctx.fill();

    // Stroke
    ctx.strokeStyle = arch.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw Dots on Vertices
    for (let i = 0; i < totalAxes; i++) {
      const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
      const r = radius * currentRadarValues[i];
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.strokeStyle = arch.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

function selectArchetype(key) {
  currentArchetypeKey = key;
  targetRadarValues = [...archetypes[key].scores];

  // Update UI buttons
  document.querySelectorAll(".archetype-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.archetype === key);
  });

  // Update details text
  const descEl = document.getElementById("archetypeDesc");
  const badgeEl = document.getElementById("archetypeBadge");
  const titleEl = document.getElementById("archetypeName");

  if (descEl) descEl.textContent = archetypes[key].desc;
  if (badgeEl) {
    badgeEl.textContent = archetypes[key].badge;
    badgeEl.style.color = archetypes[key].color;
    badgeEl.style.borderColor = archetypes[key].color;
  }
  if (titleEl) titleEl.textContent = archetypes[key].name;
}

/* ==========================================================================
   5. Interactive 5-Stage Architecture Pipeline
   ========================================================================== */
const pipelineData = [
  {
    step: "01",
    name: "In-Browser Isolated Sandboxes",
    badge: "Dockerless Multi-Framework",
    desc: "Sub-100ms in-memory compilation and test runner for Django 5.0, FastAPI, Express.js Node 20, Spring Boot Java 17, Next.js 15, and GCC C++. All challenges execute in secure isolated sandboxes with zero server container overhead.",
    metric: "< 85ms Test Latency",
    code: `// Multi-Framework In-Memory Test Runner
export async function runSandboxExecution(category, code) {
  switch (category) {
    case 'django':
      return await executeDjangoTestSuite(code);
    case 'express':
      return await runExpressJestSuite(code);
    case 'spring':
      return await runSpringBootJava17Suite(code);
  }
}`,
  },
  {
    step: "02",
    name: "Biometric Keystroke Streamer",
    badge: "Microsecond Telemetry",
    desc: "Continuous high-resolution telemetry engine capturing keystroke cadence, batch inserts, paste burst volume, focus shifts, line diffs, and editor idle intervals with sub-millisecond precision.",
    metric: "100ms Batch Sync",
    code: `// Telemetry Event Streamer
logEvent({
  type: "KEYSTROKE_BATCH",
  meta: {
    addedChars: 18,
    deletedChars: 2,
    interKeystrokeIntervalMs: 142,
    timestamp: new Date().toISOString()
  }
});`,
  },
  {
    step: "03",
    name: "Edge Route Isolation Guard",
    badge: "Cryptographic Role Guard",
    desc: "Server-side Edge Middleware strictly isolates candidate test areas from invigilator control decks. Role-prefixed tokens (candidate_, admin_, interviewer_) prevent URL tampering or token leakage.",
    metric: "Edge Verification",
    code: `// Next.js Edge Middleware Route Guard
export function middleware(req: NextRequest) {
  const token = req.cookies.get('devtrace_session')?.value;
  if (pathname.startsWith('/admin') && !token?.startsWith('admin_')) {
    return NextResponse.redirect(new URL('/ide', req.url));
  }
}`,
  },
  {
    step: "04",
    name: "ML Behavioral Classifier",
    badge: "Random Forest & XGBoost",
    desc: "Random Forest and XGBoost supervised models trained on 4,200+ telemetry vectors classify candidate proficiency and detect AI-carried submissions with 96.4% verified accuracy.",
    metric: "96.4% Model Accuracy",
    code: `// Supervised Telemetry Classifier Vector
const featureVector = [
  cadenceVariance,
  pasteVolumeRatio,
  windowFocusRetention,
  tddIterationFrequency
];
const integrityVerdict = model.predict(featureVector);`,
  },
  {
    step: "05",
    name: "Executive Assessment Dossier",
    badge: "FAANG-Grade Audit",
    desc: "Comprehensive candidate report generated at submission with 6-axis biometric radar graph, algorithmic complexity grading, and AI Socratic grilling questions for technical interviewers.",
    metric: "PDF / Audit Ready",
    code: `// Executive Assessment Dossier Output
{
  "candidateId": "cand_84719",
  "verdict": "STRONG HIRE (L5 Backend)",
  "autonomyScore": 0.98,
  "followUpGrilling": [
    "Explain concurrency lock in line 34 of paymentService.ts"
  ]
}`,
  },
];

function selectPipelineStage(index) {
  const stage = pipelineData[index];
  if (!stage) return;

  document.querySelectorAll(".pipeline-step-btn").forEach((btn, i) => {
    btn.classList.toggle("active", i === index);
  });

  const titleEl = document.getElementById("pipelineTitle");
  const badgeEl = document.getElementById("pipelineBadge");
  const descEl = document.getElementById("pipelineDesc");
  const metricEl = document.getElementById("pipelineMetric");
  const codeEl = document.getElementById("pipelineCode");

  if (titleEl) titleEl.textContent = stage.name;
  if (badgeEl) badgeEl.textContent = stage.badge;
  if (descEl) descEl.textContent = stage.desc;
  if (metricEl) metricEl.textContent = stage.metric;
  if (codeEl) codeEl.textContent = stage.code;
}

/* ==========================================================================
   6. Copy to Clipboard Utility
   ========================================================================== */
function copySnippet(text, btnElement) {
  navigator.clipboard.writeText(text).then(() => {
    const original = btnElement.textContent;
    btnElement.textContent = "Copied!";
    setTimeout(() => {
      btnElement.textContent = original;
    }, 2000);
  });
}

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  initRadarCanvas();
  selectArchetype("senior");
  selectPipelineStage(0);
  updatePlaygroundUI();
});
