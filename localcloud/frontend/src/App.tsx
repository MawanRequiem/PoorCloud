import { useState, useEffect } from "react";
import logo from "./assets/images/logo-universal.png";
import {
  ScanProject,
  StartEphemeralTunnel,
  StartPermanentTunnel,
  StopTunnel,
  SyncVercel,
  StoreCredential,
  HasCredential,
  LoadConfig,
  SaveConfig,
} from "../wailsjs/go/main/App";
import { EventsOn } from "../wailsjs/runtime/runtime";
import { Dashboard } from "./screens/Dashboard";
import { Play, Shield, Database, Layout, Settings } from "lucide-react";

interface ProjectScanResult {
  name: string;
  scripts: Record<string, string>;
  hasNode: boolean;
  hasBun: boolean;
}

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

type AppScreen = "setup" | "launching" | "dashboard";

function App() {
  const [screen, setScreen] = useState<AppScreen>("setup");
  const [projectPath, setProjectPath] = useState("");
  const [scanResult, setScanResult] = useState<ProjectScanResult | null>(null);
  const [scanError, setScanError] = useState("");
  
  // Design system parameters and config state
  const [runConfig, setRunConfig] = useState<RunConfig>({
    projectPath: "",
    runtime: "node",
    scriptName: "dev",
    port: 3000,
    memoryMB: 512,
    cpuCores: 2,
    vercelSync: false,
    vercelEnvKey: "NEXT_PUBLIC_API_URL",
    tunnelMode: "ephemeral",
  });

  // Vercel / Cloudflare permanent tunnel form inputs
  const [vercelToken, setVercelToken] = useState("");
  const [vercelProject, setVercelProject] = useState("");
  const [vercelTeam, setVercelTeam] = useState("");
  
  const [cfToken, setCfToken] = useState("");
  const [cfAccount, setCfAccount] = useState("");
  const [cfDomain, setCfDomain] = useState("");
  const [cfTunnelName, setCfTunnelName] = useState("");

  const [launchStep, setLaunchStep] = useState(1);
  const [launchError, setLaunchError] = useState("");
  const [tunnelURL, setTunnelURL] = useState("");

  // Load configuration on mount
  useEffect(() => {
    LoadConfig()
      .then((cfg: any) => {
        if (cfg && cfg.lastProjectPath) {
          setProjectPath(cfg.lastProjectPath);
          if (cfg.lastRunConfig) {
            setRunConfig((prev) => ({
              ...prev,
              projectPath: cfg.lastProjectPath,
              scriptName: cfg.lastRunConfig.scriptName || "dev",
              port: cfg.lastRunConfig.port || 3000,
              memoryMB: cfg.lastRunConfig.memoryMB || 512,
              cpuCores: cfg.lastRunConfig.cpuCores || 2,
              vercelSync: cfg.lastRunConfig.vercelSync || false,
              vercelEnvKey: cfg.lastRunConfig.vercelEnvKey || "NEXT_PUBLIC_API_URL",
              tunnelMode: cfg.lastRunConfig.tunnelMode || "ephemeral",
            }));
          }
        }
      })
      .catch((err) => console.error("Failed to load config:", err));
  }, []);

  // Listen to tunnel events during launching
  useEffect(() => {
    if (screen !== "launching") return;

    const unsubscribe = EventsOn("tunnel-status", (data: { status: string; url: string; error?: string }) => {
      if (data.status === "CONNECTED") {
        setTunnelURL(data.url);
        // Step 3 complete -> Sync Vercel or go to dashboard
        if (runConfig.vercelSync) {
          setLaunchStep(4);
          SyncVercel(vercelToken, vercelProject, vercelTeam, runConfig.vercelEnvKey, data.url)
            .then(() => {
              setScreen("dashboard");
            })
            .catch((err) => {
              setLaunchError(String(err));
            });
        } else {
          setScreen("dashboard");
        }
      } else if (data.status === "FAILED") {
        setLaunchError(data.error || "Failed to establish tunnel");
      }
    });

    return () => unsubscribe();
  }, [screen, runConfig, vercelToken, vercelProject, vercelTeam]);

  const handleScan = () => {
    if (!projectPath.trim()) {
      setScanError("Tentukan direktori project valid");
      return;
    }
    setScanError("");
    setScanResult(null);

    ScanProject(projectPath)
      .then((res) => {
        const result = res as ProjectScanResult;
        setScanResult(result);
        
        // Auto-select best dev script key
        let bestScript = "dev";
        if (result.scripts) {
          if (result.scripts["dev"]) bestScript = "dev";
          else if (result.scripts["start"]) bestScript = "start";
          else if (result.scripts["serve"]) bestScript = "serve";
          else {
            const keys = Object.keys(result.scripts);
            if (keys.length > 0) bestScript = keys[0];
          }
        }

        setRunConfig((prev) => ({
          ...prev,
          projectPath,
          scriptName: bestScript,
          runtime: result.hasBun ? "bun" : "node",
        }));

        // Persist last project path
        SaveConfig({
          lastProjectPath: projectPath,
          lastRunConfig: {
            scriptName: bestScript,
            port: runConfig.port,
            memoryMB: runConfig.memoryMB,
            cpuCores: runConfig.cpuCores,
            vercelSync: runConfig.vercelSync,
            vercelEnvKey: runConfig.vercelEnvKey,
            tunnelMode: runConfig.tunnelMode,
          },
        } as any).catch((err) => console.error("Save config failed:", err));
      })
      .catch((err) => {
        setScanError(String(err));
      });
  };

  const handleGoLive = async () => {
    setLaunchError("");
    setLaunchStep(1);
    setScreen("launching");

    try {
      // Step 1: Save credentials if needed
      if (runConfig.vercelSync && vercelToken) {
        await StoreCredential("vercel", "token", vercelToken);
      }
      if (runConfig.tunnelMode === "permanent" && cfToken) {
        await StoreCredential("cloudflare", "token", cfToken);
      }

      // Step 2: Persist current run settings
      await SaveConfig({
        lastProjectPath: projectPath,
        lastRunConfig: {
          scriptName: runConfig.scriptName,
          port: runConfig.port,
          memoryMB: runConfig.memoryMB,
          cpuCores: runConfig.cpuCores,
          vercelSync: runConfig.vercelSync,
          vercelEnvKey: runConfig.vercelEnvKey,
          tunnelMode: runConfig.tunnelMode,
        },
      } as any);

      // Step 3: Memulai Server (Simulated for now, Track A runner triggers it in Go)
      setLaunchStep(2);
      
      // Step 4: Start Tunnel
      setLaunchStep(3);
      if (runConfig.tunnelMode === "permanent") {
        await StartPermanentTunnel(
          runConfig.port,
          cfDomain,
          cfAccount,
          cfToken,
          cfTunnelName
        );
      } else {
        await StartEphemeralTunnel(runConfig.port);
      }
    } catch (err) {
      setLaunchError(String(err));
    }
  };

  const handleStop = () => {
    StopTunnel();
    setScreen("setup");
  };

  if (screen === "dashboard") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f17] p-4">
        <Dashboard
          tunnelURL={tunnelURL}
          runConfig={runConfig}
          onStop={handleStop}
        />
      </div>
    );
  }

  if (screen === "launching") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f17] text-white p-6 font-sans">
        <div className="max-w-md w-full bg-gray-900/60 p-8 rounded-2xl border border-gray-800 backdrop-blur-md shadow-2xl flex flex-col">
          <h2 className="text-xl font-bold tracking-tight text-white mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 animate-spin text-indigo-400" />
            Configuring Live Server
          </h2>

          <div className="space-y-4 font-mono text-xs">
            <div className="flex items-center gap-3">
              <span className={`h-2 w-2 rounded-full ${launchStep >= 1 ? "bg-emerald-400 animate-pulse" : "bg-gray-700"}`} />
              <span className={launchStep >= 1 ? "text-white" : "text-gray-500"}>
                1. Memulai server lokal... {launchStep > 1 && "✓"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`h-2 w-2 rounded-full ${launchStep >= 2 ? "bg-emerald-400 animate-pulse" : "bg-gray-700"}`} />
              <span className={launchStep >= 2 ? "text-white" : "text-gray-500"}>
                2. Menerapkan batasan resource... {launchStep > 2 && "✓"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`h-2 w-2 rounded-full ${launchStep >= 3 ? "bg-emerald-400 animate-pulse" : "bg-gray-700"}`} />
              <span className={launchStep >= 3 ? "text-white" : "text-gray-500"}>
                3. Membuka terowongan Cloudflare... {launchStep > 3 && "✓"}
              </span>
            </div>
            {runConfig.vercelSync && (
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full ${launchStep >= 4 ? "bg-emerald-400 animate-pulse" : "bg-gray-700"}`} />
                <span className={launchStep >= 4 ? "text-white" : "text-gray-500"}>
                  4. Menyelaraskan environment Vercel...
                </span>
              </div>
            )}
          </div>

          {launchError && (
            <div className="mt-6 p-4 bg-rose-950/20 border border-rose-900/40 rounded-xl text-xs text-rose-400 font-mono">
              <p className="font-bold mb-1">Configuration Failed</p>
              <p>{launchError}</p>
              <button
                onClick={() => setScreen("setup")}
                className="mt-3 px-3 py-1 bg-rose-900/40 hover:bg-rose-800/40 border border-rose-800/40 text-[10px] rounded font-semibold text-rose-300 transition-all cursor-pointer"
              >
                Kembali ke Pengaturan
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b0f17] text-white p-6 font-sans select-none">
      <div className="max-w-2xl w-full bg-gray-900/40 p-8 rounded-2xl border border-gray-800/85 backdrop-blur-md shadow-2xl flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <img src={logo} className="w-10 h-auto" alt="logo" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">LocalCloud Orchestrator</h1>
            <p className="text-[10px] text-gray-400 font-mono">The Minimalist Hypervisor Control Panel</p>
          </div>
        </div>

        {/* Folder Scan Input */}
        <div className="w-full mb-6 border-b border-gray-900 pb-6">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono mb-2">
            Target Project Directory
          </label>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-gray-950 border border-gray-900 rounded-lg px-4 py-2 outline-none focus:border-indigo-500 text-sm font-mono transition-all text-white placeholder-gray-700"
              type="text"
              placeholder="E.g., C:/Projects/my-web-app"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
            />
            <button
              className="bg-indigo-600 hover:bg-indigo-500 active:scale-98 px-5 py-2 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer"
              onClick={handleScan}
            >
              SCAN
            </button>
          </div>
          {scanError && (
            <p className="text-rose-500 font-mono text-[10px] mt-2 animate-bounce">
              {scanError}
            </p>
          )}
        </div>

        {scanResult && (
          <div className="space-y-6 animate-fadeIn">
            {/* Control Panel Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Server settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono mb-2">
                    NPM / Bun Script Target
                  </label>
                  <select
                    className="w-full bg-gray-950 border border-gray-900 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none focus:border-indigo-500"
                    value={runConfig.scriptName}
                    onChange={(e) => setRunConfig((prev) => ({ ...prev, scriptName: e.target.value }))}
                  >
                    {scanResult.scripts &&
                      Object.keys(scanResult.scripts).map((key) => (
                        <option key={key} value={key} className="bg-gray-950">
                          {key} ({scanResult.scripts[key]})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono mb-1 flex justify-between">
                    <span>Memory Allocation Limit</span>
                    <span className="text-indigo-400 font-semibold">{runConfig.memoryMB} MB</span>
                  </label>
                  <input
                    type="range"
                    min="128"
                    max="4096"
                    step="128"
                    className="w-full h-1.5 bg-gray-950 border border-gray-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    value={runConfig.memoryMB}
                    onChange={(e) => setRunConfig((prev) => ({ ...prev, memoryMB: parseInt(e.target.value) }))}
                  />
                  <div className="flex justify-between text-[8px] text-gray-600 font-mono mt-1">
                    <span>128MB</span>
                    <span>1024MB</span>
                    <span>2048MB</span>
                    <span>4096MB</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono mb-2">
                    CPU Core Limits
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 4, 8].map((cores) => (
                      <button
                        key={cores}
                        type="button"
                        onClick={() => setRunConfig((prev) => ({ ...prev, cpuCores: cores }))}
                        className={`flex-1 py-2 text-xs font-mono rounded-lg border font-bold transition-all cursor-pointer ${
                          runConfig.cpuCores === cores
                            ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/50"
                            : "bg-gray-950 text-gray-500 border-gray-900 hover:border-gray-800"
                        }`}
                      >
                        {cores} Core{cores > 1 && "s"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: API Keys & Connectors */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono mb-2">
                    Cloudflare Tunnel Mode
                  </label>
                  <select
                    className="w-full bg-gray-950 border border-gray-900 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none focus:border-indigo-500"
                    value={runConfig.tunnelMode}
                    onChange={(e) => setRunConfig((prev) => ({ ...prev, tunnelMode: e.target.value }))}
                  >
                    <option value="ephemeral" className="bg-gray-950">Free Domain (Ephemeral)</option>
                    <option value="permanent" className="bg-gray-950">Custom CNAME (Permanent)</option>
                  </select>
                </div>

                {runConfig.tunnelMode === "permanent" && (
                  <div className="space-y-2.5 p-3 border border-gray-900 bg-gray-950/40 rounded-xl animate-fadeIn">
                    <input
                      type="password"
                      placeholder="Cloudflare API Token"
                      className="w-full bg-gray-950 border border-gray-900 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-gray-800"
                      value={cfToken}
                      onChange={(e) => setCfToken(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Account ID"
                      className="w-full bg-gray-950 border border-gray-900 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-gray-800"
                      value={cfAccount}
                      onChange={(e) => setCfAccount(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Tunnel Name (e.g. local-server)"
                      className="w-full bg-gray-950 border border-gray-900 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-gray-800"
                      value={cfTunnelName}
                      onChange={(e) => setCfTunnelName(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="CNAME Domain (e.g. dev.mysite.com)"
                      className="w-full bg-gray-950 border border-gray-900 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-gray-800"
                      value={cfDomain}
                      onChange={(e) => setCfDomain(e.target.value)}
                    />
                  </div>
                )}

                <div className="border border-gray-900 rounded-xl p-3 bg-gray-950/20">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5" />
                      Sync with Vercel variables
                    </label>
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-indigo-500 cursor-pointer"
                      checked={runConfig.vercelSync}
                      onChange={(e) => setRunConfig((prev) => ({ ...prev, vercelSync: e.target.checked }))}
                    />
                  </div>

                  {runConfig.vercelSync && (
                    <div className="mt-3 space-y-2.5 animate-fadeIn">
                      <input
                        type="password"
                        placeholder="Vercel Access Token"
                        className="w-full bg-gray-950 border border-gray-900 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-gray-800"
                        value={vercelToken}
                        onChange={(e) => setVercelToken(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Vercel Project ID"
                        className="w-full bg-gray-950 border border-gray-900 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-gray-800"
                        value={vercelProject}
                        onChange={(e) => setVercelProject(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Vercel Team ID (Optional)"
                        className="w-full bg-gray-950 border border-gray-900 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-gray-800"
                        value={vercelTeam}
                        onChange={(e) => setVercelTeam(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Env Key (e.g. NEXT_PUBLIC_API_URL)"
                        className="w-full bg-gray-950 border border-gray-900 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-gray-800"
                        value={runConfig.vercelEnvKey}
                        onChange={(e) => setRunConfig((prev) => ({ ...prev, vercelEnvKey: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Launch Action */}
            <div className="pt-4 border-t border-gray-900">
              <button
                onClick={handleGoLive}
                className="w-full bg-emerald-600 hover:bg-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] text-white font-mono text-xs font-bold py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                GO LIVE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
