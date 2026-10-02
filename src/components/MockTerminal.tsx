"use client";

import { useState, useEffect, useRef } from "react";
import { Terminal, Trash2, Sparkles } from "lucide-react";
import { useThemeStore } from "@/store/themeStore";

export interface TerminalLine {
  type: "info" | "success" | "error" | "warning" | "system";
  text: string;
  ts?: string;
}

interface Props {
  lines: TerminalLine[];
  onCommand?: (cmd: string) => void;
  onClear?: () => void;
  onExplainError?: (errorText: string) => void;
}

const PREFIX: Record<TerminalLine["type"], string> = {
  info: "•",
  success: "✓",
  error: "✕",
  warning: "⚠",
  system: "λ",
};

export default function MockTerminal({ lines, onCommand, onClear, onExplainError }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme } = useThemeStore();
  const isLight = theme === "light";

  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const cmd = e.currentTarget.value.trim();
      if (cmd) {
        setCmdHistory((prev) => [...prev, cmd]);
        setHistoryIndex(-1);
        onCommand?.(cmd);
        e.currentTarget.value = "";
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIndex = historyIndex === -1 ? cmdHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      if (inputRef.current) {
        inputRef.current.value = cmdHistory[nextIndex] || "";
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= cmdHistory.length) {
        setHistoryIndex(-1);
        if (inputRef.current) inputRef.current.value = "";
      } else {
        setHistoryIndex(nextIndex);
        if (inputRef.current) inputRef.current.value = cmdHistory[nextIndex] || "";
      }
    }
  };

  const getLineColor = (type: TerminalLine["type"]) => {
    if (isLight) {
      switch (type) {
        case "success": return "text-emerald-700";
        case "error": return "text-rose-700";
        case "warning": return "text-amber-700";
        case "system": return "text-indigo-700 font-semibold";
        case "info":
        default: return "text-slate-700";
      }
    }
    switch (type) {
      case "success": return "text-emerald-400";
      case "error": return "text-rose-400";
      case "warning": return "text-amber-400";
      case "system": return "text-indigo-400 font-semibold";
      case "info":
      default: return "text-slate-300";
    }
  };

  return (
    <div 
      className={`flex flex-col h-full font-mono text-xs border-t transition-colors duration-150 ${
        isLight
          ? "bg-white border-slate-200 text-slate-800"
          : theme === "midnight"
          ? "bg-[#0d121f] border-[#1f293d] text-slate-200"
          : "bg-[#101319] border-[#252a36] text-slate-200"
      }`}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Title bar */}
      <div
        className={`flex items-center gap-2 px-4 py-2 border-b select-none ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-black/20 border-white/5"
        }`}
      >
        <div className="flex gap-1.5 mr-2">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-400/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-400/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-400/40" />
        </div>
        <Terminal size={12} className={isLight ? "text-slate-500" : "text-slate-400"} />
        <span className="text-[10px] font-semibold tracking-wider uppercase opacity-60">
          Terminal & Test Console
        </span>
        
        <div className="ml-auto flex items-center gap-2">
          {lines.some((l) => l.type === "error") && onExplainError && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const errs = lines.filter((l) => l.type === "error").map((l) => l.text).join("\n");
                onExplainError(errs);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-all active:scale-95 shadow-sm"
              title="Explain terminal errors with AI"
            >
              <Sparkles size={11} className="text-indigo-400" />
              <span>Explain with AI</span>
            </button>
          )}

          <button 
            onClick={(e) => { e.stopPropagation(); onClear?.(); }}
            className={`p-1 rounded transition-colors ${
              isLight ? "hover:bg-slate-200 text-slate-500" : "hover:bg-white/10 text-slate-400"
            }`}
            title="Clear Console"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1 scrollbar-thin">
        {lines.map((line, i) => (
          <div key={i} className={`flex gap-2.5 leading-5 ${getLineColor(line.type)}`}>
            <span className="flex-shrink-0 w-3 text-center opacity-60 font-bold">{PREFIX[line.type]}</span>
            <span className="flex-1 whitespace-pre-wrap font-mono">{line.text}</span>
            {line.ts && (
              <span className="opacity-40 flex-shrink-0 text-[10px] tabular-nums">{line.ts}</span>
            )}
          </div>
        ))}
        {/* Input line */}
        <div className={`flex gap-2.5 mt-2 items-center ${isLight ? "text-slate-600" : "text-slate-400"}`}>
          <span className="w-3 text-center font-bold text-blue-500">❯</span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none p-0 m-0 font-mono text-xs focus:ring-0"
            onKeyDown={handleKeyDown}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            placeholder="Type a command..."
          />
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
