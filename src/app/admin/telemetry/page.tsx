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
} from "lucide-react";
import { REPOSITORIES } from "@/data/brokenRepo";

function TelemetryDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCandidateId = searchParams.get("candidateId") || "";

  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterChallenge, setFilterChallenge] = useState("all");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!data.user || data.user.role !== "admin") {
          router.replace("/login");
        } else {
          setAuthLoading(false);
          fetchTelemetry();
        }
      } catch (err) {
        router.replace("/login");
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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#08090a] text-slate-300">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 animate-spin">
            <Zap size={24} className="text-white" fill="white" />
          </div>
          <span className="text-xs uppercase font-black tracking-widest text-slate-600">
            Fetching Telemetry Repositories...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen w-screen bg-[#08090a] text-slate-300 flex flex-col font-sans overflow-hidden">
      {/* HEADER */}
      <header className="h-16 flex items-center gap-4 px-8 bg-[#0d0e11]/80 backdrop-blur-xl border-b border-white/5 flex-shrink-0 z-40 shadow-2xl">
        <button
          onClick={() => router.push("/admin")}
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors mr-2"
        >
          <ArrowLeft size={16} />
          Dashboard
        </button>

        <div className="h-8 w-px bg-white/5 mx-2" />

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap size={20} className="text-white" fill="white" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-[0.2em] text-white uppercase leading-none mb-1">
              DevTrace
            </h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                Telemetry Log Analyzer
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1" />
        <span className="text-[10px] text-slate-500 bg-white/5 px-3 py-1 rounded-xl border border-white/5 font-bold uppercase tracking-wider">
          Total Logs: {telemetry.length}
        </span>
      </header>

      {/* DASHBOARD GRID */}
      <main className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: LIST */}
        <section className="w-[380px] border-r border-white/5 bg-[#0d0e11]/40 flex flex-col flex-shrink-0 overflow-hidden">
          {/* SEARCH & FILTERS */}
          <div className="p-4 border-b border-white/5 space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search candidate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/[0.02] border border-white/5 hover:border-white/10 focus:border-blue-500/50 rounded-xl text-xs outline-none transition-all placeholder:text-slate-600"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter size={12} className="text-slate-500" />
              <select
                value={filterChallenge}
                onChange={(e) => setFilterChallenge(e.target.value)}
                className="flex-1 bg-[#16181d] border border-white/5 rounded-lg text-[10px] py-1.5 px-2 outline-none text-slate-400 hover:text-white"
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
          <div className="flex-1 overflow-y-auto scrollbar-none p-3 space-y-2">
            {loading ? (
              <div className="text-center py-8 text-xs font-bold text-slate-600 animate-pulse uppercase">
                Loading telemetry...
              </div>
            ) : filteredTelemetry.length === 0 ? (
              <div className="text-center py-12 text-slate-600 text-xs font-medium">
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
                    onClick={() => setSelectedRecord(rec)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-blue-600/10 border-blue-500/30 shadow-lg"
                        : "bg-[#0d0e11]/60 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-white text-xs">{rec.candidateName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{dateStr}</span>
                    </div>
                    
                    <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">{repoName}</p>

                    <div className="flex gap-4 mt-3 pt-2.5 border-t border-white/[0.03] text-[10px] font-mono">
                      <div className="flex items-center gap-1">
                        <Activity size={10} className="text-blue-400" />
                        <span className="text-slate-300">{rec.stability}% Stability</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={10} className="text-slate-500" />
                        <span className="text-slate-400">{fmtDuration(rec.duration)}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: ANALYTICS & TIMELINE */}
        <section className="flex-1 bg-[#090a0c] flex flex-col overflow-hidden">
          {selectedRecord ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* SESSION METRICS SUMMARY BAR */}
              <div className="p-6 bg-[#0d0e11]/40 border-b border-white/5 flex flex-wrap gap-6 items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Candidate Session Analyzed</span>
                  <h2 className="text-xl font-black text-white mt-0.5">{selectedRecord.candidateName}</h2>
                  <p className="text-xs text-slate-400 font-medium">
                    Challenge:{" "}
                    <span className="text-blue-400">
                      {REPOSITORIES.find((r) => r.id === selectedRecord.repoId)?.name ||
                        selectedRecord.repoId}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Stability metric CARD */}
                  <div className="px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-center min-w-[100px]">
                    <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold block">Stability</span>
                    <div className="flex items-center justify-center gap-1 mt-1 text-white font-mono font-bold text-sm">
                      <Activity size={12} className="text-blue-400" />
                      {selectedRecord.stability}%
                    </div>
                  </div>

                  {/* Duration metric CARD */}
                  <div className="px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-center min-w-[100px]">
                    <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold block">Duration</span>
                    <div className="flex items-center justify-center gap-1 mt-1 text-white font-mono font-bold text-sm">
                      <Clock size={12} className="text-slate-400" />
                      {fmtDuration(selectedRecord.duration)}
                    </div>
                  </div>

                  {/* Events metric CARD */}
                  <div className="px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-center min-w-[100px]">
                    <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold block">Key Events</span>
                    <div className="flex items-center justify-center gap-1 mt-1 text-white font-mono font-bold text-sm">
                      <FileCode size={12} className="text-violet-400" />
                      {selectedRecord.events?.length || 0}
                    </div>
                  </div>

                  <button
                    onClick={handleCopyRaw}
                    className="flex items-center gap-1.5 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/5"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    Raw JSON
                  </button>
                </div>
              </div>

              {/* TIMELINE EVENT STREAM */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Code size={14} className="text-slate-500" />
                  <h3 className="text-xs uppercase font-black tracking-widest text-slate-500">Telemetry Event Stream</h3>
                </div>

                <div className="space-y-3">
                  {selectedRecord.events?.map((evt: any, idx: number) => {
                    const timeStr = new Date(evt.ts).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    });

                    // Determine event severity/theme
                    let borderTheme = "border-white/5 bg-[#0d0e11]/20";
                    let textTheme = "text-slate-400";
                    let badge = "bg-white/5 text-slate-400";

                    if (evt.type === "PASTE_DETECTED" || evt.type === "PASTE_EVENT") {
                      borderTheme = "border-amber-500/10 bg-amber-500/[0.02]";
                      textTheme = "text-amber-300";
                      badge = "bg-amber-500/10 text-amber-400";
                    } else if (evt.type === "FOCUS_LOST") {
                      borderTheme = "border-rose-500/10 bg-rose-500/[0.02]";
                      textTheme = "text-rose-300";
                      badge = "bg-rose-500/10 text-rose-400";
                    } else if (evt.type === "EXECUTION_RESULT") {
                      if (evt.meta?.passed) {
                        borderTheme = "border-emerald-500/10 bg-emerald-500/[0.02]";
                        textTheme = "text-emerald-300";
                        badge = "bg-emerald-500/10 text-emerald-400";
                      } else {
                        borderTheme = "border-rose-500/10 bg-rose-500/[0.02]";
                        textTheme = "text-rose-300";
                        badge = "bg-rose-500/10 text-rose-400";
                      }
                    } else if (evt.type === "FILE_SAVE") {
                      borderTheme = "border-blue-500/10 bg-blue-500/[0.02]";
                      textTheme = "text-blue-300";
                      badge = "bg-blue-500/10 text-blue-400";
                    }

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-start justify-between gap-4 transition-all ${borderTheme}`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${badge}`}>
                              {evt.type}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">{timeStr}</span>
                          </div>

                          {/* Event-specific details rendering */}
                          <div className="text-xs">
                            {evt.type === "PASTE_DETECTED" && (
                              <div className="space-y-2">
                                <p className="text-amber-400 font-medium leading-relaxed">
                                  Pasted <span className="font-bold text-white font-mono">{evt.meta.lines_pasted} lines</span> ({evt.meta.chars_pasted} chars) in <span className="font-bold text-white font-mono">{evt.meta.file}</span>:
                                </p>
                                <pre className="p-3 bg-black/40 border border-white/5 rounded-lg text-[10px] font-mono text-amber-200/80 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[150px] scrollbar-thin">
                                  {evt.meta.content}
                                </pre>
                              </div>
                            )}

                            {evt.type === "FOCUS_LOST" && (
                              <p className="text-rose-400 flex items-center gap-1.5">
                                <AlertTriangle size={12} />
                                Candidate navigated away from editor / switched windows. Focus lost on <span className="font-mono text-white font-bold">{evt.meta.file || "editor"}</span>.
                              </p>
                            )}

                            {evt.type === "FOCUS_DURATION" && (
                              <p className="text-slate-400">
                                Navigated away duration: <span className="font-mono text-white">{(evt.meta.duration_ms / 1000).toFixed(2)}s</span>
                              </p>
                            )}

                            {evt.type === "EXECUTION_RESULT" && (
                              <div className="space-y-1.5">
                                <p className={evt.meta.passed ? "text-emerald-400" : "text-rose-400"}>
                                  Execution result: <span className="font-bold">{evt.meta.passed ? "PASSED" : "FAILED"}</span> — {evt.meta.summary}
                                </p>
                              </div>
                            )}

                            {evt.type === "FILE_OPEN" && (
                              <p className="text-slate-400">
                                Opened file <span className="font-mono text-white font-bold">{evt.meta.file}</span>
                              </p>
                            )}

                            {evt.type === "KEYSTROKE_RAW" && (
                              <p className="text-slate-400">
                                Typed in <span className="font-mono text-white">{evt.meta.file}</span> (Length diff: <span className="font-bold text-slate-300">{evt.meta.diff}</span>, Total: {evt.meta.total_length} chars)
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <Activity size={36} className="text-slate-700 mb-3" />
              <h3 className="text-sm font-bold text-slate-500">No Session Selected</h3>
              <p className="text-xs text-slate-600 mt-1 max-w-[280px]">Select a candidate's submission from the sidebar roster to analyze their telemetry logs.</p>
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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#08090a] text-slate-300">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">
            <Zap size={24} className="text-white" fill="white" />
          </div>
          <span className="text-xs uppercase font-black tracking-widest text-slate-600">
            Rendering telemetry dashboard...
          </span>
        </div>
      </div>
    }>
      <TelemetryDashboardContent />
    </Suspense>
  );
}
