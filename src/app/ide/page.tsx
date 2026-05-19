"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Send,
  GitBranch,
  Wifi,
  Clock,
  ChevronDown,
  ChevronUp,
  Activity,
  Code2,
  Trophy,
  Zap,
  LogOut,
  User,
} from "lucide-react";
import { useTelemetryStore } from "@/store/telemetryStore";
import { REPOSITORIES } from "@/data/brokenRepo";
import FileExplorer from "@/components/FileExplorer";
import MockTerminal, { TerminalLine } from "@/components/MockTerminal";
import LivePreview from "@/components/LivePreview";
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

export default function DevTraceIDEPage() {
  const router = useRouter();
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
    { type: "system", text: "DevTrace Core v1.2.0 initialized" },
  ]);
  const [termOpen, setTermOpen] = useState(true);

  // Telemetry
  const { logEvent, getDump, sessionStart, clearEvents } = useTelemetryStore();
  const [stabilityScore, setStabilityScore] = useState(100);

  // Keystroke batching
  const keystrokeBuffer = useRef<{ added: number; deleted: number }>({ added: 0, deleted: 0 });

  // Elapsed timer
  const [elapsed, setElapsed] = useState(0);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [telemetryJson, setTelemetryJson] = useState("");
  const [submittingTelemetry, setSubmittingTelemetry] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

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
        } else {
          setUser(data.user);
          // Restrict candidate to assignedRepoId
          const assignedId = data.user.assignedRepoId || REPOSITORIES[0].id;
          const repo = REPOSITORIES.find((r) => r.id === assignedId) || REPOSITORIES[0];
          setActiveRepoId(repo.id);
          setActiveRepo(repo);
          setFiles(Object.fromEntries(Object.entries(repo.files).map(([k, v]) => [k, v.content])));
          setActiveFile(repo.activeFile);
          setTermLines((prev) => [
            ...prev,
            { type: "info", text: "Ready for challenge: " + repo.name },
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
      const events = getDump();
      const rawKeystrokes = events.filter(e => e.type === "KEYSTROKE_RAW");
      if (rawKeystrokes.length > 0) {
        const deleted = rawKeystrokes.filter(e => (e.meta.diff || 0) < 0).length;
        const total = rawKeystrokes.length;
        setStabilityScore(Math.round(100 * (1 - deleted / total)));
      }
    }, 5000);
    return () => clearInterval(i);
  }, [getDump, authLoading]);

  // Window Focus & Idle logic
  const blurTime = useRef<number | null>(null);
  useEffect(() => {
    if (authLoading || !activeFile) return;
    const handleBlur = () => { blurTime.current = Date.now(); logEvent({ type: "FOCUS_LOST", meta: { file: activeFile } }); };
    const handleFocus = () => {
      if (blurTime.current) {
        const duration = Date.now() - blurTime.current;
        logEvent({ type: "FOCUS_DURATION", meta: { file: activeFile, duration_ms: duration } });
        blurTime.current = null;
      }
      logEvent({ type: "FOCUS_GAINED", meta: { file: activeFile } });
    };
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    return () => { window.removeEventListener("blur", handleBlur); window.removeEventListener("focus", handleFocus); };
  }, [activeFile, logEvent, authLoading]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  const fmtElapsed = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const handleFileSelect = useCallback((file: string) => {
    setActiveFile(file);
    logEvent({ type: "FILE_OPEN", meta: { file, previous_file: activeFile } });
  }, [activeFile, logEvent]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value === undefined) return;
    const prev = files[activeFile] ?? "";
    const diff = value.length - prev.length;
    if (diff > 0) keystrokeBuffer.current.added += diff;
    else keystrokeBuffer.current.deleted += Math.abs(diff);
    logEvent({ type: "KEYSTROKE_RAW", meta: { file: activeFile, diff, total_length: value.length } });
    setFiles((f) => ({ ...f, [activeFile]: value }));
    setDirtyFiles((d) => new Set(d).add(activeFile));
  }, [activeFile, files, logEvent]);

  const handleEditorMount = useCallback((editor: any) => {
    editor.onDidPaste((e: any) => {
      const model = editor.getModel();
      const pastedText: string = model ? model.getValueInRange(e.range) : "";

      const lineCount  = Math.abs(e.range.endLineNumber - e.range.startLineNumber) + 1;
      const charCount  = pastedText.length;
      const wordCount  = pastedText.trim().split(/\s+/).filter(Boolean).length;
      const snippet    = pastedText.slice(0, 120) + (pastedText.length > 120 ? "…" : "");

      const pasteObject = {
        file:        activeFile,
        lines_pasted: lineCount,
        chars_pasted: charCount,
        words_pasted: wordCount,
        content:     pastedText,
        preview:     snippet,
        range: {
          startLine: e.range.startLineNumber,
          endLine:   e.range.endLineNumber,
          startCol:  e.range.startColumn,
          endCol:    e.range.endColumn,
        },
      };

      logEvent({ type: "PASTE_DETECTED", meta: pasteObject });

      if (lineCount > 5) {
        setTermLines(p => [...p, {
          type: "warning",
          text: `[Telemetry] Large paste in ${activeFile} — ${lineCount} lines / ${charCount} chars recorded`,
        }]);
      }
    });
  }, [activeFile, logEvent]);

  const handleSave = useCallback(async () => {
    if (!activeRepo) return;
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const src = files[activeFile] ?? "";
    setDirtyFiles((d) => { const n = new Set(d); n.delete(activeFile); return n; });

    const validationLines = activeRepo.validateSave(activeFile, src, ts);
    setTermLines(prev => [...prev, ...validationLines, { type: "info", text: `Saved ${activeFile}`, ts }]);

    if ((activeRepo.category === "python" && activeFile.endsWith(".py")) ||
        (activeRepo.category === "cpp"    && activeFile.endsWith(".cpp")) ||
        (activeRepo.category === "java"   && activeFile.endsWith(".java"))) {
      const langLabels: Record<string, string> = { python: "Python", cpp: "C++", java: "Java" };
      const lang = activeRepo.category as string;
      setTermLines(prev => [...prev, { type: "system", text: `Spawning secure ${langLabels[lang]} container…`, ts }]);
      try {
        const res = await fetch("/api/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: src, language: lang }),
        });
        const data = await res.json();
        if (data.error) setTermLines(prev => [...prev, { type: "error", text: data.error, ts }]);
        if (data.output) setTermLines(prev => [...prev, { type: "info", text: data.output.trimEnd(), ts }]);

        if (activeRepo.checkExecution) {
          const result = activeRepo.checkExecution(data.output || "", data.error || "");
          setTermLines(prev => [...prev, { type: result.passed ? "success" : "error", text: `Result: ${result.message}`, ts }]);
          logEvent({ type: "EXECUTION_RESULT", meta: { passed: result.passed, summary: result.message } });
        }
      } catch (e) {
        setTermLines(prev => [...prev, { type: "error", text: "Execution service unavailable.", ts }]);
      }
    }
  }, [activeFile, files, activeRepo, logEvent]);

  const handleTerminalCommand = useCallback((cmd: string) => {
    const lower = cmd.toLowerCase().trim();
    if (lower === "clear") { setTermLines([]); return; }
    setTermLines(p => [...p, { type: "system", text: `Guest@DevTrace:~$ ${cmd}` }]);
    if (lower.startsWith("git")) {
       setTermLines(p => [...p, { type: "info", text: "Git operations are currently restricted to Save actions." }]);
    } else {
       setTermLines(p => [...p, { type: "error", text: `Command not found: ${cmd}` }]);
    }
  }, []);

  const handleSubmit = async () => {
    setSubmittingTelemetry(true);
    const dump = getDump();
    const telemetryPayload = {
      sessionStart,
      duration: elapsed,
      stability: stabilityScore,
      events: dump,
    };
    setTelemetryJson(JSON.stringify(telemetryPayload, null, 2));

    try {
      const response = await fetch("/api/admin/telemetry", {
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

  if (authLoading || !activeRepo) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#08090a] text-slate-300">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 animate-spin">
            <Zap size={24} className="text-white" fill="white" />
          </div>
          <span className="text-xs uppercase font-black tracking-widest text-slate-500 animate-pulse">
            Configuring DevTrace Session...
          </span>
        </div>
      </div>
    );
  }

  const currentLang = activeRepo.files[activeFile]?.language ?? "plaintext";

  return (
    <div className="h-screen w-screen flex flex-col bg-[#08090a] text-slate-300 overflow-hidden font-sans selection:bg-blue-500/30">
      {/* ── TOP NAV ── */}
      <header className="h-14 flex items-center gap-4 px-6 bg-[#0d0e11]/80 backdrop-blur-xl border-b border-white/5 flex-shrink-0 z-[60] shadow-2xl">
        <div className="flex items-center gap-3 mr-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap size={18} className="text-white" fill="white" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-[0.2em] text-white uppercase leading-none mb-1">DevTrace</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Candidate Session</span>
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-white/5 mx-2" />

        <div className="flex items-center gap-3">
          <div className="bg-[#16181d] border border-white/5 text-slate-300 text-[11px] font-bold rounded-lg px-4 py-1.5 cursor-default min-w-[200px]">
            {activeRepo.name}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
              activeRepo.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-500' : 
              activeRepo.difficulty === 'Intermediate' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
            }`}>
              {activeRepo.difficulty}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">{activeRepo.estimatedTime}</span>
          </div>
        </div>

        <div className="flex-1" />

        {/* Candidate Profile Details */}
        <div className="flex items-center gap-2 mr-4 text-xs font-medium text-slate-400">
          <User size={14} className="text-slate-500" />
          <span>{user?.name}</span>
          <span className="text-[10px] text-slate-600 bg-white/5 px-2 py-0.5 rounded font-mono">
            {user?.userId}
          </span>
        </div>

        {/* TELEMETRY HUD */}
        <div className="hidden lg:flex items-center gap-6 px-6 py-2 bg-white/[0.02] rounded-2xl border border-white/5 mr-4">
           <div className="flex flex-col">
             <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Stability</span>
             <div className="flex items-center gap-2">
               <Activity size={10} className="text-blue-400" />
               <span className="text-xs font-mono font-bold text-white">{stabilityScore}%</span>
             </div>
           </div>
           <div className="w-px h-6 bg-white/5" />
           <div className="flex flex-col">
             <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Timer</span>
             <div className="flex items-center gap-2">
               <Clock size={10} className="text-slate-400" />
               <span className="text-xs font-mono font-bold text-white">{fmtElapsed(elapsed)}</span>
             </div>
           </div>
        </div>

        <button
          onClick={handleSubmit}
          className="group flex items-center gap-2 text-[11px] px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white rounded-xl font-bold transition-all hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95 mr-2"
        >
          <Trophy size={14} className="group-hover:rotate-12 transition-transform" />
          Finish Challenge
        </button>

        <button
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-colors"
        >
          <LogOut size={16} />
        </button>
      </header>

      {/* ── MAIN BODY ── */}
      <main className="flex-1 flex overflow-hidden">
        <FileExplorer
          files={activeRepo.fileOrder}
          activeFile={activeFile}
          onSelect={handleFileSelect}
          dirtyFiles={dirtyFiles}
        />

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* TABS */}
          <div className="flex items-center bg-[#0d0e11] border-b border-white/5 h-10 flex-shrink-0">
            {activeRepo.fileOrder.map((file: string) => (
              <button
                key={file}
                onClick={() => handleFileSelect(file)}
                className={`flex items-center gap-2 px-6 h-full text-[11px] font-medium border-r border-white/5 transition-all relative ${
                  activeFile === file
                    ? "bg-[#16181d] text-blue-400"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]"
                }`}
              >
                {activeFile === file && <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />}
                {file}
                {dirtyFiles.has(file) && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
              </button>
            ))}
            
            <div className="flex-1" />
            
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 h-full text-[10px] font-bold text-slate-500 hover:text-white transition-colors border-l border-white/5"
            >
              <Code2 size={12} />
              Save & Run
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 relative bg-[#0d0e11]">
              {!mounted ? (
                <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm animate-pulse">Loading IDE Environment...</div>
              ) : (
                <Editor
                  height="100%"
                  language={currentLang}
                  value={files[activeFile] ?? ""}
                  onChange={handleEditorChange}
                  onMount={handleEditorMount}
                  theme="vs-dark"
                  options={{
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    minimap: { enabled: false },
                    scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
                    lineNumbers: "on",
                    renderLineHighlight: "all",
                    padding: { top: 20 },
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    bracketPairColorization: { enabled: true },
                  }}
                />
              )}
            </div>

            {/* DYNAMIC SIDEBAR (Insights or Preview) */}
            <aside className="w-[340px] border-l border-white/5 bg-[#0d0e11] flex flex-col flex-shrink-0">
              {activeRepo.category === "web" ? (
                <LivePreview
                  html={files["index.html"] ?? ""}
                  css={files["style.css"] ?? ""}
                  js={files["script.js"] ?? ""}
                />
            ) : (
                <div className="flex-1 flex flex-col p-6 overflow-y-auto scrollbar-none">
                   <div className="flex items-center gap-2 mb-6">
                     <div className="w-2 h-2 rounded-full bg-blue-500" />
                     <h3 className="text-[10px] uppercase font-black tracking-widest text-slate-500">Execution Insights</h3>
                   </div>
                   
                   <div className="space-y-4">
                     <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-[9px] font-bold text-slate-600 uppercase">Current Context</span>
                        <p className="text-xs text-slate-300 mt-1 font-medium">{activeRepo.name}</p>
                     </div>

                     <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-[9px] font-bold text-slate-600 uppercase">Runtime</span>
                        <p className="text-xs mt-1 font-bold"
                          style={{ color:
                            activeRepo.category === "cpp"  ? "#a78bfa" :
                            activeRepo.category === "java" ? "#fb923c" :
                            activeRepo.category === "python" ? "#34d399" : "#60a5fa"
                          }}>
                          {activeRepo.category === "cpp"    ? "GCC 12 · C++17" :
                           activeRepo.category === "java"   ? "OpenJDK 17" :
                           activeRepo.category === "python" ? "Python 3.9 Alpine" : "Browser Sandbox"}
                        </p>
                     </div>
                     
                     <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-[9px] font-bold text-slate-600 uppercase">Telemetry Stream</span>
                        <div className="mt-2 space-y-2">
                           <div className="flex justify-between text-[10px]">
                              <span className="text-slate-500">Key Events</span>
                              <span className="text-blue-400 font-mono">{getDump().length}</span>
                           </div>
                           <div className="flex justify-between text-[10px]">
                              <span className="text-slate-500">Session ID</span>
                              <span className="text-slate-300 font-mono">#{sessionStart.toString().slice(-6)}</span>
                           </div>
                        </div>
                     </div>

                     <div className="flex-1" />
                     
                     <div className="mt-auto pt-4 border-t border-white/5">
                       <div className="p-4 rounded-xl bg-[#2563eb]/10 border border-[#2563eb]/20">
                          <p className="text-[10px] text-blue-300 leading-relaxed italic">
                            "Focus on logic efficiency. The container monitors memory and execution time."
                          </p>
                       </div>
                     </div>
                   </div>
                </div>
              )}
            </aside>
          </div>

          {/* TERMINAL FOOTER */}
          <div
            className="flex-shrink-0 transition-all duration-500 ease-in-out z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
            style={{ height: termOpen ? "220px" : "36px" }}
          >
            <div 
              className="h-9 flex items-center px-4 bg-[#121418] border-t border-white/5 cursor-pointer select-none group hover:bg-[#16181e]"
              onClick={() => setTermOpen(!termOpen)}
            >
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase font-black tracking-[0.2em] text-slate-500 group-hover:text-slate-300 transition-colors">
                  Integrated Console
                </span>
                {termOpen ? <ChevronDown size={12} className="text-slate-600" /> : <ChevronUp size={12} className="text-slate-600" />}
              </div>
              <div className="ml-auto flex items-center gap-3">
                 <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600 uppercase">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                    Container Active
                 </div>
              </div>
            </div>
            {termOpen && (
              <div style={{ height: "184px" }}>
                <MockTerminal 
                  lines={termLines} 
                  onCommand={handleTerminalCommand} 
                  onClear={() => setTermLines([])}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300 p-4">
          <div className="bg-[#0d0e11] border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] p-8 w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <Trophy size={28} className="text-emerald-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Challenge Submitted</h2>
                <p className="text-sm text-slate-500">
                  {submitSuccess 
                    ? "Your performance telemetry has been submitted to the database."
                    : "Failed to upload to server database. Please download and send manually."
                  }
                </p>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-black/40 p-6 rounded-2xl border border-white/5 mb-6 scrollbar-thin">
              <pre className="text-[11px] text-emerald-400/80 font-mono leading-relaxed">
                {telemetryJson}
              </pre>
            </div>
            
            <div className="flex justify-end gap-4">
              <button
                onClick={() => handleLogout()}
                className="px-6 py-3 text-sm font-bold text-rose-500 hover:text-rose-400 transition-colors"
              >
                Logout & Finish
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 text-sm font-bold text-slate-400 hover:text-white transition-colors"
              >
                Return to Editor
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([telemetryJson], { type: "application/json" });
                  downloadBlob(blob, "session_telemetry.json");
                }}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20"
              >
                <Download size={16} />
                Download Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
