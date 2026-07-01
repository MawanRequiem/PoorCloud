import React from "react";

interface StatusDotProps {
  status: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({ status }) => {
  const getDotStyles = () => {
    switch (status) {
      case "CONNECTED":
        return {
          dot: "bg-emerald-500 shadow-[0_0_8px_#10b981]",
          ring: "border-emerald-500/30 animate-ping",
          text: "text-emerald-400",
        };
      case "CONNECTING":
      case "RECONNECTING":
        return {
          dot: "bg-amber-500 shadow-[0_0_8px_#f59e0b] animate-pulse",
          ring: "border-amber-500/30 animate-ping",
          text: "text-amber-400",
        };
      case "FAILED":
        return {
          dot: "bg-red-500 shadow-[0_0_8px_#ef4444]",
          ring: "border-red-500/30 animate-ping",
          text: "text-red-400",
        };
      case "DISCONNECTED":
      default:
        return {
          dot: "bg-gray-600",
          ring: "hidden",
          text: "text-gray-400",
        };
    }
  };

  const styles = getDotStyles();

  return (
    <div className="flex items-center gap-2" id="status-dot-container">
      <div className="relative flex h-2.5 w-2.5">
        <span
          className={`absolute inline-flex h-full w-full rounded-full border-2 ${styles.ring}`}
        />
        <span
          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${styles.dot}`}
        />
      </div>
      <span className={`text-xs font-semibold uppercase tracking-wider font-mono ${styles.text}`}>
        {status}
      </span>
    </div>
  );
};

export default StatusDot;
