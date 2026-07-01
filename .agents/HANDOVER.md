# LocalCloud Parallel Handover & Context Chaining Protocol

> **ponytail: full** — Keep it simple, focused, and standard-library first.
> This document splits development strictly by **Layer**: **Track A (Backend Go Engine)** and **Track B (Frontend React UI)**.
> The bridge between both tracks is the **Wails API & Event Contract** defined below.

---

## 🤝 The Wails API & Event Contract (Strict Boundary)

Both agents must adhere strictly to these method signatures and event structures. Do not change them.

### 1. Go Structs Bound to TS (UI calls Go, Go returns Promise)

```typescript
// 1. Project Scan
interface ScanResult {
  name: string;
  version: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devCommand: string;    // Auto-detected best script
  defaultPort: int;      // Detected port (defaults: Next 3000, Vite 5173, etc)
  framework: string;     // "next" | "vite" | "remix" | "cra" | "unknown"
  hasNode: boolean;
  nodeVersion: string;
  hasBun: boolean;
  bunVersion: string;
  projectPath: string;
}
ScanProject(path: string): Promise<ScanResult>;
OpenDirectoryDialog(): Promise<string>;

// 2. Dev Server Lifecycle
interface RunConfig {
  projectPath: string;
  runtime: string;     // "node" | "bun" | absolute path to portable bun
  scriptName: string;  // e.g. "dev"
  port: number;
  memoryMb: number;
  cpuCores: number;
}
StartDevServer(cfg: RunConfig): Promise<void>;
StopDevServer(): Promise<void>;

// 3. Hardware Info
interface SystemInfo {
  totalRamMB: number;
  cpuCores: number;
  os: string;   // "windows" | "linux"
  arch: string; // "amd64" | "arm64"
}
GetSystemInfo(): Promise<SystemInfo>;

// 4. Cloudflare Tunnels
interface TunnelConfig {
  localPort: number;
  domain: string;      // empty for ephemeral
  accountId: string;   // empty for ephemeral
  tunnelName: string;  // empty for ephemeral
}
StartEphemeralTunnel(port: number): Promise<void>;
StartPermanentTunnel(cfg: TunnelConfig): Promise<void>;
StopTunnel(): Promise<void>;

// 5. Vercel Sync
SyncVercel(envKey: string, tunnelUrl: string): Promise<void>; // Uses stored keyring token

// 6. Secure Credentials Store (No "Get" exposed to frontend for safety!)
StoreCredential(service: string, key: string, value: string): Promise<void>;
HasCredential(service: string, key: string): Promise<boolean>;
DeleteCredential(service: string, key: string): Promise<void>;

// 7. Config Persistence
interface AppConfig {
  lastProjectPath: string;
  lastRunConfig?: {
    scriptName: string;
    port: number;
    memoryMb: number;
    cpuCores: number;
    vercelSync: boolean;
    vercelEnvKey: string;
    tunnelMode: string; // "ephemeral" | "permanent"
  };
}
LoadConfig(): Promise<AppConfig>;
SaveConfig(cfg: AppConfig): Promise<void>;

// 8. Bun Portable Installer
DownloadBunPortable(): Promise<void>;
```

### 2. Events Emitted from Go to TS (Go pushes, UI listens)

```typescript
// 1. Process Event Logs (Fired in batches every 100ms)
// Event Name: "process-log"
// Payload: string[] (array of log lines)

// 2. Real-time Metrics (Fired every 1s)
// Event Name: "resource-usage"
interface ResourceUsage {
  ramMB: number;
  ramPercent: number;
  cpuPercent: number;
  timestamp: number; // unix milliseconds
}

// 3. Out-Of-Memory Alert
// Event Name: "process-oom"
interface OOMAlert {
  message: string; // SCAD Indonesian translation warning
  memoryLimit: number;
  exitCode: number;
}

// 4. Tunnel Connection Status
// Event Name: "tunnel-status"
interface TunnelStatus {
  status: "CONNECTED" | "CONNECTING" | "RECONNECTING" | "FAILED" | "DISCONNECTED";
  url: string; // Available when CONNECTED
  error?: string;
}

// 5. Bun Installation Progress
// Event Name: "bun-download-progress"
// Payload: number (percentage 0 to 100)
```

---

## ⚡ TRACK A: Backend Go Engine (Agent 1)

This track implements all low-level OS operations, process management, API integrations, and binds them to Wails.

### Phase A1: Scanning & Validation
*   **T1: Scanner & Sniffer (`engine/scanner.go`)**
    *   Reads `package.json`, auto-detects framework/script/port, sniffs local Node/Bun runtimes.
    *   *Verification:* Write Go tests simulating different JS projects.
*   **T2: Validator (`engine/validate.go`)**
    *   Secures port ranges (1025-65535), sanitizes folder paths, validates script name existence.
    *   *Verification:* Test boundary inputs.
