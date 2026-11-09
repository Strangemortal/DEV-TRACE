"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  Shield,
  Key,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Lock,
  CheckCircle2,
} from "lucide-react";
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
  const [logoutReason, setLogoutReason] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const reason = params.get("reason");
      if (reason === "fullscreen_timeout") {
        setLogoutReason("fullscreen_timeout");
      }
    }
  }, []);

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
        throw new Error(data.error || "Authentication failed. Please verify your credentials.");
      }

      if (data.role === "admin") {
        router.push("/admin");
      } else if (data.role === "interviewer") {
        router.push("/interviewer");
      } else {
        router.push("/ide");
      }
    } catch (err: any) {
      setError(err.message || "Unable to sign in. Please verify your candidate credentials.");
      setLoading(false);
    }
  };

  if (initialChecking) {
    return (
      <div
        className={`h-screen w-screen flex flex-col items-center justify-center transition-colors ${
          isLight
            ? "bg-slate-50 text-slate-700"
            : isMidnight
            ? "bg-[#0b0f19] text-slate-300"
            : "bg-[#0f1117] text-slate-300"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md animate-spin">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-xs uppercase font-semibold tracking-wider opacity-60">
            Verifying secure session...
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
      {/* Top right actions */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        <ThemeToggle />
      </div>

      <div
        className={`w-full max-w-md border rounded-2xl p-8 shadow-2xl z-10 transition-colors ${
          isLight
            ? "bg-white border-slate-200 shadow-slate-200/50"
            : isMidnight
            ? "bg-[#111827] border-[#1f293d] shadow-black/60"
            : "bg-[#161b22] border-[#252a36] shadow-black/60"
        }`}
      >
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-600/20 mb-3.5">
            <Zap size={24} className="text-white" />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold tracking-tight">Candidate Portal</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Enterprise
            </span>
          </div>
          <p className="text-xs opacity-60 leading-relaxed">
            Enter your assessment credentials to enter your isolated technical evaluation workspace.
          </p>
        </div>

        {logoutReason === "fullscreen_timeout" && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-500 text-xs">
            <ShieldAlert size={18} className="flex-shrink-0 mt-0.5 text-rose-500" />
            <div>
              <div className="font-bold text-rose-400">Assessment Terminated</div>
              <div className="mt-0.5 text-slate-300 leading-relaxed">
                Your session was automatically locked due to leaving fullscreen mode beyond the authorized grace period. Security telemetry has been recorded.
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-400 text-xs font-medium">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-rose-400" />
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
                placeholder="e.g., candidate_username"
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
              Assessment Access Key / Password
            </label>
            <div className="relative">
              <Key size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter access key"
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-lg border text-sm outline-none transition-all ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-blue-500"
                    : "bg-black/20 border-white/10 text-white focus:border-blue-500"
                }`}
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-black/20 border border-white/5 space-y-1.5 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Lock size={12} className="text-emerald-400" />
              <span>Invigilation & Integrity Guard Active</span>
            </div>
            <p className="leading-snug text-[10px] opacity-75">
              Fullscreen mode and telemetry recording are enforced throughout this technical assessment.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs tracking-wider transition-all shadow-md shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50"
          >
            <span>{loading ? "Authenticating Session..." : "Launch Assessment Environment"}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-white/10 text-center">
          <Link
            href="/login/staff"
            className="text-xs text-slate-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1"
          >
            <span>Interviewer or Staff Member?</span>
            <span className="font-semibold text-blue-400 underline underline-offset-2">Sign in to Staff Portal →</span>
          </Link>
        </div>

        <div className="mt-4 pt-2 text-center text-[11px] opacity-50 flex items-center justify-center gap-1.5">
          <CheckCircle2 size={12} className="text-emerald-400" />
          <span>Encrypted Assessment Session • Single-Device Active</span>
        </div>
      </div>
    </div>
  );
}
