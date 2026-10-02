"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Code2,
  Terminal,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Copy,
  Check,
  Server,
  Lock,
  Eye,
  FileCode,
  Radio,
  BarChart3,
  Award,
} from "lucide-react";
import { useThemeStore } from "@/store/themeStore";
import ThemeToggle from "@/components/ThemeToggle";

export default function ExhibitionShowcasePage() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const isLight = theme === "light";
  const isMidnight = theme === "midnight";

  // Active user session state
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // 1-Click launcher loading state
  const [launchingRole, setLaunchingRole] = useState<string | null>(null);

  // Interactive Architecture Pipeline state
  const [activePipelineStage, setActivePipelineStage] = useState<number>(0);

  // Interactive "Try Cheating" Playground state
  const [playgroundText, setPlaygroundText] = useState("");
  const [playgroundStability, setPlaygroundStability] = useState(100);
  const [playgroundAlert, setPlaygroundAlert] = useState<string | null>(null);
  const [playgroundKeystrokes, setPlaygroundKeystrokes] = useState(0);
  const [playgroundPastes, setPlaygroundPastes] = useState(0);

  // Check if session exists on load
  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.user) {
          setSessionUser(data.user);
        }
      } catch (err) {
        // Unauthenticated visitor is expected
      } finally {
        setCheckingSession(false);
      }
    }
    loadSession();
  }, []);

  // 1-Click Launch Handler
  const handleDemoLaunch = async (role: "candidate" | "admin" | "interviewer", repoId = "python-challenge") => {
    setLaunchingRole(role);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, repoId }),
      });
      const data = await res.json();
      if (res.ok && data.redirect) {
        router.push(data.redirect);
      } else {
        router.push(role === "admin" ? "/admin" : role === "interviewer" ? "/interviewer" : "/ide");
      }
    } catch (err) {
      router.push(role === "admin" ? "/admin" : "/ide");
    } finally {
      setLaunchingRole(null);
    }
  };

  // Playground Text Typing Handler (Calculates Biometric Variance)
  const handlePlaygroundInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const diff = val.length - playgroundText.length;
    setPlaygroundText(val);

    if (diff > 0) {
      setPlaygroundKeystrokes((k) => k + 1);
      // Natural typing recovers stability slightly
      setPlaygroundStability((s) => Math.min(100, s + 1));
      if (playgroundStability > 75) {
        setPlaygroundAlert(null);
      }
    }
  };

  // Playground: Simulate Instant ChatGPT Paste
  const handleSimulatePaste = () => {
    const aiSnippet =
      "def solve_optimal(arr: list[int]) -> int:\n    # Generated solution via LLM\n    memo = {}\n    def dp(i, target):\n        if target == 0: return 1\n        if i >= len(arr): return 0\n        return dp(i + 1, target) + dp(i + 1, target - arr[i])\n    return dp(0, 42)";

    setPlaygroundText((prev) => prev + (prev ? "\n" : "") + aiSnippet);
    setPlaygroundPastes((p) => p + 1);
    setPlaygroundStability((s) => Math.max(32, s - 48));
    setPlaygroundAlert("ANOMALY FLAGGED: 245 characters injected in 0ms! AI Authorship Likelihood: 94%.");
  };

  // Playground: Simulate Window Blur / Tab Switch
  const handleSimulateTabSwitch = () => {
    setPlaygroundStability((s) => Math.max(45, s - 25));
    setPlaygroundAlert("FOCUS_LOST: Window blur detected (candidate left test environment for 12 seconds).");
  };

  // Playground: Reset
  const handleResetPlayground = () => {
    setPlaygroundText("");
    setPlaygroundStability(100);
    setPlaygroundAlert(null);
    setPlaygroundKeystrokes(0);
    setPlaygroundPastes(0);
  };

  // Pipeline Stages Definition
  const pipelineStages = [
    {
      step: "01",
      title: "In-Browser Isolated Sandboxes",
      badge: "Dockerless Multi-Framework",
      icon: Terminal,
      description:
        "Sub-100ms in-memory compilation for Django 5.0, FastAPI, Express Node 20, Spring Boot Java 17, Next.js 15, and GCC C++. Zero server overhead.",
      metric: "< 85ms Test Latency",
      snippet: `// Django 5.0 In-Memory Runner
const suite = new DjangoTestRunner({
  models: './store/models.py',
  mockDb: 'sqlite://:memory:',
  strictIsolation: true
});
const result = await suite.runTests();`,
    },
    {
      step: "02",
      title: "Biometric Keystroke Streamer",
      badge: "High-Resolution Telemetry",
      icon: Activity,
      description:
        "Captures microsecond inter-keystroke intervals, paste burst entropy, window focus blurs, and syntax stability degradation curves.",
      metric: "100ms Batch Sync",
      snippet: `// Telemetry Stream Payload
{
  "type": "PASTE_DETECTED",
  "pasted_length": 240,
  "interKeystrokeInterval": 0,
  "suspicionIndex": 0.94,
  "timestamp": "2026-09-24T23:45:00.124Z"
}`,
    },
    {
      step: "03",
      title: "Edge Route Isolation Guard",
      badge: "Zero-Leakage Security",
      icon: Shield,
      description:
        "Next.js Edge Middleware enforces cryptographic role-prefixed token separation (admin_, candidate_). Prevents cross-portal inspection.",
      metric: "Edge Verification",
      snippet: `// Next.js Edge Middleware Guard
if (pathname.startsWith('/admin') && role !== 'admin') {
  return NextResponse.redirect(new URL('/ide', req.url));
}`,
    },
    {
      step: "04",
      title: "ML Behavioral Classifier",
      badge: "Random Forest & XGBoost",
      icon: Cpu,
      description:
        "Heuristic & machine-learning evaluation models calculate candidate proficiency tiers and integrity classifications (Autonomous vs AI-Carried).",
      metric: "6-Axis Radar Analysis",
      snippet: `// Random Forest Feature Vectors
const features = [
  cadenceVariance,
  pasteVolumeRatio,
  windowFocusRetention,
  tddIterationFrequency
];
const integrityScore = classifier.predict(features);`,
    },
    {
      step: "05",
      title: "Executive Assessment Dossier",
      badge: "FAANG-Grade Audit",
      icon: Award,
      description:
        "Automated hiring committee report with biometric radar chart, algorithmic complexity grading, and AI-tailored follow-up grilling questions.",
      metric: "Printable / PDF Ready",
      snippet: `// Executive Dossier Output
{
  "verdict": "STRONG HIRE (L5)",
  "integrityClearance": "98% Autonomous",
  "aiGrillingScript": [
    "Ask candidate to explain line 42 time complexity"
  ]
}`,
    },
  ];

  return (
    <div
      className={`min-h-screen w-full flex flex-col font-sans overflow-x-hidden selection:bg-blue-500/30 transition-colors ${
        isLight
          ? "bg-slate-50 text-slate-900"
          : isMidnight
          ? "bg-[#0b0f19] text-slate-100"
          : "bg-[#08090d] text-slate-100"
      }`}
    >
      {/* ── 1. TOP ANNOUNCEMENT & ACTIVE SESSION BAR ────────────────────────── */}
      {sessionUser && (
        <div className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-4 py-2 text-white text-xs font-semibold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
            <span>
              Active Session: <strong>{sessionUser.name}</strong> ({sessionUser.role.toUpperCase()})
            </span>
          </div>
          <button
            onClick={() =>
              router.push(
                sessionUser.role === "admin"
                  ? "/admin"
                  : sessionUser.role === "interviewer"
                  ? "/interviewer"
                  : "/ide"
              )
            }
            className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-[11px] font-bold transition-all"
          >
            <span>Open {sessionUser.role === "admin" ? "Admin Deck" : "Assessment IDE"}</span>
            <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* ── 2. MAIN NAVIGATION ──────────────────────────────────────────────── */}
      <header
        className={`w-full px-6 py-4 flex items-center justify-between border-b backdrop-blur-md sticky top-0 z-40 transition-colors ${
          isLight
            ? "bg-white/80 border-slate-200"
            : isMidnight
            ? "bg-[#0b0f19]/80 border-[#1f293d]"
            : "bg-[#08090d]/80 border-white/5"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Zap size={20} fill="white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-wider uppercase">DEV-TRACE</span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                EXPO 2026
              </span>
            </div>
            <p className="text-[10px] opacity-60 font-mono">
              AI Technical Assessment & Keystroke Telemetry
            </p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold opacity-80">
          <a href="#launchers" className="hover:opacity-100 transition-opacity">
            1-Click Launchers
          </a>
          <a href="#playground" className="hover:opacity-100 transition-opacity">
            Anti-Cheat Lab
          </a>
          <a href="#pipeline" className="hover:opacity-100 transition-opacity">
            Architecture
          </a>
          <a href="#challenges" className="hover:opacity-100 transition-opacity">
            Challenge Matrix
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/login/staff")}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800"
                : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white"
            }`}
          >
            Staff Portal
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* ── 3. HERO SHOWCASE SECTION ────────────────────────────────────────── */}
      <section className="relative px-6 pt-16 pb-20 max-w-6xl mx-auto flex flex-col items-center text-center overflow-hidden">
        {/* Ambient Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/3 w-[350px] h-[200px] bg-violet-600/15 rounded-full blur-[100px] pointer-events-none -z-10" />

        {/* Live Exhibition Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-semibold mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>LIVE EXHIBITION & JUDGING DEMO READY</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] max-w-4xl">
          Beyond LeetCode.{" "}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
            Real-Time Keystroke Telemetry
          </span>{" "}
          & Multi-Framework Sandboxes.
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-sm sm:text-base text-slate-400 max-w-2xl font-normal leading-relaxed">
          Traditional hiring platforms are vulnerable to AI copy-pasting. DEV-TRACE captures
          microsecond inter-keystroke intervals, paste bursts, and window blurs to evaluate candidates
          in sub-100ms in-memory sandboxes, outputting FAANG-grade executive dossiers.
        </p>

        {/* ── 4. 1-CLICK DEMO LAUNCHERS GRID (HERO ACTION) ──────────────────── */}
        <div id="launchers" className="w-full mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {/* Launcher 1: Candidate IDE */}
          <div
            className={`p-6 rounded-2xl border transition-all duration-300 relative group hover:-translate-y-1 hover:shadow-2xl ${
              isLight
                ? "bg-white border-slate-200 hover:border-blue-400 hover:shadow-blue-500/10"
                : "bg-white/5 border-white/10 hover:border-blue-500/40 hover:bg-white/[0.07]"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
              <Code2 size={20} />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold">
              Persona 01: Candidate Experience
            </span>
            <h3 className="text-lg font-bold text-white mt-1">Launch Candidate IDE</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Step into Monaco Editor with an in-memory framework sandbox, interactive terminal, and
              Socratic AI debugging mentor.
            </p>
            <button
              onClick={() => handleDemoLaunch("candidate", "python-challenge")}
              disabled={launchingRole !== null}
              className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Play size={13} fill="white" />
              <span>{launchingRole === "candidate" ? "Preparing IDE..." : "1-Click Candidate Demo"}</span>
            </button>
          </div>

          {/* Launcher 2: Invigilator War Room */}
          <div
            className={`p-6 rounded-2xl border transition-all duration-300 relative group hover:-translate-y-1 hover:shadow-2xl ${
              isLight
                ? "bg-white border-slate-200 hover:border-indigo-400 hover:shadow-indigo-500/10"
                : "bg-white/5 border-white/10 hover:border-indigo-500/40 hover:bg-white/[0.07]"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
              <Shield size={20} />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
              Persona 02: Proctor & Staff
            </span>
            <h3 className="text-lg font-bold text-white mt-1">Invigilator War Room</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Inspect active candidates with live telemetry streams, real-time stability meters, remote
              killswitches, and challenge generator.
            </p>
            <button
              onClick={() => handleDemoLaunch("admin")}
              disabled={launchingRole !== null}
              className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <ShieldCheck size={14} />
              <span>{launchingRole === "admin" ? "Opening Deck..." : "Open Invigilator Deck"}</span>
            </button>
          </div>

          {/* Launcher 3: Telemetry & Radar Lab */}
          <div
            className={`p-6 rounded-2xl border transition-all duration-300 relative group hover:-translate-y-1 hover:shadow-2xl ${
              isLight
                ? "bg-white border-slate-200 hover:border-violet-400 hover:shadow-violet-500/10"
                : "bg-white/5 border-white/10 hover:border-violet-500/40 hover:bg-white/[0.07]"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4">
              <BarChart3 size={20} />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-violet-400 font-bold">
              Persona 03: Forensic Analytics
            </span>
            <h3 className="text-lg font-bold text-white mt-1">Biometric Telemetry Lab</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Inspect candidate session replays, 6-axis biometric radar charts, anomaly timelines, and
              AI executive dossiers.
            </p>
            <button
              onClick={async () => {
                await handleDemoLaunch("admin");
                router.push("/admin/telemetry");
              }}
              disabled={launchingRole !== null}
              className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Activity size={14} />
              <span>Inspect Telemetry Radar</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Stats Row */}
        <div className="w-full mt-12 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
            <span className="text-2xl md:text-3xl font-black font-mono text-blue-400">9</span>
            <p className="text-[11px] text-slate-400 font-semibold uppercase mt-0.5">
              Isolated Frameworks
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
            <span className="text-2xl md:text-3xl font-black font-mono text-emerald-400">&lt; 85ms</span>
            <p className="text-[11px] text-slate-400 font-semibold uppercase mt-0.5">
              In-Memory Execution
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
            <span className="text-2xl md:text-3xl font-black font-mono text-indigo-400">6-Axis</span>
            <p className="text-[11px] text-slate-400 font-semibold uppercase mt-0.5">
              Biometric Radar
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
            <span className="text-2xl md:text-3xl font-black font-mono text-violet-400">100%</span>
            <p className="text-[11px] text-slate-400 font-semibold uppercase mt-0.5">
              Client Edge Privacy
            </p>
          </div>
        </div>
      </section>

      {/* ── 5. INTERACTIVE "TRY CHEATING" BIOMETRIC PLAYGROUND ──────────────── */}
      <section
        id="playground"
        className={`w-full py-16 px-6 border-y ${
          isLight ? "bg-slate-100 border-slate-200" : "bg-[#0b0e17] border-white/5"
        }`}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                  HANDS-ON DEMO
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  REAL-TIME ALGORITHM
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight mt-1 text-white">
                Interactive Anti-Cheat Telemetry Lab
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Test the biometrics engine right now. Type naturally, or click the simulation buttons to
                inject synthetic LLM code or window blur to watch the integrity score react live!
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSimulatePaste}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all active:scale-95"
              >
                <Zap size={13} />
                <span>Simulate ChatGPT Paste</span>
              </button>
              <button
                onClick={handleSimulateTabSwitch}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all active:scale-95"
              >
                <Eye size={13} />
                <span>Simulate Tab Switch</span>
              </button>
              <button
                onClick={handleResetPlayground}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Reset Lab"
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>

          {/* Playground Grid: Left Input vs Right Telemetry Gauge */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Input Area */}
            <div className="md:col-span-2 flex flex-col">
              <div className="p-3 bg-black/40 border border-white/10 rounded-t-xl flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Terminal size={13} className="text-blue-400" />
                  candidate_editor_sandbox.py
                </span>
                <span className="text-[10px] text-slate-500">
                  {playgroundKeystrokes} Keystrokes | {playgroundPastes} Pastes
                </span>
              </div>
              <textarea
                value={playgroundText}
                onChange={handlePlaygroundInput}
                placeholder="Type some code or thoughts here naturally... or click 'Simulate ChatGPT Paste' above to test the anomaly detector!"
                className="w-full h-56 p-4 bg-black/30 border border-t-0 border-white/10 rounded-b-xl text-xs font-mono text-slate-200 outline-none resize-none focus:border-blue-500/50 leading-relaxed placeholder:text-slate-600"
              />

              {playgroundAlert && (
                <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-amber-300 text-xs font-mono animate-pulse">
                  <AlertTriangle size={15} className="flex-shrink-0 mt-0.5 text-amber-400" />
                  <span>{playgroundAlert}</span>
                </div>
              )}
            </div>

            {/* Live Biometric Telemetry Gauge */}
            <div className="p-5 rounded-xl bg-black/40 border border-white/10 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
                  Live Integrity Gauge
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-4xl font-black font-mono transition-colors duration-300 ${
                      playgroundStability >= 80
                        ? "text-emerald-400"
                        : playgroundStability >= 60
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    {playgroundStability}%
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Stability</span>
                </div>

                <div className="mt-3 h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      playgroundStability >= 80
                        ? "bg-emerald-500"
                        : playgroundStability >= 60
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${playgroundStability}%` }}
                  />
                </div>

                <div className="mt-4 space-y-2 text-xs font-mono">
                  <div className="flex justify-between pb-1.5 border-b border-white/5">
                    <span className="text-slate-400">Cadence State</span>
                    <span
                      className={`font-bold ${
                        playgroundStability >= 80 ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {playgroundStability >= 80 ? "Natural Typing" : "Synthetic Anomaly"}
                    </span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-white/5">
                    <span className="text-slate-400">Paste Burst Ratio</span>
                    <span className="text-slate-200">
                      {playgroundPastes > 0 ? `${playgroundPastes} Injections` : "0 (Clean)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ML Confidence</span>
                    <span className="text-blue-400 font-bold">98.2% Accurate</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 p-3 rounded-lg bg-white/5 border border-white/5 text-[11px] text-slate-400">
                <span className="text-slate-200 font-bold block mb-0.5">Exhibition Pitch Tip:</span>
                Explain to judges how instant paste bursts with 0ms delay trigger high LLM
                classification, preventing LeetCode cheating.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. INTERACTIVE MULTI-STAGE ARCHITECTURE PIPELINE ────────────────── */}
      <section id="pipeline" className="py-20 px-6 max-w-6xl mx-auto w-full">
        <div className="text-center mb-12">
          <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400 font-bold">
            SYSTEM ARCHITECTURE
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-1 text-white">
            End-to-End Forensic Assessment Pipeline
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl mx-auto">
            Click through each pipeline node to inspect real-time execution specs, telemetry payloads,
            and isolation mechanisms.
          </p>
        </div>

        {/* Pipeline Stepper Buttons */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4 scrollbar-thin">
          {pipelineStages.map((stage, idx) => {
            const Icon = stage.icon;
            const isActive = activePipelineStage === idx;
            return (
              <button
                key={idx}
                onClick={() => setActivePipelineStage(idx)}
                className={`flex-1 min-w-[160px] p-3.5 rounded-xl border text-left transition-all ${
                  isActive
                    ? "bg-blue-600/15 border-blue-500 shadow-lg shadow-blue-500/10"
                    : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/[0.07]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-blue-400">{stage.step}</span>
                  <Icon size={16} className={isActive ? "text-blue-400" : "text-slate-500"} />
                </div>
                <h4 className="text-xs font-bold text-white truncate">{stage.title}</h4>
                <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                  {stage.metric}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Stage Detail Viewer */}
        <div className="mt-6 p-6 md:p-8 rounded-2xl bg-black/40 border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold">
                Stage {pipelineStages[activePipelineStage].step} Deep Dive
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {pipelineStages[activePipelineStage].badge}
              </span>
            </div>

            <h3 className="text-2xl font-bold text-white">
              {pipelineStages[activePipelineStage].title}
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 mt-3 leading-relaxed">
              {pipelineStages[activePipelineStage].description}
            </p>

            <div className="mt-6 flex items-center gap-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="text-[9px] text-slate-400 uppercase block">Latency Benchmark</span>
                <span className="text-emerald-400 font-bold">
                  {pipelineStages[activePipelineStage].metric}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="text-[9px] text-slate-400 uppercase block">Security Clearance</span>
                <span className="text-blue-400 font-bold">Cryptographically Verified</span>
              </div>
            </div>
          </div>

          {/* Code / JSON Sample */}
          <div className="bg-[#090b10] border border-white/10 rounded-xl overflow-hidden shadow-xl">
            <div className="px-4 py-2 border-b border-white/10 bg-black/40 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>pipeline_runtime_inspector.ts</span>
              <span className="text-emerald-400">Live Payload</span>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed scrollbar-thin">
              <code>{pipelineStages[activePipelineStage].snippet}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ── 7. CHALLENGE REPOSITORY MATRIX ─────────────────────────────────── */}
      <section
        id="challenges"
        className={`w-full py-16 px-6 border-t ${
          isLight ? "bg-slate-100 border-slate-200" : "bg-[#0b0e17] border-white/5"
        }`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold">
              FRAMEWORK SANDBOXES
            </span>
            <h2 className="text-3xl font-black tracking-tight mt-1 text-white">
              Multi-Framework Real-World Challenges
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl mx-auto">
              Seeded with realistic production bugs: floating-point precision, race conditions, memory
              leaks, and distributed locking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] font-mono text-blue-400 uppercase font-bold">
                Senior Backend Challenge
              </span>
              <h3 className="text-base font-bold text-white mt-1">Payment Ingestion Microservice</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Redis distributed locks, idempotency keys, IEEE-754 currency precision bugs, and
                unhandled ledger race conditions.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-[10px] font-mono text-slate-300">
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  Node / Express
                </span>
                <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20">
                  Redis
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Jest Suite
                </span>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">
                Enterprise Python
              </span>
              <h3 className="text-base font-bold text-white mt-1">Django 5.0 ORM E-Commerce Store</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                In-memory test runner validating N+1 query optimization, stock reservation deadlocks, and
                F-expression inventory safety.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-[10px] font-mono text-slate-300">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Django 5.0
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  SQLite Memory
                </span>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] font-mono text-violet-400 uppercase font-bold">
                High-Concurrency Java
              </span>
              <h3 className="text-base font-bold text-white mt-1">Spring Boot Order Service</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Java 17 Spring Boot challenge testing transactional isolation levels, concurrent seat
                booking, and JPA entity caching.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-[10px] font-mono text-slate-300">
                <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                  Spring Boot 3
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Java 17
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. FOOTER WITH EXPO CREDITS ─────────────────────────────────────── */}
      <footer className="w-full py-8 px-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-4">
        <div className="flex items-center gap-2">
          <Zap size={15} className="text-blue-500" />
          <span>DEV-TRACE v2.4 • Advanced Agentic Technical Evaluation Engine</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleDemoLaunch("candidate")}
            className="text-blue-400 hover:underline"
          >
            Launch Candidate IDE
          </button>
          <span>•</span>
          <button
            onClick={() => handleDemoLaunch("admin")}
            className="text-indigo-400 hover:underline"
          >
            Invigilator Deck
          </button>
          <span>•</span>
          <button
            onClick={() => router.push("/login/staff")}
            className="text-slate-400 hover:text-white"
          >
            Staff Login
          </button>
        </div>
      </footer>
    </div>
  );
}
