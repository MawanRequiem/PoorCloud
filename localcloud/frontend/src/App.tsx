import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { XCircle } from "lucide-react";
import { DropZone } from "./screens/DropZone";
import { ControlPanel } from "./screens/ControlPanel";
import { Dashboard } from "./screens/Dashboard";
import { Launching } from "./screens/Launching";
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
  if (screen === "launching" && runConfig) {
    return (
      <Launching
        launchStep={launchStep}
        launchError={launchError}
        runConfig={runConfig as any}
        onCancel={() => {
          StopTunnel();
          setScreen("control");
        }}
      />
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
