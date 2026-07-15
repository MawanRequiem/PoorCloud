import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, HardDrive, Cpu, Globe, Save } from "lucide-react";
import { GetSystemInfo, LoadConfig, SaveConfig } from "../../wailsjs/go/main/App";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ open, onClose }) => {
  const [systemRAM, setSystemRAM] = useState(4096);
  const [cpuMax, setCpuMax] = useState(4);

  const [defaultMem, setDefaultMem] = useState(1024);
  const [defaultCPU, setDefaultCPU] = useState(2);
  const [defaultTunnelMode, setDefaultTunnelMode] = useState<"ephemeral" | "permanent">("ephemeral");
  const [cloudflaredPath, setCloudflaredPath] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;

    GetSystemInfo().then((info: any) => {
      if (info?.totalRamMB) setSystemRAM(info.totalRamMB);
      if (info?.cpuCores) setCpuMax(info.cpuCores);
    }).catch(() => {});

    LoadConfig().then((cfg: any) => {
      if (cfg?.defaultRunConfig) {
        const d = cfg.defaultRunConfig;
        if (d.memoryMB) setDefaultMem(d.memoryMB);
        if (d.cpuCores) setDefaultCPU(d.cpuCores);
        if (d.tunnelMode) setDefaultTunnelMode(d.tunnelMode);
      }
    }).catch(() => {});
  }, [open]);

  const handleSave = async () => {
    try {
      const current = await LoadConfig().catch(() => ({} as any));
      await SaveConfig({
        ...current,
        defaultRunConfig: {
          scriptName: "",
          port: 3000,
          memoryMB: defaultMem,
          cpuCores: defaultCPU,
          vercelSync: false,
          vercelEnvKey: "NEXT_PUBLIC_API_URL",
          tunnelMode: defaultTunnelMode,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Non-blocking
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-300 flex justify-end bg-[#0b0f17]/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-sm bg-[#111827] border-l border-[#1f2937] h-full overflow-y-auto p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-[#f3f4f6] tracking-tight">
                Settings
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[#1f2937] text-[#9ca3af] hover:text-[#f3f4f6] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Default Tunnel Mode */}
              <div>
                <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
                  <Globe className="w-3 h-3" />
                  Default Tunnel Mode
                </label>
                <select
                  value={defaultTunnelMode}
                  onChange={(e) => setDefaultTunnelMode(e.target.value as "ephemeral" | "permanent")}
                  className="w-full bg-[#0b0f17] border border-[#1f2937] rounded-lg px-3 py-2 text-sm font-mono text-[#f3f4f6] outline-none focus:border-[#6366f1] transition-colors"
                >
                  <option value="ephemeral">Free Domain (Ephemeral)</option>
                  <option value="permanent">Custom CNAME (Permanent)</option>
                </select>
              </div>

              {/* Default RAM */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider font-mono flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />
                    Default RAM Limit
                  </label>
                  <span className="text-xs font-bold font-mono text-[#6366f1]">
                    {defaultMem} MB
                  </span>
                </div>
                <input
                  type="range"
                  min={128}
                  max={Math.min(systemRAM, 8192)}
                  step={128}
                  value={defaultMem}
                  onChange={(e) => setDefaultMem(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-[#1f2937] rounded-lg appearance-none cursor-pointer accent-[#6366f1]"
                />
              </div>

              {/* Default CPU */}
              <div>
                <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider font-mono mb-2 flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  Default CPU Cores
                </label>
                <div className="flex gap-2">
                  {Array.from({ length: Math.min(cpuMax, 8) }, (_, i) => i + 1).map(
                    (cores) => (
                      <button
                        key={cores}
                        type="button"
                        onClick={() => setDefaultCPU(cores)}
                        className={`flex-1 py-2 text-xs font-mono rounded-lg border font-bold transition-all cursor-pointer ${
                          defaultCPU === cores
                            ? "bg-[#6366f1]/10 text-[#6366f1] border-[#6366f1]/40"
                            : "bg-[#0b0f17] text-[#6b7280] border-[#1f2937] hover:border-[#374151]"
                        }`}
                      >
                        {cores}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* cloudflared Path */}
              <div>
                <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider font-mono mb-2">
                  cloudflared Binary Path
                </label>
                <input
                  type="text"
                  value={cloudflaredPath}
                  onChange={(e) => setCloudflaredPath(e.target.value)}
                  placeholder="Auto-detected from PATH"
                  className="w-full bg-[#0b0f17] border border-[#1f2937] rounded-lg px-3 py-2 text-xs font-mono text-[#f3f4f6] placeholder-[#4b5563] outline-none focus:border-[#6366f1] transition-colors"
                />
              </div>
            </div>

            {/* Save */}
            <div className="mt-8">
              <button
                onClick={handleSave}
                className={`w-full py-2.5 rounded-xl text-xs font-bold font-mono text-white transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  saved
                    ? "bg-[#10b981] border border-[#10b981]/20"
                    : "bg-[#6366f1] hover:bg-[#4f46e5] border border-[#6366f1]/20"
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                {saved ? "Saved" : "Save Defaults"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsPanel;
