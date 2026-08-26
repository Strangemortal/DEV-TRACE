"use client";

import React, { useState } from "react";
import { BookOpen, Code2, Eye, FileText } from "lucide-react";
import { useThemeStore } from "@/store/themeStore";

interface Props {
  content: string;
  className?: string;
  defaultFormatted?: boolean;
}

export default function MarkdownViewer({ content, className = "", defaultFormatted = true }: Props) {
  const [isFormatted, setIsFormatted] = useState(defaultFormatted);
  const { theme } = useThemeStore();
  const isLight = theme === "light";

  if (!content) {
    return (
      <div className="p-4 text-xs opacity-60 text-center">
        No content available.
      </div>
    );
  }

  // Parse markdown into clean React elements
  const renderFormattedMarkdown = (text: string) => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLang = "";

    const parseInline = (line: string): React.ReactNode => {
      // Split by backticks for inline code
      const parts = line.split(/(`[^`]+`)/g);
      return parts.map((part, idx) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
          const code = part.slice(1, -1);
          return (
            <code
              key={idx}
              className={`px-1.5 py-0.5 mx-0.5 rounded text-xs font-mono font-medium ${
                isLight ? "bg-slate-200 text-slate-800" : "bg-black/40 text-blue-300 border border-white/10"
              }`}
            >
              {code}
            </code>
          );
        }

        // Bold formatting
        const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
        return boldParts.map((bPart, bIdx) => {
          if (bPart.startsWith("**") && bPart.endsWith("**") && bPart.length >= 4) {
            return (
              <strong key={`${idx}-${bIdx}`} className="font-bold text-inherit">
                {bPart.slice(2, -2)}
              </strong>
            );
          }
          return bPart;
        });
      });
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Code blocks ```
      if (trimmed.startsWith("```")) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockLang = trimmed.slice(3).trim();
          codeBlockContent = [];
        } else {
          inCodeBlock = false;
          elements.push(
            <div
              key={`code-${index}`}
              className={`my-3 p-3.5 rounded-md border font-mono text-xs overflow-x-auto ${
                isLight ? "bg-slate-900 text-slate-100 border-slate-700" : "bg-black/50 text-slate-200 border-white/10"
              }`}
            >
              {codeBlockLang && (
                <div className="text-[10px] uppercase font-semibold opacity-60 mb-1">
                  {codeBlockLang}
                </div>
              )}
              <pre className="whitespace-pre">{codeBlockContent.join("\n")}</pre>
            </div>
          );
          codeBlockContent = [];
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Empty line
      if (trimmed === "") {
        elements.push(<div key={`space-${index}`} className="h-2" />);
        return;
      }

      // Horizontal rule
      if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
        elements.push(
          <hr
            key={`hr-${index}`}
            className={`my-3 border-t ${isLight ? "border-slate-200" : "border-white/10"}`}
          />
        );
        return;
      }

      // Headings
      if (trimmed.startsWith("# ")) {
        elements.push(
          <h1
            key={`h1-${index}`}
            className="text-base font-bold mt-3 mb-2 pb-1 border-b border-white/10 text-inherit flex items-center gap-2"
          >
            {parseInline(trimmed.slice(2))}
          </h1>
        );
        return;
      }

      if (trimmed.startsWith("## ")) {
        elements.push(
          <h2
            key={`h2-${index}`}
            className="text-sm font-bold mt-4 mb-2 text-sky-500 flex items-center gap-2"
          >
            {parseInline(trimmed.slice(3))}
          </h2>
        );
        return;
      }

      if (trimmed.startsWith("### ")) {
        elements.push(
          <h3
            key={`h3-${index}`}
            className="text-xs font-bold mt-3 mb-1.5 uppercase tracking-wide opacity-80"
          >
            {parseInline(trimmed.slice(4))}
          </h3>
        );
        return;
      }

      // Numbered List (e.g. 1. , 2. )
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        elements.push(
          <div key={`num-${index}`} className="flex items-start gap-2 my-1 pl-1">
            <span className="flex-shrink-0 w-5 h-5 rounded bg-sky-500/10 text-sky-500 font-bold text-xs flex items-center justify-center border border-sky-500/20">
              {numMatch[1]}
            </span>
            <div className="flex-1 text-sm leading-relaxed">{parseInline(numMatch[2])}</div>
          </div>
        );
        return;
      }

      // Bullet List (- or *)
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        elements.push(
          <div key={`bullet-${index}`} className="flex items-start gap-2 my-1 pl-2">
            <span className="w-1.5 h-1.5 rounded-sm bg-sky-500 flex-shrink-0 mt-2" />
            <div className="flex-1 text-sm leading-relaxed">{parseInline(trimmed.slice(2))}</div>
          </div>
        );
        return;
      }

      // Regular Paragraph
      elements.push(
        <p key={`p-${index}`} className="text-sm leading-relaxed my-1">
          {parseInline(line)}
        </p>
      );
    });

    return elements;
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Format Toggle Bar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
        <div className="text-[11px] font-semibold opacity-70 uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen size={13} className="text-sky-500" />
          <span>Document Reader</span>
        </div>

        <div className="flex items-center gap-1 bg-black/10 rounded-md p-0.5 border border-white/5 text-xs">
          <button
            type="button"
            onClick={() => setIsFormatted(true)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
              isFormatted
                ? "bg-sky-600 text-white shadow-sm font-semibold"
                : "opacity-60 hover:opacity-100"
            }`}
            title="Convert markdown symbols to clean reading words"
          >
            <Eye size={12} />
            <span>Simple Reading</span>
          </button>
          <button
            type="button"
            onClick={() => setIsFormatted(false)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
              !isFormatted
                ? "bg-sky-600 text-white shadow-sm font-semibold"
                : "opacity-60 hover:opacity-100"
            }`}
            title="View raw markdown syntax"
          >
            <FileText size={12} />
            <span>Raw Markdown</span>
          </button>
        </div>
      </div>

      {/* Content Body */}
      {isFormatted ? (
        <div className="space-y-1 select-text font-sans">
          {renderFormattedMarkdown(content)}
        </div>
      ) : (
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed p-3.5 rounded-md border bg-black/20 border-white/10 select-text overflow-x-auto">
          {content}
        </pre>
      )}
    </div>
  );
}
