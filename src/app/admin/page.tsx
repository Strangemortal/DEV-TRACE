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
} from "lucide-react";
import { REPOSITORIES } from "@/data/brokenRepo";

export default function AdminDashboard() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [interviewers, setInterviewers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Navigation / Tabs state
  const [activeTab, setActiveTab] = useState<"candidates" | "interviewers">("candidates");

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

  // Success modal details to copy credentials
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdDetails, setCreatedDetails] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Delete confirmation
  const [candidateToDelete, setCandidateToDelete] = useState<any>(null);

  // Stats
  const [telemetryCount, setTelemetryCount] = useState(0);

  // Check auth
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!data.user || data.user.role !== "admin") {
          router.replace("/login/staff");
        } else {
          setAuthLoading(false);
          fetchCandidates();
          fetchInterviewers();
          fetchTelemetryCount();
        }
      } catch (err) {
        router.replace("/login/staff");
      }
    }
    checkAuth();
  }, [router]);

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
    <div className="min-h-screen w-screen bg-[#08090a] text-slate-300 flex flex-col font-sans overflow-x-hidden selection:bg-blue-500/30">
      {/* Radial glow background */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* TOP HEADER */}
      <header className="h-16 flex items-center gap-4 px-8 bg-[#0d0e11]/80 backdrop-blur-xl border-b border-white/5 flex-shrink-0 z-40 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap size={20} className="text-white" fill="white" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-[0.2em] text-white uppercase leading-none mb-1">
              DevTrace
            </h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                Admin Control Deck
              </span>
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-white/5 mx-2" />

        <nav className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("candidates")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "candidates"
                ? "bg-white/5 border border-white/10 text-white cursor-default"
                : "border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            Candidate Roster
          </button>
          <button
            onClick={() => setActiveTab("interviewers")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "interviewers"
                ? "bg-white/5 border border-white/10 text-white cursor-default"
                : "border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            Interviewer Roster
          </button>
          <button
            onClick={() => router.push("/admin/telemetry")}
            className="px-4 py-1.5 hover:bg-white/5 border border-transparent hover:border-white/5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 transition-all"
          >
            Telemetry Logs
          </button>
        </nav>

        <div className="flex-1" />

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </header>

      {/* DASHBOARD BODY */}
      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8 z-10">
        
        {/* STATS DECK */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-[#0d0e11]/50 border border-white/5 backdrop-blur shadow-xl flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500">
              <Users size={24} />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Total Candidates</span>
              <h3 className="text-2xl font-black text-white font-mono mt-1">{candidates.length}</h3>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#0d0e11]/50 border border-white/5 backdrop-blur shadow-xl flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-500">
              <UserCheck size={24} />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Active Candidates</span>
              <h3 className="text-2xl font-black text-white font-mono mt-1">{activeCandidates.length}</h3>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#0d0e11]/50 border border-white/5 backdrop-blur shadow-xl flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-violet-600/10 flex items-center justify-center text-violet-500">
              <Shield size={24} />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Interviewers</span>
              <h3 className="text-2xl font-black text-white font-mono mt-1">{interviewers.length}</h3>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#0d0e11]/50 border border-white/5 backdrop-blur shadow-xl flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-500">
              <Activity size={24} />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Submitted Sessions</span>
              <h3 className="text-2xl font-black text-white font-mono mt-1">{telemetryCount}</h3>
            </div>
          </div>
        </section>

        {activeTab === "candidates" ? (
          /* CANDIDATE MANAGEMENT CONTAINER */
          <section className="bg-[#0d0e11]/50 border border-white/5 rounded-2xl shadow-2xl p-6 backdrop-blur flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-white">Candidates</h2>
                <p className="text-xs text-slate-500">Add candidates, select their assessment challenge, and share system credentials.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 text-xs px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/10 active:scale-95"
              >
                <Plus size={14} />
                Add Candidate
              </button>
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
                      const repoName =
                        REPOSITORIES.find((r) => r.id === c.assignedRepoId)?.name || c.assignedRepoId;
                      const creator = interviewers.find(i => i.userId === c.createdBy);
                      const creatorName = creator ? creator.name : (c.createdBy === 'admin' ? 'Admin' : c.createdBy || 'Admin');
                      
                      return (
                        <tr key={c.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-6 py-4 font-bold text-white">{c.name}</td>
                          <td className="px-6 py-4 font-mono text-blue-400">{c.userId}</td>
                          <td className="px-6 py-4 font-mono text-slate-400">{c.passwordHash}</td>
                          <td className="px-6 py-4 text-slate-300 font-medium">{repoName}</td>
                          <td className="px-6 py-4 text-slate-400 font-mono capitalize">{creatorName}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                c.active
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-rose-500/10 text-rose-400"
                              }`}
                            >
                              {c.active ? "Active" : "Deleted"}
                            </span>
                          </td>
                          <td className="px-6 py-4 flex items-center gap-3">
                            <button
                              title="View Telemetry"
                              onClick={() => router.push(`/admin/telemetry?candidateId=${c.id}`)}
                              className="p-1.5 hover:bg-white/5 border border-transparent hover:border-white/5 text-slate-400 hover:text-white rounded-lg transition-all"
                            >
                              <Eye size={14} />
                            </button>
                            {c.active && (
                              <button
                                title="Delete Candidate"
                                onClick={() => setCandidateToDelete(c)}
                                className="p-1.5 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
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
        )}
      </main>

      {/* CREATE CANDIDATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0d0e11] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2">Create Candidate Credentials</h3>
            <p className="text-xs text-slate-500 mb-6">Enter candidate name. Credentials and randomly generated password will be generated automatically.</p>
            
            {createError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateCandidate} className="space-y-4">
              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                  Candidate Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g., Alice Smith"
                  className="w-full px-4 py-2.5 bg-white/[0.02] border border-white/5 hover:border-white/10 focus:border-blue-500/50 rounded-xl text-sm outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                  Candidate User ID (Auto Suggested)
                </label>
                <input
                  type="text"
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="e.g., alice_smith"
                  className="w-full px-4 py-2.5 bg-white/[0.02] border border-white/5 hover:border-white/10 focus:border-blue-500/50 rounded-xl text-sm outline-none transition-all font-mono text-blue-400"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                  Assign Challenge repo
                </label>
                <select
                  value={assignedRepoId}
                  onChange={(e) => setAssignedRepoId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#16181d] border border-white/5 rounded-xl text-sm outline-none text-slate-300 hover:bg-[#1a1d24] transition-colors cursor-pointer"
                >
                  {REPOSITORIES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.category.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setName("");
                    setUserId("");
                    setCreateError("");
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0d0e11] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2">Register Interviewer Account</h3>
            <p className="text-xs text-slate-500 mb-6">Create credentials for the interviewer. Register their verification password below.</p>
            
            {intCreateError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                {intCreateError}
              </div>
            )}

            <form onSubmit={handleCreateInterviewer} className="space-y-4">
              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                  Interviewer Name
                </label>
                <input
                  type="text"
                  required
                  value={intName}
                  onChange={handleIntNameChange}
                  placeholder="e.g., Sarah Connor"
                  className="w-full px-4 py-2.5 bg-white/[0.02] border border-white/5 hover:border-white/10 focus:border-violet-500/50 rounded-xl text-sm outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                  Username / User ID (Auto Suggested)
                </label>
                <input
                  type="text"
                  required
                  value={intUserId}
                  onChange={(e) => setIntUserId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="e.g., sarah_c"
                  className="w-full px-4 py-2.5 bg-white/[0.02] border border-white/5 hover:border-white/10 focus:border-violet-500/50 rounded-xl text-sm outline-none transition-all font-mono text-violet-400"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                  Verification Password
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={intPassword}
                    onChange={(e) => setIntPassword(e.target.value)}
                    placeholder="Enter registration password"
                    className="flex-1 px-4 py-2.5 bg-white/[0.02] border border-white/5 hover:border-white/10 focus:border-violet-500/50 rounded-xl text-sm outline-none transition-all font-mono text-white"
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
                    className="px-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl text-xs text-slate-300 font-bold transition-all"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInterviewerModal(false);
                    setIntName("");
                    setIntUserId("");
                    setIntPassword("");
                    setIntCreateError("");
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={intCreating}
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0d0e11] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">Account Generated Successfully!</h3>
            <p className="text-xs text-slate-500 mb-6">Share these credentials with the candidate. The system password has been randomly generated.</p>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4 font-mono text-xs">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-600 tracking-wider font-sans">Login Portal URL</span>
                <p className="text-white mt-0.5 break-all">{window.location.origin}/login</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-600 tracking-wider font-sans">User ID</span>
                  <p className="text-blue-400 font-bold mt-0.5">{createdDetails.userId}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-600 tracking-wider font-sans">Password</span>
                  <p className="text-emerald-400 font-bold mt-0.5">{createdDetails.password}</p>
                </div>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-600 tracking-wider font-sans">Challenge</span>
                <p className="text-slate-300 mt-0.5">{createdDetails.assignedChallenge}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCopyCredentials}
                className="flex-1 flex items-center justify-center gap-2 py-3 border border-white/5 hover:border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                {copied ? "Copied Shareable Info" : "Copy Credentials"}
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setCreatedDetails(null);
                }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CANDIDATE CONFIRMATION MODAL */}
      {candidateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0d0e11] border border-white/10 rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2">Delete Candidate Account</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Are you sure you want to delete <span className="font-bold text-white">{candidateToDelete.name}</span>?
              <br />
              <span className="text-rose-500 font-semibold">Their session will immediately end, and login capability will be disabled.</span>
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCandidateToDelete(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCandidate}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE INTERVIEWER CONFIRMATION MODAL */}
      {interviewerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0d0e11] border border-white/10 rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2">Delete Interviewer Account</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Are you sure you want to delete <span className="font-bold text-white">{interviewerToDelete.name}</span>?
              <br />
              <span className="text-rose-500 font-semibold">Their session will immediately end, and they will lose access.</span>
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setInterviewerToDelete(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteInterviewer}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                Delete Interviewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
