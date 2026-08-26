"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Activity,
  Code2,
  Trophy,
  Zap,
  LogOut,
  User,
  Shield,
  Play,
  Sparkles,
  Lightbulb,
  Check,
  HelpCircle,
  X,
  BookOpen,
  Maximize2,
  Minimize2,
  GripHorizontal,
} from "lucide-react";
import { useTelemetryStore } from "@/store/telemetryStore";
import { useThemeStore } from "@/store/themeStore";
import { REPOSITORIES } from "@/data/brokenRepo";
import FileExplorer from "@/components/FileExplorer";
import MockTerminal, { TerminalLine } from "@/components/MockTerminal";
import LivePreview from "@/components/LivePreview";
import ThemeToggle from "@/components/ThemeToggle";
import MarkdownViewer from "@/components/MarkdownViewer";
import Editor from "@monaco-editor/react";

// ---- helpers ----------------------------------------------------------------
function buildZip(files: Record<string, string>): Blob {
  const lines: string[] = [];
  for (const [name, content] of Object.entries(files)) {
    lines.push(`// === ${name} ===`);
    lines.push(content);
    lines.push("");
  }
  return new Blob([lines.join("\n")], { type: "text/plain" });
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtElapsed(sec: number): string {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function DevTraceIDEPage() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const isLight = theme === "light";
  const isMidnight = theme === "midnight";

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [activeRepoId, setActiveRepoId] = useState("");
  const [activeRepo, setActiveRepo] = useState<any>(null);

  // File state
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState("");
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());

  // Hydration state for Monaco
  const [mounted, setMounted] = useState(false);

  // Terminal
  const [termLines, setTermLines] = useState<TerminalLine[]>([
    { type: "system", text: "DevTrace Assessment Environment Ready" },
  ]);
  const [termOpen, setTermOpen] = useState(true);
  const [termHeight, setTermHeight] = useState<number>(240);
  const [isDraggingTerm, setIsDraggingTerm] = useState(false);

  const handleTermMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingTerm(true);
    const startY = e.clientY;
    const startH = termHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startY - moveEvent.clientY;
      const newHeight = Math.min(Math.max(startH + delta, 120), window.innerHeight * 0.75);
      setTermHeight(newHeight);
      if (!termOpen) setTermOpen(true);
    };

    const handleMouseUp = () => {
      setIsDraggingTerm(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Telemetry
  const { logEvent, getDump, sessionStart, clearEvents } = useTelemetryStore();
  const [stabilityScore, setStabilityScore] = useState(100);

  // Keystroke batching
  const keystrokeBuffer = useRef<{ added: number; deleted: number }>({ added: 0, deleted: 0 });

  // Elapsed timer
  const [elapsed, setElapsed] = useState(0);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [submittingTelemetry, setSubmittingTelemetry] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Problem brief state
  const [showProblemBrief, setShowProblemBrief] = useState(false);

  // AI Socratic Mentor & Explainer state
  const [showAiMentor, setShowAiMentor] = useState(false);
  const [hintLevel, setHintLevel] = useState<1 | 2 | 3>(1);
  const [aiHint, setAiHint] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<any>(null);
  const [showAiExplainer, setShowAiExplainer] = useState(false);

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!data.user) {
          router.replace("/login");
        } else if (data.user.role === "admin") {
          router.replace("/admin");
        } else if (data.user.role === "interviewer") {
          router.replace("/interviewer");
        } else {
          setUser(data.user);
          const assignedId = data.user.assignedRepoId || REPOSITORIES[0].id;
          let repo = REPOSITORIES.find((r) => r.id === assignedId);

          if (!repo) {
            try {
              const customRes = await fetch("/api/ai/generate-challenge");
              const customData = await customRes.json();
              repo = customData.customChallenges?.find((r: any) => r.id === assignedId);
            } catch (e) {
              console.warn("Failed to load custom challenges", e);
            }
          }

          if (!repo) repo = REPOSITORIES[0];

          setActiveRepoId(repo.id);
          setActiveRepo(repo);
          setFiles(Object.fromEntries(Object.entries(repo.files).map(([k, v]: [string, any]) => [k, v.content])));
          setActiveFile(repo.activeFile);
          setTermLines((prev) => [
            ...prev,
            { type: "info", text: "Active Challenge: " + repo.name },
            { type: "system", text: `[Environment] Sandbox: ${repo.environmentLabel || repo.framework?.toUpperCase() || repo.category.toUpperCase()}` },
            ...(repo.testCommand ? [{ type: "system", text: `[Test Runner] Command: ${repo.testCommand}` } as TerminalLine] : []),
          ]);
          clearEvents(); // Reset telemetry session for this run
          setAuthLoading(false);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        router.replace("/login");
      }
    }
    checkAuth();
    setMounted(true);
  }, [router, clearEvents]);

  // Elapsed timer handler
  useEffect(() => {
    if (authLoading) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [authLoading]);

  // Stability Calculation
  useEffect(() => {
    if (authLoading) return;
    const i = setInterval(() => {
      const dump = getDump();
      let score = 100;

      const errors = dump.filter((e) => e.type === "EXECUTION_RESULT" && !e.meta?.passed).length;
      score -= errors * 10;

      const largePastes = dump.filter((e) => e.type === "PASTE_DETECTED" && e.meta?.lines_pasted > 10).length;
      score -= largePastes * 15;

      const focusLosses = dump.filter((e) => e.type === "FOCUS_LOST").length;
      score -= focusLosses * 5;

      setStabilityScore(Math.max(10, Math.min(100, score)));
    }, 2000);
    return () => clearInterval(i);
  }, [authLoading, getDump]);

  // Focus tracking
  useEffect(() => {
    if (authLoading) return;
    let focusLostTime: number | null = null;

    const handleBlur = () => {
      focusLostTime = Date.now();
      logEvent({ type: "FOCUS_LOST", meta: { timestamp: new Date().toISOString() } });
    };

    const handleFocus = () => {
      const duration = focusLostTime ? Math.round((Date.now() - focusLostTime) / 1000) : 0;
      focusLostTime = null;
      logEvent({
        type: "FOCUS_GAINED",
        meta: { duration_away_seconds: duration, timestamp: new Date().toISOString() },
      });
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [authLoading, logEvent]);

  // Handle file select
  const handleFileSelect = (file: string) => {
    logEvent({
      type: "FILE_OPEN",
      meta: { file, previous_file: activeFile },
    });
    setActiveFile(file);
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined) return;
    setFiles((prev) => ({ ...prev, [activeFile]: value }));
    setDirtyFiles((d) => new Set(d).add(activeFile));
  };

  const handleEditorMount = useCallback((editor: any) => {
    editor.onDidChangeModelContent((e: any) => {
      for (const change of e.changes) {
        if (change.text.length > 0) {
          keystrokeBuffer.current.added += change.text.length;
        }
        if (change.rangeLength > 0) {
          keystrokeBuffer.current.deleted += change.rangeLength;
        }
      }
    });

    editor.onDidPaste((e: any) => {
      const model = editor.getModel();
      if (!model) return;

      const pastedText = model.getValueInRange(e.range);
      const charCount = pastedText.length;
      const wordCount = pastedText.trim().split(/\s+/).filter(Boolean).length;
      const lineCount = e.range.endLineNumber - e.range.startLineNumber + 1;

      const snippet = pastedText.length > 200
        ? pastedText.slice(0, 200) + ` … [${pastedText.length - 200} more chars]`
        : pastedText;

      const pasteObject = {
        file: activeFile,
        lines_pasted: lineCount,
        chars_pasted: charCount,
        words_pasted: wordCount,
        content: pastedText,
        preview: snippet,
        range: {
          startLine: e.range.startLineNumber,
          endLine: e.range.endLineNumber,
          startCol: e.range.startColumn,
          endCol: e.range.endColumn,
        },
      };

      logEvent({ type: "PASTE_DETECTED", meta: pasteObject });

      if (lineCount > 5) {
        setTermLines((p) => [
          ...p,
          {
            type: "warning",
            text: `[Telemetry] Paste recorded in ${activeFile} (${lineCount} lines, ${charCount} chars)`,
          },
        ]);
      }
    });
  }, [activeFile, logEvent]);

  const handleSave = useCallback(async () => {
    if (!activeRepo) return;
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const src = files[activeFile] ?? "";
    setDirtyFiles((d) => {
      const n = new Set(d);
      n.delete(activeFile);
      return n;
    });

    const validationLines = activeRepo.validateSave(activeFile, src, ts);
    setTermLines((prev) => [...prev, ...validationLines, { type: "info", text: `Saved ${activeFile}`, ts }]);

    const isExecutionCategory = ["python", "cpp", "java", "node"].includes(activeRepo.category);
    if (isExecutionCategory) {
      setTermLines((prev) => [...prev, { type: "system", text: "Running test suite...", ts }]);
      try {
        const res = await fetch("/api/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: src,
            files: files,
            activeFile: activeFile,
            language: activeRepo.category,
            framework: activeRepo.framework,
          }),
        });
        const data = await res.json();
        if (data.error) setTermLines((prev) => [...prev, { type: "error", text: data.error, ts }]);
        if (data.output) setTermLines((prev) => [...prev, { type: "info", text: data.output.trimEnd(), ts }]);

        if (activeRepo.checkExecution) {
          const result = activeRepo.checkExecution(data.output || "", data.error || "");
          setTermLines((prev) => [
            ...prev,
            { type: result.passed ? "success" : "error", text: `Result: ${result.message}`, ts },
          ]);
          logEvent({ type: "EXECUTION_RESULT", meta: { passed: result.passed, summary: result.message } });
        }
      } catch (e) {
        setTermLines((prev) => [...prev, { type: "error", text: "Execution service unavailable.", ts }]);
      }
    }
  }, [activeFile, files, activeRepo, logEvent]);

  const handleTerminalCommand = useCallback((cmd: string) => {
    const lower = cmd.toLowerCase().trim();
    if (lower === "clear") {
      setTermLines([]);
      return;
    }
    setTermLines((p) => [...p, { type: "system", text: `User@DevTrace:~$ ${cmd}` }]);
    if (lower.startsWith("git")) {
      setTermLines((p) => [...p, { type: "info", text: "Git operations are managed by Save actions." }]);
    } else {
      setTermLines((p) => [...p, { type: "error", text: `Command not found: ${cmd}` }]);
    }
  }, []);

  const handleRequestAiHint = async (level: 1 | 2 | 3) => {
    setHintLevel(level);
    setAiLoading(true);
    try {
      const errorLines = termLines.filter((l) => l.type === "error").map((l) => l.text).join("\n");
      const targetFile = activeFile?.endsWith(".md")
        ? activeRepo?.fileOrder?.find((f: string) => !f.endsWith(".md")) || activeFile
        : activeFile;

      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "socratic_hint",
          challengeName: activeRepo?.name || "DevTrace Challenge",
          challengeId: activeRepo?.id,
          framework: activeRepo?.framework,
          activeFile: targetFile,
          code: files[targetFile] || "",
          errorOutput: errorLines,
          hintLevel: level,
        }),
      });
      const data = await res.json();
      if (data.success && data.hint) {
        setAiHint(data.hint);
        logEvent({ type: "AI_HINT_REQUESTED", meta: { level, activeFile: targetFile } });
      } else {
        setAiHint({
          hintLevel: level,
          title: `Step ${level}: Debugging Clue`,
          hintText: data.error || "Review your test suite assertions and check the calculation logic in the active module.",
          encouragement: "Trace the inputs and expected outputs carefully.",
        });
      }
    } catch (e) {
      console.error("AI hint error:", e);
      setAiHint({
        hintLevel: level,
        title: `Step ${level}: Debugging Clue`,
        hintText: "Network delay encountered. Check the unit test assertions in your test file for the expected values.",
        encouragement: "You're close! Check the function return values.",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleExplainError = async (errorText: string) => {
    setShowAiExplainer(true);
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "explain_error",
          errorOutput: errorText,
          framework: activeRepo?.framework,
          language: currentLang,
          activeFile,
          code: files[activeFile] || "",
        }),
      });
      const data = await res.json();
      if (data.success && data.explanation) {
        setAiExplanation(data.explanation);
        logEvent({ type: "AI_EXPLAIN_ERROR", meta: { length: errorText.length } });
      }
    } catch (e) {
      console.error("AI explain error:", e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmittingTelemetry(true);
    const dump = getDump();
    const telemetryPayload = {
      sessionStart,
      duration: elapsed,
      stability: stabilityScore,
      events: dump,
    };

    try {
      const response = await fetch("/api/telemetry/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(telemetryPayload),
      });
      if (response.ok) {
        setSubmitSuccess(true);
      } else {
        console.error("Telemetry failed to submit to server");
      }
    } catch (err) {
      console.error("Failed submitting telemetry:", err);
    } finally {
      setSubmittingTelemetry(false);
      setShowModal(true);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  if (authLoading || !activeRepo) {
    return (
      <div
        className={`h-screen w-screen flex flex-col items-center justify-center transition-colors ${
          isLight ? "bg-slate-50 text-slate-800" : isMidnight ? "bg-[#0b0f19] text-slate-200" : "bg-[#0f1117] text-slate-200"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md animate-spin">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-xs uppercase font-semibold tracking-wider opacity-60">
            Initializing Assessment Workspace...
          </span>
        </div>
      </div>
    );
  }

  const currentLang = activeRepo.files[activeFile]?.language ?? "plaintext";

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden font-sans transition-colors duration-150 ${
        isLight
          ? "bg-slate-50 text-slate-900"
          : isMidnight
          ? "bg-[#0b0f19] text-slate-100"
          : "bg-[#0f1117] text-slate-200"
      }`}
    >
      {/* ── TOP HEADER ── */}
      <header
        className={`min-h-[56px] flex flex-wrap md:flex-nowrap items-center justify-between gap-3 px-4 py-2 border-b flex-shrink-0 z-30 transition-colors ${
          isLight
            ? "bg-white border-slate-200 shadow-sm"
            : isMidnight
            ? "bg-[#111827] border-[#1f293d]"
            : "bg-[#161b22] border-[#252a36]"
        }`}
      >
        {/* Left Side: Brand & Challenge Title */}
        <div className="flex items-center gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center shadow-sm">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-xs font-bold tracking-wider uppercase leading-none">DevTrace</h1>
              <span className="text-[10px] font-medium opacity-60 tracking-tight">Assessment</span>
            </div>
          </div>

          <div className={`h-5 w-px hidden sm:block ${isLight ? "bg-slate-200" : "bg-white/10"}`} />

          {/* Challenge Box Title */}
          <div
            className={`text-xs md:text-sm font-semibold px-3 py-1.5 rounded-md border ${
              isLight
                ? "bg-slate-50 border-slate-300 text-slate-800"
                : "bg-white/5 border-white/10 text-slate-200"
            }`}
          >
            {activeRepo.name}
          </div>
        </div>

        {/* Right Side: Actions & Session */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Candidate Profile */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs md:text-sm opacity-85 px-2.5 py-1 rounded-md border border-transparent">
            <User size={14} className="opacity-70" />
            <span className="font-medium">{user?.name}</span>
            <span
              className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                isLight ? "bg-slate-100 text-slate-600" : "bg-white/5 text-slate-400"
              }`}
            >
              {user?.userId}
            </span>
          </div>

          {/* Session Status Box */}
          <div
            className={`hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-md border text-xs md:text-sm ${
              isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-white/5 border-white/10 text-slate-300"
            }`}
          >
            <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold">Active</span>
            </div>
            <div className={`w-px h-3.5 ${isLight ? "bg-slate-300" : "bg-white/10"}`} />
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="opacity-60" />
              <span className="font-mono font-bold text-xs md:text-sm">{fmtElapsed(elapsed)}</span>
            </div>
          </div>

          {/* Problem Brief Button (Box Design) */}
          <button
            type="button"
            onClick={() => {
              setShowProblemBrief((prev) => {
                const next = !prev;
                if (next) setShowAiMentor(false);
                return next;
              });
            }}
            className={`flex items-center gap-1.5 text-xs md:text-sm px-3.5 py-1.5 rounded-md font-medium border transition-all active:scale-95 shadow-sm ${
              showProblemBrief
                ? "bg-sky-600 border-sky-500 text-white font-semibold"
                : isLight
                ? "bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-700"
                : "bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/20 text-sky-400"
            }`}
          >
            <BookOpen size={14} />
            <span>Problem Spec</span>
          </button>

          {/* AI Socratic Mentor Button (Box Design) */}
          <button
            type="button"
            onClick={() => {
              setShowAiMentor((prev) => {
                const next = !prev;
                if (next) {
                  setShowProblemBrief(false);
                  if (!aiHint) {
                    setTimeout(() => handleRequestAiHint(1), 0);
                  }
                }
                return next;
              });
            }}
            className={`flex items-center gap-1.5 text-xs md:text-sm px-3.5 py-1.5 rounded-md font-medium border transition-all active:scale-95 shadow-sm ${
              showAiMentor
                ? "bg-indigo-600 border-indigo-500 text-white font-semibold"
                : isLight
                ? "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700"
                : "bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20 text-indigo-400"
            }`}
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>AI Mentor</span>
          </button>

          {/* Theme Toggle Component */}
          <ThemeToggle />

          {/* Finish Challenge Button (Box Design) */}
          <button
            onClick={handleSubmit}
            className="flex items-center gap-1.5 text-xs md:text-sm px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-semibold transition-all shadow-sm active:scale-95"
          >
            <Trophy size={14} />
            <span>Finish</span>
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            title="Sign Out"
            className={`p-1.5 rounded-md border transition-colors ${
              isLight ? "hover:bg-slate-100 border-slate-300 text-slate-600" : "hover:bg-white/10 border-white/10 text-slate-400"
            }`}
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* ── MAIN BODY ── */}
      <main className="flex-1 flex overflow-hidden relative">
        <FileExplorer
          files={activeRepo.fileOrder}
          activeFile={activeFile}
          onSelect={handleFileSelect}
          dirtyFiles={dirtyFiles}
        />

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden relative">
          {/* Editor Tabs & Run Action */}
          <div
            className={`flex items-center border-b h-10 flex-shrink-0 ${
              isLight ? "bg-slate-100/70 border-slate-200" : "bg-black/20 border-white/5"
            }`}
          >
            {activeRepo.fileOrder.map((file: string) => {
              const isActive = activeFile === file;
              return (
                <button
                  key={file}
                  onClick={() => handleFileSelect(file)}
                  className={`flex items-center gap-2 px-4 h-full text-xs md:text-sm border-r transition-all relative ${
                    isActive
                      ? isLight
                        ? "bg-white text-blue-700 font-semibold border-slate-200"
                        : "bg-[#161b22] text-blue-400 font-medium border-white/5"
                      : isLight
                      ? "text-slate-600 hover:bg-slate-200/50 border-slate-200"
                      : "text-slate-400 hover:bg-white/5 border-white/5"
                  }`}
                >
                  {isActive && <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />}
                  <span>{file}</span>
                  {dirtyFiles.has(file) && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                </button>
              );
            })}

            <div className="flex-1" />

            <div className="px-3">
              <button
                onClick={handleSave}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs md:text-sm font-semibold transition-all shadow-sm ${
                  isLight
                    ? "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                    : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20"
                }`}
              >
                <Play size={13} className="fill-current" />
                <span>{activeRepo.framework === "django" ? "Run Django Tests (Ctrl+S)" : "Save & Run (Ctrl+S)"}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 min-w-0 flex overflow-hidden relative">
            {/* Monaco Editor Container */}
            <div
              className={`flex-1 min-w-0 h-full relative transition-colors ${
                isLight ? "bg-white" : isMidnight ? "bg-[#0b0f19]" : "bg-[#0f1117]"
              }`}
            >
              {!mounted ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm opacity-60 animate-pulse">
                  Loading Workspace...
                </div>
              ) : (
                <Editor
                  height="100%"
                  language={currentLang}
                  value={files[activeFile] ?? ""}
                  onChange={handleEditorChange}
                  onMount={handleEditorMount}
                  theme={isLight ? "light" : "vs-dark"}
                  options={{
                    fontSize: 14,
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace",
                    minimap: { enabled: false },
                    scrollbar: { vertical: "auto", horizontal: "auto" },
                    lineNumbers: "on",
                    renderLineHighlight: "all",
                    padding: { top: 16 },
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    bracketPairColorization: { enabled: true },
                  }}
                />
              )}
            </div>

            {/* Sidebar (Web Live Preview or Assessment Info) */}
            {activeRepo.category === "web" && (
              <aside className={`w-[360px] max-w-[40vw] border-l flex flex-col flex-shrink-0 ${isLight ? "border-slate-200 bg-white" : "border-white/5 bg-[#12151c]"}`}>
                <LivePreview
                  html={files["index.html"] ?? ""}
                  css={files["style.css"] ?? ""}
                  js={files["script.js"] ?? ""}
                />
              </aside>
            )}

            {/* Problem Brief Drawer (Box Design) */}
            {showProblemBrief && (
              <aside
                className={`w-full sm:w-[400px] lg:w-[440px] max-w-full md:max-w-[48vw] border-l flex flex-col flex-shrink-0 h-full z-20 ${
                  isLight ? "border-slate-200 bg-white text-slate-800" : isMidnight ? "border-[#1f293d] bg-[#0f1422] text-slate-200" : "border-[#252a36] bg-[#141822] text-slate-200"
                }`}
              >
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-sky-600/10 border border-sky-600/20 flex items-center justify-center">
                      <BookOpen size={16} className="text-sky-500" />
                    </div>
                    <div>
                      <h3 className="text-sm md:text-base font-semibold leading-tight">{activeRepo?.name || "Problem Specification"}</h3>
                      <p className="text-xs opacity-60">Requirements & Test Objectives</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowProblemBrief(false)}
                    className="p-1.5 rounded-md opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    title="Close"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-4 sm:p-5 flex-1 overflow-y-auto font-sans text-sm space-y-4 leading-relaxed scrollbar-thin">
                  {/* Test Command Info Box */}
                  {activeRepo?.testCommand && (
                    <div className={`p-3 rounded-md border text-xs font-mono flex items-center justify-between ${
                      isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-black/20 border-white/10 text-emerald-400"
                    }`}>
                      <span className="opacity-60 text-[11px] uppercase font-sans font-semibold">Test Command:</span>
                      <span className="font-bold">{activeRepo.testCommand}</span>
                    </div>
                  )}

                  {/* Repository Files Box */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold opacity-70 uppercase tracking-wider">Repository Files</div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeRepo?.fileOrder?.map((file: string) => (
                        <button
                          key={file}
                          onClick={() => handleFileSelect(file)}
                          className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-all ${
                            activeFile === file
                              ? "bg-sky-600 border-sky-500 text-white font-bold shadow-sm"
                              : isLight
                              ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                              : "bg-black/30 border-white/10 text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          {file}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Problem Specification Content Box with Markdown Converter */}
                  <div className={`p-4 rounded-md border text-sm leading-relaxed ${
                    isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-black/20 border-white/10 text-slate-200"
                  }`}>
                    <MarkdownViewer
                      content={files["README.md"] || activeRepo?.files?.["README.md"]?.content || activeRepo?.description || "Review the repository files and execute the test runner to diagnose and solve the bugs."}
                    />
                  </div>
                </div>
              </aside>
            )}

            {/* AI Socratic Mentor Drawer (Box Design) */}
            {showAiMentor && (
              <aside
                className={`w-full sm:w-[380px] lg:w-[420px] max-w-full md:max-w-[48vw] border-l flex flex-col flex-shrink-0 h-full z-20 ${
                  isLight ? "border-slate-200 bg-white text-slate-800" : isMidnight ? "border-[#1f293d] bg-[#0f1422] text-slate-200" : "border-[#252a36] bg-[#141822] text-slate-200"
                }`}
              >
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center">
                      <Sparkles size={16} className="text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-sm md:text-base font-semibold">AI Socratic Mentor</h3>
                      <p className="text-xs opacity-60">Progressive, non-spoiler hints</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAiMentor(false)}
                    className="p-1.5 rounded-md opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    title="Close"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-4 sm:p-5 flex flex-col flex-1 overflow-y-auto space-y-4">
                  {/* Hint Level Selection Box Tabs */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold opacity-60 uppercase tracking-wider">Hint Depth</div>
                    <div className="grid grid-cols-3 rounded-md border p-1 gap-1 text-xs font-semibold bg-black/10">
                      <button
                        onClick={() => handleRequestAiHint(1)}
                        className={`py-1.5 rounded-md text-center transition-all ${
                          hintLevel === 1 ? "bg-indigo-600 text-white shadow-sm font-bold" : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        1. Concept
                      </button>
                      <button
                        onClick={() => handleRequestAiHint(2)}
                        className={`py-1.5 rounded-md text-center transition-all ${
                          hintLevel === 2 ? "bg-indigo-600 text-white shadow-sm font-bold" : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        2. Location
                      </button>
                      <button
                        onClick={() => handleRequestAiHint(3)}
                        className={`py-1.5 rounded-md text-center transition-all ${
                          hintLevel === 3 ? "bg-indigo-600 text-white shadow-sm font-bold" : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        3. Logic Clue
                      </button>
                    </div>
                  </div>

                  {aiLoading ? (
                    <div className="flex flex-col items-center justify-center py-14 gap-3 text-sm opacity-70">
                      <Sparkles size={24} className="text-indigo-400 animate-spin" />
                      <span>Formulating Socratic guidance...</span>
                    </div>
                  ) : aiHint ? (
                    <div className="space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-sm font-bold text-indigo-400">
                          <Lightbulb size={15} />
                          <span>{aiHint.title}</span>
                        </div>
                        <button
                          onClick={() => handleRequestAiHint(hintLevel)}
                          className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                        >
                          Refresh
                        </button>
                      </div>

                      <div
                        className={`p-4 rounded-md border text-sm leading-relaxed ${
                          isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-black/20 border-white/10 text-slate-200"
                        }`}
                      >
                        {aiHint.hintText}
                      </div>

                      {aiHint.encouragement && (
                        <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 font-medium flex items-center gap-2">
                          <Check size={14} className="flex-shrink-0" />
                          <span>{aiHint.encouragement}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm opacity-60 text-center py-10">
                      Click a hint level above to receive contextual debugging clues without spoiling the solution.
                    </div>
                  )}
                </div>
              </aside>
            )}
          </div>

          {/* Resizable Terminal & Test Output */}
          <div
            className={`border-t flex flex-col flex-shrink-0 relative transition-all ${
              isDraggingTerm ? "select-none" : ""
            } ${isLight ? "border-slate-200" : "border-white/5"}`}
            style={{ height: termOpen ? `${termHeight}px` : "36px" }}
          >
            {/* Top Resize Drag Handle */}
            {termOpen && (
              <div
                onMouseDown={handleTermMouseDown}
                title="Drag vertically to alter terminal size"
                className={`h-1.5 w-full cursor-row-resize absolute -top-1 left-0 right-0 z-30 group flex items-center justify-center transition-colors ${
                  isDraggingTerm ? "bg-blue-500" : "hover:bg-blue-500/80"
                }`}
              >
                <div className="w-12 h-1 rounded-full bg-slate-400/40 group-hover:bg-white transition-colors" />
              </div>
            )}

            {/* Terminal Header Bar */}
            <div
              className={`h-9 flex items-center justify-between px-4 border-t select-none transition-colors ${
                isLight
                  ? "bg-slate-100 border-slate-200"
                  : isMidnight
                  ? "bg-[#111827] border-[#1f293d]"
                  : "bg-[#161b22] border-[#252a36]"
              }`}
            >
              {/* Left: Title & Toggle */}
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setTermOpen(!termOpen)}
              >
                <span className="text-xs uppercase font-bold tracking-wider opacity-70">
                  Terminal & Test Output
                </span>
                {termOpen ? <ChevronDown size={14} className="opacity-60" /> : <ChevronUp size={14} className="opacity-60" />}
              </div>

              {/* Right: Size Controls */}
              {termOpen && (
                <div className="flex items-center gap-1.5 text-xs">
                  {/* Preset Size Buttons */}
                  <div className={`hidden sm:flex items-center rounded border p-0.5 text-[10px] font-semibold ${
                    isLight ? "bg-slate-200/70 border-slate-300" : "bg-black/30 border-white/10"
                  }`}>
                    <button
                      type="button"
                      onClick={() => setTermHeight(160)}
                      className={`px-2 py-0.5 rounded transition-all ${
                        termHeight === 160
                          ? "bg-blue-600 text-white font-bold"
                          : "opacity-60 hover:opacity-100"
                      }`}
                      title="Compact (160px)"
                    >
                      Compact
                    </button>
                    <button
                      type="button"
                      onClick={() => setTermHeight(240)}
                      className={`px-2 py-0.5 rounded transition-all ${
                        termHeight === 240
                          ? "bg-blue-600 text-white font-bold"
                          : "opacity-60 hover:opacity-100"
                      }`}
                      title="Default (240px)"
                    >
                      Default
                    </button>
                    <button
                      type="button"
                      onClick={() => setTermHeight(420)}
                      className={`px-2 py-0.5 rounded transition-all ${
                        termHeight === 420
                          ? "bg-blue-600 text-white font-bold"
                          : "opacity-60 hover:opacity-100"
                      }`}
                      title="Expanded (420px)"
                    >
                      Large
                    </button>
                  </div>

                  {/* Maximize Toggle Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (termHeight >= 480) {
                        setTermHeight(240);
                      } else {
                        setTermHeight(Math.floor(window.innerHeight * 0.65));
                      }
                    }}
                    title={termHeight >= 480 ? "Restore size" : "Maximize terminal height"}
                    className={`p-1 rounded transition-colors ${
                      isLight ? "hover:bg-slate-200 text-slate-600" : "hover:bg-white/10 text-slate-400"
                    }`}
                  >
                    {termHeight >= 480 ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  </button>
                </div>
              )}
            </div>

            {/* Terminal Body */}
            {termOpen && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <MockTerminal
                  lines={termLines}
                  onCommand={handleTerminalCommand}
                  onClear={() => setTermLines([])}
                  onExplainError={handleExplainError}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* AI Error Explainer Modal (Box Design) */}
      {showAiExplainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`border rounded-lg shadow-xl p-6 md:p-7 w-full max-w-lg flex flex-col animate-in zoom-in-95 duration-150 ${
              isLight ? "bg-white border-slate-200 text-slate-800" : isMidnight ? "bg-[#111827] border-[#1f293d] text-slate-100" : "bg-[#161b22] border-[#252a36] text-slate-100"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center">
                  <Sparkles size={16} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Stack Trace Explanation</h3>
                  <p className="text-xs opacity-60">Plain English debugging diagnosis</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiExplainer(false)}
                className="p-1.5 rounded-md opacity-60 hover:opacity-100"
              >
                <X size={16} />
              </button>
            </div>

            {aiLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-sm opacity-60">
                <Sparkles size={24} className="text-indigo-400 animate-spin" />
                <span>Analyzing runtime exception...</span>
              </div>
            ) : aiExplanation ? (
              <div className="space-y-3.5 text-sm">
                <div className={`p-3.5 rounded-md border ${isLight ? "bg-indigo-50/50 border-indigo-100 text-indigo-900" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-200"}`}>
                  <span className="font-bold block mb-1">What went wrong:</span>
                  <p>{aiExplanation.summary}</p>
                </div>

                <div>
                  <span className="font-bold opacity-70 block mb-1">Root Cause:</span>
                  <p className="opacity-90 leading-relaxed">{aiExplanation.rootCause}</p>
                </div>

                {aiExplanation.suggestedFixDirections?.length > 0 && (
                  <div>
                    <span className="font-bold opacity-70 block mb-1.5">Actionable Fix Directions:</span>
                    <ul className="space-y-1.5 pl-4 list-disc opacity-90">
                      {aiExplanation.suggestedFixDirections.map((step: string, idx: number) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAiExplainer(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-semibold transition-all shadow-sm"
              >
                Got It, Back to Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Success Modal (Box Design) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`border rounded-lg shadow-xl p-6 md:p-7 w-full max-w-md flex flex-col animate-in zoom-in-95 duration-150 ${
              isLight ? "bg-white border-slate-200 text-slate-800" : isMidnight ? "bg-[#111827] border-[#1f293d] text-slate-100" : "bg-[#161b22] border-[#252a36] text-slate-100"
            }`}
          >
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                <Trophy size={28} className="text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold">Assessment Submitted!</h2>
              <p className="text-sm opacity-75 mt-1.5">
                Your code submission has been recorded and submitted for evaluation.
              </p>
            </div>

            <div
              className={`p-4 rounded-md border mb-6 text-sm space-y-2.5 ${
                isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-black/20 border-white/10 text-slate-300"
              }`}
            >
              <div className="flex justify-between">
                <span className="opacity-60">Challenge:</span>
                <span className="font-semibold">{activeRepo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Candidate:</span>
                <span className="font-mono font-semibold">{user?.name} ({user?.userId})</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Total Time:</span>
                <span className="font-mono font-semibold">{fmtElapsed(elapsed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Status:</span>
                <span className="text-emerald-500 font-semibold flex items-center gap-1.5">
                  <Check size={15} /> Completed
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-semibold opacity-70 hover:opacity-100 rounded-md transition-colors"
              >
                Review Code
              </button>
              <button
                onClick={() => handleLogout()}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold shadow-sm transition-all active:scale-95"
              >
                <LogOut size={15} />
                <span>Exit & Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal (Box Design) */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div
            className={`border rounded-lg shadow-xl p-6 w-full max-w-sm flex flex-col ${
              isLight
                ? "bg-white border-slate-200 text-slate-800"
                : isMidnight
                ? "bg-[#111827] border-[#1f293d] text-slate-100"
                : "bg-[#161b22] border-[#252a36] text-slate-100"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0">
                <LogOut size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold">Sign Out?</h3>
                <p className="text-xs opacity-60">End current candidate session</p>
              </div>
            </div>

            <p className="text-sm opacity-80 my-2 leading-relaxed">
              Are you sure you want to sign out? Your code changes and elapsed assessment progress will remain saved.
            </p>

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className={`px-3.5 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  isLight
                    ? "border-slate-300 hover:bg-slate-100 text-slate-700"
                    : "border-white/10 hover:bg-white/5 text-slate-300"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-1.5 rounded-md text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
              >
                <LogOut size={14} />
                <span>Yes, Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
