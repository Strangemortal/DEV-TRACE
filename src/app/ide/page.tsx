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
  Lock,
  Pause,
  AlertTriangle,
  ShieldAlert,
  Terminal as TermIcon,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useTelemetryStore } from "@/store/telemetryStore";
import { useThemeStore } from "@/store/themeStore";
import { REPOSITORIES, isReadOnlyFile } from "@/data/brokenRepo";
import FileExplorer from "@/components/FileExplorer";
import MockTerminal, { TerminalLine } from "@/components/MockTerminal";
import LivePreview from "@/components/LivePreview";
import ThemeToggle from "@/components/ThemeToggle";
import MarkdownViewer from "@/components/MarkdownViewer";
import Editor from "@monaco-editor/react";

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
    { type: "system", text: "DevTrace Assessment Sandbox Ready" },
    { type: "info", text: "Type 'help' in the terminal to inspect available commands." },
  ]);
  const [termOpen, setTermOpen] = useState(true);
  const [termHeight, setTermHeight] = useState<number>(240);
  const [isDraggingTerm, setIsDraggingTerm] = useState(false);
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false);

  // Fullscreen & Tab Switch state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [fullscreenEscapeCount, setFullscreenEscapeCount] = useState(0);
  const fullscreenEscapeCountRef = useRef(0);
  const [fullscreenCountdown, setFullscreenCountdown] = useState(15);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedAssessmentRef = useRef(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const tabSwitchCountRef = useRef(0);
  const [showTabSwitchModal, setShowTabSwitchModal] = useState(false);

  // Test Pause/Stop state (from Admin side)
  const [isPaused, setIsPaused] = useState(false);

  // Copy/Paste blocking notification toast
  const [pasteBlockedToast, setPasteBlockedToast] = useState<string | null>(null);

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

  // Problem brief drawer state
  const [showProblemBrief, setShowProblemBrief] = useState(false);

  // AI Socratic Mentor & Explainer state
  const [showAiMentor, setShowAiMentor] = useState(false);
  const [hintLevel, setHintLevel] = useState<1 | 2 | 3>(1);
  const [aiHint, setAiHint] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<any>(null);
  const [showAiExplainer, setShowAiExplainer] = useState(false);

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

  // Fullscreen helper
  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
      setShowFullscreenPrompt(false);
      setShowFullscreenWarning(false);
      hasStartedAssessmentRef.current = true;
      try {
        sessionStorage.setItem("devtrace_fs_active", "true");
      } catch (_) {}

      // Clear any running countdown timer
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setFullscreenCountdown(15);

      logEvent({ type: "FOCUS_GAINED", meta: { fullscreen: true } });
    } catch (e) {
      console.warn("Fullscreen request denied or not supported", e);
      setIsFullscreen(true);
      setShowFullscreenPrompt(false);
      setShowFullscreenWarning(false);
      hasStartedAssessmentRef.current = true;
    }
  };

  // Automatic logout when grace period expires outside fullscreen
  const handleTimeoutAutoLogout = useCallback(async () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    logEvent({
      type: "FOCUS_LOST",
      meta: {
        reason: "FULLSCREEN_TIMEOUT_LOGOUT",
        strikeCount: fullscreenEscapeCountRef.current,
        timestamp: new Date().toISOString(),
      },
    });

    try {
      const dump = getDump();
      await fetch("/api/telemetry/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionStart,
          duration: elapsed,
          stability: Math.max(10, stabilityScore - 30),
          events: [
            ...dump,
            {
              type: "AUTO_LOGOUT",
              ts: Date.now(),
              meta: { reason: "FULLSCREEN_TIMEOUT", duration: elapsed },
            },
          ],
        }),
      });
    } catch (e) {
      console.warn("Telemetry submission error on auto-logout", e);
    }

    try {
      sessionStorage.removeItem("devtrace_fs_active");
    } catch (_) {}

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout error", e);
    }

    router.replace("/login?reason=fullscreen_timeout");
  }, [elapsed, getDump, logEvent, router, sessionStart, stabilityScore]);

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
          if (data.user.active === false || data.user.status === "paused") {
            setIsPaused(true);
          }

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
          setActiveFile(repo.activeFile || "README.md");
          setTermLines((prev) => [
            ...prev,
            { type: "info", text: "Active Challenge: " + repo.name },
            { type: "system", text: `[Environment] Sandbox: ${repo.environmentLabel || repo.framework?.toUpperCase() || repo.category.toUpperCase()}` },
            ...(repo.testCommand ? [{ type: "system", text: `[Test Runner] Command: ${repo.testCommand}` } as TerminalLine] : []),
          ]);
          clearEvents(); // Reset telemetry session for this run
          setAuthLoading(false);

          // Check if already in fullscreen or resuming active session
          const wasActive = typeof window !== "undefined" && sessionStorage.getItem("devtrace_fs_active") === "true";
          if (!document.fullscreenElement) {
            if (wasActive) {
              hasStartedAssessmentRef.current = true;
              fullscreenEscapeCountRef.current += 1;
              setFullscreenEscapeCount(fullscreenEscapeCountRef.current);
              setShowFullscreenWarning(true);
              setFullscreenCountdown(15);
              let remaining = 15;
              countdownIntervalRef.current = setInterval(() => {
                remaining -= 1;
                setFullscreenCountdown(remaining);
                if (remaining <= 0) {
                  if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                    countdownIntervalRef.current = null;
                  }
                  handleTimeoutAutoLogout();
                }
              }, 1000);
            } else {
              setShowFullscreenPrompt(true);
            }
          } else {
            setIsFullscreen(true);
            hasStartedAssessmentRef.current = true;
            try {
              sessionStorage.setItem("devtrace_fs_active", "true");
            } catch (_) {}
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        router.replace("/login");
      }
    }
    checkAuth();
    setMounted(true);
  }, [router, clearEvents, handleTimeoutAutoLogout]);

  // Elapsed timer handler (runs only when not paused)
  useEffect(() => {
    if (authLoading || isPaused) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [authLoading, isPaused]);

  // Fullscreen change listener with strike recording & countdown
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);

      if (!isFs) {
        // Exited fullscreen!
        const wasStarted =
          hasStartedAssessmentRef.current ||
          (typeof window !== "undefined" && sessionStorage.getItem("devtrace_fs_active") === "true");

        if (wasStarted && !authLoading) {
          fullscreenEscapeCountRef.current += 1;
          const currentStrikes = fullscreenEscapeCountRef.current;
          setFullscreenEscapeCount(currentStrikes);
          setShowFullscreenWarning(true);
          setShowFullscreenPrompt(false);

          logEvent({
            type: "FULLSCREEN_EXIT",
            meta: {
              reason: "FULLSCREEN_ESCAPED",
              strikeCount: currentStrikes,
              gracePeriodSeconds: 15,
              timestamp: new Date().toISOString(),
            },
          });

          // Start 15s countdown to auto-logout
          setFullscreenCountdown(15);
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }

          let remaining = 15;
          countdownIntervalRef.current = setInterval(() => {
            remaining -= 1;
            setFullscreenCountdown(remaining);
            if (remaining <= 0) {
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
              }
              handleTimeoutAutoLogout();
            }
          }, 1000);
        }
      } else {
        // Re-entered fullscreen!
        setShowFullscreenWarning(false);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setFullscreenCountdown(15);
        logEvent({
          type: "FOCUS_GAINED",
          meta: { fullscreen: true, recovered: true, timestamp: new Date().toISOString() },
        });
      }
    };

    document.addEventListener("fullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [authLoading, handleTimeoutAutoLogout, logEvent]);

  // Tab switch & focus loss tracking with strike counter
  useEffect(() => {
    if (authLoading) return;
    let focusLostTime: number | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        focusLostTime = Date.now();
        tabSwitchCountRef.current += 1;
        const currentCount = tabSwitchCountRef.current;
        setTabSwitchCount(currentCount);
        logEvent({
          type: "TAB_SWITCH",
          meta: { strikeCount: currentCount, timestamp: new Date().toISOString() },
        });
        setShowTabSwitchModal(true);
      } else {
        const duration = focusLostTime ? Math.round((Date.now() - focusLostTime) / 1000) : 0;
        focusLostTime = null;
        logEvent({
          type: "FOCUS_GAINED",
          meta: { duration_away_seconds: duration, timestamp: new Date().toISOString() },
        });
      }
    };

    const handleWindowBlur = () => {
      focusLostTime = Date.now();
      logEvent({ type: "FOCUS_LOST", meta: { timestamp: new Date().toISOString() } });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [authLoading, logEvent]);

  // Strict Copy/Paste Prevention
  useEffect(() => {
    const handleBlockClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const actionType = e.type === "paste" ? "Pasting" : "Copying";
      setPasteBlockedToast(`${actionType} is strictly prohibited in this assessment environment. All code must be typed.`);
      logEvent({
        type: "PASTE_DETECTED",
        meta: {
          blocked: true,
          action: e.type,
          file: activeFile,
          timestamp: new Date().toISOString(),
        },
      });
      setTimeout(() => setPasteBlockedToast(null), 3000);
    };

    const handleKeyDownBlock = (e: KeyboardEvent) => {
      // If outside fullscreen during assessment, block all code typing
      if (!isFullscreen && hasStartedAssessmentRef.current) {
        if (e.key !== "F11" && !e.altKey && e.key !== "Tab") {
          e.preventDefault();
          e.stopPropagation();
          setPasteBlockedToast("Fullscreen required. Code typing is locked until you return to fullscreen mode.");
          setTimeout(() => setPasteBlockedToast(null), 3000);
          return;
        }
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (isCtrlOrCmd && ["c", "v", "x", "insert"].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        setPasteBlockedToast("Copy, Cut, and Paste keyboard shortcuts are strictly disabled.");
        logEvent({
          type: "PASTE_DETECTED",
          meta: { blocked: true, shortcut: `Ctrl+${key.toUpperCase()}`, file: activeFile },
        });
        setTimeout(() => setPasteBlockedToast(null), 3000);
      } else if (e.shiftKey && e.key === "Insert") {
        e.preventDefault();
        e.stopPropagation();
        setPasteBlockedToast("Paste shortcut is strictly disabled.");
        setTimeout(() => setPasteBlockedToast(null), 3000);
      }
    };

    window.addEventListener("paste", handleBlockClipboard, true);
    window.addEventListener("copy", handleBlockClipboard, true);
    window.addEventListener("cut", handleBlockClipboard, true);
    window.addEventListener("keydown", handleKeyDownBlock, true);

    return () => {
      window.removeEventListener("paste", handleBlockClipboard, true);
      window.removeEventListener("copy", handleBlockClipboard, true);
      window.removeEventListener("cut", handleBlockClipboard, true);
      window.removeEventListener("keydown", handleKeyDownBlock, true);
    };
  }, [activeFile, logEvent, isFullscreen]);

  // Heartbeat & Live Telemetry Sync (Every 3 seconds)
  useEffect(() => {
    if (authLoading) return;

    const interval = setInterval(async () => {
      try {
        // 1. Check heartbeat & admin pause state
        const hbRes = await fetch("/api/telemetry/heartbeat");
        if (hbRes.ok) {
          const hbData = await hbRes.json();
          if (hbData.active === false || hbData.status === "paused") {
            setIsPaused(true);
          } else {
            setIsPaused(false);
          }
        }

        // 2. Stream live telemetry to server
        const dump = getDump();
        await fetch("/api/telemetry/live", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stability: stabilityScore,
            duration: elapsed,
            activeFile,
            eventCount: dump.length,
            tabSwitches: tabSwitchCount,
            fullscreenEscapes: fullscreenEscapeCount,
            recentEvents: dump.slice(-15),
          }),
        });
      } catch (err) {
        console.warn("Live telemetry heartbeat error:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [authLoading, elapsed, stabilityScore, activeFile, tabSwitchCount, fullscreenEscapeCount, getDump]);

  // Stability Calculation
  useEffect(() => {
    if (authLoading) return;
    const i = setInterval(() => {
      const dump = getDump();
      let score = 100;

      const errors = dump.filter((e) => e.type === "EXECUTION_RESULT" && !e.meta?.passed).length;
      score -= errors * 10;

      const pasteAttempts = dump.filter((e) => e.type === "PASTE_DETECTED").length;
      score -= pasteAttempts * 10;

      const tabSwitches = dump.filter((e) => e.type === "TAB_SWITCH").length;
      score -= tabSwitches * 10;

      const fullscreenEscapes = dump.filter((e) => e.type === "FULLSCREEN_EXIT").length;
      score -= fullscreenEscapes * 15;

      const focusLosses = dump.filter((e) => e.type === "FOCUS_LOST").length;
      score -= focusLosses * 5;

      setStabilityScore(Math.max(10, Math.min(100, score)));
    }, 2000);
    return () => clearInterval(i);
  }, [authLoading, getDump]);

  // Handle file select
  const handleFileSelect = (file: string) => {
    logEvent({
      type: "FILE_OPEN",
      meta: { file, previous_file: activeFile },
    });
    setActiveFile(file);
  };

  const isCurrentFileReadOnly = isReadOnlyFile(activeFile, activeRepo);

  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined || isCurrentFileReadOnly || isPaused || !isFullscreen) return;
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
  }, []);

  const handleSave = useCallback(async () => {
    if (!activeRepo || isPaused || !isFullscreen) return;
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const src = files[activeFile] ?? "";
    setDirtyFiles((d) => {
      const n = new Set(d);
      n.delete(activeFile);
      return n;
    });

    const validationLines = activeRepo.validateSave ? activeRepo.validateSave(activeFile, src, ts) : [];
    setTermLines((prev) => [...prev, ...validationLines, { type: "info", text: `Saved ${activeFile}`, ts }]);

    const isExecutionCategory = ["python", "cpp", "java", "node"].includes(activeRepo.category);
    if (isExecutionCategory) {
      setTermLines((prev) => [
        ...prev,
        { type: "system", text: `Executing ${activeRepo.testCommand || "test suite"}...`, ts },
      ]);
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
  }, [activeFile, files, activeRepo, isPaused, logEvent]);

  // Enhanced Terminal Command Runner
  const handleTerminalCommand = useCallback((cmd: string) => {
    const raw = cmd.trim();
    const lower = raw.toLowerCase();
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    setTermLines((p) => [...p, { type: "system", text: `User@DevTrace:~$ ${raw}`, ts }]);

    if (!raw) return;

    if (lower === "clear" || lower === "cls") {
      setTermLines([]);
      return;
    }

    if (lower === "help") {
      setTermLines((p) => [
        ...p,
        { type: "info", text: "Available Terminal Commands:" },
        { type: "system", text: "  test / run                   - Execute challenge test runner" },
        { type: "system", text: "  python manage.py test / npm test - Execute standard test runner" },
        { type: "system", text: "  ls / dir                     - List workspace repository files" },
        { type: "system", text: "  cat <filename>               - View contents of a file" },
        { type: "system", text: "  status                       - Display active test status & metrics" },
        { type: "system", text: "  whoami                       - Display candidate identity info" },
        { type: "system", text: "  pwd                          - Print working directory" },
        { type: "system", text: "  reset <filename>             - Reset a file to original challenge template" },
        { type: "system", text: "  clear                        - Clear terminal screen" },
      ]);
      return;
    }

    if (lower === "ls" || lower === "dir") {
      const order = activeRepo?.fileOrder || Object.keys(files);
      setTermLines((p) => [
        ...p,
        { type: "info", text: `Workspace Repository (${order.length} files):` },
        ...order.map((f: string) => {
          const isRo = isReadOnlyFile(f, activeRepo);
          const size = (files[f] || "").length;
          return {
            type: "system" as const,
            text: `  ${isRo ? "[READ-ONLY] " : "            "}${f.padEnd(24)} (${size} bytes)`,
          };
        }),
      ]);
      return;
    }

    if (lower.startsWith("cat ") || lower.startsWith("type ")) {
      const target = raw.slice(4).trim();
      if (!target) {
        setTermLines((p) => [...p, { type: "error", text: "Usage: cat <filename>" }]);
        return;
      }
      if (files[target] !== undefined) {
        const lines = files[target].split("\n");
        setTermLines((p) => [
          ...p,
          { type: "info", text: `--- ${target} (${lines.length} lines) ---` },
          ...lines.slice(0, 50).map((l, idx) => ({
            type: "system" as const,
            text: `${(idx + 1).toString().padStart(3, " ")} | ${l}`,
          })),
          ...(lines.length > 50 ? [{ type: "warning" as const, text: `... (${lines.length - 50} more lines omitted)` }] : []),
        ]);
      } else {
        setTermLines((p) => [...p, { type: "error", text: `File not found: ${target}` }]);
      }
      return;
    }

    if (lower === "pwd") {
      setTermLines((p) => [...p, { type: "info", text: "/workspace" }]);
      return;
    }

    if (lower === "whoami") {
      setTermLines((p) => [
        ...p,
        { type: "info", text: `Candidate: ${user?.name || "Anonymous"} (${user?.userId || "N/A"})` },
        { type: "system", text: `Role: Candidate Assessment Session | Status: ${isPaused ? "Paused" : "Active"}` },
      ]);
      return;
    }

    if (lower === "status") {
      setTermLines((p) => [
        ...p,
        { type: "info", text: `Active Challenge: ${activeRepo?.name || "N/A"}` },
        { type: "system", text: `Active File: ${activeFile} | Stability: ${stabilityScore}% | Elapsed: ${fmtElapsed(elapsed)}` },
        { type: "system", text: `Tab Switches / Focus Loss: ${tabSwitchCount} | Integrity Status: ${tabSwitchCount > 2 ? "Flagged" : "Nominal"}` },
      ]);
      return;
    }

    if (lower.startsWith("reset")) {
      const target = raw.slice(5).trim() || activeFile;
      if (isReadOnlyFile(target, activeRepo)) {
        setTermLines((p) => [...p, { type: "error", text: `Cannot reset read-only file: ${target}` }]);
        return;
      }
      const initialContent = activeRepo?.files?.[target]?.content;
      if (initialContent !== undefined) {
        setFiles((prev) => ({ ...prev, [target]: initialContent }));
        setDirtyFiles((d) => {
          const next = new Set(d);
          next.delete(target);
          return next;
        });
        setTermLines((p) => [...p, { type: "success", text: `Reset ${target} to initial challenge template.` }]);
      } else {
        setTermLines((p) => [...p, { type: "error", text: `File not found in challenge repository: ${target}` }]);
      }
      return;
    }

    // Test runner triggers
    if (
      lower === "test" ||
      lower === "run" ||
      lower === "npm test" ||
      lower.startsWith("python manage.py test") ||
      lower.startsWith("python test_") ||
      lower.startsWith("python test") ||
      lower.startsWith("node test") ||
      lower.startsWith("pytest") ||
      lower.startsWith("javac") ||
      lower === activeRepo?.testCommand?.toLowerCase()
    ) {
      handleSave();
      return;
    }

    if (lower.startsWith("git")) {
      setTermLines((p) => [...p, { type: "info", text: "Git operations are managed automatically by Save actions." }]);
      return;
    }

    setTermLines((p) => [
      ...p,
      { type: "error", text: `Command not found: ${raw}. Type 'help' for available commands or 'test' to run assertions.` },
    ]);
  }, [activeRepo, activeFile, files, user, isPaused, stabilityScore, elapsed, tabSwitchCount, handleSave]);

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
        hintText: "Review the unit test assertions in your test file for the expected values.",
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
    try {
      sessionStorage.removeItem("devtrace_fs_active");
    } catch (_) {}
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
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
    try {
      sessionStorage.removeItem("devtrace_fs_active");
    } catch (_) {}
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
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
      className={`h-screen w-screen flex flex-col overflow-hidden font-sans transition-colors duration-150 relative ${
        isLight
          ? "bg-slate-50 text-slate-900"
          : isMidnight
          ? "bg-[#0b0f19] text-slate-100"
          : "bg-[#0f1117] text-slate-200"
      }`}
    >
      {/* ── PAUSE OVERLAY (Triggered when stopped by Admin) ── */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6 animate-in fade-in duration-200">
          <div className="max-w-md w-full p-8 rounded-2xl border border-amber-500/30 bg-[#0f121d] text-white text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 animate-pulse">
              <Pause size={32} />
            </div>
            <h2 className="text-xl font-bold text-white">Assessment Paused by Invigilator</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your assessment session has been temporarily paused from the staff administrator desk. All your written code and elapsed assessment progress have been securely preserved.
            </p>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-amber-300 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Status: Paused (Awaiting Invigilator Resume Signal)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              This sandbox will automatically unlock the moment the administrator or interviewer resumes your test.
            </p>
          </div>
        </div>
      )}

      {/* ── FULLSCREEN PROMPT MODAL (Shown on start) ── */}
      {showFullscreenPrompt && !isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-in fade-in duration-200">
          <div className="max-w-md w-full p-7 rounded-2xl border border-blue-500/30 bg-[#0f121d] text-white text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
              <Maximize2 size={28} />
            </div>
            <h2 className="text-lg font-bold">Enter Fullscreen Mode</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              To maintain assessment integrity and prevent external distractions, this test requires fullscreen mode.
            </p>
            <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-500/20 text-xs text-blue-300 text-left space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <ShieldAlert size={14} className="text-blue-400 flex-shrink-0" />
                <span>Invigilation Rules Active:</span>
              </div>
              <ul className="text-[11px] opacity-80 list-disc pl-4 space-y-0.5">
                <li>Exiting fullscreen will be logged on your telemetry.</li>
                <li>Tab switching and window blur trigger integrity strikes.</li>
                <li>Copy & paste is disabled; code must be written manually.</li>
              </ul>
            </div>
            <button
              onClick={enterFullscreen}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <Maximize2 size={15} />
              <span>Launch Fullscreen IDE</span>
            </button>
          </div>
        </div>
      )}

      {/* ── FULLSCREEN ESCAPE WARNING MODAL (Triggered on escape or exiting fullscreen) ── */}
      {showFullscreenWarning && !isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="max-w-md w-full p-6 sm:p-7 rounded-2xl border-2 border-rose-500/50 bg-[#140b0f] text-white text-center shadow-2xl space-y-4 shadow-rose-950/50">
            {/* Alert Icon & Badge */}
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500 animate-bounce">
              <ShieldAlert size={34} />
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                Security Integrity Alert
              </span>
              <h2 className="text-xl font-bold mt-2 text-rose-400">Fullscreen Mode Exited!</h2>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                You escaped fullscreen mode. In accordance with examination invigilation rules, fullscreen is mandatory. Code typing has been locked.
              </p>
            </div>

            {/* Violation Details & Status */}
            <div className="grid grid-cols-2 gap-2 text-left">
              <div className="p-3 rounded-xl bg-black/40 border border-rose-500/20">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Violation</span>
                <span className="text-rose-400 font-mono font-bold text-sm">Strike #{fullscreenEscapeCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-rose-500/20">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Editor Status</span>
                <span className="text-amber-400 font-mono font-bold text-xs">Locked (No Typing)</span>
              </div>
            </div>

            {/* Live Countdown Timer Card */}
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-center space-y-2">
              <div className="text-[11px] text-rose-300 font-semibold uppercase tracking-wider">
                Automatic Session Termination In
              </div>
              <div className="text-3xl font-black font-mono text-rose-400 tracking-wider animate-pulse">
                00:{fullscreenCountdown < 10 ? `0${fullscreenCountdown}` : fullscreenCountdown}
              </div>
              {/* Visual Progress Bar */}
              <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden border border-rose-500/20">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${Math.max(0, Math.min(100, (fullscreenCountdown / 15) * 100))}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                If you do not return to fullscreen before the timer expires, your test will be automatically submitted and you will be logged out.
              </p>
            </div>

            {/* Re-enter Fullscreen Button */}
            <button
              onClick={enterFullscreen}
              className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-900/40 active:scale-95 flex items-center justify-center gap-2"
            >
              <Maximize2 size={16} />
              <span>Return to Fullscreen Now</span>
            </button>
          </div>
        </div>
      )}

      {/* ── TAB SWITCH WARNING MODAL (Triggered on tab change) ── */}
      {showTabSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="max-w-md w-full p-6 rounded-2xl border border-rose-500/40 bg-[#140b0f] text-white text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500 animate-bounce">
              <ShieldAlert size={30} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                Security Integrity Alert
              </span>
              <h2 className="text-lg font-bold mt-2 text-rose-400">Tab Switch Detected!</h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                You switched tabs or minimized the assessment window. This violation has been recorded on your invigilator telemetry log.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-rose-500/20 text-xs font-mono flex items-center justify-between text-slate-200">
              <span className="opacity-70 font-sans">Recorded Tab Switches:</span>
              <span className="text-rose-400 font-bold font-mono text-sm">Strike #{tabSwitchCount}</span>
            </div>

            <button
              onClick={() => setShowTabSwitchModal(false)}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              I Understand & Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* ── BLOCKED COPY/PASTE TOAST ── */}
      {pasteBlockedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold shadow-2xl animate-in slide-in-from-top-3 duration-150 border border-rose-400">
          <AlertTriangle size={15} className="flex-shrink-0" />
          <span>{pasteBlockedToast}</span>
        </div>
      )}

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
            <div className={`flex items-center gap-1.5 font-medium ${isPaused ? "text-amber-500" : "text-emerald-500"}`}>
              <span className={`w-2 h-2 rounded-full ${isPaused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`} />
              <span className="text-xs font-semibold">{isPaused ? "Paused" : "Active"}</span>
            </div>
            <div className={`w-px h-3.5 ${isLight ? "bg-slate-300" : "bg-white/10"}`} />
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="opacity-60" />
              <span className="font-mono font-bold text-xs md:text-sm">{fmtElapsed(elapsed)}</span>
            </div>
            {(tabSwitchCount > 0 || fullscreenEscapeCount > 0) && (
              <>
                <div className={`w-px h-3.5 ${isLight ? "bg-slate-300" : "bg-white/10"}`} />
                <div className="flex items-center gap-1.5 text-rose-500 font-bold text-xs" title="Integrity strikes logged">
                  <ShieldAlert size={13} />
                  <span>{tabSwitchCount + fullscreenEscapeCount} Strikes</span>
                </div>
              </>
            )}
          </div>

          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={enterFullscreen}
            title={isFullscreen ? "Fullscreen active" : "Enter Fullscreen Mode"}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              isFullscreen
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                : isLight
                ? "border-slate-300 hover:bg-slate-100 text-slate-700"
                : "border-white/10 hover:bg-white/10 text-slate-300"
            }`}
          >
            <Maximize2 size={13} />
            <span className="hidden sm:inline">{isFullscreen ? "Fullscreen" : "Full Screen"}</span>
          </button>

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
            disabled={isPaused || !isFullscreen}
            className="flex items-center gap-1.5 text-xs md:text-sm px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50"
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
          repo={activeRepo}
          isCollapsed={isExplorerCollapsed}
          onToggleCollapse={() => setIsExplorerCollapsed((prev) => !prev)}
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
              const isRo = isReadOnlyFile(file, activeRepo);
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
                  {isRo && <Lock size={11} className="opacity-50" />}
                  {dirtyFiles.has(file) && !isRo && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                </button>
              );
            })}

            <div className="flex-1" />

            <div className="px-3">
              <button
                onClick={handleSave}
                disabled={isPaused || !isFullscreen}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs md:text-sm font-semibold transition-all shadow-sm disabled:opacity-50 ${
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

          {/* READ-ONLY FILE WARNING BANNER */}
          {isCurrentFileReadOnly && (
            <div className="h-8 px-4 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between font-medium flex-shrink-0">
              <div className="flex items-center gap-2">
                <Lock size={13} />
                <span>Read-Only Specification / Test Suite ({activeFile}) — Protected against modification to ensure assessment integrity</span>
              </div>
              <span className="text-[10px] font-mono opacity-80 uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                Locked
              </span>
            </div>
          )}

          <div className="flex-1 min-w-0 flex overflow-hidden relative">
            {/* Monaco Editor Container */}
            <div
              className={`flex-1 min-w-0 h-full relative transition-colors ${
                isLight ? "bg-white" : isMidnight ? "bg-[#0b0f19]" : "bg-[#0f1117]"
              }`}
            >
              {!isFullscreen && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 text-center pointer-events-auto select-none">
                  <div className="p-5 rounded-2xl bg-[#140b0f] border border-rose-500/40 text-rose-400 max-w-sm flex flex-col items-center gap-2.5 shadow-2xl">
                    <ShieldAlert size={32} className="text-rose-500 animate-pulse" />
                    <div className="text-sm font-bold text-rose-300">Editor Locked</div>
                    <p className="text-xs text-slate-300">
                      Typing and code editing are strictly disabled outside fullscreen mode. Return to fullscreen to resume writing code.
                    </p>
                    <button
                      onClick={enterFullscreen}
                      className="mt-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-2"
                    >
                      <Maximize2 size={14} />
                      <span>Return to Fullscreen</span>
                    </button>
                  </div>
                </div>
              )}

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
                    wordWrap: "on",
                    automaticLayout: true,
                    scrollbar: { vertical: "auto", horizontal: "auto" },
                    lineNumbers: "on",
                    renderLineHighlight: "all",
                    padding: { top: 16 },
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    bracketPairColorization: { enabled: true },
                    readOnly: isCurrentFileReadOnly || isPaused || !isFullscreen,
                    contextmenu: false, // Disables right-click paste/copy menu
                    copyWithSyntaxHighlighting: false,
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
                      {activeRepo?.fileOrder?.map((file: string) => {
                        const isRo = isReadOnlyFile(file, activeRepo);
                        return (
                          <button
                            key={file}
                            onClick={() => handleFileSelect(file)}
                            className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-all flex items-center gap-1.5 ${
                              activeFile === file
                                ? "bg-sky-600 border-sky-500 text-white font-bold shadow-sm"
                                : isLight
                                ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                                : "bg-black/30 border-white/10 text-slate-300 hover:bg-white/10"
                            }`}
                          >
                            <span>{file}</span>
                            {isRo && <Lock size={10} className="opacity-60" />}
                          </button>
                        );
                      })}
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
                  Terminal & Test Console
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
                Your code submission and telemetry stream have been securely recorded.
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