*   **T3: SysInfo (`engine/sysinfo.go`)**
    *   C-free detection of core counts and physical memory limits on Windows and Linux.
    *   *Verification:* Verify values match Host Task Manager/System Monitor.

### Phase A2: Execution & Resource Control
*   **T4: Process Runner (`engine/runner.go`)**
    *   Spawns local dev server using raw args (command-injection safe). Pipes merged output.
    *   *Verification:* Confirm execution of node/bun.
*   **T5: Windows Limiter (`engine/os_limiter_windows.go`)**
    *   Assigns process to Job Objects, sets Max Memory limit and CPU rate Hard Caps.
*   **T6: Linux Limiter (`engine/os_limiter_linux.go`)**
    *   Spawns inside systemd scope, or falls back to writing directly to cgroups files, or taskset/prlimit.
*   **T7: OOM Monitor & Process Guard (`engine/processguard.go`)**
    *   Monitors exit code 137 (OOM), emits `"process-oom"` event. Tracks active process groups and kills all cleanly on Wails shutdown (`OnShutdown`).

### Phase A3: Networking & Storage
*   **T11-T13: Cloudflare Tunnel Manager (`engine/tunnel.go`)**
    *   Detects `cloudflared` executable, runs Ephemeral Tunnels, parses stderr, handles drop detection and triggers 5× backoff reconnect loop.
*   **T14: Secure Keyring (`engine/keyring.go`, `keyring_windows.go`, `keyring_linux.go`)**
    *   Implements Windows DPAPI, Linux D-Bus default keyring interface, and local encrypted file fallback.
*   **T15: Vercel Sync client (`engine/vercel.go`)**
    *   Handles HTTP calls to add environment variables and queue redeployments.
*   **T16: Permanent Tunnel (`engine/tunnel_api.go`)**
    *   Cloudflare API v4 integration to configure DNS records.
*   **T17: Config Storage (`engine/config.go`)**
    *   Saves UI bounds, last path, and non-sensitive options to `%APPDATA%/localcloud/config.json`.
*   **T18: Bun Installer (`engine/bundler.go`)**
    *   Downloads, unzips portable Bun binary, and emits download percentage events.

---

## ⚡ TRACK B: Frontend React UI (Agent 2)

This track builds the visual presentation layer, handles animations, maps chart data, and consumes Wails events.

### Phase B1: Drop-Zone & Setup Flow
*   **T19: Drop-Zone Screen (`frontend/src/screens/DropZone.tsx`)**
    *   Renders drag-drop target (using Wails `OnFileDrop`), Browse folder option. Triggers visual shake animation on folder scan error. Displays warning banner + progress bar if Bun needs to be downloaded.
*   **T20: Control Panel Screen (`frontend/src/screens/ControlPanel.tsx`)**
    *   Dropdown for script choice, port number validation. CPU core buttons, and color-coded RAM allocation slider. Integrates Vercel sync config and Cloudflare credentials form.

### Phase B2: Launching & Telemetry Charts
*   **T21: Launching Screen (`frontend/src/screens/Launching.tsx`)**
    *   Animated vertical stepper. Triggers local server run, tunnel execution, and Vercel syncing, updating indicators as events verify success.
*   **T22: Log Terminal Component (`frontend/src/components/LogTerminal.tsx`)**
    *   Subscribes to `"process-log"` batches. Capped ring buffer state (`logs.slice(-1000)`). Uses `react-window` virtualization. Highlight HTTP statuses/error words.
*   **T23: Resource Chart Component (`frontend/src/components/ResourceChart.tsx`)**
    *   Subscribes to `"resource-usage"`. Renders dual Recharts Area charts showing RAM limits vs usage and CPU load over a rolling 60-second window.
*   **T24: OOM Modal Component (`frontend/src/components/OOMModal.tsx`)**
    *   Indonesian dialog box warning overlay blocking UI when OOM event fires. Offers settings tweak or restart options.

### Phase B3: Monitoring & Routing
*   **T25: Dashboard Screen (`frontend/src/screens/Dashboard.tsx`)**
    *   Uptime counter, glass-morphism URL Card with click-to-copy, integrated terminal, chart subcomponents, and prominent red Stop Floating Button.
*   **T26: App Router & Animations (`frontend/src/App.tsx`)**
    *   State machine controller routing screens using Framer Motion `<AnimatePresence>` transitions.

---

## 🔗 TRACK C: Integration & Hardening (Coordinated)

*   **T27: IPC WebView Hardening (`main.go`)**
    *   Disable external WebView navigation, hotkeys, status bars, and raw drops.
*   **T28: Bindings Registry (`app.go`)**
    *   Expose all Go engine methods, run final `wails build` command, and perform complete QA cycle.
