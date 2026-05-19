"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Monitor } from "lucide-react";

interface Props {
  html: string;
  css: string;
  js: string;
}

export default function LivePreview({ html, css, js }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [lastRefresh, setLastRefresh] = useState<string>("");

  const buildSrc = () => {
    // Inject CSS inline and JS inline into the HTML
    let doc = html;

    // Replace stylesheet link with inline styles
    const hasCssLink = /<link[^>]+rel=["']stylesheet["'][^>]*>/gi.test(doc);
    if (hasCssLink) {
      doc = doc.replace(
        /<link[^>]+rel=["']stylesheet["'][^>]*>/gi,
        `<style>\n${css}\n</style>`
      );
    } else {
      doc += `\n<style>\n${css}\n</style>`;
    }

    // Replace script src with inline script
    const hasJsScript = /<script[^>]+src=["'][^"']*\.js["'][^>]*><\/script>/gi.test(html);
    if (hasJsScript) {
      doc = doc.replace(
        /<script[^>]+src=["'][^"']*\.js["'][^>]*><\/script>/gi,
        `<script>\n${js}\n</script>`
      );
    } else {
      doc += `\n<script>\n${js}\n</script>`;
    }

    return doc;
  };

  const refresh = () => {
    if (!iframeRef.current) return;
    const src = buildSrc();
    iframeRef.current.srcdoc = src;
    setLastRefresh(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  };

  useEffect(() => {
    const timer = setTimeout(refresh, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, css, js]);

  return (
    <div className="flex flex-col h-full bg-[#161819]">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1d21] border-b border-[#2d2f33] select-none">
        <Monitor size={11} className="text-slate-500" />
        <span className="text-slate-500 text-[10px] uppercase tracking-widest">
          Live Preview
        </span>
        <span className="ml-2 text-slate-700 text-[10px]">
          {lastRefresh ? `Updated ${lastRefresh}` : "Waiting…"}
        </span>
        <button
          onClick={refresh}
          className="ml-auto text-slate-600 hover:text-slate-300 transition-colors"
          title="Force refresh"
        >
          <RefreshCw size={11} />
        </button>
      </div>
      <div className="flex-1 relative">
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0 bg-white"
          sandbox="allow-scripts allow-modals"
          title="Live Preview"
        />
      </div>
    </div>
  );
}
