"use client";

import { FileText, FileCode2, FileJson, BookOpen, FolderOpen, ChevronRight } from "lucide-react";

const FILE_ICONS: Record<string, React.ReactNode> = {
  "index.html": <FileCode2 size={14} className="text-orange-400" />,
  "style.css": <FileCode2 size={14} className="text-sky-400" />,
  "script.js": <FileText size={14} className="text-yellow-400" />,
  "main.py": <FileCode2 size={14} className="text-blue-400" />,
  "main.cpp": <FileCode2 size={14} className="text-violet-400" />,
  "Main.java": <FileCode2 size={14} className="text-orange-400" />,
  "README.md": <BookOpen size={14} className="text-emerald-400" />,
};

interface Props {
  files: string[];
  activeFile: string;
  onSelect: (file: string) => void;
  dirtyFiles: Set<string>;
}

export default function FileExplorer({ files, activeFile, onSelect, dirtyFiles }: Props) {
  return (
    <div className="w-[220px] flex-shrink-0 bg-[#0d0e10] border-r border-white/5 flex flex-col h-full shadow-lg">
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/5 bg-[#121417]/50">
        <div className="flex items-center gap-2">
          <FolderOpen size={14} className="text-slate-400" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
            Project Files
          </span>
        </div>
      </div>
      
      <div className="py-2 overflow-y-auto flex-1 scrollbar-none">
        <div className="px-2 mb-2">
           <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-slate-600 font-medium">
             <ChevronRight size={12} className="rotate-90" />
             <span className="uppercase tracking-tighter">root</span>
           </div>
        </div>
        
        {files.map((file) => (
          <button
            key={file}
            onClick={() => onSelect(file)}
            className={`w-[calc(100%-16px)] mx-2 flex items-center gap-2.5 px-3 py-2 text-[12px] rounded-md transition-all duration-200 group relative mb-0.5 ${
              activeFile === file
                ? "bg-blue-600/10 text-blue-400 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.2)]"
                : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"
            }`}
          >
            {activeFile === file && (
              <div className="absolute left-0 w-1 h-4 bg-blue-500 rounded-full" />
            )}
            
            <span className="flex-shrink-0 transition-transform group-hover:scale-110 duration-200">
              {FILE_ICONS[file] ?? <FileJson size={14} className="text-slate-500" />}
            </span>
            
            <span className="flex-1 truncate font-medium">
              {file}
            </span>
            
            {dirtyFiles.has(file) && (
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse" />
            )}
          </button>
        ))}
      </div>
      
      {/* Footer Info */}
      <div className="p-4 border-t border-white/5 bg-[#121417]/30">
        <div className="text-[10px] text-slate-600 font-mono flex flex-col gap-1">
          <div className="flex justify-between">
            <span>Branch</span>
            <span className="text-slate-400">main</span>
          </div>
          <div className="flex justify-between">
            <span>Files</span>
            <span className="text-slate-400">{files.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
