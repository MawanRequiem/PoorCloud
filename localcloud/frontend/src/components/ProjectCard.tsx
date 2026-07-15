import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, ExternalLink, Play, Square, Trash2, AlertTriangle, WifiOff } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { EventsOn, BrowserOpenURL } from "../../wailsjs/runtime/runtime";
import { StatusDot } from "./StatusDot";
import type { ProjectState, ResourceUsageEvent, TunnelStatusEvent, ProcessOOMEvent } from "../types";

interface ProjectCardProps {
  project: ProjectState;
  onStart: (projectID: string) => void;
  onStop: (projectID: string) => void;
  onRemove: (projectID: string) => void;
  isSelected: boolean;
  onSelect: (projectID: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onStart,
  onStop,
  onRemove,
  isSelected,
  onSelect,
}) => {
  const [ramHistory, setRamHistory] = useState<{ v: number; t: number }[]>([]);
  const [cpuHistory, setCpuHistory] = useState<{ v: number; t: number }[]>([]);
  const [tunnelData, setTunnelData] = useState({ status: project.tunnelStatus, url: project.tunnelURL });
  const [hasOOM, setHasOOM] = useState(false);
  const [hasTunnelError, setHasTunnelError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRemove, setShowRemove] = useState(false);

  useEffect(() => {
    const unsub1 = EventsOn("resource-usage", (data: ResourceUsageEvent) => {
      if (data.projectID !== project.projectID) return;
      const t = data.timestamp || Date.now();
      setRamHistory((prev) => [...prev, { v: data.ramMB, t }].slice(-60));
      setCpuHistory((prev) => [...prev, { v: data.cpuPercent, t }].slice(-60));
    });

    const unsub2 = EventsOn("tunnel-status", (data: TunnelStatusEvent) => {
      if (data.projectID !== project.projectID) return;
      setTunnelData({ status: data.status, url: data.url || tunnelData.url });
      if (data.status === "FAILED" || data.status === "DISCONNECTED") {
        setHasTunnelError(true);
      }
    });

    const unsub3 = EventsOn("process-oom", (data: ProcessOOMEvent) => {
      if (data.projectID !== project.projectID) return;
      setHasOOM(true);
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [project.projectID]);

  const handleCopy = async () => {
    const url = tunnelData.url;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleOpen = () => {
    if (tunnelData.url) BrowserOpenURL(tunnelData.url);
  };

  const isRunning = project.status === "running";
  const tunnelStatus = isRunning ? tunnelData.status || "CONNECTED" : "DISCONNECTED";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => onSelect(project.projectID)}
      className={`relative bg-[#111827]/60 border rounded-xl p-4 backdrop-blur-md cursor-pointer transition-all ${
        isSelected
          ? "border-[#6366f1] shadow-[0_0_15px_rgba(99,102,241,0.1)]"
          : "border-[#1f2937] hover:border-[#374151]"
      }`}
    >
      {/* Health Badges */}
      {(hasOOM || hasTunnelError) && (
        <div className="absolute top-2 right-2 flex gap-1">
          {hasOOM && (
            <span className="flex items-center gap-1 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-md px-1.5 py-0.5">
              <AlertTriangle className="w-2.5 h-2.5 text-[#ef4444]" />
              <span className="text-[8px] font-bold text-[#ef4444] font-mono uppercase">OOM</span>
            </span>
          )}
          {hasTunnelError && (
            <span className="flex items-center gap-1 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-md px-1.5 py-0.5">
              <WifiOff className="w-2.5 h-2.5 text-[#f59e0b]" />
              <span className="text-[8px] font-bold text-[#f59e0b] font-mono uppercase">DISCONNECTED</span>
            </span>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[#f3f4f6] truncate">
            {project.name || "Untitled Project"}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            {project.framework !== "unknown" && (
              <span className="text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded bg-[#6366f1]/10 text-[#6366f1] border border-[#6366f1]/20">
                {project.framework}
              </span>
            )}
            <StatusDot status={tunnelStatus} />
          </div>
        </div>
      </div>

      {/* Tunnel URL */}
      {tunnelData.url && (
        <div className="mb-3 bg-[#0b0f17]/50 border border-[#1f2937] rounded-lg px-2.5 py-1.5 flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#9ca3af] truncate flex-1">
            {tunnelData.url}
          </span>
          <button onClick={(e) => { e.stopPropagation(); handleCopy(); }} className="shrink-0 cursor-pointer text-[#6b7280] hover:text-[#f3f4f6] transition-colors">
            <Copy className="w-3 h-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleOpen(); }} className="shrink-0 cursor-pointer text-[#6b7280] hover:text-[#6366f1] transition-colors">
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Mini Sparklines */}
      {isRunning && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="h-8 bg-[#0b0f17]/50 rounded-lg overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ramHistory}>
                <Area type="monotone" dataKey="v" stroke="#6366f1" fill="url(#ramGrad)" strokeWidth={1} isAnimationActive={false} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="h-8 bg-[#0b0f17]/50 rounded-lg overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cpuHistory}>
                <Area type="monotone" dataKey="v" stroke="#10b981" fill="url(#cpuGrad)" strokeWidth={1} isAnimationActive={false} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between text-[9px] font-mono text-[#6b7280] mb-3">
        <span>PORT :{project.port}</span>
        <span className="text-[#6366f1]">
          {isRunning ? `${project.ramMB}MB / ${project.cpuPercent.toFixed(0)}% CPU` : "STOPPED"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {isRunning ? (
          <button
            onClick={(e) => { e.stopPropagation(); onStop(project.projectID); setHasOOM(false); setHasTunnelError(false); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-[#ef4444]/20 rounded-lg text-[10px] font-bold font-mono text-[#ef4444] transition-all cursor-pointer"
          >
            <Square className="w-3 h-3 fill-current" />
            STOP
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onStart(project.projectID); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#10b981]/10 hover:bg-[#10b981]/20 border border-[#10b981]/20 rounded-lg text-[10px] font-bold font-mono text-[#10b981] transition-all cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            START
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (showRemove) {
              onRemove(project.projectID);
            } else {
              setShowRemove(true);
              setTimeout(() => setShowRemove(false), 3000);
            }
          }}
          className={`px-3 py-2 border rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
            showRemove
              ? "bg-[#ef4444]/20 border-[#ef4444]/40 text-[#ef4444]"
              : "bg-transparent border-[#1f2937] text-[#6b7280] hover:border-[#374151] hover:text-[#9ca3af]"
          }`}
        >
          {showRemove ? <Trash2 className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
        </button>
      </div>
    </motion.div>
  );
};

export default ProjectCard;
