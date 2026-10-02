"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Plus,
  Trash2,
  Eye,
  LogOut,
  UserCheck,
  BookOpen,
  Key,
  Copy,
  Check,
  Users,
  Activity,
  Award,
  Shield,
  Sparkles,
  Wand2,
  Code,
  FileCode,
  FolderPlus,
  Play,
  Square,
  Ban,
  FileUp,
  Download,
} from "lucide-react";
import { REPOSITORIES } from "@/data/brokenRepo";
import { useThemeStore } from "@/store/themeStore";
import ThemeToggle from "@/components/ThemeToggle";
import BulkAddModal from "@/components/BulkAddModal";

export default function AdminDashboard() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const isLight = theme === "light";
  const isMidnight = theme === "midnight";

  const [candidates, setCandidates] = useState<any[]>([]);
  const [interviewers, setInterviewers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Navigation / Tabs state
  const [activeTab, setActiveTab] = useState<"candidates" | "interviewers" | "ai-generator">("candidates");

  // Custom challenges from library
  const [customChallenges, setCustomChallenges] = useState<any[]>([]);

  // AI Challenge Generator state
  const [aiFramework, setAiFramework] = useState("django");
  const [aiDifficulty, setAiDifficulty] = useState("intermediate");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiChallenge, setAiChallenge] = useState<any>(null);
  const [aiActiveFile, setAiActiveFile] = useState("");
  const [aiSaved, setAiSaved] = useState(false);
  const [aiPreviewTab, setAiPreviewTab] = useState<"brief" | "code">("brief");

  // Create candidate form modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [assignedRepoId, setAssignedRepoId] = useState(REPOSITORIES[0].id);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  // Create interviewer form modal state
  const [showInterviewerModal, setShowInterviewerModal] = useState(false);
  const [intName, setIntName] = useState("");
  const [intUserId, setIntUserId] = useState("");
  const [intPassword, setIntPassword] = useState("");
  const [intCreateError, setIntCreateError] = useState("");
  const [intCreating, setIntCreating] = useState(false);
  const [interviewerToDelete, setInterviewerToDelete] = useState<any>(null);

  // Bulk Add Modal state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCreatedList, setBulkCreatedList] = useState<any[] | null>(null);
  const [bulkCopied, setBulkCopied] = useState(false);

  // Success modal details to copy credentials
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdDetails, setCreatedDetails] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Delete confirmation
  const [candidateToDelete, setCandidateToDelete] = useState<any>(null);

  // Stats
  const [telemetryCount, setTelemetryCount] = useState(0);

  const handleDownloadBulkCSV = () => {
    if (!bulkCreatedList || bulkCreatedList.length === 0) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const headers = ["Name", "User ID", "Password", "Assigned Challenge", "Login URL"];
    const rows = bulkCreatedList.map((c) => {
      const challengeName = REPOSITORIES.find((r) => r.id === c.assignedRepoId)?.name || c.assignedRepoId;
      return [
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.userId}"`,
        `"${c.rawPassword}"`,
        `"${challengeName.replace(/"/g, '""')}"`,
        `"${origin}/login"`,
      ].join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `devtrace_candidates_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyBulkCredentials = () => {
    if (!bulkCreatedList) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const lines = bulkCreatedList.map(
      (c) =>
        `Name: ${c.name} | User ID: ${c.userId} | Password: ${c.rawPassword} | Repo: ${c.assignedRepoId} | URL: ${origin}/login`
    );
    navigator.clipboard.writeText(lines.join("\n"));
    setBulkCopied(true);
    setTimeout(() => setBulkCopied(false), 2000);
  };

  // Check auth
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!data.user) {
          router.replace("/login/staff");
        } else if (data.user.role === "candidate") {
          router.replace("/ide");
        } else if (data.user.role === "interviewer") {
          router.replace("/interviewer");
        } else if (data.user.role === "admin") {
          setAuthLoading(false);
          fetchCandidates();
          fetchInterviewers();
          fetchTelemetryCount();
          fetchCustomChallenges();
        } else {
          router.replace("/login/staff");
        }
      } catch (err) {
        router.replace("/login/staff");
      }
    }
    checkAuth();
  }, [router]);

  async function fetchCustomChallenges() {
    try {
      const res = await fetch("/api/ai/generate-challenge");
      const data = await res.json();
      if (res.ok) {
        setCustomChallenges(data.customChallenges || []);
      }
    } catch (error) {
      console.error("Failed to load custom challenges:", error);
    }
  }

  const handleGenerateAIChallenge = async () => {
    setAiGenerating(true);
    setAiSaved(false);
    try {
      const res = await fetch("/api/ai/generate-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          framework: aiFramework,
          difficulty: aiDifficulty,
          saveToLibrary: false,
        }),
      });
      const data = await res.json();
      if (data.success && data.challenge) {
        setAiChallenge(data.challenge);
        setAiActiveFile(data.challenge.activeFile || data.challenge.fileOrder[0]);
      } else {
        alert(data.error || "Failed to generate AI challenge");
      }
    } catch (e) {
      console.error("Generate challenge error:", e);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveAIChallenge = async () => {
    if (!aiChallenge) return;
    try {
      const res = await fetch("/api/ai/generate-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          framework: aiFramework,
          difficulty: aiDifficulty,
          saveToLibrary: true,
        }),
      });
      if (res.ok) {
        setAiSaved(true);
        fetchCustomChallenges();
      }
    } catch (e) {
      console.error("Save AI challenge error:", e);
    }
  };

  async function fetchCandidates() {
    try {
      const res = await fetch("/api/admin/candidates");
      const data = await res.json();
      if (res.ok) {
        setCandidates(data.candidates || []);
      }
    } catch (error) {
      console.error("Failed to load candidates:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchInterviewers() {
    try {
      const res = await fetch("/api/admin/interviewers");
      const data = await res.json();
      if (res.ok) {
        setInterviewers(data.interviewers || []);
      }
    } catch (error) {
      console.error("Failed to load interviewers:", error);
    }
  }

  async function fetchTelemetryCount() {
    try {
      const res = await fetch("/api/admin/telemetry");
      const data = await res.json();
      if (res.ok) {
        setTelemetryCount(data.telemetry?.length || 0);
      }
    } catch (error) {
      console.error("Failed to load telemetry count:", error);
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    // Auto-generate a clean, lowercase user ID
    const cleanId = val
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .slice(0, 15);
    setUserId(cleanId ? `${cleanId}_${Math.floor(10 + Math.random() * 90)}` : "");
  };

  const handleIntNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setIntName(val);
    const cleanId = val
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .slice(0, 15);
    setIntUserId(cleanId ? `${cleanId}_${Math.floor(10 + Math.random() * 90)}` : "");
  };

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);

    try {
      const res = await fetch("/api/admin/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, userId, assignedRepoId }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create candidate");
      }

      setCreatedDetails({
        name: data.candidate.name,
        userId: data.candidate.userId,
        password: data.rawPassword,
        assignedChallenge: REPOSITORIES.find((r) => r.id === data.candidate.assignedRepoId)?.name || data.candidate.assignedRepoId,
      });

      // Reset form
      setName("");
      setUserId("");
      setAssignedRepoId(REPOSITORIES[0].id);
      setShowCreateModal(false);
      setShowSuccessModal(true);
      fetchCandidates();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create candidate.");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateInterviewer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntCreateError("");
    setIntCreating(true);

    try {
      const res = await fetch("/api/admin/interviewers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: intName, userId: intUserId, password: intPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create interviewer");
      }

      // Reset form
      setIntName("");
      setIntUserId("");
      setIntPassword("");
      setShowInterviewerModal(false);
      fetchInterviewers();
    } catch (err: any) {
      setIntCreateError(err.message || "Failed to create interviewer.");
    } finally {
      setIntCreating(false);
    }
  };

  const handleToggleCandidateStatus = async (candidate: any) => {
    try {
      const res = await fetch(`/api/admin/candidates/${candidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !candidate.active }),
      });
      if (res.ok) {
        fetchCandidates();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update candidate status");
      }
    } catch (error) {
      console.error("Error toggling candidate status:", error);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!candidateToDelete) return;
    try {
      const res = await fetch(`/api/admin/candidates/${candidateToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchCandidates();
        setCandidateToDelete(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete candidate");
      }
    } catch (error) {
      console.error("Error deleting candidate:", error);
    }
  };

  const handleDeleteInterviewer = async () => {
    if (!interviewerToDelete) return;
    try {
      const res = await fetch(`/api/admin/interviewers/${interviewerToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchInterviewers();
        setInterviewerToDelete(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete interviewer");
      }
    } catch (error) {
      console.error("Error deleting interviewer:", error);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdDetails) return;
    const shareText = `DevTrace Assessment Credentials\n\nURL: ${window.location.origin}/login\nUser ID: ${createdDetails.userId}\nPassword: ${createdDetails.password}\nChallenge: ${createdDetails.assignedChallenge}`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login/staff");
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#08090a] text-slate-300">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 animate-spin">
            <Zap size={24} className="text-white" fill="white" />
          </div>
          <span className="text-xs uppercase font-black tracking-widest text-slate-600">
            Validating Administrator Authority...
          </span>
        </div>
      </div>
    );
  }

  const activeCandidates = candidates.filter((c) => c.active);

  return (
    <div
      className={`min-h-screen w-full flex flex-col font-sans overflow-x-hidden transition-colors duration-150 ${
        isLight
          ? "bg-slate-50 text-slate-900"
          : isMidnight
          ? "bg-[#0b0f19] text-slate-100"
          : "bg-[#0f1117] text-slate-200"
      }`}
    >
      {/* TOP HEADER */}
      <header
        className={`h-14 flex items-center gap-4 px-6 border-b flex-shrink-0 z-30 transition-colors ${
          isLight
            ? "bg-white border-slate-200 shadow-sm"
            : isMidnight
            ? "bg-[#111827] border-[#1f293d]"
            : "bg-[#161b22] border-[#252a36]"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-wider text-inherit uppercase leading-none">
              DevTrace
            </h1>
            <span className="text-[9px] font-medium opacity-60">Admin Deck</span>
          </div>
        </div>

        <div className={`h-6 w-px mx-1 ${isLight ? "bg-slate-200" : "bg-white/10"}`} />

        <nav className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab("candidates")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "candidates"
                ? isLight
                  ? "bg-blue-50 text-blue-700 font-bold"
                  : "bg-white/10 text-white font-bold"
                : isLight
                ? "text-slate-600 hover:bg-slate-100"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            Candidates
          </button>
          <button
            onClick={() => setActiveTab("interviewers")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "interviewers"
                ? isLight
                  ? "bg-blue-50 text-blue-700 font-bold"
                  : "bg-white/10 text-white font-bold"
                : isLight
                ? "text-slate-600 hover:bg-slate-100"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            Interviewers
          </button>
          <button
            onClick={() => setActiveTab("ai-generator")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "ai-generator"
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold shadow-sm"
                : isLight
                ? "text-slate-600 hover:bg-slate-100"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Sparkles size={13} className="text-amber-400" />
            <span>AI Test Maker</span>
          </button>
          <button
            onClick={() => router.push("/admin/telemetry")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isLight ? "text-slate-600 hover:bg-slate-100" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            Telemetry Logs
          </button>
        </nav>

        <div className="flex-1" />

        <ThemeToggle />

        <button
          onClick={handleLogout}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            isLight
              ? "border-slate-300 hover:bg-slate-100 text-slate-700"
              : "border-white/10 hover:bg-white/10 text-slate-300"
          }`}
        >
          <LogOut size={13} />
          <span>Sign Out</span>
        </button>
      </header>

      {/* DASHBOARD BODY */}
      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6 z-10">
        
        {/* STATS DECK */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          <div className={`p-5 rounded-xl border transition-colors ${isLight ? "bg-white border-slate-200 shadow-sm" : isMidnight ? "bg-[#111827] border-[#1f293d]" : "bg-[#161b22] border-[#252a36]"} flex items-center gap-4`}>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Users size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">Total Candidates</span>
              <h3 className="text-xl font-bold font-mono mt-0.5">{candidates.length}</h3>
            </div>
          </div>

          <div className={`p-5 rounded-xl border transition-colors ${isLight ? "bg-white border-slate-200 shadow-sm" : isMidnight ? "bg-[#111827] border-[#1f293d]" : "bg-[#161b22] border-[#252a36]"} flex items-center gap-4`}>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <UserCheck size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">Active Candidates</span>
              <h3 className="text-xl font-bold font-mono mt-0.5">{activeCandidates.length}</h3>
            </div>
          </div>

          <div className={`p-5 rounded-xl border transition-colors ${isLight ? "bg-white border-slate-200 shadow-sm" : isMidnight ? "bg-[#111827] border-[#1f293d]" : "bg-[#161b22] border-[#252a36]"} flex items-center gap-4`}>
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500">
              <Shield size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">Interviewers</span>
              <h3 className="text-xl font-bold font-mono mt-0.5">{interviewers.length}</h3>
            </div>
          </div>

          <div className={`p-5 rounded-xl border transition-colors ${isLight ? "bg-white border-slate-200 shadow-sm" : isMidnight ? "bg-[#111827] border-[#1f293d]" : "bg-[#161b22] border-[#252a36]"} flex items-center gap-4`}>
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Activity size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">Submitted Sessions</span>
              <h3 className="text-xl font-bold font-mono mt-0.5">{telemetryCount}</h3>
            </div>
          </div>
        </section>

        {activeTab === "candidates" ? (
          /* CANDIDATE MANAGEMENT CONTAINER */
          <section className={`border rounded-xl p-6 transition-colors ${isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : isMidnight ? "bg-[#111827] border-[#1f293d] text-slate-100" : "bg-[#161b22] border-[#252a36] text-slate-100"} flex flex-col min-h-[400px]`}>
            <div className="flex items-center justify-between mb-5 flex-shrink-0">
              <div>
                <h2 className="text-base font-bold">Candidates</h2>
                <p className="text-xs opacity-60 mt-0.5">Manage candidates, challenge assignments, and credentials.</p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowBulkModal(true)}
                  className={`flex items-center gap-1.5 text-xs px-3.5 py-2 border rounded-lg font-semibold transition-all shadow-sm active:scale-95 ${
                    isLight
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                      : "bg-indigo-600/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/20"
                  }`}
                >
                  <FileUp size={14} />
                  <span>Bulk Add (CSV / PDF)</span>
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 text-xs px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-sm active:scale-95"
                >
                  <Plus size={14} />
                  <span>Add Candidate</span>
                </button>
              </div>
            </div>

            {/* TABLE */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-xs uppercase font-bold text-slate-600 animate-pulse">
                Loading Candidate Database...
              </div>
            ) : candidates.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/5 rounded-xl">
                <Users size={32} className="text-slate-600 mb-3" />
                <h3 className="text-sm font-bold text-slate-400">No Candidates Found</h3>
                <p className="text-xs text-slate-600 mt-1 max-w-[280px]">Add your first candidate to give them access credentials to the IDE.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">User ID</th>
                      <th className="px-6 py-4">Access Token</th>
                      <th className="px-6 py-4">Assigned Challenge</th>
                      <th className="px-6 py-4">Assigned By</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {candidates.map((c) => {
                      const repoObj = REPOSITORIES.find((r) => r.id === c.assignedRepoId);
                      const repoName = repoObj?.name || c.assignedRepoId;
                      const creator = interviewers.find(i => i.userId === c.createdBy);
                      const creatorName = creator ? creator.name : (c.createdBy === 'admin' ? 'Admin' : c.createdBy || 'Admin');
                      
                      return (
                        <tr key={c.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-6 py-4 font-bold text-white">{c.name}</td>
                          <td className="px-6 py-4 font-mono text-blue-400">{c.userId}</td>
                          <td className="px-6 py-4 font-mono text-slate-400">{c.passwordHash}</td>
                          <td className="px-6 py-4 text-slate-300 font-medium">
                            <div className="flex items-center gap-2">
                              <span>{repoName}</span>
                              {repoObj?.framework === "django" && (
                                <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
                                  DJANGO
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-400 font-mono capitalize">{creatorName}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                                c.active
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              }`}
                            >
                              {c.active ? "In Progress" : "Test Stopped"}
                            </span>
                          </td>
                          <td className="px-6 py-4 flex items-center gap-2">
                            {/* View Telemetry */}
                            <button
                              title="View Telemetry"
                              onClick={() => router.push(`/admin/telemetry?candidateId=${c.id}`)}
                              className="p-1.5 hover:bg-white/5 border border-transparent hover:border-white/10 text-slate-400 hover:text-white rounded-lg transition-all"
                            >
                              <Eye size={14} />
                            </button>

                            {/* Stop / Resume Test Button */}
                            <button
                              title={c.active ? "Stop Test (Locks candidate IDE session)" : "Resume Test"}
                              onClick={() => handleToggleCandidateStatus(c)}
                              className={`p-1.5 rounded-lg border transition-all ${
                                c.active
                                  ? "hover:bg-amber-500/10 border-transparent hover:border-amber-500/20 text-slate-400 hover:text-amber-400"
                                  : "hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20 text-slate-400 hover:text-emerald-400"
                              }`}
                            >
                              {c.active ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                            </button>

                            {/* Delete Candidate Button */}
                            <button
                              title="Delete Candidate (Telemetry Preserved)"
                              onClick={() => setCandidateToDelete(c)}
                              className="p-1.5 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : activeTab === "interviewers" ? (
          /* INTERVIEWER MANAGEMENT CONTAINER */
          /* INTERVIEWER MANAGEMENT CONTAINER */
          <section className="bg-[#0d0e11]/50 border border-white/5 rounded-2xl shadow-2xl p-6 backdrop-blur flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-white">Interviewers</h2>
                <p className="text-xs text-slate-500">Register new interviewer accounts and manage access credentials.</p>
              </div>
              <button
                onClick={() => setShowInterviewerModal(true)}
                className="flex items-center gap-2 text-xs px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-violet-600/10 active:scale-95"
              >
                <Plus size={14} />
                Register Interviewer
              </button>
            </div>

            {/* TABLE */}
            {interviewers.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/5 rounded-xl">
                <Shield size={32} className="text-slate-600 mb-3" />
                <h3 className="text-sm font-bold text-slate-400">No Interviewers Registered</h3>
                <p className="text-xs text-slate-600 mt-1 max-w-[280px]">Add your first interviewer to let them manage candidates and view telemetry logs.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Username</th>
                      <th className="px-6 py-4">Access Password</th>
                      <th className="px-6 py-4">Date Registered</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {interviewers.map((i) => {
                      const dateStr = new Date(i.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                      return (
                        <tr key={i.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-6 py-4 font-bold text-white">{i.name}</td>
                          <td className="px-6 py-4 font-mono text-violet-400">{i.userId}</td>
                          <td className="px-6 py-4 font-mono text-slate-400">{i.passwordHash}</td>
                          <td className="px-6 py-4 text-slate-300 font-medium">{dateStr}</td>
                          <td className="px-6 py-4">
                            <button
                              title="Delete Interviewer"
                              onClick={() => setInterviewerToDelete(i)}
                              className="p-1.5 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          /* AI CHALLENGE GENERATOR STUDIO */
          <section className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Generator Form & Templates */}
              <div className="lg:col-span-5 space-y-4">
                <div className={`p-5 md:p-6 rounded-lg border ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0d0e11]/60 border-white/5"}`}>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-md bg-indigo-600 flex items-center justify-center shadow-sm">
                      <Sparkles size={16} className="text-white" />
                    </div>
                    <div>
                      <h3 className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>AI Challenge Synthesizer</h3>
                      <p className="text-[11px] opacity-70">Generate realistic multi-file debugging repos</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* Framework Selector */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold opacity-70 mb-1.5">
                        Target Framework & Stack
                      </label>
                      <select
                        value={aiFramework}
                        onChange={(e) => setAiFramework(e.target.value)}
                        className={`w-full px-3.5 py-2 rounded-md border text-xs outline-none transition-colors ${
                          isLight
                            ? "bg-slate-50 border-slate-300 text-slate-800 focus:border-indigo-500"
                            : "bg-[#121620] border-white/10 text-slate-200 focus:border-indigo-500/50"
                        }`}
                      >
                        <option value="django">Django 5 (Python / ORM / Views / Tests)</option>
                        <option value="fastapi">FastAPI (Python / Pydantic / Async)</option>
                        <option value="spring">Spring Boot 3 (Java / JUnit 5 / Maven)</option>
                        <option value="express">Node.js & Express (TypeScript / Mocha)</option>
                        <option value="flask">Flask (Python / Pytest / Auth)</option>
                        <option value="nextjs">Next.js 15 (React 19 / Server Components)</option>
                      </select>
                    </div>

                    {/* Difficulty */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold opacity-70 mb-1.5">
                        Seniority Difficulty Level
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {["beginner", "intermediate", "advanced"].map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setAiDifficulty(lvl)}
                            className={`py-1.5 rounded-md capitalize font-semibold transition-all border text-xs ${
                              aiDifficulty === lvl
                                ? "bg-indigo-600 border-indigo-500 text-white shadow-sm font-bold"
                                : isLight
                                ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                                : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Prompt / Scenario */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold opacity-70 mb-1.5">
                        Custom Bug Scenario or Requirement
                      </label>
                      <textarea
                        rows={3}
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="e.g., E-commerce shopping cart discount calculation bug when applying coupon codes..."
                        className={`w-full p-3 rounded-md border text-xs outline-none transition-all resize-none ${
                          isLight
                            ? "bg-slate-50 border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500"
                            : "bg-white/[0.02] border-white/10 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500"
                        }`}
                      />
                    </div>

                    {/* Curated Production Blueprints */}
                    <div>
                      <span className="block text-[10px] uppercase font-bold opacity-70 mb-2">
                        Industry-Grade Production Scenarios
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { title: "💳 Idempotent Payment Webhook", desc: "Deduplication & balance lock" },
                          { title: "🛒 Tiered Cart & Stock Clamping", desc: "Negative balance race condition" },
                          { title: "⏱️ Sliding Token Bucket Limiter", desc: "Burst refill calculation bug" },
                          { title: "🔐 Multi-Tenant RBAC & JWT Expiry", desc: "Permission boundary leak" },
                          { title: "⚡ High-Concurrency Write Cache", desc: "Stale reads under heavy load" },
                          { title: "📦 FIFO Queue with Retry Backoff", desc: "Dead-letter message handling" },
                        ].map((t) => (
                          <button
                            key={t.title}
                            type="button"
                            onClick={() => setAiPrompt(`${t.title}: ${t.desc}`)}
                            className={`p-2.5 rounded-md border text-left transition-all group ${
                              isLight
                                ? "bg-slate-50 hover:bg-indigo-50/50 border-slate-200 hover:border-indigo-300 text-slate-800"
                                : "bg-white/[0.02] hover:bg-white/[0.06] border-white/5 hover:border-indigo-500/30 text-slate-200"
                            }`}
                          >
                            <div className={`font-semibold text-xs transition-colors ${
                              isLight ? "text-slate-800 group-hover:text-indigo-600" : "text-white group-hover:text-indigo-400"
                            }`}>
                              {t.title}
                            </div>
                            <div className="text-[10px] opacity-70 mt-0.5">{t.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action Button - High Contrast Visible Button */}
                    <button
                      type="button"
                      disabled={aiGenerating}
                      onClick={handleGenerateAIChallenge}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Wand2 size={16} className={aiGenerating ? "animate-spin" : ""} />
                      <span>{aiGenerating ? "Synthesizing Production Challenge..." : "Synthesize Production Challenge"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Code & Repo Live Preview */}
              <div className="lg:col-span-7">
                {aiChallenge ? (
                  <div className={`p-5 md:p-6 rounded-lg border flex flex-col h-full ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0d0e11]/60 border-white/5"}`}>
                    <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{aiChallenge.name}</h3>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                            {aiChallenge.framework?.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs opacity-75 mt-1">{aiChallenge.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {aiSaved ? (
                          <span className="px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20 flex items-center gap-1.5">
                            <Check size={13} /> Saved in Library
                          </span>
                        ) : (
                          <button
                            onClick={handleSaveAIChallenge}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                          >
                            <FolderPlus size={14} />
                            <span>Save to Library</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Preview Mode Switcher */}
                    <div className="flex items-center justify-between mb-3">
                      <div className={`flex rounded-md border p-0.5 text-[11px] font-semibold ${
                        isLight ? "bg-slate-100 border-slate-200" : "bg-black/20 border-white/5"
                      }`}>
                        <button
                          onClick={() => setAiPreviewTab("brief")}
                          className={`px-3 py-1 rounded transition-all ${
                            aiPreviewTab === "brief"
                              ? "bg-indigo-600 text-white shadow-sm font-bold"
                              : isLight ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          📖 Problem Brief
                        </button>
                        <button
                          onClick={() => setAiPreviewTab("code")}
                          className={`px-3 py-1 rounded transition-all ${
                            aiPreviewTab === "code"
                              ? "bg-indigo-600 text-white shadow-sm font-bold"
                              : isLight ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          💻 Code & Test Files ({aiChallenge.fileOrder?.length || 0})
                        </button>
                      </div>

                      {aiPreviewTab === "code" && (
                        <div className="flex items-center gap-1 overflow-x-auto max-w-[280px] scrollbar-none">
                          {aiChallenge.fileOrder?.map((fname: string) => (
                            <button
                              key={fname}
                              onClick={() => setAiActiveFile(fname)}
                              className={`px-2 py-1 rounded text-[10px] font-mono border transition-all ${
                                aiActiveFile === fname
                                  ? "bg-indigo-600 border-indigo-500 text-white font-bold"
                                  : isLight
                                  ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                                  : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              {fname}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Content Box */}
                    {aiPreviewTab === "brief" ? (
                      <div className={`flex-1 rounded-md border p-4 font-sans text-xs overflow-auto max-h-[380px] scrollbar-thin leading-relaxed ${
                        isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-black/40 border-white/5 text-slate-200"
                      }`}>
                        <pre className="whitespace-pre-wrap font-sans text-xs select-text">
                          {aiChallenge.files?.["README.md"]?.content || aiChallenge.description || "Review challenge specification and test cases."}
                        </pre>
                      </div>
                    ) : (
                      <div className={`flex-1 rounded-md border p-4 font-mono text-xs overflow-auto max-h-[380px] scrollbar-thin ${
                        isLight ? "bg-slate-900 text-slate-100 border-slate-800" : "bg-black/40 border-white/5 text-slate-200"
                      }`}>
                        <pre>{aiChallenge.files?.[aiActiveFile]?.content || "// Select a file to preview code..."}</pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`h-full flex flex-col items-center justify-center p-12 text-center rounded-lg border border-dashed ${
                    isLight ? "border-slate-300 bg-slate-50/50" : "border-white/10"
                  }`}>
                    <Wand2 size={36} className="opacity-40 mb-3 animate-bounce" />
                    <h3 className={`text-sm font-bold ${isLight ? "text-slate-800" : "text-slate-400"}`}>No Generated Challenge Yet</h3>
                    <p className="text-xs opacity-60 mt-1 max-w-sm">
                      Select your target framework, adjust difficulty, pick an industry scenario or enter your custom requirements, and click Synthesize to generate multi-file broken code with integrated tests.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* CREATE CANDIDATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className={`border rounded-lg p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 ${
            isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#0d0e11] border-white/10 text-white"
          }`}>
            <h3 className={`text-lg font-bold mb-1 ${isLight ? "text-slate-900" : "text-white"}`}>Create Candidate Credentials</h3>
            <p className="text-xs opacity-70 mb-5">Enter candidate name. Credentials and randomly generated password will be generated automatically.</p>
            
            {createError && (
              <div className="mb-4 p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateCandidate} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold opacity-70 mb-1.5">
                  Candidate Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g., Alice Smith"
                  className={`w-full px-3.5 py-2.5 border rounded-md text-sm outline-none transition-all ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
                      : "bg-white/[0.02] border-white/10 text-white placeholder:text-slate-600 focus:border-blue-500/50"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold opacity-70 mb-1.5">
                  Candidate User ID (Auto Suggested)
                </label>
                <input
                  type="text"
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="e.g., alice_smith"
                  className={`w-full px-3.5 py-2.5 border rounded-md text-sm outline-none transition-all font-mono text-blue-600 dark:text-blue-400 ${
                    isLight
                      ? "bg-slate-50 border-slate-300"
                      : "bg-white/[0.02] border-white/10"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold opacity-70 mb-1.5">
                  Assign Challenge repo
                </label>
                <select
                  value={assignedRepoId}
                  onChange={(e) => setAssignedRepoId(e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-md text-sm outline-none cursor-pointer ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-800"
                      : "bg-[#16181d] border-white/10 text-slate-300"
                  }`}
                >
                  {[...REPOSITORIES, ...customChallenges].map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} [{r.framework && r.framework !== "none" ? r.framework.toUpperCase() : r.category?.toUpperCase() || "CUSTOM"}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setName("");
                    setUserId("");
                    setCreateError("");
                  }}
                  className="px-4 py-2 text-xs font-semibold opacity-70 hover:opacity-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                >
                  {creating ? "Generating..." : "Generate Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGISTER INTERVIEWER MODAL */}
      {showInterviewerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className={`border rounded-lg p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 ${
            isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#0d0e11] border-white/10 text-white"
          }`}>
            <h3 className={`text-lg font-bold mb-1 ${isLight ? "text-slate-900" : "text-white"}`}>Register Interviewer Account</h3>
            <p className="text-xs opacity-70 mb-5">Create credentials for the interviewer. Register their verification password below.</p>
            
            {intCreateError && (
              <div className="mb-4 p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
                {intCreateError}
              </div>
            )}

            <form onSubmit={handleCreateInterviewer} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold opacity-70 mb-1.5">
                  Interviewer Name
                </label>
                <input
                  type="text"
                  required
                  value={intName}
                  onChange={handleIntNameChange}
                  placeholder="e.g., Sarah Connor"
                  className={`w-full px-3.5 py-2.5 border rounded-md text-sm outline-none transition-all ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-violet-500"
                      : "bg-white/[0.02] border-white/10 text-white placeholder:text-slate-600 focus:border-violet-500/50"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold opacity-70 mb-1.5">
                  Username / User ID (Auto Suggested)
                </label>
                <input
                  type="text"
                  required
                  value={intUserId}
                  onChange={(e) => setIntUserId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="e.g., sarah_c"
                  className={`w-full px-3.5 py-2.5 border rounded-md text-sm outline-none transition-all font-mono text-violet-600 dark:text-violet-400 ${
                    isLight
                      ? "bg-slate-50 border-slate-300"
                      : "bg-white/[0.02] border-white/10"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold opacity-70 mb-1.5">
                  Verification Password
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={intPassword}
                    onChange={(e) => setIntPassword(e.target.value)}
                    placeholder="Enter registration password"
                    className={`flex-1 px-3.5 py-2.5 border rounded-md text-sm outline-none transition-all font-mono ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400"
                        : "bg-white/[0.02] border-white/10 text-white placeholder:text-slate-600"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
                      let pw = "";
                      for (let i = 0; i < 8; i++) {
                        pw += chars.charAt(Math.floor(Math.random() * chars.length));
                      }
                      setIntPassword(pw);
                    }}
                    className={`px-3 border rounded-md text-xs font-bold transition-all ${
                      isLight
                        ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
                        : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300"
                    }`}
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setShowInterviewerModal(false);
                    setIntName("");
                    setIntUserId("");
                    setIntPassword("");
                    setIntCreateError("");
                  }}
                  className="px-4 py-2 text-xs font-semibold opacity-70 hover:opacity-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={intCreating}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-md text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                >
                  {intCreating ? "Registering..." : "Register Interviewer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREDENTIALS GENERATED SUCCESS MODAL */}
      {showSuccessModal && createdDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200 p-4">
          <div className={`border rounded-lg p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 ${
            isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#0d0e11] border-white/10 text-white"
          }`}>
            <h3 className={`text-lg font-bold mb-1 ${isLight ? "text-slate-900" : "text-white"}`}>Account Generated Successfully!</h3>
            <p className="text-xs opacity-70 mb-5">Share these credentials with the candidate. The system password has been randomly generated.</p>

            <div className={`p-4 rounded-md border space-y-3.5 font-mono text-xs ${
              isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/[0.02] border-white/5 text-slate-200"
            }`}>
              <div>
                <span className="text-[10px] uppercase font-bold opacity-60 font-sans">Login Portal URL</span>
                <p className="mt-0.5 break-all font-semibold">{window.location.origin}/login</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold opacity-60 font-sans">User ID</span>
                  <p className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">{createdDetails.userId}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold opacity-60 font-sans">Password</span>
                  <p className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">{createdDetails.password}</p>
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold opacity-60 font-sans">Challenge</span>
                <p className="mt-0.5 opacity-80">{createdDetails.assignedChallenge}</p>
              </div>
            </div>

            <div className="flex gap-2.5 mt-5">
              <button
                onClick={handleCopyCredentials}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 border rounded-md text-xs font-semibold transition-all ${
                  isLight
                    ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800"
                    : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                }`}
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copied ? "Copied Shareable Info" : "Copy Credentials"}</span>
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setCreatedDetails(null);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold transition-all shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CANDIDATE CONFIRMATION MODAL */}
      {candidateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className={`border rounded-lg p-6 md:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 ${
            isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#0d0e11] border-white/10 text-white"
          }`}>
            <h3 className={`text-lg font-bold mb-2 ${isLight ? "text-slate-900" : "text-white"}`}>Delete Candidate</h3>
            <p className="text-xs opacity-75 leading-relaxed mb-6">
              Are you sure you want to remove <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{candidateToDelete.name}</span> (<span className="font-mono text-blue-600 dark:text-blue-400">{candidateToDelete.userId}</span>) from the roster?
              <br /><br />
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ All telemetry logs and AI assessment reports will remain permanently saved in the system.</span>
            </p>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setCandidateToDelete(null)}
                className="px-4 py-2 text-xs font-semibold opacity-70 hover:opacity-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCandidate}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-bold transition-all shadow-sm"
              >
                Delete Candidate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE INTERVIEWER CONFIRMATION MODAL */}
      {interviewerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className={`border rounded-lg p-6 md:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 ${
            isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#0d0e11] border-white/10 text-white"
          }`}>
            <h3 className={`text-lg font-bold mb-2 ${isLight ? "text-slate-900" : "text-white"}`}>Delete Interviewer Account</h3>
            <p className="text-xs opacity-75 leading-relaxed mb-6">
              Are you sure you want to delete <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{interviewerToDelete.name}</span>?
              <br />
              <span className="text-rose-600 dark:text-rose-400 font-semibold">Their session will immediately end, and they will lose access.</span>
            </p>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setInterviewerToDelete(null)}
                className="px-4 py-2 text-xs font-semibold opacity-70 hover:opacity-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteInterviewer}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-bold transition-all shadow-sm"
              >
                Delete Interviewer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* BULK ADD CANDIDATES MODAL */}
      <BulkAddModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSuccess={(created) => {
          setBulkCreatedList(created);
          fetchCandidates();
        }}
        isLight={isLight}
      />

      {/* BULK CREDENTIALS CREATED MODAL */}
      {bulkCreatedList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-in fade-in duration-200 p-4">
          <div
            className={`border rounded-xl p-6 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] ${
              isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#0d0e11] border-white/10 text-white"
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                  Bulk Candidates Added Successfully!
                </h3>
                <p className="text-xs opacity-70 mt-0.5">
                  {bulkCreatedList.length} candidate account(s) generated. Download the CSV roster or copy credentials.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                {bulkCreatedList.length} Accounts
              </span>
            </div>

            {/* Candidate Credentials Table */}
            <div className="flex-1 overflow-y-auto my-4 rounded-lg border border-white/10">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/[0.03] border-b border-white/10 text-[10px] font-bold text-slate-400 uppercase">
                    <th className="px-3.5 py-2.5">Name</th>
                    <th className="px-3.5 py-2.5">User ID</th>
                    <th className="px-3.5 py-2.5">Password</th>
                    <th className="px-3.5 py-2.5">Assigned Challenge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {bulkCreatedList.map((c, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-3.5 py-2 font-sans font-semibold">{c.name}</td>
                      <td className="px-3.5 py-2 text-blue-400 font-bold">{c.userId}</td>
                      <td className="px-3.5 py-2 text-emerald-400 font-bold">{c.rawPassword}</td>
                      <td className="px-3.5 py-2 font-sans text-slate-300">
                        {REPOSITORIES.find((r) => r.id === c.assignedRepoId)?.name || c.assignedRepoId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadBulkCSV}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <Download size={14} />
                  <span>Download CSV Roster</span>
                </button>
                <button
                  onClick={handleCopyBulkCredentials}
                  className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-lg text-xs font-semibold transition-all ${
                    isLight
                      ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800"
                      : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                  }`}
                >
                  {bulkCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span>{bulkCopied ? "Copied All" : "Copy All Credentials"}</span>
                </button>
              </div>

              <button
                onClick={() => setBulkCreatedList(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
