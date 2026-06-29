import { useState, useEffect } from 'react';
import logo from './assets/images/logo-universal.png';
import { ScanProject, StartTunnel, StopTunnel } from "../wailsjs/go/main/App";
import { EventsOn } from "../wailsjs/runtime/runtime";

interface ProjectScanResult {
  name: string;
  scripts: Record<string, string>;
  hasNode: boolean;
  hasBun: boolean;
}

interface TunnelEvent {
  status: string;
  url: string;
  error?: string;
}

// ponytail: YAGNI - clean, beautiful single-page dashboard to test and verify SCAD core bindings.
function App() {
  const [projectPath, setProjectPath] = useState('');
  const [scanResult, setScanResult] = useState<ProjectScanResult | null>(null);
  const [scanError, setScanError] = useState('');
  const [tunnelState, setTunnelState] = useState({
    status: 'DISCONNECTED',
    url: '',
    error: '',
  });

  // Listen to Wails events for tunnel status updates
  useEffect(() => {
    // ponytail: register Wails runtime event listener
    const unsubscribe = EventsOn('tunnel-status', (data: TunnelEvent) => {
      setTunnelState({
        status: data.status,
        url: data.url,
        error: data.error || '',
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleScan = () => {
    if (!projectPath.trim()) {
      setScanError('Please enter a valid path');
      return;
    }
    setScanError('');
    setScanResult(null);

    ScanProject(projectPath)
      .then((res) => {
        setScanResult(res as ProjectScanResult);
      })
      .catch((err) => {
        setScanError(String(err));
      });
  };

  const handleStartTunnel = () => {
    StartTunnel(3000).catch((err) => {
      setTunnelState((prev) => ({ ...prev, error: String(err) }));
    });
  };

  const handleStopTunnel = () => {
    StopTunnel();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b0f17] text-white p-6 font-sans">
      <div className="max-w-xl w-full bg-gray-900/60 p-8 rounded-2xl border border-gray-800 backdrop-blur-md shadow-2xl flex flex-col items-center">
        <img src={logo} className="w-24 h-auto mb-6" alt="logo" />
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">LocalCloud Orchestrator</h1>
        <p className="text-xs text-gray-400 mb-8">Universal AI-Assisted Core Scaffolding</p>

        {/* Project Scanner Section */}
        <div className="w-full mb-6 border-b border-gray-800 pb-6">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Project Scanner</h2>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 outline-none focus:border-indigo-500 text-sm transition-all"
              type="text"
              placeholder="E.g., C:/Projects/my-web-app"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
            />
            <button
              className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              onClick={handleScan}
            >
              Scan
            </button>
          </div>
          {scanError && <p className="text-red-500 text-xs mt-2">{scanError}</p>}
          {scanResult && (
            <div className="bg-gray-950/80 rounded-lg p-4 mt-3 border border-gray-800 text-xs space-y-2">
              <p><span className="text-gray-400">Project:</span> <strong className="text-indigo-400">{scanResult.name || 'Unnamed'}</strong></p>
              <p><span className="text-gray-400">Node Runtime:</span> <span className={scanResult.hasNode ? "text-green-400" : "text-amber-400"}>{scanResult.hasNode ? "Detected" : "Not Found"}</span></p>
              <p><span className="text-gray-400">Bun Runtime:</span> <span className={scanResult.hasBun ? "text-green-400" : "text-amber-400"}>{scanResult.hasBun ? "Detected" : "Not Found"}</span></p>
              <div>
                <span className="text-gray-400">Scripts:</span>
                <div className="pl-2 mt-1 border-l border-gray-800 max-h-24 overflow-y-auto">
                  {scanResult.scripts && Object.keys(scanResult.scripts).map((key) => (
                    <div key={key}><span className="text-gray-500">{key}:</span> {scanResult.scripts[key]}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cloudflare Tunnel Controller Section */}
        <div className="w-full">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Tunnel Controller</h2>
          <div className="flex justify-between items-center bg-gray-950/50 p-4 rounded-xl border border-gray-800">
            <div>
              <p className="text-xs text-gray-400">Status</p>
              <p className="text-sm font-bold flex items-center gap-1.5 mt-0.5">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  tunnelState.status === 'CONNECTED' ? 'bg-green-500' :
                  tunnelState.status === 'CONNECTING' || tunnelState.status === 'RECONNECTING' ? 'bg-amber-500 animate-pulse' :
                  'bg-gray-600'
                }`} />
                {tunnelState.status}
              </p>
            </div>
            <div className="flex gap-2">
              {tunnelState.status === 'CONNECTED' ? (
                <button
                  className="bg-red-600 hover:bg-red-500 active:bg-red-700 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  onClick={handleStopTunnel}
                >
                  Disconnect
                </button>
              ) : (
                <button
                  className="bg-green-600 hover:bg-green-500 active:bg-green-700 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  disabled={tunnelState.status === 'CONNECTING'}
                  onClick={handleStartTunnel}
                >
                  Go Live
                </button>
              )}
            </div>
          </div>
          {tunnelState.url && (
            <div className="bg-gray-950/80 rounded-lg p-3 mt-3 border border-green-900/50 text-center">
              <p className="text-[10px] text-green-400 font-semibold mb-0.5">PUBLIC URL</p>
              <a
                href={tunnelState.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 underline font-mono break-all"
              >
                {tunnelState.url}
              </a>
            </div>
          )}
          {tunnelState.error && <p className="text-red-500 text-xs mt-2 text-center">{tunnelState.error}</p>}
        </div>
      </div>
    </div>
  );
}

export default App;
