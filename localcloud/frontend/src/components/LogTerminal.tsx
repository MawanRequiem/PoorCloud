import React, { useState, useEffect, useRef } from "react";
import { FixedSizeList } from "react-window";
import { EventsOn } from "../../wailsjs/runtime/runtime";

interface LogEntry {
  raw: string;
  timestamp: string;
}

const parseLogLine = (line: string): LogEntry => {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return { raw: line, timestamp: timeStr };
};

const LogLine: React.FC<{ style: React.CSSProperties; entry: LogEntry }> = ({
  style,
  entry,
}) => {
  if (!entry) return null;

  const getLineColor = (text: string) => {
    if (/\b(200|201|304)\b/.test(text)) return "text-emerald-400 font-medium";
    if (/\b(404|500|503)\b/i.test(text) || /error|failed|exception/i.test(text)) return "text-rose-500 font-bold";
    if (/warn|warning/i.test(text)) return "text-amber-400 font-medium";
    return "text-gray-300";
  };

  return (
    <div
      style={style}
      className="flex gap-3 px-4 font-mono text-[11px] leading-6 overflow-hidden text-ellipsis whitespace-nowrap hover:bg-gray-800/30 transition-colors border-b border-gray-900/10"
    >
      <span className="text-gray-600 select-none min-w-[50px]">{entry.timestamp}</span>
      <span className={getLineColor(entry.raw)}>{entry.raw}</span>
    </div>
  );
};

interface LogTerminalProps {
  projectID?: string;
}

export const LogTerminal: React.FC<LogTerminalProps> = ({ projectID }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const listRef = useRef<FixedSizeList>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(250);

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setHeight(Math.max(150, entry.contentRect.height - 40));
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  useEffect(() => {
    const unsubscribe = EventsOn("process-log", (data: { projectID: string; lines: string[] }) => {
      if (projectID && data.projectID !== projectID) return;
      setLogs((prev) => {
        const newLogs = [...prev, ...(data.lines || []).map((line) => parseLogLine(line))];
        return newLogs.slice(-1000);
      });
    });

    return () => unsubscribe();
  }, [projectID]);

  useEffect(() => {
    if (autoScroll && listRef.current && logs.length > 0) {
      listRef.current.scrollToItem(logs.length - 1, "end");
    }
  }, [logs, autoScroll]);

  const handleClear = () => setLogs([]);

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full flex flex-col bg-gray-950/80 border border-gray-900 rounded-xl overflow-hidden shadow-inner"
    >
      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-900 bg-gray-950/90 select-none">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">
          Terminal Console Output
        </span>
        <div className="flex gap-2">
          <button
            className={`text-[10px] font-medium font-mono px-2 py-0.5 rounded transition-all cursor-pointer ${
              autoScroll
                ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                : "bg-gray-800/30 text-gray-500 border border-gray-800"
            }`}
            onClick={() => setAutoScroll((prev) => !prev)}
          >
            {autoScroll ? "Auto-Scroll ON" : "Auto-Scroll OFF"}
          </button>
          <button
            className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded bg-gray-900 text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 border border-gray-800 hover:border-rose-900/30 transition-all cursor-pointer"
            onClick={handleClear}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex-1 w-full bg-gray-950/40 p-1">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-600 font-mono italic">
            Waiting for server logs...
          </div>
        ) : (
          <FixedSizeList
            ref={listRef}
            height={height}
            width="100%"
            itemCount={logs.length}
            itemSize={24}
            onScroll={({ scrollOffset, scrollUpdateWasRequested }) => {
              if (!scrollUpdateWasRequested) {
                const totalHeight = logs.length * 24;
                const isAtBottom = scrollOffset >= totalHeight - height - 48;
                setAutoScroll(isAtBottom);
              }
            }}
          >
            {({ index, style }) => <LogLine style={style} entry={logs[index]} />}
          </FixedSizeList>
        )}
      </div>
    </div>
  );
};

export default LogTerminal;
