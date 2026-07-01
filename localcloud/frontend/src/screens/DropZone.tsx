import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { FolderOpen, AlertCircle, Download, Loader2 } from "lucide-react";
import { ScanProject, DownloadBunPortable } from "../../wailsjs/go/main/App";
import { EventsOn } from "../../wailsjs/runtime/runtime";
import logo from "../assets/images/logo-universal.png";

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

interface DropZoneProps {
  onScanned: (result: ScanResult) => void;
}

export function DropZone({ onScanned }: DropZoneProps) {
  const [path, setPath] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [downloadingBun, setDownloadingBun] = useState(false);
  const [bunProgress, setBunProgress] = useState(0);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 400);
  };

  const handleScan = useCallback(async (folderPath: string) => {
    if (!folderPath.trim()) {
      setError("Tentukan direktori project valid");
      triggerShake();
      return;
    }

    setError("");
    setScanning(true);

    try {
      const result = await ScanProject(folderPath);
      const scanned = result as unknown as ScanResult;
      setLastScan(scanned);
      onScanned(scanned);
    } catch (err) {
      setError(String(err));
      triggerShake();
    } finally {
      setScanning(false);
    }
  }, [onScanned]);

  const handleBrowse = async () => {
    // User types path manually — folder picker binding can be added later
  };

  const handleDownloadBun = async () => {
    setDownloadingBun(true);
    setBunProgress(0);

    const unsub = EventsOn("bun-download-progress", (data: { percent: number }) => {
      setBunProgress(data.percent);
    });

    try {
      await DownloadBunPortable("");
      // Re-scan after download to detect bun
      if (path) {
        const result = await ScanProject(path);
        const scanned = result as unknown as ScanResult;
        setLastScan(scanned);
        if (scanned.hasBun) {
          onScanned(scanned);
        }
      }
    } catch (err) {
      setError(`Gagal mengunduh Bun: ${err}`);
    } finally {
      unsub();
      setDownloadingBun(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="min-h-screen flex flex-col items-center justify-center bg-[#0b0f17] text-white p-6 select-none"
    >
      <div className="max-w-lg w-full flex flex-col items-center gap-8">
        {/* Logo & Title */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="flex flex-col items-center gap-4"
        >
          <img src={logo} className="w-16 h-auto" alt="LocalCloud" />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[#f3f4f6]">
              LocalCloud
            </h1>
            <p className="text-xs text-[#9ca3af] mt-1 font-mono tracking-wide">
              The Minimalist Hypervisor
            </p>
          </div>
        </motion.div>

        {/* Drop Zone */}
        <motion.div
          animate={shaking ? { x: [0, -10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className={`w-full border-2 border-dashed rounded-xl p-8 transition-colors duration-200 flex flex-col items-center gap-4 ${
            error
              ? "border-[#ef4444] bg-[#ef4444]/5"
              : "border-[#1f2937] hover:border-[#6366f1]/50 bg-[#111827]/40"
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-[#6366f1]" />
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-[#f3f4f6]">
              Letakkan folder project Anda di sini
            </p>
            <p className="text-[11px] text-[#9ca3af] mt-1 font-mono">
              atau klik tombol di bawah untuk memilih direktori
            </p>
          </div>

          <div className="w-full flex gap-2">
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScan(path)}
              placeholder="C:/Projects/my-web-app"
              className="flex-1 bg-[#111827] border border-[#1f2937] rounded-lg px-4 py-2.5 text-sm font-mono text-[#f3f4f6] placeholder-[#4b5563] outline-none focus:border-[#6366f1] transition-colors"
            />
            <button
              onClick={handleBrowse}
              className="px-5 py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] active:scale-[0.98] rounded-lg text-xs font-bold font-mono tracking-wide text-white transition-all cursor-pointer"
            >
              BROWSE
            </button>
          </div>

          {scanning && (
            <div className="flex items-center gap-2 text-xs text-[#9ca3af] font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6366f1]" />
              Memindai project...
            </div>
          )}

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#ef4444] font-mono flex items-center gap-1.5"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </motion.p>
          )}
        </motion.div>

        {/* Runtime Warning Banner */}
        {lastScan && !lastScan.hasNode && !lastScan.hasBun && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-xl p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-[#f59e0b] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#fbbf24]">
                Runtime Tidak Terdeteksi
              </p>
              <p className="text-[11px] text-[#f59e0b]/80 mt-1 font-mono">
                Klik di bawah untuk mengunduh Bun portabel otomatis ke dalam aplikasi.
              </p>
              <button
                onClick={handleDownloadBun}
                disabled={downloadingBun}
                className="mt-3 flex items-center gap-2 px-4 py-2 bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30 border border-[#f59e0b]/40 rounded-lg text-xs font-bold text-[#fbbf24] transition-all cursor-pointer disabled:opacity-50"
              >
                {downloadingBun ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Mengunduh... {bunProgress}%
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Unduh Bun Portable
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default DropZone;
