"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  Download,
  Copy,
  Users,
  X,
  FileCheck,
} from "lucide-react";
import { REPOSITORIES } from "@/data/brokenRepo";

interface CandidateRow {
  id: string;
  name: string;
  userId: string;
  assignedRepoId: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (created: any[], rawPasswords: Record<string, string>) => void;
  customChallenges?: any[];
  isLight?: boolean;
}

export default function BulkAddModal({
  isOpen,
  onClose,
  onSuccess,
  customChallenges = [],
  isLight = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [defaultRepoId, setDefaultRepoId] = useState(REPOSITORIES[0].id);
  const [rawText, setRawText] = useState("");
  const [parsedCandidates, setParsedCandidates] = useState<CandidateRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const allRepos = [...REPOSITORIES, ...customChallenges];

  // Helper to parse CSV string into CandidateRow[]
  const parseCsvContent = (content: string, defaultRepo: string) => {
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const results: CandidateRow[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip header line if detected
      if (i === 0 && (line.toLowerCase().startsWith("name") || line.toLowerCase().includes("username") || line.toLowerCase().includes("user_id"))) {
        continue;
      }

      // Parse comma or tab separated values
      const parts = line.includes("\t") ? line.split("\t") : line.split(",");
      const name = parts[0]?.replace(/^["']|["']$/g, "").trim();
      if (!name) continue;

      let userId = parts[1]?.replace(/^["']|["']$/g, "").trim();
      if (!userId) {
        userId = name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_")
          .slice(0, 15);
      }

      const assignedRepoId = parts[2]?.replace(/^["']|["']$/g, "").trim() || defaultRepo;

      results.push({
        id: `row_${i}_${Date.now()}`,
        name,
        userId: userId.toLowerCase(),
        assignedRepoId,
      });
    }

    return results;
  };

  // Helper to parse plain text / PDF raw extracted text
  const parsePdfContent = (content: string, defaultRepo: string) => {
    // Extract candidate names from text (lines with 2-4 words, filtering out common PDF metadata)
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const results: CandidateRow[] = [];
    const stopWords = ["page", "assessment", "candidates", "date", "created", "name", "id", "email", "total", "devtrace"];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length < 3 || line.length > 50) continue;
      const lower = line.toLowerCase();
      if (stopWords.some((sw) => lower === sw || lower.startsWith(sw + ":"))) continue;

      // Extract cleaned name
      const name = line.replace(/^\d+[\.\-\)]\s*/, "").replace(/[,\t].*$/, "").trim();
      if (name.length >= 3 && !name.includes("http") && !name.includes("@")) {
        const userId = name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 15);
        results.push({
          id: `pdf_row_${i}_${Date.now()}`,
          name,
          userId,
          assignedRepoId: defaultRepo,
        });
      }
    }

    return results;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setFileName(file.name);

    try {
      if (file.name.endsWith(".csv") || file.type === "text/csv" || file.name.endsWith(".txt")) {
        const text = await file.text();
        const parsed = parseCsvContent(text, defaultRepoId);
        if (parsed.length === 0) {
          setError("No candidate records found in CSV. Please verify file format.");
        } else {
          setParsedCandidates(parsed);
        }
      } else if (file.name.endsWith(".pdf") || file.type === "application/pdf") {
        // PDF text extraction using ArrayBuffer and regex / text decoding
        const arrayBuffer = await file.arrayBuffer();
        const decoder = new TextDecoder("utf-8");
        const rawString = decoder.decode(arrayBuffer);

        // Extract text streams inside PDF (matching BT ... ET blocks or string literals)
        const textMatches = rawString.match(/\((.*?)\)|\[(.*?)\]/g) || [];
        let extractedText = textMatches
          .map((m) => m.replace(/[\(\)\[\]]/g, ""))
          .join("\n");

        if (!extractedText || extractedText.length < 10) {
          extractedText = rawString.replace(/[^\x20-\x7E\n]/g, " ");
        }

        const parsed = parsePdfContent(extractedText, defaultRepoId);
        if (parsed.length === 0) {
          // Fallback: split raw string by words
          const words = rawString.match(/[A-Z][a-z]+ [A-Z][a-z]+/g) || [];
          const uniqueWords = Array.from(new Set(words)).slice(0, 50);
          const fallbackParsed = uniqueWords.map((name, idx) => ({
            id: `pdf_fallback_${idx}`,
            name,
            userId: name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 15),
            assignedRepoId: defaultRepoId,
          }));
          if (fallbackParsed.length > 0) {
            setParsedCandidates(fallbackParsed);
          } else {
            setError("Could not extract candidate names automatically from PDF. Try using CSV or pasting text.");
          }
        } else {
          setParsedCandidates(parsed);
        }
      } else {
        setError("Unsupported file format. Please upload a .csv or .pdf file.");
      }
    } catch (err: any) {
      console.error("File parse error:", err);
      setError("Failed to parse file: " + (err.message || "Unknown error"));
    }
  };

  const handleParseText = () => {
    if (!rawText.trim()) {
      setError("Please paste candidate entries first.");
      return;
    }
    setError("");
    const parsed = parseCsvContent(rawText, defaultRepoId);
    if (parsed.length === 0) {
      setError("No valid candidate rows detected. Format: 'Name, User ID (optional)' per line.");
    } else {
      setParsedCandidates(parsed);
    }
  };

  const handleUpdateRow = (id: string, field: keyof CandidateRow, value: string) => {
    setParsedCandidates((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleDeleteRow = (id: string) => {
    setParsedCandidates((prev) => prev.filter((r) => r.id !== id));
  };

  const handleApplyDefaultRepoToAll = (repoId: string) => {
    setDefaultRepoId(repoId);
    setParsedCandidates((prev) =>
      prev.map((row) => ({ ...row, assignedRepoId: repoId }))
    );
  };

  const handleBulkSubmit = async () => {
    if (parsedCandidates.length === 0) {
      setError("No candidates to create.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/candidates/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: parsedCandidates.map((c) => ({
            name: c.name,
            userId: c.userId,
            assignedRepoId: c.assignedRepoId,
          })),
          defaultRepoId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Bulk candidate creation failed.");
      }

      onSuccess(data.candidates, data.rawPasswords || {});
      onClose();
    } catch (err: any) {
      console.error("Bulk add submit error:", err);
      setError(err.message || "Bulk addition failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div
        className={`border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 ${
          isLight
            ? "bg-white border-slate-200 text-slate-800"
            : "bg-[#0e111a] border-white/10 text-white"
        }`}
      >
        {/* Header */}
        <div
          className={`p-5 border-b flex items-center justify-between ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/5"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Users size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Mass Candidate Ingestion</h3>
              <p className="text-xs opacity-60">Upload a CSV or PDF roster to generate batch assessment credentials.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 scrollbar-thin">
          {/* Mode Switcher Tabs */}
          <div
            className={`flex rounded-xl p-1 gap-1 border text-xs font-semibold ${
              isLight ? "bg-slate-100 border-slate-200" : "bg-black/30 border-white/5"
            }`}
          >
            <button
              onClick={() => setMode("upload")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
                mode === "upload"
                  ? "bg-blue-600 text-white shadow-sm font-bold"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              <Upload size={14} />
              <span>Upload CSV / PDF File</span>
            </button>
            <button
              onClick={() => setMode("paste")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
                mode === "paste"
                  ? "bg-blue-600 text-white shadow-sm font-bold"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              <FileSpreadsheet size={14} />
              <span>Paste CSV Roster Text</span>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle size={15} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Default Challenge Selector */}
          <div>
            <label className="block text-[10px] uppercase font-bold opacity-70 mb-1.5">
              Default Challenge for Batch
            </label>
            <select
              value={defaultRepoId}
              onChange={(e) => handleApplyDefaultRepoToAll(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-colors ${
                isLight
                  ? "bg-slate-50 border-slate-300 text-slate-800 focus:border-blue-500"
                  : "bg-[#141824] border-white/10 text-slate-200 focus:border-blue-500/50"
              }`}
            >
              {allRepos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} [{r.framework?.toUpperCase() || r.category?.toUpperCase() || "CODE"}]
                </option>
              ))}
            </select>
          </div>

          {/* Upload Mode */}
          {mode === "upload" ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group ${
                isLight
                  ? "bg-slate-50 hover:bg-blue-50/50 border-slate-300 hover:border-blue-400"
                  : "bg-white/[0.02] hover:bg-white/[0.05] border-white/10 hover:border-blue-500/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,.pdf,application/pdf,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-3 group-hover:scale-110 transition-transform">
                <Upload size={22} />
              </div>
              <h4 className="text-sm font-bold">
                {fileName ? fileName : "Click to select CSV or PDF roster file"}
              </h4>
              <p className="text-xs opacity-60 mt-1 max-w-sm">
                Supports spreadsheet exports (.csv), candidate listings (.pdf), and plaintext (.txt).
              </p>
            </div>
          ) : (
            /* Paste Mode */
            <div className="space-y-2">
              <textarea
                rows={5}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Format (one per line):\nAlice Smith, alice_smith\nBob Jones, bob_jones\nCarol White`}
                className={`w-full p-3.5 rounded-xl border text-xs font-mono outline-none resize-none transition-colors ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
                    : "bg-white/[0.02] border-white/10 text-white placeholder:text-slate-600 focus:border-blue-500/50"
                }`}
              />
              <button
                type="button"
                onClick={handleParseText}
                className="w-full py-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-500 rounded-xl text-xs font-bold transition-colors"
              >
                Parse Candidate Lines
              </button>
            </div>
          )}

          {/* Parsed Candidates Preview Grid */}
          {parsedCandidates.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <FileCheck size={14} className="text-emerald-500" />
                  <span>Parsed Roster ({parsedCandidates.length} Candidates)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setParsedCandidates([])}
                  className="text-[11px] text-rose-500 hover:underline"
                >
                  Clear All
                </button>
              </div>

              <div className="max-h-[220px] overflow-y-auto rounded-xl border border-white/5 scrollbar-thin">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                      isLight ? "bg-slate-100 text-slate-600" : "bg-black/40 text-slate-400 border-white/5"
                    }`}>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">User ID</th>
                      <th className="px-3 py-2">Challenge</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {parsedCandidates.map((row) => (
                      <tr key={row.id} className="hover:bg-white/[0.01]">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => handleUpdateRow(row.id, "name", e.target.value)}
                            className="bg-transparent border-none outline-none font-bold text-xs w-full"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.userId}
                            onChange={(e) => handleUpdateRow(row.id, "userId", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                            className="bg-transparent border-none outline-none font-mono text-blue-500 text-xs w-full"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.assignedRepoId}
                            onChange={(e) => handleUpdateRow(row.id, "assignedRepoId", e.target.value)}
                            className={`px-1.5 py-1 rounded text-[11px] outline-none ${
                              isLight ? "bg-slate-100 text-slate-800" : "bg-[#161822] text-slate-300"
                            }`}
                          >
                            {allRepos.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name.slice(0, 20)}...
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1 hover:text-rose-500 transition-colors opacity-60 hover:opacity-100"
                            title="Remove candidate from batch"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-4 border-t flex items-center justify-between ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/5"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold opacity-70 hover:opacity-100 transition-opacity"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || parsedCandidates.length === 0}
            onClick={handleBulkSubmit}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50"
          >
            <Plus size={14} />
            <span>
              {loading
                ? "Generating Accounts..."
                : `Generate Accounts (${parsedCandidates.length})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
