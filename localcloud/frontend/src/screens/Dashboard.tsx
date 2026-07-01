import React, { useState, useEffect } from "react";
import { Copy, Check, ExternalLink, RefreshCw, XCircle } from "lucide-react";
import { StatusDot } from "../components/StatusDot";
import { ResourceChart } from "../components/ResourceChart";
import { LogTerminal } from "../components/LogTerminal";
import { EventsOn, BrowserOpenURL } from "../../wailsjs/runtime/runtime";

interface RunConfig {
  projectPath: string;
  runtime: string;
  scriptName: string;
  port: number;
  memoryMB: number;
  cpuCores: number;
  vercelSync: boolean;
  vercelEnvKey: string;
  tunnelMode: string;
}

interface DashboardProps {
  tunnelURL: string;
  runConfig: RunConfig;
  onStop: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  tunnelURL,
  runConfig,
  onStop,
}) => {
  const [copied, setCopied] = useState(false);
  const [uptime, setUptime] = useState(0);
  const [tunnelState, setTunnelState] = useState({
    status: "CONNECTED",
    url: tunnelURL,
    error: "",
  });

  // Uptime Counter
  useEffect(() => {
    const timer = setInterval(() => {
      setUptime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to connection drops and status changes
  useEffect(() => {
    const unsubscribe = EventsOn("tunnel-status", (data: { status: string; url: string; error?: string }) => {
      setTunnelState({
        status: data.status,
        url: data.url,
        error: data.error || "",
      });
    });
    return () => unsubscribe();
  }, []);

  const formatUptime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [
      hrs.toString().padStart(2, "0"),
      mins.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ].join(":");
  };

  const handleCopy = async () => {
    const url = tunnelState.url || tunnelURL;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed: ", err);
    }
  };

  const handleOpenBrowser = () => {
    const url = tunnelState.url || tunnelURL;
    if (url) {
      BrowserOpenURL(url);
    }
  };

  const isConnected = tunnelState.status === "CONNECTED";
  const isReconnecting =
    tunnelState.status === "CONNECTING" ||
    tunnelState.status === "RECONNECTING";

  return (
    <div
      className="w-full max-w-5xl h-[92vh] flex flex-col gap-5 text-white p-2 font-sans"
      id="dashboard-screen"
    >
      {/* Top Header Panel */}
      <div className="flex justify-between items-center bg-gray-950/40 border border-gray-900 rounded-xl p-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight text-white">
              LocalCloud Dashboard
            </h1>
            <p className="text-[10px] text-gray-500 font-mono">
              PORT: <span className="text-indigo-400">{runConfig.port}</span> | SCRIPT:{" "}
              <span className="text-emerald-400">{runConfig.scriptName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-mono">
              Uptime
            </span>
            <span className="text-sm font-semibold font-mono text-gray-300">
              {formatUptime(uptime)}
            </span>
          </div>

          <div className="h-8 w-[1px] bg-gray-900" />

          <div className="flex flex-col items-end">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-0.5">
              Tunnel Link
            </span>
            <StatusDot status={tunnelState.status} />
          </div>
        </div>
      </div>

      {/* URL Exposure Card */}
      <div
        className={`relative overflow-hidden bg-gray-900/30 border rounded-xl p-5 backdrop-blur-lg transition-all duration-300 ${
          isConnected
            ? "border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
            : isReconnecting
            ? "border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)] animate-pulse"
            : "border-gray-800"
        }`}
      >
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest font-mono">
              Public Forwarding Address
            </span>
            <div className="mt-1">
              {tunnelState.url ? (
                <span className="text-base font-semibold text-white font-mono break-all selection:bg-indigo-500/30">
                  {tunnelState.url}
                </span>
              ) : (
                <span className="text-sm text-gray-500 font-mono italic">
                  {isReconnecting
                    ? "Generating secure connection tunnel..."
                    : "No active tunnel link available"}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              disabled={!tunnelState.url}
              className="flex items-center gap-1.5 bg-gray-950 hover:bg-gray-900 disabled:opacity-40 disabled:hover:bg-gray-950 border border-gray-800 hover:border-gray-700 active:scale-98 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer transition-all"
              title="Copy URL"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-mono">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-mono">Copy</span>
                </>
              )}
            </button>

            <button
              onClick={handleOpenBrowser}
              disabled={!tunnelState.url}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 active:scale-98 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer transition-all"
              title="Open link in default browser"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="font-mono">Open</span>
            </button>
          </div>
        </div>

        {tunnelState.error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-rose-400 bg-rose-950/20 border border-rose-900/30 px-3 py-1.5 rounded-lg font-mono">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{tunnelState.error}</span>
          </div>
        )}
      </div>

      {/* Resource Performance Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ResourceChart type="ram" limit={runConfig.memoryMB} />
        <ResourceChart type="cpu" limit={runConfig.cpuCores * 100} />
      </div>

      {/* Terminal Output */}
      <div className="flex-1 min-h-0 flex flex-col">
        <LogTerminal />
      </div>

      {/* Bottom Floating Halt Action */}
      <div className="flex justify-end pt-1">
        <button
          onClick={onStop}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 hover:shadow-[0_0_12px_rgba(239,68,68,0.2)] active:scale-98 text-white font-mono text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer border border-rose-500/20"
        >
          STOP SERVICE
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
