"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Zap,
  ArrowLeft,
  Clock,
  Activity,
  Trophy,
  Copy,
  Check,
  Search,
  Filter,
  FileCode,
  AlertTriangle,
  Clipboard,
  ExternalLink,
  Code,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  TrendingUp,
  Bot,
  UserCheck,
  RefreshCw,
  Lightbulb,
} from "lucide-react";
import { REPOSITORIES } from "@/data/brokenRepo";
import { useThemeStore } from "@/store/themeStore";
import ThemeToggle from "@/components/ThemeToggle";

function TelemetryDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCandidateId = searchParams.get("candidateId") || "";

  const { theme } = useThemeStore();
  const isLight = theme === "light";
  const isMidnight = theme === "midnight";

  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [userRole, setUserRole] = useState<"admin" | "interviewer" | null>(null);
  
  // View Mode: timeline vs AI Evaluation
  const [viewMode, setViewMode] = useState<"timeline" | "ai-evaluation">("timeline");
  const [aiEvaluation, setAiEvaluation] = useState<any>(null);
  const [aiEvaluating, setAiEvaluating] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterChallenge, setFilterChallenge] = useState("all");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!data.user) {
          router.replace("/login/staff");
        } else if (data.user.role === "candidate") {
          router.replace("/ide");
        } else if (data.user.role === "admin" || data.user.role === "interviewer") {
          setUserRole(data.user.role);
          setAuthLoading(false);
          fetchTelemetry();
        } else {
          router.replace("/login/staff");
        }
      } catch (err) {
        router.replace("/login/staff");
      }
    }
    checkAuth();
  }, [router]);

  async function fetchTelemetry() {
    try {
      const res = await fetch("/api/admin/telemetry");
      const data = await res.json();
      if (res.ok) {
        const list = data.telemetry || [];
        // Sort telemetry: newest submissions first
        list.sort((a: any, b: any) => b.submittedAt - a.submittedAt);
        setTelemetry(list);
        
        // Auto select if candidateId passed
        if (initialCandidateId) {
          const matched = list.find((t: any) => t.candidateId === initialCandidateId);
          if (matched) {
            setSelectedRecord(matched);
          } else if (list.length > 0) {
            setSelectedRecord(list[0]);
          }
        } else if (list.length > 0) {
          setSelectedRecord(list[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load telemetry:", error);
    } finally {
      setLoading(false);
    }
  }

  const fmtDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) {
      return `${h}h ${m}m ${sec}s`;
    }
    return `${m}m ${sec}s`;
  };

  const handleCopyRaw = () => {
    if (!selectedRecord) return;
    navigator.clipboard.writeText(JSON.stringify(selectedRecord, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchAiEvaluation = async (record: any) => {
    if (!record) return;
    setAiEvaluating(true);
    try {
      const res = await fetch("/api/ai/evaluate-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: record.candidateId,
          candidateName: record.candidateName,
          repoId: record.repoId,
          durationSeconds: record.duration,
          stabilityScore: record.stability,
          events: record.events || [],
        }),
      });
      const data = await res.json();
      if (data.success && data.evaluation) {
        setAiEvaluation(data.evaluation);
      }
    } catch (e) {
      console.error("Failed to generate AI evaluation:", e);
    } finally {
      setAiEvaluating(false);
    }
  };

  // Filter telemetry list
  const filteredTelemetry = telemetry.filter((t) => {
    const matchesSearch =
      t.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.repoId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChallenge = filterChallenge === "all" || t.repoId === filterChallenge;
    return matchesSearch && matchesChallenge;
  });

  if (authLoading) {
    return (
      <div className={`h-screen w-screen flex flex-col items-center justify-center transition-colors ${
        isLight ? "bg-slate-50 text-slate-700" : isMidnight ? "bg-[#0b0f19] text-slate-200" : "bg-[#08090a] text-slate-300"
      }`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 animate-spin">
            <Zap size={24} className="text-white" fill="white" />
          </div>
          <span className="text-xs uppercase font-bold tracking-wider opacity-70">
            Fetching Telemetry Logs...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen h-screen w-screen flex flex-col font-sans overflow-hidden transition-colors ${
      isLight ? "bg-slate-100 text-slate-800" : isMidnight ? "bg-[#0b0f19] text-slate-200" : "bg-[#08090a] text-slate-300"
    }`}>
      {/* HEADER */}
      <header className={`min-h-[60px] h-16 flex items-center gap-4 px-6 border-b flex-shrink-0 z-40 transition-colors ${
        isLight ? "bg-white border-slate-200 shadow-sm" : isMidnight ? "bg-[#111827] border-[#1f293d]" : "bg-[#0d0e11] border-white/5 shadow-2xl"
      }`}>
        <button
          onClick={() => router.push(userRole === "interviewer" ? "/interviewer" : "/admin")}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors ${
            isLight ? "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100" : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
          }`}
        >
          <ArrowLeft size={14} />
          <span>Dashboard</span>
        </button>

        <div className={`h-6 w-px ${isLight ? "bg-slate-200" : "bg-white/10"}`} />

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center shadow-sm">
            <Zap size={18} className="text-white" fill="white" />
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-wider uppercase leading-none">
              DevTrace
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-[10px] font-medium opacity-70 uppercase tracking-tight">
                Telemetry Log Analyzer
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <span className={`text-xs px-3 py-1 rounded-md border font-semibold ${
            isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-white/5 border-white/10 text-slate-300"
          }`}>
            Total Logs: {telemetry.length}
          </span>

          <ThemeToggle />
        </div>
      </header>

      {/* DASHBOARD GRID */}
      <main className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: LIST */}
        <section className={`w-[340px] md:w-[380px] border-r flex flex-col flex-shrink-0 overflow-hidden transition-colors ${
          isLight ? "bg-white border-slate-200" : isMidnight ? "bg-[#0f1422] border-[#1f293d]" : "bg-[#0d0e11]/80 border-white/5"
        }`}>
          {/* SEARCH & FILTERS */}
          <div className={`p-3.5 border-b space-y-2.5 ${isLight ? "border-slate-200 bg-slate-50/50" : "border-white/5"}`}>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                type="text"
                placeholder="Search candidate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 border rounded-md text-xs outline-none transition-all ${
                  isLight
                    ? "bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-blue-500"
                    : "bg-black/30 border-white/10 text-slate-200 placeholder:text-slate-600 focus:border-blue-500/50"
                }`}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter size={12} className="opacity-50" />
              <select
                value={filterChallenge}
                onChange={(e) => setFilterChallenge(e.target.value)}
                className={`flex-1 border rounded-md text-xs py-1.5 px-2 outline-none transition-colors ${
                  isLight
                    ? "bg-white border-slate-300 text-slate-800"
                    : "bg-[#16181d] border-white/10 text-slate-300 hover:text-white"
                }`}
              >
                <option value="all">All Challenges</option>
                {REPOSITORIES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* LIST BOX */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
            {loading ? (
              <div className="text-center py-8 text-xs font-semibold opacity-60 animate-pulse uppercase">
                Loading telemetry...
              </div>
            ) : filteredTelemetry.length === 0 ? (
              <div className="text-center py-12 opacity-60 text-xs font-medium">
                No telemetry logs found.
              </div>
            ) : (
              filteredTelemetry.map((rec) => {
                const isSelected = selectedRecord?.id === rec.id;
                const repoName =
                  REPOSITORIES.find((r) => r.id === rec.repoId)?.name || rec.repoId;
                const dateStr = new Date(rec.submittedAt).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <button
                    key={rec.id}
                    onClick={() => {
                      setSelectedRecord(rec);
                      setAiEvaluation(null);
                      if (viewMode === "ai-evaluation") {
                        fetchAiEvaluation(rec);
                      }
                    }}
                    className={`w-full text-left p-3.5 rounded-md border transition-all ${
                      isSelected
                        ? isLight
                          ? "bg-blue-50 border-blue-400 shadow-sm"
                          : "bg-blue-600/15 border-blue-500/40 shadow-md"
                        : isLight
                        ? "bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700"
                        : "bg-black/20 hover:bg-white/5 border-white/5 text-slate-300"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`font-bold text-xs ${isSelected && isLight ? "text-blue-700" : isLight ? "text-slate-900" : "text-white"}`}>
                        {rec.candidateName}
                      </span>
                      <span className="text-[10px] opacity-60 font-mono">{dateStr}</span>
                    </div>
                    
                    <p className="text-xs opacity-75 mt-1 font-medium truncate">{repoName}</p>

                    <div className={`flex gap-4 mt-2.5 pt-2 border-t text-[11px] font-mono ${isLight ? "border-slate-200" : "border-white/5"}`}>
                      <div className="flex items-center gap-1">
                        <Activity size={12} className="text-blue-500" />
                        <span>{rec.stability}% Stability</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="opacity-60" />
                        <span>{fmtDuration(rec.duration)}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: ANALYTICS & TIMELINE */}
        <section className={`flex-1 flex flex-col overflow-hidden transition-colors ${
          isLight ? "bg-white" : isMidnight ? "bg-[#0b0f19]" : "bg-[#090a0c]"
        }`}>
          {selectedRecord ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* SESSION METRICS SUMMARY BAR */}
              <div className={`p-5 border-b flex flex-wrap gap-4 items-center justify-between transition-colors ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-[#0d0e11]/50 border-white/5"
              }`}>
                <div>
                  <span className="text-[10px] uppercase tracking-wider opacity-60 font-bold">Candidate Session Analyzed</span>
                  <h2 className={`text-lg md:text-xl font-bold mt-0.5 ${isLight ? "text-slate-900" : "text-white"}`}>
                    {selectedRecord.candidateName}
                  </h2>
                  <p className="text-xs opacity-75 font-medium mt-0.5">
                    Challenge:{" "}
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      {REPOSITORIES.find((r) => r.id === selectedRecord.repoId)?.name ||
                        selectedRecord.repoId}
                    </span>
                  </p>
                </div>

                <div className="flex items-center flex-wrap gap-2.5">
                  {/* View Mode Toggle Buttons */}
                  <div className={`flex rounded-md border p-1 gap-1 ${isLight ? "bg-slate-200/70 border-slate-300" : "bg-black/40 border-white/10"}`}>
                    <button
                      onClick={() => setViewMode("timeline")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                        viewMode === "timeline"
                          ? "bg-blue-600 text-white shadow-sm font-bold"
                          : isLight ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Code size={13} />
                      <span>Event Stream</span>
                    </button>
                    <button
                      onClick={() => {
                        setViewMode("ai-evaluation");
                        if (!aiEvaluation) fetchAiEvaluation(selectedRecord);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                        viewMode === "ai-evaluation"
                          ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm font-bold"
                          : isLight ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Sparkles size={13} className="text-amber-400" />
                      <span>AI Assessment Report</span>
                    </button>
                  </div>

                  <button
                    onClick={handleCopyRaw}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all border ${
                      isLight ? "bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-sm" : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                    }`}
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    <span>Raw JSON</span>
                  </button>
                </div>
              </div>

              {/* VIEW 1: TIMELINE EVENT STREAM */}
              {viewMode === "timeline" ? (
                <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 scrollbar-thin">
                  <div className="flex items-center gap-2 mb-2">
                    <Code size={14} className="opacity-60" />
                    <h3 className="text-xs uppercase font-bold tracking-wider opacity-70">Telemetry Event Stream</h3>
                  </div>

                  <div className="space-y-2.5">
                    {selectedRecord.events?.map((evt: any, idx: number) => {
                      const timeStr = new Date(evt.ts).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      });

                      let borderTheme = isLight ? "border-slate-200 bg-slate-50" : "border-white/5 bg-[#0d0e11]/20";
                      let textTheme = isLight ? "text-slate-700" : "text-slate-300";
                      let badge = isLight ? "bg-slate-200 text-slate-700" : "bg-white/10 text-slate-300";

                      if (evt.type === "PASTE_DETECTED" || evt.type === "PASTE_EVENT") {
                        borderTheme = isLight ? "border-amber-300 bg-amber-50/60" : "border-amber-500/20 bg-amber-500/5";
                        textTheme = isLight ? "text-amber-800" : "text-amber-300";
                        badge = isLight ? "bg-amber-200 text-amber-900" : "bg-amber-500/20 text-amber-300";
                      } else if (evt.type === "FOCUS_LOST") {
                        borderTheme = isLight ? "border-rose-300 bg-rose-50/60" : "border-rose-500/20 bg-rose-500/5";
                        textTheme = isLight ? "text-rose-800" : "text-rose-300";
                        badge = isLight ? "bg-rose-200 text-rose-900" : "bg-rose-500/20 text-rose-300";
                      } else if (evt.type === "EXECUTION_RESULT") {
                        if (evt.meta?.passed) {
                          borderTheme = isLight ? "border-emerald-300 bg-emerald-50/60" : "border-emerald-500/20 bg-emerald-500/5";
                          textTheme = isLight ? "text-emerald-800" : "text-emerald-300";
                          badge = isLight ? "bg-emerald-200 text-emerald-900" : "bg-emerald-500/20 text-emerald-300";
                        } else {
                          borderTheme = isLight ? "border-rose-300 bg-rose-50/60" : "border-rose-500/20 bg-rose-500/5";
                          textTheme = isLight ? "text-rose-800" : "text-rose-300";
                          badge = isLight ? "bg-rose-200 text-rose-900" : "bg-rose-500/20 text-rose-300";
                        }
                      } else if (evt.type === "FILE_SAVE") {
                        borderTheme = isLight ? "border-blue-300 bg-blue-50/60" : "border-blue-500/20 bg-blue-500/5";
                        textTheme = isLight ? "text-blue-800" : "text-blue-300";
                        badge = isLight ? "bg-blue-200 text-blue-900" : "bg-blue-500/20 text-blue-300";
                      } else if (evt.type === "AI_HINT_REQUESTED") {
                        borderTheme = isLight ? "border-indigo-300 bg-indigo-50/60" : "border-indigo-500/20 bg-indigo-500/5";
                        textTheme = isLight ? "text-indigo-800" : "text-indigo-300";
                        badge = isLight ? "bg-indigo-200 text-indigo-900" : "bg-indigo-500/20 text-indigo-300";
                      }

                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-md border ${borderTheme} transition-all flex items-start gap-3`}
                        >
                          <div className="flex flex-col items-center flex-shrink-0">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${badge}`}>
                              {evt.type}
                            </span>
                            <span className="text-[10px] font-mono opacity-60 mt-1">{timeStr}</span>
                          </div>

                          <div className="flex-1 font-mono text-xs overflow-hidden">
                            {evt.meta ? (
                              <pre className={`text-xs whitespace-pre-wrap ${textTheme}`}>
                                {JSON.stringify(evt.meta, null, 2)}
                              </pre>
                            ) : (
                              <span className="opacity-50 text-xs italic">No metadata logged for event.</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* VIEW 2: AI CANDIDATE EVALUATION & INTEGRITY REPORT */
                <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 scrollbar-thin">
                  {aiEvaluating ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
                      <div className="w-12 h-12 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center animate-pulse">
                        <Sparkles size={24} className="text-indigo-500 animate-spin" />
                      </div>
                      <h3 className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Synthesizing AI Evaluation Report</h3>
                      <p className="text-xs opacity-70 max-w-sm">
                        Analyzing keystroke cadence, paste bursts, code stability, and solving patterns...
                      </p>
                    </div>
                  ) : aiEvaluation ? (
                    <div className="space-y-5 animate-in fade-in duration-200">
                      {/* Top Metric Cards Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        {/* Overall Score */}
                        <div className={`p-4 rounded-md border ${isLight ? "bg-slate-50 border-slate-200" : "bg-black/20 border-white/10"}`}>
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Overall Score</span>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className={`text-2xl font-black ${isLight ? "text-slate-900" : "text-white"}`}>{aiEvaluation.overallScore}</span>
                            <span className="text-xs opacity-50">/ 100</span>
                          </div>
                          <div className={`mt-2 h-1.5 w-full rounded-full overflow-hidden ${isLight ? "bg-slate-200" : "bg-white/10"}`}>
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${aiEvaluation.overallScore}%` }} />
                          </div>
                        </div>

                        {/* Proficiency Tier */}
                        <div className={`p-4 rounded-md border ${isLight ? "bg-slate-50 border-slate-200" : "bg-black/20 border-white/10"}`}>
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Proficiency Tier</span>
                          <div className="flex items-center gap-2 mt-2">
                            <UserCheck size={18} className="text-indigo-500" />
                            <span className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{aiEvaluation.proficiencyTier}</span>
                          </div>
                        </div>

                        {/* Behavioral Integrity */}
                        <div className={`p-4 rounded-md border ${isLight ? "bg-slate-50 border-slate-200" : "bg-black/20 border-white/10"}`}>
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Behavioral Integrity</span>
                          <div className="flex items-center gap-2 mt-2">
                            <ShieldCheck size={18} className={aiEvaluation.integrityScore > 75 ? "text-emerald-500" : "text-amber-500"} />
                            <span className={`text-xs font-bold ${aiEvaluation.integrityScore > 75 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {aiEvaluation.integrityClassification}
                            </span>
                          </div>
                        </div>

                        {/* Code Quality & Complexity */}
                        <div className={`p-4 rounded-md border ${isLight ? "bg-slate-50 border-slate-200" : "bg-black/20 border-white/10"}`}>
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Code Quality</span>
                          <div className="flex items-center justify-between mt-2 text-xs">
                            <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{aiEvaluation.codeQualityRating}</span>
                            <span className="font-mono text-[11px] opacity-70">{aiEvaluation.timeComplexity}</span>
                          </div>
                        </div>
                      </div>

                      {/* Behavioral Summary Card */}
                      <div className={`p-4 md:p-5 rounded-md border ${
                        isLight ? "bg-indigo-50/60 border-indigo-200 text-indigo-950" : "bg-indigo-950/20 border-indigo-500/20 text-slate-200"
                      }`}>
                        <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                          <Bot size={16} />
                          <span>AI Executive Evaluation Summary</span>
                        </div>
                        <p className="text-sm leading-relaxed">{aiEvaluation.behavioralSummary}</p>
                      </div>

                      {/* Strengths & Growth Areas */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`p-4 md:p-5 rounded-md border space-y-2.5 ${isLight ? "bg-slate-50 border-slate-200" : "bg-black/20 border-white/10"}`}>
                          <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Check size={14} /> Identified Strengths
                          </h4>
                          <ul className="space-y-1.5 text-xs opacity-90 list-disc pl-4">
                            {aiEvaluation.strengths?.map((s: string, idx: number) => (
                              <li key={idx}>{s}</li>
                            ))}
                          </ul>
                        </div>

                        <div className={`p-4 md:p-5 rounded-md border space-y-2.5 ${isLight ? "bg-slate-50 border-slate-200" : "bg-black/20 border-white/10"}`}>
                          <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Lightbulb size={14} /> Evaluation Growth Areas
                          </h4>
                          <ul className="space-y-1.5 text-xs opacity-90 list-disc pl-4">
                            {aiEvaluation.growthAreas?.map((g: string, idx: number) => (
                              <li key={idx}>{g}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Tailored Interview Follow-up Questions */}
                      <div className={`p-4 md:p-5 rounded-md border space-y-3.5 ${isLight ? "bg-slate-50 border-slate-200" : "bg-black/20 border-white/10"}`}>
                        <div className="flex items-center justify-between">
                          <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}>
                            <HelpCircle size={15} className="text-blue-500" />
                            <span>Recommended Technical Interview Questions</span>
                          </h4>
                          <span className="text-[10px] opacity-60 font-medium">Auto-generated for interviewer</span>
                        </div>

                        <div className="space-y-2.5">
                          {aiEvaluation.interviewQuestions?.map((q: any, idx: number) => (
                            <div key={idx} className={`p-3.5 rounded-md border space-y-1.5 ${isLight ? "bg-white border-slate-200" : "bg-black/20 border-white/5"}`}>
                              <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                Q{idx + 1}: {q.question}
                              </div>
                              <p className="text-xs opacity-75">
                                <span className="font-semibold">Why ask: </span>{q.reason}
                              </p>
                              {q.expectedAnswerHint && (
                                <p className={`text-xs font-mono p-2 rounded-md border ${
                                  isLight ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                                }`}>
                                  <span className="font-bold">Target Answer: </span>{q.expectedAnswerHint}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Anomaly Timeline (if any flagged) */}
                      {aiEvaluation.anomalyEvents?.length > 0 && (
                        <div className={`p-4 md:p-5 rounded-md border space-y-3 ${
                          isLight ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-rose-950/20 border-rose-500/20 text-slate-200"
                        }`}>
                          <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-2">
                            <AlertTriangle size={15} />
                            <span>Flagged Anomaly Timeline</span>
                          </h4>
                          <div className="space-y-2">
                            {aiEvaluation.anomalyEvents.map((a: any, idx: number) => (
                              <div key={idx} className={`flex items-center justify-between text-xs p-2.5 rounded-md border ${
                                isLight ? "bg-white border-rose-200 text-rose-800" : "bg-black/30 border-rose-500/20 text-rose-300"
                              }`}>
                                <span className="font-semibold">{a.type} — {a.note}</span>
                                <span className="text-[10px] font-mono opacity-70">{a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : "Flagged"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-xs opacity-60">
                      Click the AI Assessment tab to run deep telemetry inference on this candidate.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <Activity size={36} className="opacity-40 mb-3" />
              <h3 className="text-sm font-bold opacity-70">No Session Selected</h3>
              <p className="text-xs opacity-50 mt-1 max-w-[280px]">Select a candidate's submission from the sidebar roster to analyze their telemetry logs.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function TelemetryDashboard() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-slate-300">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">
            <Zap size={24} className="text-white" fill="white" />
          </div>
          <span className="text-xs uppercase font-bold tracking-wider opacity-60">
            Rendering telemetry dashboard...
          </span>
        </div>
      </div>
    }>
      <TelemetryDashboardContent />
    </Suspense>
  );
}
