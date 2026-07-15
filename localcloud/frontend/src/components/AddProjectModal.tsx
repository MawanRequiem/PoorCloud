import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { DropZone } from "../screens/DropZone";
import { ControlPanel } from "../screens/ControlPanel";
import { Launching } from "../screens/Launching";
import type { ScanResult, RunConfig } from "../types";

type Step = "dropzone" | "control" | "launching";

interface AddProjectModalProps {
  open: boolean;
  onComplete: (scan: ScanResult, config: RunConfig) => void;
  onClose: () => void;
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({
  open,
  onComplete,
  onClose,
}) => {
  const [step, setStep] = useState<Step>("dropzone");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [runConfig, setRunConfig] = useState<RunConfig | null>(null);
  const [launchStep, setLaunchStep] = useState(1);
  const [launchError, setLaunchError] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("dropzone");
      setScanResult(null);
      setRunConfig(null);
      setLaunchStep(1);
      setLaunchError("");
    }
  }, [open]);

  const handleScanned = (result: ScanResult) => {
    setScanResult(result);
    setStep("control");
  };

  const handleGoLive = (config: RunConfig) => {
    setRunConfig(config);
    setLaunchStep(1);
    setLaunchError("");
    setStep("launching");

    setTimeout(() => setLaunchStep(2), 400);
    setTimeout(() => setLaunchStep(3), 800);
    setTimeout(() => {
      if (scanResult) {
        onComplete(scanResult, config);
      }
    }, 1200);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-300 flex items-center justify-center bg-[#0b0f17]/80 backdrop-blur-sm p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            <div className="relative bg-[#111827]/60 border border-[#1f2937] rounded-xl backdrop-blur-md p-6">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#1f2937] text-[#9ca3af] hover:text-[#f3f4f6] transition-all cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {["dropzone", "control", "launching"].map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold font-mono transition-all ${
                        step === s
                          ? "bg-[#6366f1] text-white"
                          : step > s || (step === "launching" && s === "dropzone")
                          ? "bg-[#10b981] text-white"
                          : "bg-[#1f2937] text-[#6b7280]"
                      }`}
                    >
                      {step > s || (step === "launching" && s === "dropzone") ? "✓" : i + 1}
                    </div>
                    {i < 2 && <div className="w-8 h-px bg-[#1f2937]" />}
                  </div>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {step === "dropzone" && (
                  <motion.div
                    key="dropzone"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.15 }}
                  >
                    <p className="text-center text-xs text-[#9ca3af] font-mono mb-4">
                      Select a project folder to begin
                    </p>
                    <DropZone onScanned={handleScanned} />
                  </motion.div>
                )}

                {step === "control" && scanResult && (
                  <motion.div
                    key="control"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ControlPanel scan={scanResult} onGoLive={handleGoLive} />
                  </motion.div>
                )}

                {step === "launching" && runConfig && (
                  <motion.div
                    key="launching"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Launching
                      launchStep={launchStep}
                      launchError={launchError}
                      runConfig={runConfig as any}
                      onCancel={onClose}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddProjectModal;
