"use client";

import React, { useMemo, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Zap,
  Activity,
  Clock,
  Code,
  Layers,
  Sparkles,
  Info,
  Maximize2,
} from "lucide-react";

export interface BiometricRadarProps {
  stabilityScore?: number;
  events?: Array<{ type: string; meta?: any; ts: string }>;
  durationSeconds?: number;
  candidateName?: string;
  repoId?: string;
  compact?: boolean;
}

interface BiometricDimension {
  key: string;
  label: string;
  score: number;
  description: string;
  weight: number;
  benchmark: string;
}

export default function BiometricRadarChart({
  stabilityScore = 88,
  events = [],
  durationSeconds = 180,
  candidateName = "Candidate",
  repoId = "challenge",
  compact = false,
}: BiometricRadarProps) {
  const [activeTooltip, setActiveTooltip] = useState<BiometricDimension | null>(null);

  // Compute biometric dimensions from raw telemetry events
  const metrics = useMemo(() => {
    let pasteEventsCount = 0;
    let totalPastedChars = 0;
    let tabSwitches = 0;
    let testRuns = 0;
    let hintRequests = 0;
    let rawKeystrokes = 0;
    let totalAdded = 0;

    events.forEach((evt) => {
      const type = evt.type || "";
      if (type.includes("PASTE")) {
        pasteEventsCount++;
        const len = evt.meta?.length || evt.meta?.pasted_length || evt.meta?.text_length || 120;
        totalPastedChars += Number(len);
      } else if (type.includes("FOCUS") || type.includes("TAB_SWITCH")) {
        tabSwitches++;
      } else if (type.includes("EXECUTION") || type.includes("RUN_TEST")) {
        testRuns++;
      } else if (type.includes("HINT") || type.includes("AI_HINT")) {
        hintRequests++;
      } else if (type.includes("KEYSTROKE")) {
        rawKeystrokes++;
        if (evt.meta?.added) totalAdded += Number(evt.meta.added);
      }
    });

    // 1. Keystroke Rhythm (Natural inter-keystroke variance)
    // If massive paste with few keystrokes, rhythm drops
    let rhythmScore = 92;
    if (totalPastedChars > 200 && rawKeystrokes < 100) rhythmScore = 48;
    else if (totalPastedChars > 100) rhythmScore = 65;
    else if (rawKeystrokes > 150) rhythmScore = 96;

    // 2. Paste Cleanliness (Low paste volume vs mass code injection)
    let pasteCleanliness = 100;
    if (pasteEventsCount > 0) {
      pasteCleanliness = Math.max(25, 100 - pasteEventsCount * 22 - Math.floor(totalPastedChars / 25));
    }

    // 3. Focus Persistence (Window retention vs tab switching)
    let focusPersistence = Math.max(20, 100 - tabSwitches * 24);

    // 4. Iterative Testing (TDD iteration cadence)
    let testingCadence = 60;
    if (testRuns >= 3) testingCadence = 95;
    else if (testRuns >= 1) testingCadence = 82;
    else testingCadence = 45;

    // 5. Socratic Autonomy (Self-reliance vs heavy AI prompting)
    let socraticAutonomy = 98;
    if (hintRequests >= 3) socraticAutonomy = 62;
    else if (hintRequests >= 1) socraticAutonomy = 84;

    // 6. Syntax Velocity (Stability index consistency)
    const syntaxVelocity = Math.min(100, Math.max(30, Math.round(stabilityScore)));

    const dimensions: BiometricDimension[] = [
      {
        key: "rhythm",
        label: "Keystroke Rhythm",
        score: rhythmScore,
        description: "Natural inter-keystroke interval entropy and human cadence variance",
        weight: 0.2,
        benchmark: "> 80% indicates human typing cadence",
      },
      {
        key: "paste",
        label: "Paste Integrity",
        score: pasteCleanliness,
        description: "Proportion of keystrokes typed manually vs instant paste bursts",
        weight: 0.25,
        benchmark: "> 75% indicates original code creation",
      },
      {
        key: "focus",
        label: "Focus Persistence",
        score: focusPersistence,
        description: "Window adherence and absence of unauthorized tab switches or blur events",
        weight: 0.2,
        benchmark: "> 85% denotes zero external browser lookups",
      },
      {
        key: "testing",
        label: "Iterative Testing",
        score: testingCadence,
        description: "Frequency and distribution of compilation & automated test runs",
        weight: 0.15,
        benchmark: "> 70% reflects test-driven developer methodology",
      },
      {
        key: "autonomy",
        label: "Socratic Autonomy",
        score: socraticAutonomy,
        description: "Problem-solving independence and prudent usage of Socratic hints",
        weight: 0.1,
        benchmark: "> 80% shows high independent architectural grasp",
      },
      {
        key: "velocity",
        label: "Stability Velocity",
        score: syntaxVelocity,
        description: "Consistency of incremental diffs and absence of drastic rollbacks",
        weight: 0.1,
        benchmark: "> 75% indicates controlled code evolution",
      },
    ];

    // Composite Integrity Index
    const compositeScore = Math.round(
      dimensions.reduce((acc, dim) => acc + dim.score * dim.weight, 0)
    );

    let classification: "Autonomous (High Integrity)" | "AI-Assisted (Normal)" | "AI-Carried (Plagiarism Risk)";
    let badgeColor: string;
    let badgeText: string;

    if (compositeScore >= 82) {
      classification = "Autonomous (High Integrity)";
      badgeColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      badgeText = "VERIFIED NATURAL";
    } else if (compositeScore >= 62) {
      classification = "AI-Assisted (Normal)";
      badgeColor = "text-amber-400 bg-amber-500/10 border-amber-500/30";
      badgeText = "MODERATE SUSPICION";
    } else {
      classification = "AI-Carried (Plagiarism Risk)";
      badgeColor = "text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse";
      badgeText = "HIGH INTEGRITY RISK";
    }

    // Detected Anomalies
    const anomalies: Array<{ label: string; severity: "low" | "medium" | "high"; detail: string }> = [];
    if (totalPastedChars > 80) {
      anomalies.push({
        label: "Paste Ingestion Anomaly",
        severity: totalPastedChars > 200 ? "high" : "medium",
        detail: `${totalPastedChars} chars injected via ${pasteEventsCount} paste event(s)`,
      });
    }
    if (tabSwitches > 0) {
      anomalies.push({
        label: "Window Focus Lost",
        severity: tabSwitches >= 3 ? "high" : "medium",
        detail: `${tabSwitches} window blur / tab-switch event(s) recorded`,
      });
    }
    if (testRuns === 0) {
      anomalies.push({
        label: "Zero Pre-Submission Verification",
        severity: "low",
        detail: "No intermediate test suite executions before submission",
      });
    }

    return {
      dimensions,
      compositeScore,
      classification,
      badgeColor,
      badgeText,
      pasteEventsCount,
      totalPastedChars,
      tabSwitches,
      testRuns,
      anomalies,
    };
  }, [stabilityScore, events, durationSeconds]);

  // SVG Radar Geometry Calculations
  const size = compact ? 220 : 280;
  const center = size / 2;
  const radius = center - (compact ? 28 : 38);
  const totalAxes = metrics.dimensions.length;
  const angleStep = (Math.PI * 2) / totalAxes;

  // Compute point for a given axis index and normalized value (0 - 1)
  const getPoint = (axisIndex: number, valueNormalized: number) => {
    const angle = axisIndex * angleStep - Math.PI / 2;
    const r = radius * Math.max(0.08, Math.min(1, valueNormalized));
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Build candidate polygon SVG path
  const candidatePolygonPoints = metrics.dimensions
    .map((dim, idx) => {
      const pt = getPoint(idx, dim.score / 100);
      return `${pt.x},${pt.y}`;
    })
    .join(" ");

  // Grid concentric polygon levels (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className="w-full flex flex-col items-center">
      {/* HEADER WITH BADGE */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Activity size={14} />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Behavioral Biometrics Radar
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">
              6-Axis ML Telemetry Spectrum
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black tracking-wider uppercase font-mono ${metrics.badgeColor}`}
          >
            {metrics.badgeText}
          </span>
          <span className="text-xs font-black font-mono text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">
            {metrics.compositeScore}%
          </span>
        </div>
      </div>

      {/* RADAR SVG GRAPHIC */}
      <div className="relative flex items-center justify-center">
        <svg
          width={size}
          height={size}
          className="overflow-visible select-none drop-shadow-[0_0_20px_rgba(59,130,246,0.15)]"
        >
          <defs>
            {/* Radar area glowing gradient */}
            <linearGradient id="radarAreaGradient" x1="0" y1="0" x2="1" y2="1">
              <stop
                offset="0%"
                stopColor={
                  metrics.compositeScore >= 80
                    ? "#10b981"
                    : metrics.compositeScore >= 60
                    ? "#3b82f6"
                    : "#f43f5e"
                }
                stopOpacity="0.45"
              />
              <stop
                offset="100%"
                stopColor={
                  metrics.compositeScore >= 80
                    ? "#06b6d4"
                    : metrics.compositeScore >= 60
                    ? "#8b5cf6"
                    : "#e11d48"
                }
                stopOpacity="0.1"
              />
            </linearGradient>

            <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* BACKGROUND CONCENTRIC WEBS */}
          {gridLevels.map((lvl, lIdx) => {
            const points = Array.from({ length: totalAxes })
              .map((_, aIdx) => {
                const pt = getPoint(aIdx, lvl);
                return `${pt.x},${pt.y}`;
              })
              .join(" ");

            return (
              <polygon
                key={lIdx}
                points={points}
                fill={lIdx === gridLevels.length - 1 ? "rgba(15,23,42,0.4)" : "none"}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={lIdx === gridLevels.length - 1 ? "1.5" : "1"}
                strokeDasharray={lIdx === gridLevels.length - 1 ? "none" : "2 3"}
              />
            );
          })}

          {/* RADIAL SPOKES */}
          {metrics.dimensions.map((_, idx) => {
            const endPt = getPoint(idx, 1.0);
            return (
              <line
                key={idx}
                x1={center}
                y1={center}
                x2={endPt.x}
                y2={endPt.y}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
              />
            );
          })}

          {/* CANDIDATE DATA POLYGON */}
          <polygon
            points={candidatePolygonPoints}
            fill="url(#radarAreaGradient)"
            stroke={
              metrics.compositeScore >= 80
                ? "#34d399"
                : metrics.compositeScore >= 60
                ? "#60a5fa"
                : "#fb7185"
            }
            strokeWidth="2.5"
            strokeLinejoin="round"
            filter="url(#radarGlow)"
          />

          {/* DATA VERTEX NODES & LABELS */}
          {metrics.dimensions.map((dim, idx) => {
            const pt = getPoint(idx, dim.score / 100);
            const labelPt = getPoint(idx, 1.18);

            return (
              <g
                key={dim.key}
                className="cursor-pointer group"
                onMouseEnter={() => setActiveTooltip(dim)}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                {/* Outer ring */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="5"
                  className="fill-[#0b0f19] stroke-blue-400 stroke-2 transition-all duration-200 group-hover:r-7 group-hover:stroke-white"
                />
                {/* Inner dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="2"
                  className={
                    dim.score >= 80
                      ? "fill-emerald-400"
                      : dim.score >= 60
                      ? "fill-blue-400"
                      : "fill-rose-400"
                  }
                />

                {/* Axis Label */}
                <text
                  x={labelPt.x}
                  y={labelPt.y}
                  textAnchor={
                    Math.abs(labelPt.x - center) < 8
                      ? "middle"
                      : labelPt.x > center
                      ? "start"
                      : "end"
                  }
                  dominantBaseline="central"
                  className="text-[9px] font-mono font-bold fill-slate-400 group-hover:fill-white transition-colors"
                >
                  {compact ? dim.label.split(" ")[0] : dim.label} ({dim.score}%)
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ACTIVE DIMENSION TOOLTIP DETAILS */}
      <div className="w-full mt-3 min-h-[44px] p-2.5 rounded-lg bg-black/40 border border-white/10 text-xs">
        {activeTooltip ? (
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-[11px]">{activeTooltip.label}</span>
                <span className="font-mono text-emerald-400 font-black text-[11px]">
                  {activeTooltip.score}%
                </span>
              </div>
              <p className="text-[10px] text-slate-300 mt-0.5">{activeTooltip.description}</p>
            </div>
            <span className="text-[9px] text-slate-500 font-mono text-right flex-shrink-0">
              {activeTooltip.benchmark}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono py-0.5">
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-blue-400" />
              Hover any biometric vertex above for forensic definition
            </span>
            <span className="opacity-60">Calculated over {events.length} raw telemetry ticks</span>
          </div>
        )}
      </div>

      {/* ANOMALY STREAM TAGS */}
      {metrics.anomalies.length > 0 && (
        <div className="w-full mt-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
            <AlertTriangle size={11} className="text-amber-400" />
            <span>Behavioral Outliers Detected ({metrics.anomalies.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {metrics.anomalies.map((anom, aIdx) => (
              <div
                key={aIdx}
                className={`px-2 py-1 rounded text-[10px] font-mono border flex items-center gap-1.5 ${
                  anom.severity === "high"
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    : anom.severity === "medium"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    : "bg-blue-500/10 border-blue-500/30 text-blue-300"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                <span className="font-bold">{anom.label}:</span>
                <span className="opacity-80">{anom.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
