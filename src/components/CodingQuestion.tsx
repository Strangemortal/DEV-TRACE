"use client";

import React, { useState } from "react";

interface CodingQuestionProps {
  title: string;
  description: string;
  initialCode: string;
}

export default function CodingQuestion({
  title,
  description,
  initialCode,
}: CodingQuestionProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRunCode = async () => {
    setIsLoading(true);
    setOutput("");
    setError("");

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "An error occurred during execution.");
      } else {
        setOutput(data.output);
        if (data.error) {
          setError(data.error); // stderr from the execution
        }
      }
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100 rounded-xl overflow-hidden shadow-2xl border border-gray-800">
      <div className="p-6 border-b border-gray-800 bg-gray-900/50">
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-gray-400">{description}</p>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col border-r border-gray-800">
          <div className="p-3 bg-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider flex justify-between items-center">
            <span>Editor (Python 3.9)</span>
            <button
              onClick={handleRunCode}
              disabled={isLoading}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isLoading
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-500"
              }`}
            >
              {isLoading ? "Running..." : "Run Code"}
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 p-4 bg-[#1e1e1e] text-gray-200 font-mono text-sm focus:outline-none resize-none"
            spellCheck={false}
          />
        </div>

        <div className="flex-1 flex flex-col bg-[#0d0d0d]">
          <div className="p-3 bg-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider border-t lg:border-t-0 border-gray-800">
            Output Console
          </div>
          <div className="flex-1 p-4 overflow-auto font-mono text-sm whitespace-pre-wrap">
            {output && (
              <div className="text-green-400 mb-2">
                <span className="text-gray-500 block mb-1 text-xs">Standard Output:</span>
                {output}
              </div>
            )}
            {error && (
              <div className="text-red-400">
                <span className="text-gray-500 block mb-1 text-xs">Error / StdErr:</span>
                {error}
              </div>
            )}
            {!output && !error && !isLoading && (
              <div className="text-gray-600 italic">Run your code to see the output here...</div>
            )}
            {isLoading && (
              <div className="text-blue-400 animate-pulse">Executing code in secure container...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
