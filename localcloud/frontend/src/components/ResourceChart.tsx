import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { EventsOn } from "../../wailsjs/runtime/runtime";

interface DataPoint {
  time: string;
  value: number;
}

interface ResourceChartProps {
  type: "ram" | "cpu";
  limit: number; // RAM in MB or CPU in Cores (or percent)
}

interface ResourceEvent {
  ramMB: number;
  ramPercent: number;
  cpuPercent: number;
  timestamp: number;
}

export const ResourceChart: React.FC<ResourceChartProps> = ({ type, limit }) => {
  const [data, setData] = useState<DataPoint[]>([]);

  useEffect(() => {
    // Listen to Go telemetry monitor ticks (every 1s)
    const unsubscribe = EventsOn("resource-usage", (usage: ResourceEvent) => {
      setData((prev) => {
        const dateObj = new Date(usage.timestamp);
        const timeStr = dateObj.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });

        const point = {
          time: timeStr,
          value: type === "ram" ? usage.ramMB : usage.cpuPercent,
        };

        return [...prev, point].slice(-60); // 60 second circular buffer
      });
    });

    return () => {
      unsubscribe();
    };
  }, [type]);

  const isRAM = type === "ram";
  const strokeColor = isRAM ? "#6366f1" : "#10b981"; // Indigo for RAM, Emerald for CPU
  const gradientId = `gradient-${type}`;
  const valueLabel = isRAM ? "RAM Usage (MB)" : "CPU Load (%)";
  const limitLabel = isRAM ? `Limit: ${limit}MB` : `Limit: ${limit}%`;

  return (
    <div
      className="flex-1 min-w-[280px] bg-gray-950/60 border border-gray-900 rounded-xl p-4 flex flex-col shadow-lg backdrop-blur-md"
      id={`resource-chart-${type}`}
    >
      <div className="flex justify-between items-baseline mb-2">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">
          {isRAM ? "Memory Profile" : "Processor Profile"}
        </h3>
        <span className="text-[10px] font-semibold text-gray-500 font-mono">
          {data.length > 0 ? `${data[data.length - 1].value.toFixed(1)} ${isRAM ? "MB" : "%"}` : "0"}
        </span>
      </div>

      <div className="h-[140px] w-full select-none">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.4} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 9, fill: "#4b5563", fontFamily: "monospace" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              domain={[0, (dataMax: number) => Math.max(limit * 1.2, dataMax, 10)]}
              tick={{ fontSize: 9, fill: "#4b5563", fontFamily: "monospace" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#030712",
                border: "1px solid #1f2937",
                borderRadius: "8px",
                fontSize: "11px",
                fontFamily: "monospace",
                color: "#f3f4f6",
              }}
              labelStyle={{ color: "#9ca3af" }}
            />

            <Area
              type="monotone"
              dataKey="value"
              name={valueLabel}
              stroke={strokeColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
            />

            {limit > 0 && (
              <ReferenceLine
                y={limit}
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                label={{
                  value: limitLabel,
                  fill: "#f87171",
                  fontSize: 8,
                  position: "top",
                  fontFamily: "monospace",
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ResourceChart;
