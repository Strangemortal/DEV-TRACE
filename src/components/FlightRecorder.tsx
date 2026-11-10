"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  SkipForward,
  SkipBack,
  Clock,
  Activity,
  Flame,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Code2,
  FileText,
  Sparkles,
  Zap,
} from "lucide-react";
import { useThemeStore } from "@/store/themeStore";

export interface FlightRecorderProps {
  events: any[];
  durationSeconds: number;
  candidateName: string;
  repoId: string;
  initialCode?: string;
  activeFileName?: string;
}

export type CognitiveState = "FLOW" | "REFACTOR" | "STUCK" | "RESEARCH";

export interface TimelineSlice {
  timestamp: number; // millisecond offset from session start
  progressPct: number; // 0 to 100
  state: CognitiveState;
  stateLabel: string;
  color: string;
  activeFile: string;
  codeSnapshot: string;
  velocityCpm: number;
  stabilityScore: number;
  eventDescription: string;
  eventType: string;
  isAnomaly: boolean;
}

export default function FlightRecorder({
  events,
  durationSeconds,
  candidateName,
  repoId,
  initialCode = "// Initial Workspace Code\n",
  activeFileName = "main.py",
}: FlightRecorderProps) {
  const { theme } = useThemeStore();
  const isLight = theme === "light";
  const isMidnight = theme === "midnight";

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2); // 1x, 2x, 5x, 10x
  const [currentSliceIndex, setCurrentSliceIndex] = useState(0);

  const animationFrameRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(Date.now());

  // ── 1. PRE-COMPUTE FLIGHT RECORDER SLICES (Cognitive State Machine) ──
  const slices: TimelineSlice[] = useMemo(() => {
    const parseTs = (val: any): number => {
      if (!val) return 0;
      if (typeof val === "number") return val;
      const parsed = new Date(val).getTime();
      return isNaN(parsed) ? 0 : parsed;
    };

    const totalDurationMs = Math.max(10000, (durationSeconds || 180) * 1000);
    const validEvents = (events || [])
      .map((e) => ({
        ...e,
        _ts: parseTs(e.ts),
      }))
      .filter((e) => e._ts > 0)
      .sort((a, b) => a._ts - b._ts);

    const sessionStart = validEvents.length > 0 ? validEvents[0]._ts : Date.now() - totalDurationMs;
    const sessionEnd = validEvents.length > 0 ? validEvents[validEvents.length - 1]._ts : Date.now();
    const actualSpanMs = Math.max(totalDurationMs, sessionEnd - sessionStart);

    // 120 timeline frames across the session duration
    const FRAME_COUNT = 120;
    const frameIntervalMs = actualSpanMs / FRAME_COUNT;
    const computedSlices: TimelineSlice[] = [];

    let currentCode = initialCode;
    let currentStability = 100;
    let currentFile = activeFileName;

    // Track sliding window state
    let rollingVelocity = 0;
    let recentFailedTests = 0;
    let recentRefactorCount = 0;

    for (let i = 0; i < FRAME_COUNT; i++) {
      const frameStartMs = i * frameIntervalMs;
      const frameEndMs = (i + 1) * frameIntervalMs;
      const absStart = sessionStart + frameStartMs;
      const absEnd = sessionStart + frameEndMs;

      // Filter events occurring in this window
      const windowEvents = validEvents.filter(
        (e) => e._ts >= absStart && e._ts < absEnd
      );

      let keystrokes = 0;
      let deletions = 0;
      let pasteAttempts = 0;
      let failedTests = 0;
      let passedTests = 0;
      let isRefactor = false;
      let latestEventDesc = "";
      let latestEventType = "IDLE";
      let hasAnomaly = false;

      for (const ev of windowEvents) {
        latestEventType = ev.type || "EVENT";
        const meta = ev.meta || {};

        if (
          ev.type === "KEYSTROKE_BATCH" ||
          ev.type === "KEYSTROKE_RAW" ||
          ev.type === "KEYSTROKE" ||
          ev.type === "CODE_EDIT"
        ) {
          const added = meta.added || meta.count || 1;
          const deleted = meta.deleted || 0;
          keystrokes += added;
          deletions += deleted;
          if (deleted > 0 && deleted / (added + deleted) > 0.3) {
            isRefactor = true;
          }
          latestEventDesc = `Typing: ${added} added, ${deleted} deleted`;
          if (meta.codeSnapshot) currentCode = meta.codeSnapshot;
        } else if (ev.type === "PASTE_DETECTED" || ev.type === "PASTE_EVENT") {
          pasteAttempts += 1;
          hasAnomaly = true;
          latestEventDesc = `Paste Attempt Blocked by Invigilator (${meta.length || meta.diff || 100} chars)`;
        } else if (ev.type === "TAB_SWITCH" || ev.type === "FOCUS_LOST" || ev.type === "FULLSCREEN_EXIT") {
          hasAnomaly = true;
          latestEventDesc = "Integrity Warning: Window Focus Lost / Tab Switch";
        } else if (
          ev.type === "EXECUTION_RESULT" ||
          ev.type === "TEST_RESULT" ||
          ev.type === "TEST_RUN" ||
          ev.type === "RUN_TESTS"
        ) {
          const isPassed = meta.passed === true || meta.status === "pass";
          if (!isPassed && meta.passed !== undefined) {
            failedTests += 1;
            latestEventDesc = `Test Assertion Failed: ${meta.summary || meta.error || "Regression"}`;
          } else {
            passedTests += 1;
            latestEventDesc = `Unit Tests Passed (Green): ${meta.summary || "All assertions OK"}`;
          }
        } else if (ev.type === "FILE_SWITCH" || ev.type === "FILE_OPEN") {
          currentFile = meta.file || meta.fileName || currentFile;
          latestEventDesc = `Switched to file: ${currentFile}`;
        } else if (ev.type === "AI_CODE_SUGGESTION_INSERTED") {
          isRefactor = true;
          latestEventDesc = `AI Copilot Snippet Injected (${meta.trapType || "Audit Vector"})`;
        } else if (ev.type === "AI_TRAP_NEUTRALIZED") {
          isRefactor = true;
          latestEventDesc = `AI Trap Audited & Fixed (${meta.trapType || "Boundary Check"})`;
        }
      }

      // Update rolling stats
      if (failedTests > 0) recentFailedTests = 3;
      else if (recentFailedTests > 0) recentFailedTests--;

      if (isRefactor || (deletions > 0 && deletions / Math.max(1, keystrokes + deletions) > 0.25)) {
        recentRefactorCount = 3;
      } else if (recentRefactorCount > 0) recentRefactorCount--;

      const windowMinutes = Math.max(0.01, frameIntervalMs / 60000);
      const instantCpm = Math.round(keystrokes / windowMinutes);
      rollingVelocity = Math.round(rollingVelocity * 0.6 + instantCpm * 0.4);

      // Stability degradation
      currentStability = Math.max(
        10,
        Math.min(100, currentStability - pasteAttempts * 10 - (hasAnomaly ? 5 : 0) - failedTests * 8)
      );

      // ── COGNITIVE STATE CLASSIFICATION ENGINE ──
      let state: CognitiveState = "RESEARCH";
      let stateLabel = "Research & Architectural Orientation";
      let color = "#818cf8"; // Indigo

      // If test failed or anomaly detected -> FRICTION / STUCK
      if (failedTests > 0 || recentFailedTests > 0 || hasAnomaly) {
        state = "STUCK";
        stateLabel = failedTests > 0 ? "Cognitive Friction: Debugging Test Regression" : "Cognitive Friction: Integrity Anomaly";
        color = "#f43f5e"; // Rose
      }
      // If deletions and refactoring -> REFACTOR
      else if (isRefactor || recentRefactorCount > 0 || (deletions > 0 && deletions / Math.max(1, keystrokes + deletions) > 0.25)) {
        state = "REFACTOR";
        stateLabel = "Iterative Code Refactoring & Restructuring";
        color = "#f59e0b"; // Amber
      }
      // If typing velocity active or test passed -> FLOW
      else if (rollingVelocity >= 35 || keystrokes >= 3 || passedTests > 0) {
        state = "FLOW";
        stateLabel = "Flow State: Active Implementation";
        color = "#10b981"; // Emerald
      }
      // Default to RESEARCH / PLANNING
      else {
        state = "RESEARCH";
        stateLabel = i < 15 ? "Specification Review & Requirements Planning" : "Cognitive Pause / Logic Analysis";
        color = "#818cf8"; // Indigo
      }

      if (!latestEventDesc) {
        latestEventDesc =
          state === "FLOW"
            ? `Active coding (${rollingVelocity} CPM)`
            : state === "REFACTOR"
            ? "Refactoring & pruning code structures"
            : state === "STUCK"
            ? "Debugging runtime error"
            : "Reviewing code & requirements";
      }

      computedSlices.push({
        timestamp: frameStartMs,
        progressPct: (i / (FRAME_COUNT - 1)) * 100,
        state,
        stateLabel,
        color,
        activeFile: currentFile,
        codeSnapshot: currentCode,
        velocityCpm: rollingVelocity,
        stabilityScore: currentStability,
        eventDescription: latestEventDesc,
        eventType: latestEventType,
        isAnomaly: hasAnomaly || failedTests > 0,
      });
    }

    return computedSlices;
  }, [events, durationSeconds, initialCode, activeFileName]);

  const currentSlice = slices[currentSliceIndex] || slices[0];

  // ── 2. PLAYBACK TICK HANDLER ──
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    lastTickTimeRef.current = Date.now();

    const loop = () => {
      const now = Date.now();
      const delta = now - lastTickTimeRef.current;
      const tickThreshold = 1000 / (15 * playbackSpeed);

      if (delta >= tickThreshold) {
        lastTickTimeRef.current = now;
        setCurrentSliceIndex((prev) => {
          if (prev >= slices.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, playbackSpeed, slices.length]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const resetPlayback = () => {
    setIsPlaying(false);
    setCurrentSliceIndex(0);
  };

  const jumpToAnomaly = () => {
    const nextAnomalyIdx = slices.findIndex(
      (s, idx) => idx > currentSliceIndex && s.isAnomaly
    );
    if (nextAnomalyIdx !== -1) {
      setCurrentSliceIndex(nextAnomalyIdx);
    } else {
      // Wrap around
      const firstAnomaly = slices.findIndex((s) => s.isAnomaly);
      if (firstAnomaly !== -1) setCurrentSliceIndex(firstAnomaly);
    }
  };

  const fmtTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div
      className={`flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
        isLight
          ? "bg-white border-slate-200 text-slate-800"
          : isMidnight
          ? "bg-[#0b0f19] border-indigo-500/30 text-slate-100"
          : "bg-[#0d1017] border-[#252a36] text-slate-100"
      }`}
    >
      {/* ── HEADER HUD ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 md:px-6 border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Flame size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold tracking-tight">Interactive Flight Recorder</h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                60s Vector Playback
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Candidate: <span className="text-slate-200 font-semibold">{candidateName}</span> • Challenge:{" "}
              <span className="font-mono text-sky-400">{repoId}</span>
            </p>
          </div>
        </div>

        {/* Live Gauges */}
        <div className="flex items-center gap-3">
          {/* Cognitive State Pill */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold backdrop-blur"
            style={{
              borderColor: `${currentSlice.color}40`,
              backgroundColor: `${currentSlice.color}15`,
              color: currentSlice.color,
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-ping"
              style={{ backgroundColor: currentSlice.color }}
            />
            <span>{currentSlice.stateLabel}</span>
          </div>

          {/* Typing Speed Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/30 border border-white/5 text-xs font-mono text-slate-300">
            <Zap size={13} className="text-amber-400" />
            <span>{currentSlice.velocityCpm} CPM</span>
          </div>

          {/* Stability Gauge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/30 border border-white/5 text-xs font-mono text-slate-300">
            <Activity size={13} className="text-emerald-400" />
            <span>{currentSlice.stabilityScore}% Stability</span>
          </div>
        </div>
      </div>

      {/* ── COGNITIVE HEATMAP TIMELINE TRACK ── */}
      <div className="p-4 md:px-6 space-y-2 bg-black/10 border-b border-white/5">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-sky-400" />
            <span className="text-slate-200 font-bold">{fmtTime(currentSlice.timestamp)}</span>
            <span>/ {fmtTime(durationSeconds * 1000)}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Flow
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Refactor
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Friction/Error
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400" /> Research
            </span>
          </div>
        </div>

        {/* Heatmap Bar */}
        <div className="relative h-7 w-full rounded-lg bg-slate-900 border border-white/10 overflow-hidden cursor-pointer select-none">
          {/* Slices representation */}
          <div className="absolute inset-0 flex">
            {slices.map((slice, idx) => (
              <div
                key={idx}
                onClick={() => setCurrentSliceIndex(idx)}
                className="flex-1 h-full transition-opacity hover:opacity-100 opacity-80 relative group"
                style={{ backgroundColor: slice.color }}
                title={`${slice.stateLabel} at ${fmtTime(slice.timestamp)}`}
              >
                {slice.isAnomaly && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </div>
            ))}
          </div>

          {/* Interactive Playhead Needle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl z-20 pointer-events-none transition-all duration-75"
            style={{ left: `${currentSlice.progressPct}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-md border-2 border-blue-600" />
          </div>
        </div>

        {/* Current Event Description */}
        <div className="flex items-center justify-between text-[11px] pt-1">
          <span className="text-slate-400 flex items-center gap-1.5 truncate">
            <FileText size={12} className="text-blue-400 flex-shrink-0" />
            <span className="font-mono text-slate-200">{currentSlice.activeFile}</span>
            <span className="opacity-50">•</span>
            <span className="text-slate-300 italic">{currentSlice.eventDescription}</span>
          </span>
          {currentSlice.isAnomaly && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              <AlertTriangle size={11} /> Flagged Anomaly
            </span>
          )}
        </div>
      </div>

      {/* ── CODE REPLAY VIEWPORT ── */}
      <div className="relative flex-1 min-h-[220px] max-h-[360px] overflow-y-auto p-4 font-mono text-xs bg-[#070a10] text-slate-200">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-[11px] text-slate-500">
          <span>Active Editor Replay: {currentSlice.activeFile}</span>
          <span>Syntax Engine: Ready</span>
        </div>
        <pre className="whitespace-pre-wrap leading-relaxed select-none">
          <code>
            {currentSlice.codeSnapshot ||
              `# Live snapshot at ${fmtTime(currentSlice.timestamp)}\n# Candidate was working in ${currentSlice.activeFile}\n\ndef solution():\n    # In-progress implementation`}
          </code>
        </pre>
      </div>

      {/* ── PLAYBACK CONTROLS BAR ── */}
      <div className="p-3 md:px-6 flex items-center justify-between border-t border-white/5 bg-black/30">
        <div className="flex items-center gap-2">
          {/* Reset */}
          <button
            onClick={resetPlayback}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Rewind to Start"
          >
            <RotateCcw size={15} />
          </button>

          {/* Step Back */}
          <button
            onClick={() => setCurrentSliceIndex((prev) => Math.max(0, prev - 5))}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Step Back 5s"
          >
            <SkipBack size={15} />
          </button>

          {/* Play / Pause Primary Button */}
          <button
            onClick={togglePlay}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95"
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            <span>{isPlaying ? "Pause" : "Play Flight"}</span>
          </button>

          {/* Step Forward */}
          <button
            onClick={() => setCurrentSliceIndex((prev) => Math.min(slices.length - 1, prev + 5))}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Step Forward 5s"
          >
            <SkipForward size={15} />
          </button>

          {/* Jump to Anomaly */}
          <button
            onClick={jumpToAnomaly}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-all"
            title="Jump to Next Security Anomaly"
          >
            <AlertTriangle size={13} />
            <span>Next Anomaly</span>
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/5 text-xs font-mono">
          {[1, 2, 5, 10].map((spd) => (
            <button
              key={spd}
              onClick={() => setPlaybackSpeed(spd)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                playbackSpeed === spd
                  ? "bg-blue-600 text-white font-bold shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
