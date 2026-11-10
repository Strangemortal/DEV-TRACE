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
    const totalDurationMs = Math.max(1000, durationSeconds * 1000);
    const sortedEvents = [...events].sort((a, b) => (a.ts || 0) - (b.ts || 0));
    const sessionStart = sortedEvents[0]?.ts || Date.now() - totalDurationMs;

    // We interpolate ~120 timeline frames across the session duration
    const FRAME_COUNT = 120;
    const frameIntervalMs = totalDurationMs / FRAME_COUNT;
    const computedSlices: TimelineSlice[] = [];

    let currentCode = initialCode;
    let currentStability = 100;
    let currentFile = activeFileName;

    for (let i = 0; i < FRAME_COUNT; i++) {
      const frameStartMs = i * frameIntervalMs;
      const frameEndMs = (i + 1) * frameIntervalMs;
      const absStart = sessionStart + frameStartMs;
      const absEnd = sessionStart + frameEndMs;

      // Filter events occurring in this window
      const windowEvents = sortedEvents.filter(
        (e) => (e.ts || 0) >= absStart && (e.ts || 0) < absEnd
      );

      // Track deletions vs insertions
      let keystrokes = 0;
      let deletions = 0;
      let pasteAttempts = 0;
      let failedTests = 0;
      let latestEventDesc = "Editor Active";
      let latestEventType = "IDLE";
      let hasAnomaly = false;

      for (const ev of windowEvents) {
        latestEventType = ev.type || "EVENT";
        if (ev.type === "KEYSTROKE") {
          keystrokes += 1;
          latestEventDesc = `Typing: '${ev.meta?.char || "code"}'`;
        } else if (ev.type === "PASTE_DETECTED" || ev.type === "PASTE_EVENT") {
          pasteAttempts += 1;
          hasAnomaly = true;
          latestEventDesc = "Paste Attempt Blocked by Invigilator";
        } else if (ev.type === "TAB_SWITCH" || ev.type === "FOCUS_LOST") {
          hasAnomaly = true;
          latestEventDesc = "Integrity Warning: Window Focus Lost";
        } else if (ev.type === "EXECUTION_RESULT") {
          if (!ev.meta?.passed) {
            failedTests += 1;
            latestEventDesc = "Test Execution Failed";
          } else {
            latestEventDesc = "Unit Tests Passed (Green)";
          }
        } else if (ev.type === "FILE_SWITCH") {
          currentFile = ev.meta?.file || currentFile;
          latestEventDesc = `Switched to file: ${currentFile}`;
        }
      }

      // Stability degradation based on anomalies
      currentStability = Math.max(10, currentStability - pasteAttempts * 8 - (hasAnomaly ? 4 : 0));

      // Calculate Keystroke Velocity (chars per min)
      const windowMinutes = frameIntervalMs / 60000;
      const velocityCpm = Math.round(keystrokes / Math.max(0.05, windowMinutes));
      const deletionRatio = keystrokes > 0 ? deletions / keystrokes : 0;

      // Cognitive State Machine Classification
      let state: CognitiveState = "FLOW";
      let stateLabel = "Flow State (Active Implementation)";
      let color = "#10b981"; // Emerald

      if (windowEvents.length === 0 && i > 0) {
        state = "RESEARCH";
        stateLabel = "Cognitive Pause / Planning / Reading Docs";
        color = "#818cf8"; // Indigo
      } else if (failedTests > 0 || hasAnomaly) {
        state = "STUCK";
        stateLabel = "Cognitive Friction / Debugging Error";
        color = "#f43f5e"; // Rose
      } else if (deletionRatio > 0.3 || latestEventDesc.includes("Refactor")) {
        state = "REFACTOR";
        stateLabel = "Iterative Code Refactoring";
        color = "#f59e0b"; // Amber
      } else if (velocityCpm >= 80) {
        state = "FLOW";
        stateLabel = "High-Velocity Flow State";
        color = "#10b981"; // Emerald
      } else {
        state = "RESEARCH";
        stateLabel = "Deliberate Code Construction";
        color = "#38bdf8"; // Sky Blue
      }

      computedSlices.push({
        timestamp: frameStartMs,
        progressPct: (i / (FRAME_COUNT - 1)) * 100,
        state,
        stateLabel,
        color,
        activeFile: currentFile,
        codeSnapshot: currentCode,
        velocityCpm,
        stabilityScore: currentStability,
        eventDescription: latestEventDesc,
        eventType: latestEventType,
        isAnomaly: hasAnomaly,
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
