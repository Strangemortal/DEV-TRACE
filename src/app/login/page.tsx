"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, Shield, Key, AlertCircle, ArrowRight } from "lucide-react";
import { useThemeStore } from "@/store/themeStore";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const isLight = theme === "light";
  const isMidnight = theme === "midnight";

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialChecking, setInitialChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.user) {
          if (data.user.role === "admin") {
            router.replace("/admin");
          } else if (data.user.role === "interviewer") {
            router.replace("/interviewer");
          } else {
            router.replace("/ide");
          }
        } else {
          setInitialChecking(false);
        }
      } catch (err) {
        setInitialChecking(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password, loginType: "candidate" }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (data.role === "admin") {
        router.push("/admin");
      } else if (data.role === "interviewer") {
        router.push("/interviewer");
      } else {
        router.push("/ide");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please check your credentials.");
      setLoading(false);
    }
  };

  if (initialChecking) {
    return (
      <div
        className={`h-screen w-screen flex flex-col items-center justify-center transition-colors ${
          isLight ? "bg-slate-50 text-slate-700" : isMidnight ? "bg-[#0b0f19] text-slate-300" : "bg-[#0f1117] text-slate-300"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md animate-spin">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-xs uppercase font-semibold tracking-wider opacity-60">
            Checking session...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-center p-4 relative font-sans transition-colors duration-150 ${
        isLight
          ? "bg-slate-50 text-slate-900"
          : isMidnight
          ? "bg-[#0b0f19] text-slate-100"
          : "bg-[#0f1117] text-slate-100"
      }`}
    >
      {/* Top right theme toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div
        className={`w-full max-w-md border rounded-2xl p-8 shadow-xl z-10 transition-colors ${
          isLight
            ? "bg-white border-slate-200 shadow-slate-200/50"
            : isMidnight
            ? "bg-[#111827] border-[#1f293d] shadow-black/40"
            : "bg-[#161b22] border-[#252a36] shadow-black/40"
        }`}
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm mb-3">
            <Zap size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Candidate Login</h1>
          <p className="text-xs opacity-60 mt-1">Enter your credentials to begin your assessment</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-500 text-xs font-medium">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider opacity-70 mb-1.5">
              Candidate User ID
            </label>
            <div className="relative">
              <Shield size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                type="text"
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g., john_doe_84"
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-lg border text-sm outline-none transition-all ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-blue-500"
                    : "bg-black/20 border-white/10 text-white focus:border-blue-500"
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider opacity-70 mb-1.5">
              Access Token / Password
            </label>
            <div className="relative">
              <Key size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-lg border text-sm outline-none transition-all ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-blue-500"
                    : "bg-black/20 border-white/10 text-white focus:border-blue-500"
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs tracking-wider transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
          >
            <span>{loading ? "Signing in..." : "Enter Assessment IDE"}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-2">
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              try {
                const res = await fetch("/api/auth/demo", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ role: "candidate", repoId: "python-challenge" }),
                });
                const data = await res.json();
                if (data.redirect) router.push(data.redirect);
              } catch (e) {
                setLoading(false);
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold transition-all"
          >
            <Zap size={13} />
            <span>1-Click Exhibition Demo Candidate</span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-[11px] opacity-60 hover:opacity-100 transition-opacity text-center mt-0.5"
          >
            ← Back to Exhibition Showcase
          </button>
        </div>

        <div className="mt-3 pt-2 text-center text-xs opacity-50 flex items-center justify-center gap-1.5">
          <Shield size={12} className="text-blue-400" />
          <span>Secured Candidate Assessment Session</span>
        </div>
      </div>
    </div>
  );
}
