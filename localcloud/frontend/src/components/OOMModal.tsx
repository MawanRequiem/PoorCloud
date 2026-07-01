import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, RotateCcw, Settings } from "lucide-react";

interface OOMModalProps {
  open: boolean;
  memoryLimit: number;
  onRestart: () => void;
  onChangeSettings: () => void;
}

export function OOMModal({ open, memoryLimit, onRestart, onChangeSettings }: OOMModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-300 flex items-center justify-center bg-[#0b0f17]/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-md bg-[#111827] border border-[#1f2937] rounded-xl p-6 shadow-xl"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-[#f3f4f6] tracking-tight">
                  Server Berhenti
                </h2>
                <p className="text-sm text-[#9ca3af] mt-2 leading-relaxed">
                  Server Lokal Terhenti: Penggunaan memori melewati batas yang Anda tentukan.
                </p>
                <div className="mt-3 bg-[#0b0f17] border border-[#1f2937] rounded-lg px-3 py-2 font-mono text-xs text-[#9ca3af]">
                  Memory limit:{" "}
                  <span className="text-[#ef4444] font-bold">{memoryLimit} MB</span>
                </div>
                <p className="text-xs text-[#6b7280] mt-3 leading-relaxed">
                  Naikkan limit slider Anda atau periksa memory leak pada kode Anda.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onRestart}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] active:scale-[0.98] rounded-lg text-xs font-bold font-mono text-white transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restart
              </button>
              <button
                onClick={onChangeSettings}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#111827] hover:bg-[#1f2937] border border-[#1f2937] rounded-lg text-xs font-bold font-mono text-[#9ca3af] transition-all cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                Ubah Pengaturan
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default OOMModal;
