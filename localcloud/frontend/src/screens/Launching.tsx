import React from "react";
import { Settings, XCircle } from "lucide-react";

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

interface LaunchingProps {
  launchStep: number;
  launchError: string;
  runConfig: RunConfig;
  onCancel: () => void;
}

export const Launching: React.FC<LaunchingProps> = ({
  launchStep,
  launchError,
  runConfig,
  onCancel,
}) => {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#0b0f17] text-white p-6 font-sans"
      id="launching-screen"
    >
      <div className="max-w-md w-full bg-gray-900/60 p-8 rounded-2xl border border-gray-800 backdrop-blur-md shadow-2xl flex flex-col">
        <h2 className="text-xl font-bold tracking-tight text-white mb-6 flex items-center gap-2">
          <Settings className="w-5 h-5 animate-spin text-indigo-400" />
          Configuring Live Server
        </h2>

        <div className="space-y-4 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span
              className={`h-2 w-2 rounded-full ${
                launchStep >= 1 ? "bg-emerald-400 animate-pulse" : "bg-gray-700"
              }`}
            />
            <span className={launchStep >= 1 ? "text-white" : "text-gray-500"}>
              1. Memulai server lokal... {launchStep > 1 && "✓"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`h-2 w-2 rounded-full ${
                launchStep >= 2 ? "bg-emerald-400 animate-pulse" : "bg-gray-700"
              }`}
            />
            <span className={launchStep >= 2 ? "text-white" : "text-gray-500"}>
              2. Menerapkan batasan resource... {launchStep > 2 && "✓"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`h-2 w-2 rounded-full ${
                launchStep >= 3 ? "bg-emerald-400 animate-pulse" : "bg-gray-700"
              }`}
            />
            <span className={launchStep >= 3 ? "text-white" : "text-gray-500"}>
              3. Membuka terowongan Cloudflare... {launchStep > 3 && "✓"}
            </span>
          </div>
          {runConfig.vercelSync && (
            <div className="flex items-center gap-3">
              <span
                className={`h-2 w-2 rounded-full ${
                  launchStep >= 4 ? "bg-emerald-400 animate-pulse" : "bg-gray-700"
                }`}
              />
              <span className={launchStep >= 4 ? "text-white" : "text-gray-500"}>
                4. Menyelaraskan environment Vercel...
              </span>
            </div>
          )}
        </div>

        {launchError ? (
          <div className="mt-6 p-4 bg-rose-950/20 border border-rose-900/40 rounded-xl text-xs text-rose-400 font-mono">
            <p className="font-bold mb-1">Configuration Failed</p>
            <p>{launchError}</p>
            <button
              onClick={onCancel}
              className="mt-3 px-3 py-1 bg-rose-900/40 hover:bg-rose-800/40 border border-rose-800/40 text-[10px] rounded font-semibold text-rose-300 transition-all cursor-pointer"
            >
              Kembali ke Pengaturan
            </button>
          </div>
        ) : (
          <div className="mt-8 flex justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-950 hover:bg-gray-900 border border-gray-800 hover:border-gray-700 text-xs font-semibold text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer"
            >
              Batal
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Launching;
