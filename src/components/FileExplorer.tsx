"use client";

import { FileText, FileCode2, FileJson, BookOpen, FolderOpen, ChevronRight, Database, Settings, ShieldCheck, PlayCircle } from "lucide-react";
import { useThemeStore } from "@/store/themeStore";

const FILE_ICONS: Record<string, React.ReactNode> = {
  "index.html": <FileCode2 size={14} className="text-amber-500" />,
  "style.css": <FileCode2 size={14} className="text-sky-500" />,
  "script.js": <FileText size={14} className="text-yellow-500" />,
  "main.py": <FileCode2 size={14} className="text-blue-500" />,
  "app.py": <FileCode2 size={14} className="text-blue-500" />,
  "routes.py": <FileCode2 size={14} className="text-indigo-500" />,
  "schemas.py": <ShieldCheck size={14} className="text-teal-500" />,
  "test_main.py": <PlayCircle size={14} className="text-rose-500" />,
  "test_app.py": <PlayCircle size={14} className="text-rose-500" />,
  "app.js": <FileCode2 size={14} className="text-yellow-500" />,
  "middleware.js": <ShieldCheck size={14} className="text-teal-500" />,
  "routes.js": <FileCode2 size={14} className="text-indigo-500" />,
  "test.js": <PlayCircle size={14} className="text-rose-500" />,
  "route.js": <FileCode2 size={14} className="text-blue-500" />,
  "actions.ts": <FileCode2 size={14} className="text-indigo-500" />,
  "actions.js": <FileCode2 size={14} className="text-indigo-500" />,
  "test_actions.js": <PlayCircle size={14} className="text-rose-500" />,
  "OrderService.java": <FileCode2 size={14} className="text-orange-500" />,
  "OrderController.java": <FileCode2 size={14} className="text-amber-500" />,
  "OrderApplicationTests.java": <PlayCircle size={14} className="text-rose-500" />,
  "models.py": <Database size={14} className="text-emerald-500" />,
  "views.py": <FileCode2 size={14} className="text-indigo-500" />,
  "tests.py": <PlayCircle size={14} className="text-rose-500" />,
  "serializers.py": <ShieldCheck size={14} className="text-teal-500" />,
  "settings.py": <Settings size={14} className="text-orange-500" />,
  "manage.py": <FileCode2 size={14} className="text-blue-600" />,
  "main.cpp": <FileCode2 size={14} className="text-violet-500" />,
  "Main.java": <FileCode2 size={14} className="text-orange-500" />,
  "README.md": <BookOpen size={14} className="text-emerald-500" />,
};

interface Props {
  files: string[];
  activeFile: string;
  onSelect: (file: string) => void;
  dirtyFiles: Set<string>;
}

export default function FileExplorer({ files, activeFile, onSelect, dirtyFiles }: Props) {
  const { theme } = useThemeStore();
  const isLight = theme === "light";

  return (
    <div
      className={`w-[220px] flex-shrink-0 border-r flex flex-col h-full transition-colors duration-150 ${
        isLight
          ? "bg-slate-50 border-slate-200 text-slate-700"
          : theme === "midnight"
          ? "bg-[#0d121f] border-[#1f293d] text-slate-300"
          : "bg-[#12151c] border-[#252a36] text-slate-300"
      }`}
    >
      <div
        className={`px-4 py-3 flex items-center justify-between border-b ${
          isLight ? "bg-slate-100/70 border-slate-200" : "bg-black/20 border-white/5"
        }`}
      >
        <div className="flex items-center gap-2">
          <FolderOpen size={14} className={isLight ? "text-slate-500" : "text-slate-400"} />
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
            Explorer
          </span>
        </div>
      </div>
      
      <div className="py-2 overflow-y-auto flex-1 scrollbar-thin">
        <div className="px-2 mb-2">
           <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] opacity-60 font-medium">
             <ChevronRight size={12} className="rotate-90" />
             <span className="uppercase tracking-wider">workspace</span>
           </div>
        </div>
        
        {files.map((file) => {
          const isActive = activeFile === file;
          return (
            <button
              key={file}
              onClick={() => onSelect(file)}
              className={`w-[calc(100%-16px)] mx-2 flex items-center gap-2.5 px-3 py-2 text-xs md:text-sm rounded-md transition-all group relative mb-0.5 border ${
                isActive
                  ? isLight
                    ? "bg-blue-50 text-blue-700 font-semibold border-blue-200 shadow-sm"
                    : "bg-blue-500/15 text-blue-400 font-medium border-blue-500/20"
                  : isLight
                  ? "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 border-transparent"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border-transparent"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 w-1 h-3.5 bg-blue-500 rounded-sm" />
              )}
              
              <span className="flex-shrink-0 transition-transform group-hover:scale-105">
                {FILE_ICONS[file] ?? <FileJson size={15} className="opacity-60" />}
              </span>
              
              <span className="flex-1 truncate text-left font-mono text-xs md:text-sm">
                {file}
              </span>
              
              {dirtyFiles.has(file) && (
                <span className="w-1.5 h-1.5 rounded-sm bg-amber-500" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Footer Info */}
      <div
        className={`p-3 border-t text-[10px] font-mono flex flex-col gap-1 opacity-70 ${
          isLight ? "border-slate-200 bg-slate-100/50" : "border-white/5 bg-black/10"
        }`}
      >
        <div className="flex justify-between">
          <span>Branch</span>
          <span className="font-semibold">main</span>
        </div>
        <div className="flex justify-between">
          <span>Files</span>
          <span>{files.length}</span>
        </div>
      </div>
    </div>
  );
}
