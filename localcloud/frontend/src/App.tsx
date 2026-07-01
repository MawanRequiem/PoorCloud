import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Settings, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { DropZone } from "./screens/DropZone";
import { ControlPanel } from "./screens/ControlPanel";
import { Dashboard } from "./screens/Dashboard";
import { OOMModal } from "./components/OOMModal";
import type { RunConfig } from "./screens/ControlPanel";
import {
  StartEphemeralTunnel,
  StartPermanentTunnel,
  StopTunnel,
  SyncVercel,
  SaveConfig,
} from "../wailsjs/go/main/App";
import { EventsOn } from "../wailsjs/runtime/runtime";

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

type AppScreen = "dropzone" | "control" | "launching" | "dashboard";

function App() {
  const [screen, setScreen] = useState<AppScreen>("dropzone");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [runConfig, setRunConfig] = useState<RunConfig | null>(null);
  const [tunnelURL, setTunnelURL] = useState("");

  // Launching state
  const [launchStep, setLaunchStep] = useState(1);
  const [launchError, setLaunchError] = useState("");
  const [launchSteps] = useState([
    { id: 1, label: "Memulai server lokal..." },
    { id: 2, label: "Menerapkan batasan resource..." },
    { id: 3, label: "Membuka terowongan aman..." },
    { id: 4, label: "Menyelaraskan Vercel..." },
  ]);

  // OOM state
  const [oomOpen, setOomOpen] = useState(false);
  const [oomMemoryLimit, setOomMemoryLimit] = useState(0);

  // Listen for tunnel status during launching
  useEffect(() => {
    if (screen !== "launching") return;

    const unsub = EventsOn("tunnel-status", (data: { status: string; url: string; error?: string }) => {
      if (data.status === "CONNECTED") {
        setTunnelURL(data.url);
        setLaunchStep(4);

        if (runConfig?.vercelSync) {
          SyncVercel(
            runConfig.vercelToken,
            runConfig.vercelProject,
            runConfig.vercelTeam,
            runConfig.vercelEnvKey,
            data.url
          )
            .then(() => {
              setTimeout(() => setScreen("dashboard"), 300);
            })
            .catch((err) => {
              setLaunchError(`Vercel sync gagal: ${err}`);
            });
        } else {
          setTimeout(() => setScreen("dashboard"), 300);
        }
      } else if (data.status === "FAILED") {
        setLaunchError(data.error || "Gagal membuat terowongan");
      }
    });

    return () => unsub();
  }, [screen, runConfig]);

  // Listen for OOM events
  useEffect(() => {
    const unsub = EventsOn("process-oom", (data: { memoryLimit: number }) => {
      setOomMemoryLimit(data.memoryLimit || 0);
      setOomOpen(true);
    });
    return () => unsub();
  }, []);

  const handleScanned = (result: ScanResult) => {
    setScanResult(result);
    setScreen("control");
  };

  const handleGoLive = async (config: RunConfig) => {
    setRunConfig(config);
    setLaunchError("");
    setLaunchStep(1);
    setScreen("launching");

    // Save config
    try {
      await SaveConfig({
        lastProjectPath: config.projectPath,
        lastRunConfig: {
          scriptName: config.scriptName,
          port: config.port,
          memoryMB: config.memoryMB,
          cpuCores: config.cpuCores,
          vercelSync: config.vercelSync,
          vercelEnvKey: config.vercelEnvKey,
          tunnelMode: config.tunnelMode,
        },
      } as any);
    } catch {
      // Non-blocking
    }

    // Step 1-2: Local server & resource limits (handled by engine runner)
    setLaunchStep(2);
    await new Promise((r) => setTimeout(r, 400));

    // Step 3: Start tunnel
    setLaunchStep(3);
    try {
      if (config.tunnelMode === "permanent") {
        await StartPermanentTunnel(
          config.port,
          config.cfDomain,
          config.cfAccount,
          config.cfToken,
          config.cfTunnelName
        );
      } else {
        await StartEphemeralTunnel(config.port);
      }
    } catch (err) {
      setLaunchError(String(err));
    }
  };

  const handleStop = () => {
    StopTunnel();
    setScreen("dropzone");
  };

  const handleOomRestart = () => {
    setOomOpen(false);
    handleStop();
  };

  const handleOomChangeSettings = () => {
    setOomOpen(false);
    setScreen("control");
  };

  // ─── Launching Screen ───────────────────────────────────────
  if (screen === "launching") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen flex items-center justify-center bg-[#0b0f17] text-white p-6 select-none"
      >
        <div className="max-w-sm w-full bg-[#111827]/60 border border-[#1f2937] rounded-xl backdrop-blur-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-4 h-4 animate-spin text-[#6366f1]" />
            <h2 className="text-sm font-bold text-[#f3f4f6] tracking-tight">
              Menyiapkan Server
            </h2>
          </div>

          <div className="space-y-4">
            {launchSteps.map((step) => {
              const isVercel = step.id === 4;
              if (isVercel && !runConfig?.vercelSync) return null;

              const active = launchStep >= step.id;
              const done = launchStep > step.id;

              return (
                <div key={step.id} className="flex items-center gap-3">
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />
                  ) : active ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#6366f1] shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-[#1f2937] shrink-0" />
                  )}
                  <span
                    className={`text-xs font-mono ${
                      done
                        ? "text-[#10b981]"
                        : active
                        ? "text-[#f3f4f6]"
                        : "text-[#4b5563]"
                    }`}
                  >
                    {step.id}. {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {launchError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg"
            >
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[#ef4444] font-mono">Gagal</p>
                  <p className="text-[11px] text-[#fca5a5] mt-0.5 font-mono">{launchError}</p>
                </div>
              </div>
              <button
                onClick={() => setScreen("control")}
                className="mt-3 w-full py-2 bg-[#111827] hover:bg-[#1f2937] border border-[#1f2937] rounded-lg text-xs font-bold font-mono text-[#9ca3af] transition-all cursor-pointer"
              >
                Kembali ke Pengaturan
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {screen === "dropzone" && (
          <DropZone key="dropzone" onScanned={handleScanned} />
        )}

        {screen === "control" && scanResult && (
          <ControlPanel key="control" scan={scanResult} onGoLive={handleGoLive} />
        )}

        {screen === "dashboard" && (
          <Dashboard
            key="dashboard"
            tunnelURL={tunnelURL}
            runConfig={runConfig!}
            onStop={handleStop}
          />
        )}
      </AnimatePresence>

      <OOMModal
        open={oomOpen}
        memoryLimit={oomMemoryLimit}
        onRestart={handleOomRestart}
        onChangeSettings={handleOomChangeSettings}
      />
    </>
  );
}

export default App;
