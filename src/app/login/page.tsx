"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, Shield, Key, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
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
        body: JSON.stringify({ userId, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (data.role === "admin") {
        router.push("/admin");
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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">
            <Zap size={24} className="text-white" fill="white" />
          </div>
          <span className="text-xs uppercase font-black tracking-widest text-slate-600">
            Authorizing session...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-[#08090a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0d0e11]/85 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4 animate-bounce">
            <Zap size={28} className="text-white" fill="white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">DevTrace</h1>
          <p className="text-xs text-slate-500 mt-1.5 uppercase tracking-widest font-semibold">
            Assessment Environment Access
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
              User ID / Username
            </label>
            <div className="relative">
              <Shield size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your user ID"
                className="w-full pl-11 pr-4 py-3 bg-white/[0.02] border border-white/5 hover:border-white/10 focus:border-blue-500/50 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all focus:bg-white/[0.04]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Access Token / Password
            </label>
            <div className="relative">
              <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-11 pr-4 py-3 bg-white/[0.02] border border-white/5 hover:border-white/10 focus:border-blue-500/50 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all focus:bg-white/[0.04]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full group flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
          >
            {loading ? "Verifying..." : "Authenticate"}
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Admin Access Console
            </span>
            <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
              username: <span className="text-blue-400 font-bold">admin</span>
              <br />
              password: <span className="text-blue-400 font-bold">password123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
