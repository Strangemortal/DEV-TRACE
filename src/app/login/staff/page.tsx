"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, Shield, Key, AlertCircle, ArrowRight } from "lucide-react";

export default function StaffLoginPage() {
  const router = useRouter();
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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#08090a] text-slate-300">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20 animate-pulse">
            <Zap size={24} className="text-white" fill="white" />
          </div>
          <span className="text-xs uppercase font-black tracking-widest text-slate-600">
            Authorizing staff credentials...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-[#08090a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-fuchsia-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0d0e11]/85 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20 mb-4 animate-bounce">
            <Zap size={28} className="text-white" fill="white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">DevTrace</h1>
          <p className="text-xs text-slate-500 mt-1.5 uppercase tracking-widest font-semibold">
            Staff Authentication Deck
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3 text-rose-400">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed font-medium">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Staff Username
            </label>
            <div className="relative">
              <Shield size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter staff username"
                className="w-full pl-11 pr-4 py-3 bg-white/[0.02] border border-white/5 hover:border-white/10 focus:border-violet-500/50 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all focus:bg-white/[0.04]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Staff Password
            </label>
            <div className="relative">
              <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-11 pr-4 py-3 bg-white/[0.02] border border-white/5 hover:border-white/10 focus:border-violet-500/50 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all focus:bg-white/[0.04]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full group flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-700 hover:from-violet-500 hover:to-fuchsia-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
          >
            {loading ? "Authenticating..." : "Sign In"}
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all text-center"
          >
            Are you a Candidate? Access Assessment Portal →
          </button>
        </div>
      </div>
    </div>
  );
}
