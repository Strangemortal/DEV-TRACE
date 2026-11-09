"use client";

import React, { useEffect, useState } from "react";
import {
  Smartphone,
  Laptop,
  Wifi,
  Copy,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  QrCode,
  Download,
} from "lucide-react";
import { useThemeStore } from "@/store/themeStore";

interface NetworkUrl {
  name: string;
  ip: string;
  url: string;
  isPrimary: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConnectMobileModal({ isOpen, onClose }: Props) {
  const { theme } = useThemeStore();
  const isLight = theme === "light";
  const isMidnight = theme === "midnight";

  const [loading, setLoading] = useState(true);
  const [primaryUrl, setPrimaryUrl] = useState("");
  const [primaryIp, setPrimaryIp] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [networkUrls, setNetworkUrls] = useState<NetworkUrl[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNetworkInfo();
    }
  }, [isOpen]);

  const fetchNetworkInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/network-info");
      const data = await res.json();
      if (data.success) {
        setPrimaryUrl(data.primaryUrl);
        setPrimaryIp(data.primaryIp);
        setQrCodeDataUrl(data.qrCodeDataUrl);
        setNetworkUrls(data.networkUrls || []);
      }
    } catch (err) {
      console.error("Failed to load network info", err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all duration-200 ${
          isLight
            ? "bg-white border-slate-200 text-slate-800"
            : isMidnight
            ? "bg-[#0f172a] border-indigo-500/30 text-slate-100"
            : "bg-[#12151c] border-[#252a36] text-slate-100"
        }`}
      >
        {/* Glowing Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500" />

        {/* Header */}
        <div className="p-5 pb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <QrCode size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">Connect Mobile App</h3>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LAN Server Live
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Scan from your phone camera to run seamlessly on the same Wi-Fi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 pt-2 space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <RefreshCw size={24} className="animate-spin text-blue-400" />
              <span className="text-xs text-slate-400">Detecting local network interfaces...</span>
            </div>
          ) : (
            <>
              {/* QR Code Container */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl border bg-black/20 border-white/5">
                {qrCodeDataUrl ? (
                  <div className="relative p-2.5 rounded-xl bg-white shadow-lg flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCodeDataUrl}
                      alt="Mobile Connect QR Code"
                      className="w-36 h-36 rounded-lg block"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white rounded-full p-1 shadow">
                      <Smartphone size={14} />
                    </div>
                  </div>
                ) : (
                  <div className="w-36 h-36 rounded-xl bg-slate-800/50 flex items-center justify-center text-xs text-slate-400">
                    No QR Code
                  </div>
                )}

                <div className="space-y-2.5 text-center sm:text-left flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-300 flex items-center justify-center sm:justify-start gap-1.5">
                    <Wifi size={14} className="text-sky-400" />
                    <span>Local Network Address:</span>
                  </div>

                  {/* URL Box */}
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono">
                    <span className="truncate flex-1 text-sky-400 select-all font-semibold">
                      {primaryUrl}
                    </span>
                    <button
                      onClick={() => copyToClipboard(primaryUrl)}
                      className="p-1.5 rounded hover:bg-white/10 text-slate-300 transition-colors flex-shrink-0"
                      title="Copy URL"
                    >
                      {copied ? (
                        <Check size={14} className="text-emerald-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400 leading-tight">
                    Both devices must be connected to the same Wi-Fi router or mobile hotspot.
                  </div>
                </div>
              </div>

              {/* Install PWA Instructions Box */}
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                  isLight
                    ? "bg-slate-50 border-slate-200"
                    : "bg-white/[0.03] border-white/5"
                }`}
              >
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Download size={14} className="text-emerald-400" />
                  <span>How to Install as Standalone App:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div className="p-2 rounded-lg bg-black/20 border border-white/5 space-y-1">
                    <span className="font-bold text-sky-400">📱 On Mobile:</span>
                    <p className="opacity-80">
                      Open in Chrome/Safari, tap <strong>Share</strong> or <strong>⋮</strong> and select{" "}
                      <strong>&quot;Add to Home Screen&quot;</strong>.
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-black/20 border border-white/5 space-y-1">
                    <span className="font-bold text-indigo-400">💻 On Laptop:</span>
                    <p className="opacity-80">
                      Click the <strong>Install</strong> icon in the address bar (or browser menu) to run as a desktop app.
                    </p>
                  </div>
                </div>
              </div>

              {/* Alternative IPs if multi-adapter */}
              {networkUrls.length > 1 && (
                <div className="text-[11px] text-slate-400">
                  <span className="opacity-70">Other network adapters: </span>
                  {networkUrls
                    .filter((n) => !n.isPrimary)
                    .map((n) => (
                      <button
                        key={n.ip}
                        onClick={() => copyToClipboard(n.url)}
                        className="underline hover:text-sky-300 ml-1.5"
                      >
                        {n.name}: {n.ip}
                      </button>
                    ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Telemetry & auth sync automatically</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
