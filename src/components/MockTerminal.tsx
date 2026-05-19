"use client";

import { useEffect, useRef } from "react";
import { Terminal, X, Minus, Trash2 } from "lucide-react";

export interface TerminalLine {
  type: "info" | "success" | "error" | "warning" | "system";
  text: string;
  ts?: string;
}

interface Props {
  lines: TerminalLine[];
  onCommand?: (cmd: string) => void;
  onClear?: () => void;
}

const COLOR: Record<TerminalLine["type"], string> = {
  info: "text-blue-400",
  success: "text-emerald-400",
  error: "text-rose-400",
  warning: "text-amber-400",
  system: "text-indigo-400",
};

const PREFIX: Record<TerminalLine["type"], string> = {
  info: "•",
  success: "✓",
  error: "✕",
  warning: "⚠",
  system: "λ",
};

export default function MockTerminal({ lines, onCommand, onClear }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const cmd = e.currentTarget.value.trim();
      if (cmd) {
        onCommand?.(cmd);
        e.currentTarget.value = "";
      }
    }
  };

  return (
    <div 
      className="flex flex-col h-full bg-[#0a0a0c] font-mono text-xs border border-white/5 shadow-2xl"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#121216] border-b border-white/5 select-none">
        <div className="flex gap-1.5 mr-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
        </div>
        <Terminal size={12} className="text-slate-400" />
        <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">
          Console — v1.2.0
        </span>
        
        <div className="ml-auto flex items-center gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); onClear?.(); }}
            className="p-1 hover:bg-white/5 rounded text-slate-500 hover:text-slate-300 transition-colors"
            title="Clear Console"
          >
            <Trash2 size={12} />
          </button>
          <Minus size={12} className="text-slate-600 cursor-pointer hover:text-slate-400" />
          <X size={12} className="text-slate-600 cursor-pointer hover:text-slate-400" />
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {lines.map((line, i) => (
          <div key={i} className={`flex gap-3 leading-6 animate-in fade-in slide-in-from-left-2 duration-300 ${COLOR[line.type]}`}>
            <span className="flex-shrink-0 w-4 text-center opacity-60 font-bold">{PREFIX[line.type]}</span>
            <span className="flex-1 whitespace-pre-wrap font-mono tracking-tight">{line.text}</span>
            {line.ts && (
              <span className="text-slate-700 flex-shrink-0 text-[10px] tabular-nums">{line.ts}</span>
            )}
          </div>
        ))}
        {/* Input line */}
        <div className="flex gap-3 text-slate-400 mt-2 items-center">
          <span className="w-4 text-center text-indigo-500 font-bold">❯</span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-slate-200 placeholder-slate-800 p-0 m-0 font-mono focus:ring-0"
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
