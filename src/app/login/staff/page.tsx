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
  ShieldCheck,
  Lock,
} from "lucide-react";
import { useThemeStore } from "@/store/themeStore";
import ThemeToggle from "@/components/ThemeToggle";

export default function StaffLoginPage() {
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
        body: JSON.stringify({ userId, password, loginType: "staff" }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed. Please check your credentials.");
      }

      if (data.role === "admin") {
        router.push("/admin");
      } else if (data.role === "interviewer") {
        router.push("/interviewer");
      } else {
        router.push("/ide");
      }
    } catch (err: any) {
      setError(err.message || "Invalid staff credentials.");
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
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md animate-spin">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-xs uppercase font-semibold tracking-wider opacity-60">
            Checking staff authorization...
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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-600/20 mb-3.5">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold tracking-tight">Staff Portal</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Admin & Invigilator
            </span>
          </div>
          <p className="text-xs opacity-60 leading-relaxed">
            Authorized administrative deck for test configuration, candidate telemetry, and assessment oversight.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-400 text-xs font-medium">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider opacity-70 mb-1.5">
              Staff Username
            </label>
            <div className="relative">
              <Shield size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                type="text"
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g., admin_username"
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-lg border text-sm outline-none transition-all ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-indigo-500"
                    : "bg-black/20 border-white/10 text-white focus:border-indigo-500"
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider opacity-70 mb-1.5">
              Security Credential
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
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-indigo-500"
                    : "bg-black/20 border-white/10 text-white focus:border-indigo-500"
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs tracking-wider transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50"
          >
            <span>{loading ? "Verifying Authorization..." : "Access Control Deck"}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-white/10 text-center">
          <Link
            href="/login"
            className="text-xs text-slate-400 hover:text-indigo-400 transition-colors inline-flex items-center gap-1"
          >
            <span>Taking a test as a candidate?</span>
            <span className="font-semibold text-indigo-400 underline underline-offset-2">Switch to Candidate Portal →</span>
          </Link>
        </div>

        <div className="mt-4 pt-2 text-center text-[11px] opacity-50 flex items-center justify-center gap-1.5">
          <Lock size={12} className="text-indigo-400" />
          <span>Restricted Invigilator & Staff Access • Audited Actions</span>
        </div>
      </div>
    </div>
  );
}
