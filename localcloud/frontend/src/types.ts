export interface ProjectState {
  projectID: string;
  name: string;
  version: string;
  framework: string;
  port: number;
  tunnelURL: string;
  tunnelStatus: string;
  status: string;
  ramMB: number;
  cpuPercent: number;
  projectPath: string;
  devCommand: string;
  hasNode: boolean;
  hasBun: boolean;
}

export interface ScanResult {
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

export interface RunConfig {
  projectPath: string;
  runtime: string;
  scriptName: string;
  port: number;
  memoryMB: number;
  cpuCores: number;
  vercelSync: boolean;
  vercelToken: string;
  vercelProject: string;
  vercelTeam: string;
  vercelEnvKey: string;
  tunnelMode: "ephemeral" | "permanent";
  cfToken: string;
  cfAccount: string;
  cfDomain: string;
  cfTunnelName: string;
}

export interface ResourceUsageEvent {
  projectID: string;
  ramMB: number;
  cpuPercent: number;
  timestamp: number;
}

export interface TunnelStatusEvent {
  projectID: string;
  status: string;
  url: string;
  error: string;
}

export interface ProcessLogEvent {
  projectID: string;
  lines: string[];
}

export interface ProcessOOMEvent {
  projectID: string;
  memoryLimit: number;
}
