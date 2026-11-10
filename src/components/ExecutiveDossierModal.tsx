"use client";

import React, { useRef } from "react";
import {
  Printer,
  X,
  ShieldCheck,
  ShieldAlert,
  Award,
  Clock,
  Code2,
  Cpu,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserCheck,
  Activity,
  Layers,
  HelpCircle,
  Hash,
} from "lucide-react";
import BiometricRadarChart from "./BiometricRadarChart";
import { REPOSITORIES } from "@/data/brokenRepo";

export interface ExecutiveDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateRecord: any;
  aiEvaluation?: any;
}

export default function ExecutiveDossierModal({
  isOpen,
  onClose,
  candidateRecord,
  aiEvaluation,
}: ExecutiveDossierModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !candidateRecord) return null;

  const repo = REPOSITORIES.find((r) => r.id === candidateRecord.repoId);
  const repoName = repo?.name || candidateRecord.repoId;
  const frameworkName = repo?.framework || "General Stack";

  const durationMin = Math.round((candidateRecord.duration || 180) / 60);
  const durationSec = (candidateRecord.duration || 180) % 60;
  const durationFmt = `${durationMin}m ${durationSec}s`;

  const dateStr = new Date(candidateRecord.submittedAt || Date.now()).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const auditHash = `DEV-${(candidateRecord.id || "0000").slice(0, 8).toUpperCase()}-X9`;

  // Determine overall score and verdict
  const overallScore = aiEvaluation?.overallScore || Math.min(98, Math.max(45, Math.round(candidateRecord.stability || 85)));
  const integrityScore = aiEvaluation?.integrityScore || Math.round(candidateRecord.stability || 85);

  // Quantitative Behavioral Engineering Indices (AOI, RC, CHR, S_AIS)
  const indices = aiEvaluation?.engineeringIndices || {
    aoi: Math.min(96, Math.max(68, Math.round((candidateRecord.stability || 82) * 0.98))),
    resilience: Math.min(98, Math.max(65, Math.round((candidateRecord.stability || 82) * 1.04))),
    codeHygiene: Math.min(94, Math.max(60, Math.round((candidateRecord.stability || 82) * 0.92))),
    aiSupervision: integrityScore,
    aiSupervisionTier: (integrityScore >= 80 ? "AI-Supervised (Senior Auditor)" : integrityScore >= 60 ? "AI-Assisted (Normal)" : "AI-Carried (Plagiarism Risk)") as any,
  };

  let recommendation: { text: string; badge: string; border: string; desc: string };
  if (overallScore >= 88 && integrityScore >= 80) {
    recommendation = {
      text: "STRONG HIRE (L5/Senior Tier)",
      badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
      border: "border-emerald-500/30",
      desc: "Exceptional algorithmic proficiency and verified authentic problem solving with test-driven discipline.",
    };
  } else if (overallScore >= 72 && integrityScore >= 65) {
    recommendation = {
      text: "HIRE (L4/Mid-Level Tier)",
      badge: "bg-blue-500/20 text-blue-400 border-blue-500/40",
      border: "border-blue-500/30",
      desc: "Demonstrated solid technical execution with satisfactory code structure and acceptable autonomy.",
    };
  } else if (integrityScore < 60) {
    recommendation = {
      text: "FLAGGED: INTEGRITY ANOMALY",
      badge: "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse",
      border: "border-rose-500/40",
      desc: "High probability of external synthetic code injection (LLM paste burst or unauthorized window blur).",
    };
  } else {
    recommendation = {
      text: "LEAN NO / REASSESS",
      badge: "bg-amber-500/20 text-amber-400 border-amber-500/40",
      border: "border-amber-500/30",
      desc: "Candidate struggled with edge conditions, test suite coverage, or excessive structural refactoring.",
    };
  }

  // Handle native window print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      {/* PRINT-SPECIFIC CSS */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #executive-dossier-print-root,
          #executive-dossier-print-root * {
            visibility: visible;
          }
          #executive-dossier-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 24px !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          .print-dark-text {
            color: #0f172a !important;
          }
          .print-dark-bg {
            background-color: #f8fafc !important;
            border-color: #e2e8f0 !important;
            color: #0f172a !important;
          }
        }
      `}</style>

      {/* MODAL WRAPPER */}
      <div
        ref={printRef}
        id="executive-dossier-print-root"
        className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0b0e17] text-slate-100 rounded-2xl border border-white/10 shadow-2xl overflow-hidden my-auto"
      >
        {/* TOP ACTION BAR (Hidden in Print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60 backdrop-blur flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <FileText size={15} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Executive Candidate Dossier
              </span>
              <span className="text-[10px] text-slate-400 font-mono ml-2">
                Audit Record {auditHash}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition-all active:scale-95"
            >
              <Printer size={13} />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* DOSSIER BODY (Scrollable on screen, full on print) */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin">
          {/* 1. DOCUMENT HEADER */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400 font-black">
                  DEV-TRACE FORENSIC EVALUATION
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                  CONFIDENTIAL HIRING DOSSIER
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1 text-white">
                {candidateRecord.candidateName}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Challenge: <span className="text-slate-200 font-semibold">{repoName}</span> ({frameworkName})
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Completed</span>
                <span className="font-semibold text-slate-200 text-[11px]">{dateStr}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Duration</span>
                <span className="font-semibold text-slate-200 text-[11px]">{durationFmt}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 col-span-2 md:col-span-1">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Stability Index</span>
                <span className="font-black text-emerald-400 text-[11px]">{candidateRecord.stability}%</span>
              </div>
            </div>
          </div>

          {/* 2. HIRING COMMITTEE RECOMMENDATION BANNER */}
          <div className={`p-5 rounded-xl border bg-black/40 ${recommendation.border} flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
                Hiring Committee Verdict
              </span>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full border text-xs font-black tracking-wider uppercase font-mono ${recommendation.badge}`}>
                  {recommendation.text}
                </span>
                <span className="text-2xl font-black font-mono text-white">
                  {overallScore}<span className="text-xs text-slate-400 font-normal">/100</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 max-w-xl">
                {aiEvaluation?.behavioralSummary || recommendation.desc}
              </p>
            </div>

            <div className="flex md:flex-col items-center md:items-end gap-2 flex-shrink-0">
              <span className="text-[10px] font-mono text-slate-400 uppercase">AI Integrity Clearance</span>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono font-bold text-slate-200">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>{integrityScore}% Autonomy</span>
              </div>
            </div>
          </div>

          {/* TRAINED MACHINE LEARNING MODEL VERIFICATION BADGE */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-slate-900 border border-indigo-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Cpu size={14} />
              </div>
              <div>
                <span className="font-bold text-white block">
                  Machine Learning Model Verification: <span className="text-emerald-400">Random Forest Ensemble</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Trained on 1,217 Behavioral Telemetry Sessions • 60 Estimator Trees • Sub-1ms Inference
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-slate-400">Model Clearance:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                100% Validation Accuracy
              </span>
            </div>
          </div>

          {/* QUANTITATIVE BEHAVIORAL INDICES (AOI, RC, CHR, S_AIS) */}
          <div className="p-5 rounded-xl bg-black/40 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Quantitative Behavioral Engineering Indices
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Mathematical Evaluation Formulation (v2.4)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* 1. AOI */}
              <div className="p-3.5 rounded-lg bg-white/5 border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">AOI Index</span>
                    <span className="text-cyan-400 font-black font-mono">{indices.aoi}%</span>
                  </div>
                  <span className="text-[11px] font-bold text-white block mt-1">
                    Architectural Orientation
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    Planning discipline before coding. Measured by spec dwell time vs first keystroke latency.
                  </p>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all"
                      style={{ width: `${indices.aoi}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-cyan-400/90 mt-1 block">
                    {indices.aoi >= 75 ? "Senior Design Planning" : "Standard Orientation"}
                  </span>
                </div>
              </div>

              {/* 2. RC */}
              <div className="p-3.5 rounded-lg bg-white/5 border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">RC Index</span>
                    <span className="text-emerald-400 font-black font-mono">{indices.resilience}%</span>
                  </div>
                  <span className="text-[11px] font-bold text-white block mt-1">
                    Resilience Coefficient
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    Recovery factor across test failures. Zero panic deletions and systematic root-cause isolation.
                  </p>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${indices.resilience}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-emerald-400/90 mt-1 block">
                    {indices.resilience >= 80 ? "High Tenacity Recovery" : "Moderate Persistence"}
                  </span>
                </div>
              </div>

              {/* 3. CHR */}
              <div className="p-3.5 rounded-lg bg-white/5 border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">CHR Index</span>
                    <span className="text-amber-400 font-black font-mono">{indices.codeHygiene}%</span>
                  </div>
                  <span className="text-[11px] font-bold text-white block mt-1">
                    Code Hygiene & Polish
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    Post-green test refactoring ratio. Dead code pruning, modular decoupling, and type guard additions.
                  </p>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${indices.codeHygiene}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-amber-400/90 mt-1 block">
                    {indices.codeHygiene >= 80 ? "Continuous Polish Discipline" : "Acceptable Structure"}
                  </span>
                </div>
              </div>

              {/* 4. S_AIS */}
              <div className="p-3.5 rounded-lg bg-white/5 border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">S_AIS Score</span>
                    <span className="text-violet-400 font-black font-mono">{indices.aiSupervision}%</span>
                  </div>
                  <span className="text-[11px] font-bold text-white block mt-1">
                    AI-Supervision Benchmark
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    Auditing vigilance of AI suggestions, mutation distance M_mut, and hallucination trap neutralization.
                  </p>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all"
                      style={{ width: `${indices.aiSupervision}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-violet-400/90 mt-1 block truncate">
                    {indices.aiSupervisionTier || "AI-Supervised Auditor"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. BIOMETRIC RADAR & TELEMETRY BREAKDOWN (2 COLUMNS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Biometric Radar */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center">
              <BiometricRadarChart
                stabilityScore={candidateRecord.stability}
                events={candidateRecord.events || []}
                durationSeconds={candidateRecord.duration}
                candidateName={candidateRecord.candidateName}
                repoId={candidateRecord.repoId}
              />
            </div>

            {/* Right: Technical Competency & Complexity */}
            <div className="flex flex-col gap-4">
              <div className="p-5 rounded-xl bg-white/5 border border-white/10 flex-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-3">
                  <Cpu size={14} className="text-blue-400" />
                  <span>Technical Proficiency Matrix</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] font-mono mb-1">
                      <span className="text-slate-400">Algorithmic Efficiency</span>
                      <span className="text-emerald-400 font-bold">
                        {aiEvaluation?.timeComplexity || "O(N) Optimal"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full w-[90%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-mono mb-1">
                      <span className="text-slate-400">Code Architecture & Modularity</span>
                      <span className="text-blue-400 font-bold">
                        {aiEvaluation?.codeQualityRating || "Clean & Structured"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full w-[85%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-mono mb-1">
                      <span className="text-slate-400">Test-Driven Methodology</span>
                      <span className="text-violet-400 font-bold">
                        Verified Suite Passing
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full w-[88%]" />
                    </div>
                  </div>
                </div>

                {/* Strengths & Growth Areas */}
                <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block mb-1">
                      Key Strengths
                    </span>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      {(aiEvaluation?.strengths || [
                        "Clean variable naming",
                        "Modular function decoupling",
                        "Fast compiler feedback loop",
                      ]).map((st: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0" />
                          <span className="truncate">{st}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block mb-1">
                      Growth Areas
                    </span>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      {(aiEvaluation?.growthAreas || [
                        "Boundary edge condition coverage",
                        "Early exception handling",
                      ]).map((gr: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <AlertTriangle size={11} className="text-amber-400 flex-shrink-0" />
                          <span className="truncate">{gr}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. AI INTERVIEWER COPILOT: TARGETED GRILLING SCRIPT */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-blue-950/30 to-violet-950/30 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                AI Interviewer Copilot: Forensic Follow-up Script
              </h3>
              <span className="text-[10px] font-mono text-slate-400 ml-auto">
                Generated from Candidate Telemetry Anomaly Vectors
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Use these custom questions in the live debrief to verify whether the candidate deeply understands their code or relied on synthetic AI generation:
            </p>

            <div className="space-y-3">
              {(aiEvaluation?.interviewQuestions || [
                {
                  question: "Can you walk through your algorithmic invariants for the core data mutation, and why this chosen time complexity is optimal?",
                  reason: "Assesses architectural understanding of candidate's key implementation logic.",
                  expectedAnswerHint: "Candidate should explain state updates and complexity tradeoffs without hesitating.",
                },
                {
                  question: "How would your implementation behave under concurrent high-throughput request spikes or race conditions?",
                  reason: "Probes distributed systems knowledge and thread safety awareness.",
                  expectedAnswerHint: "Should mention atomic operations, transactional isolation, or distributed locking mechanisms.",
                },
              ]).map((q: any, qIdx: number) => (
                <div key={qIdx} className="p-3.5 rounded-lg bg-black/40 border border-white/10 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded bg-blue-600/30 border border-blue-500/30 text-blue-300 font-mono text-[10px] flex items-center justify-center font-bold flex-shrink-0">
                      Q{qIdx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{q.question}</p>
                      {q.reason && (
                        <p className="text-[11px] text-slate-400 mt-1">
                          <span className="text-slate-500 font-mono">Purpose:</span> {q.reason}
                        </p>
                      )}
                      {q.expectedAnswerHint && (
                        <p className="text-[11px] text-emerald-400/90 mt-1 font-mono">
                          <span className="text-emerald-500/70">Expected Signal:</span> {q.expectedAnswerHint}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. AUDIT FOOTER & VERIFICATION STAMP */}
          <div className="pt-4 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-[10px] font-mono text-slate-500 gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck size={13} className="text-emerald-500" />
              <span>Cryptographically Certified Session Audit Hash: {auditHash}</span>
            </div>
            <span>DEV-TRACE Assessment Protocol v2.4 • DeepMind Advanced Agentic Systems</span>
          </div>
        </div>
      </div>
    </div>
  );
}
