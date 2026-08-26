"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun, Sparkles, ChevronDown } from "lucide-react";
import { useThemeStore, ThemeMode } from "@/store/themeStore";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = (localStorage.getItem("devtrace_theme") as ThemeMode) || "dark";
    setTheme(saved);
  }, [setTheme]);

  if (!mounted) return <div className="w-8 h-8 rounded-lg bg-white/5" />;

  const themeOptions: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { id: "dark", label: "Clean Dark", icon: <Moon size={14} className="text-blue-400" /> },
    { id: "light", label: "Clean Light", icon: <Sun size={14} className="text-amber-500" /> },
    { id: "midnight", label: "Midnight Blue", icon: <Sparkles size={14} className="text-indigo-400" /> },
  ];

  const currentOption = themeOptions.find((t) => t.id === theme) || themeOptions[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all text-xs font-medium ${
          theme === "light"
            ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 shadow-sm"
            : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 shadow-sm"
        }`}
        title="Change Theme"
      >
        <span>{currentOption.icon}</span>
        {!compact && <span className="text-[11px] font-semibold">{currentOption.label}</span>}
        <ChevronDown size={12} className="opacity-60" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`absolute right-0 mt-2 w-40 rounded-xl border shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 ${
              theme === "light"
                ? "bg-white border-slate-200 text-slate-800 shadow-slate-300/50"
                : theme === "midnight"
                ? "bg-[#111827] border-[#1f293d] text-slate-200 shadow-black/60"
                : "bg-[#161b22] border-[#30363d] text-slate-200 shadow-black/60"
            }`}
          >
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Select Theme
            </div>
            {themeOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setTheme(opt.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                  theme === opt.id
                    ? theme === "light"
                      ? "bg-blue-50 text-blue-600 font-semibold"
                      : "bg-blue-500/10 text-blue-400 font-semibold"
                    : theme === "light"
                    ? "hover:bg-slate-100 text-slate-700"
                    : "hover:bg-white/5 text-slate-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  {opt.icon}
                  <span>{opt.label}</span>
                </div>
                {theme === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
