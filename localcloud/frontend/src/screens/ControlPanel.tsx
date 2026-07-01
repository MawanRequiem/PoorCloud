import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Database,
  Globe,
  ChevronDown,
  Cpu,
  HardDrive,
} from "lucide-react";
import { GetSystemInfo, SaveConfig, StoreCredential } from "../../wailsjs/go/main/App";

interface ScanResult {
  name: string;
  version: string;
  scripts: Record<string, string>;
  devCommand: string;
  defaultPort: number;
  framework: string;
  hasNode: boolean;
  hasBun: boolean;
  projectPath: string;
}

export interface RunConfig {
  projectPath: string;
  runtime: string;
  scriptName: string;
  port: number;
  memoryMB: number;
  cpuCores: number;
  vercelSync: boolean;
  vercelToken: string;
  vercelProject: string;
  vercelTeam: string;
  vercelEnvKey: string;
  tunnelMode: "ephemeral" | "permanent";
  cfToken: string;
  cfAccount: string;
  cfDomain: string;
  cfTunnelName: string;
}

interface ControlPanelProps {
  scan: ScanResult;
  onGoLive: (config: RunConfig) => void;
}

export function ControlPanel({ scan, onGoLive }: ControlPanelProps) {
  const [systemRAM, setSystemRAM] = useState(4096);
  const [cpuMax, setCpuMax] = useState(4);

  const [config, setConfig] = useState<RunConfig>({
    projectPath: scan.projectPath,
    runtime: scan.hasBun ? "bun" : "node",
    scriptName: scan.devCommand || "dev",
    port: scan.defaultPort || 3000,
    memoryMB: Math.min(1024, 4096),
    cpuCores: 2,
    vercelSync: false,
    vercelToken: "",
    vercelProject: "",
    vercelTeam: "",
    vercelEnvKey: "NEXT_PUBLIC_API_URL",
    tunnelMode: "ephemeral",
    cfToken: "",
    cfAccount: "",
    cfDomain: "",
    cfTunnelName: "",
  });

  useEffect(() => {
    GetSystemInfo().then((info: any) => {
      if (info?.totalRamMB) setSystemRAM(info.totalRamMB);
      if (info?.cpuCores) setCpuMax(info.cpuCores);
    }).catch(() => {});
  }, []);

  const update = (partial: Partial<RunConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleGoLive = async () => {
    // Persist credentials
    try {
      if (config.vercelSync && config.vercelToken) {
        await StoreCredential("vercel", "token", config.vercelToken);
      }
      if (config.tunnelMode === "permanent" && config.cfToken) {
        await StoreCredential("cloudflare", "token", config.cfToken);
      }
    } catch {
      // Non-blocking
    }

    onGoLive(config);
  };

  const scripts = scan.scripts ? Object.entries(scan.scripts) : [];
  const frameworkBadge = scan.framework !== "unknown" ? scan.framework : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="min-h-screen flex items-center justify-center bg-[#0b0f17] text-white p-4 select-none"
    >
      <div className="w-full max-w-3xl bg-[#111827]/60 border border-[#1f2937] rounded-xl backdrop-blur-md p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#f3f4f6] tracking-tight">
              {scan.name || "Untitled Project"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {frameworkBadge && (
                <span className="text-[10px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#6366f1]/10 text-[#6366f1] border border-[#6366f1]/20">
                  {frameworkBadge}
                </span>
              )}
              <span className="text-[10px] font-mono text-[#9ca3af]">
                {scan.hasBun ? "bun" : "node"} · port {scan.defaultPort}
              </span>
            </div>
          </div>
        </div>

        {/* Grid: Left settings / Right integrations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Script Selector */}
            <div>
              <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider font-mono mb-1.5">
                <ChevronDown className="w-3 h-3 inline mr-1" />
                Dev Script
              </label>
              <select
                value={config.scriptName}
                onChange={(e) => update({ scriptName: e.target.value })}
                className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3 py-2 text-sm font-mono text-[#f3f4f6] outline-none focus:border-[#6366f1] transition-colors"
              >
                {scripts.map(([key, val]) => (
                  <option key={key} value={key} className="bg-[#111827]">
                    {key} <span className="text-[#9ca3af]">({val})</span>
                  </option>
                ))}
              </select>
            </div>

            {/* Port Input */}
            <div>
              <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider font-mono mb-1.5">
                Port
              </label>
              <input
                type="number"
                min={1025}
                max={65535}
                value={config.port}
                onChange={(e) => update({ port: parseInt(e.target.value) || 3000 })}
                className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3 py-2 text-sm font-mono text-[#f3f4f6] outline-none focus:border-[#6366f1] transition-colors"
              />
            </div>

            {/* RAM Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider font-mono flex items-center gap-1">
                  <HardDrive className="w-3 h-3" />
                  Memory Limit
                </label>
                <span className="text-xs font-bold font-mono text-[#6366f1]">
                  {config.memoryMB} MB
                </span>
              </div>
              <input
                type="range"
                min={128}
                max={Math.min(systemRAM, 8192)}
                step={128}
                value={config.memoryMB}
                onChange={(e) => update({ memoryMB: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-[#1f2937] rounded-lg appearance-none cursor-pointer accent-[#6366f1]"
              />
              <div className="flex justify-between text-[9px] text-[#4b5563] font-mono mt-1">
                <span>128 MB</span>
                <span>{Math.min(systemRAM, 8192)} MB</span>
              </div>
            </div>

            {/* CPU Cores */}
            <div>
              <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider font-mono mb-1.5 flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                CPU Cores
              </label>
              <div className="flex gap-2">
                {Array.from({ length: Math.min(cpuMax, 8) }, (_, i) => i + 1).map(
                  (cores) => (
                    <button
                      key={cores}
                      type="button"
                      onClick={() => update({ cpuCores: cores })}
                      className={`flex-1 py-2 text-xs font-mono rounded-lg border font-bold transition-all cursor-pointer ${
                        config.cpuCores === cores
                          ? "bg-[#6366f1]/10 text-[#6366f1] border-[#6366f1]/40"
                          : "bg-[#111827] text-[#6b7280] border-[#1f2937] hover:border-[#374151]"
                      }`}
                    >
                      {cores}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Tunnel Mode */}
            <div>
              <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider font-mono mb-1.5 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Tunnel Mode
              </label>
              <select
                value={config.tunnelMode}
                onChange={(e) => update({ tunnelMode: e.target.value as "ephemeral" | "permanent" })}
                className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3 py-2 text-sm font-mono text-[#f3f4f6] outline-none focus:border-[#6366f1] transition-colors"
              >
                <option value="ephemeral" className="bg-[#111827]">
                  Free Domain (Ephemeral)
                </option>
                <option value="permanent" className="bg-[#111827]">
                  Custom CNAME (Permanent)
                </option>
              </select>
            </div>

            <AnimatePresence>
              {config.tunnelMode === "permanent" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <InputField
                    type="password"
                    placeholder="Cloudflare API Token"
                    value={config.cfToken}
                    onChange={(v) => update({ cfToken: v })}
                  />
                  <InputField
                    placeholder="Account ID"
                    value={config.cfAccount}
                    onChange={(v) => update({ cfAccount: v })}
                  />
                  <InputField
                    placeholder="Tunnel Name (e.g. local-server)"
                    value={config.cfTunnelName}
                    onChange={(v) => update({ cfTunnelName: v })}
                  />
                  <InputField
                    placeholder="CNAME Domain (e.g. dev.mysite.com)"
                    value={config.cfDomain}
                    onChange={(v) => update({ cfDomain: v })}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Vercel Sync */}
            <div className="border border-[#1f2937] rounded-xl p-3 bg-[#111827]/40">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  Sync Vercel
                </label>
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-[#6366f1] cursor-pointer"
                  checked={config.vercelSync}
                  onChange={(e) => update({ vercelSync: e.target.checked })}
                />
              </div>

              <AnimatePresence>
                {config.vercelSync && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-2 overflow-hidden"
                  >
                    <InputField
                      type="password"
                      placeholder="Vercel Access Token"
                      value={config.vercelToken}
                      onChange={(v) => update({ vercelToken: v })}
                    />
                    <InputField
                      placeholder="Project ID"
                      value={config.vercelProject}
                      onChange={(v) => update({ vercelProject: v })}
                    />
                    <InputField
                      placeholder="Team ID (optional)"
                      value={config.vercelTeam}
                      onChange={(v) => update({ vercelTeam: v })}
                    />
                    <InputField
                      placeholder="Env Key (default: NEXT_PUBLIC_API_URL)"
                      value={config.vercelEnvKey}
                      onChange={(v) => update({ vercelEnvKey: v })}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* GO LIVE */}
        <motion.button
          onClick={handleGoLive}
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 bg-[#10b981] hover:bg-[#059669] rounded-xl text-sm font-bold font-mono tracking-wide text-white transition-all cursor-pointer flex items-center justify-center gap-2 border border-[#10b981]/20"
        >
          <Play className="w-4 h-4 fill-current" />
          GO LIVE
        </motion.button>
      </div>
    </motion.div>
  );
}

function InputField({
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3 py-1.5 text-xs font-mono text-[#f3f4f6] placeholder-[#4b5563] outline-none focus:border-[#6366f1] transition-colors"
    />
  );
}

export default ControlPanel;
