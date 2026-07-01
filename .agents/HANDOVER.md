# LocalCloud Parallel Handover & Context Chaining Protocol

> **ponytail: full** — Keep it simple, focused, and standard-library first.
> This document splits development into **Feature-Vertical Tracks**. Each agent implements both the Go backend and React frontend parts of their respective features.
>
> To eliminate merge conflicts on Wails binding files, Wails `App` methods are partitioned into separate files under the same `main` package (e.g., `app_engine.go` and `app_telemetry.go`).

---

## 🤝 Feature-Vertical Partitioning Strategy

```
                                  [ PROJECT ROOT ]
                                         |
            +----------------------------+----------------------------+
            |                                                         |
    [ FEATURE TRACK A: Core Engine ]          [ FEATURE TRACK B: Tunnel & Telemetry ]
            |                                                         |
    * Go Engine Files:                        * Go Engine Files:
      - engine/scanner.go                       - engine/tunnel.go
      - engine/validate.go                      - engine/tunnel_api.go
      - engine/sysinfo.go                       - engine/keyring.go / keyring_*.go
      - engine/runner.go                        - engine/vercel.go
      - engine/os_limiter.go / limiter_*.go     - engine/logpipe.go
      - engine/processguard.go                  - engine/monitor.go
      - engine/bundler.go                       - engine/config.go
            |                                                         |
    * Go Binding File:                        * Go Binding File:
      - app_engine.go [NEW]                     - app_telemetry.go [NEW]
            |                                                         |
    * React UI Screens:                       * React UI Screens & Components:
      - screens/DropZone.tsx                    - components/LogTerminal.tsx
      - screens/ControlPanel.tsx                - components/ResourceChart.tsx
      - screens/OOMModal.tsx                    - components/StatusDot.tsx
      - App.tsx (State Router)                  - screens/Dashboard.tsx
```

---

## ⚡ FEATURE TRACK A: Core Engine & Project Launcher (Agent 1)

This track owns the entry-to-launch flow: checking project directories, verifying runtime binaries (Node/Bun), downloading portable Bun, specifying CPU/RAM slider parameters, applying kernel-level limits, and managing the child process lifecycle.

### A1. Scanner & System Diagnostics
*   **T1: Scanner & Environment Sniffer (`engine/scanner.go`)**
    *   Reads `package.json`, framework detection, best dev script guess, and default port identification. Sniffs Node/Bun versions.
    *   *Verification:* Run Go scan tests.
*   **T2: Hardware Profiler (`engine/sysinfo.go`)**
    *   Direct read of CPU cores (`runtime.NumCPU()`) and total physical memory on Windows/Linux.
    *   *Verification:* Print output and confirm it matches system properties.
*   **T3: Input Guard (`engine/validate.go`)**
    *   Validates port numbers (1025-65535), cleans path traversal issues, and ensures scripts exist in package manifest.

### A2. Local Process Controller & Limits
*   **T4: Process Launcher (`engine/runner.go`)**
    *   Spawns local server subprocess using raw arguments (no shell interpreter). Gathers stdout/stderr pipe.
*   **T5: Windows Kernel Limiter (`engine/os_limiter_windows.go`)**
    *   Creates anonymous Job Objects, assigns subprocess PID, applies CPU Rate control and memory limit caps.
*   **T6: Linux Kernel Limiter (`engine/os_limiter_linux.go`)**
    *   Launches inside modern systemd scope, or writes limits directly to cgroups files, or uses `taskset`/`prlimit`.
*   **T7: Process Guard & OOM Handler (`engine/processguard.go`)**
    *   Cleans up all tracked process groups on Wails `OnShutdown`. Intercepts exit code 137, throwing `"process-oom"` events to UI.
*   **T8: Bun Portable Bundler (`engine/bundler.go`)**
    *   Downloads, unzips portable Bun executable, and reports progress updates to Wails listeners.

### A3. Core UI Screens & Routing
*   **T9: Wails Engine Bindings (`app_engine.go`)**
    *   Implements `ScanProject`, `OpenDirectoryDialog`, `StartDevServer`, `StopDevServer`, `GetSystemInfo`, and `DownloadBunPortable` bindings.
*   **T10: Drop-Zone Screen (`frontend/src/screens/DropZone.tsx`)**
    *   Framer-motion drag-drop target (calls Wails `OnFileDrop`), folder picker, shake animations, and Bun download progress bar.
*   **T11: Control Panel Screen (`frontend/src/screens/ControlPanel.tsx`)**
    *   Pre-populated script selectors, validated port input, CPU chips, and RAM gradient allocation slider.
*   **T12: OOM Modal Overlay (`frontend/src/components/OOMModal.tsx`)**
    *   Blocked Indonesian error modal overlay triggering on OOM alerts.
*   **T13: App Router (`frontend/src/App.tsx`)**
    *   Coordinates screen state switches with Framer Motion `<AnimatePresence>`.

---

## ⚡ FEATURE TRACK B: Tunnels, Sync & Telemetry Dashboard (Agent 2)

This track owns everything that happens after the local server starts: creating reverse tunnels, secure credential persistence, updating Vercel variables, buffering logs at 100ms, polling system metrics, and presenting the real-time Dashboard.

### B1. Secure Storage & REST Syncer
*   **T14: Secure Keyring (`engine/keyring.go`, `keyring_windows.go`, `keyring_linux.go`)**
    *   DPAPI (Windows) and D-Bus Secret Service (Linux) secure credentials manager with AES encrypted file fallback.
    *   *Verification:* Ensure credentials are encrypted on disk.
*   **T15: Vercel REST Client (`engine/vercel.go`)**
    *   Sends PATCH calls to environment variables API and triggers POST deployments API on redeploys.
*   **T16: Config Persistence (`engine/config.go`)**
    *   Saves/loads UI window dimensions, last folder path, and non-sensitive options.

### B2. Reverse Tunnel Managers
*   **T17: cloudflared Finder & Ephemeral Tunnel (`engine/tunnel.go`)**
    *   Locates binary on system, executes command, and scans stderr for trycloudflare.com URL pattern.
*   **T18: Tunnel Reconnector (`engine/tunnel.go`)**
    *   Monitors EOF, starts a 5× reconnect loop with exponential backoff, and updates connection states.
*   **T19: Permanent Tunnel (`engine/tunnel_api.go`)**
    *   Registers named tunnels and configures DNS CNAME records via Cloudflare API v4.

### B3. Log Pipes & Real-time Graphs
*   **T20: Log Batcher (`engine/logpipe.go`)**
    *   100ms ticker buffering log line slices to avoid UI rendering lockup.
*   **T21: System Load Monitor (`engine/monitor.go`)**
    *   Direct `/proc` stats reader (Linux) and memory status API calls (Windows) polling CPU/RAM every 1s.
*   **T22: Wails Telemetry Bindings (`app_telemetry.go`)**
    *   Implements `StartEphemeralTunnel`, `StartPermanentTunnel`, `StopTunnel`, `SyncVercel`, `StoreCredential`, `HasCredential`, `LoadConfig`, and `SaveConfig`.
*   **T23: Log Terminal Component (`frontend/src/components/LogTerminal.tsx`)**
    *   Virtualized list mapping batched logs. Circular ring buffer state (`slice(-1000)`). Color coding rules.
*   **T24: Resource Chart Component (`frontend/src/components/ResourceChart.tsx`)**
    *   Recharts Area charts rendering RAM limits vs load and CPU usage (rolling 60-point window).
*   **T25: Live Dashboard Screen (`frontend/src/screens/Dashboard.tsx`)**
    *   Glass-morphism URL Card with click-to-copy, status dot indicator, subcomponents (LogTerminal, ResourceChart), and Stop process control button.

---

## 🔗 TRACK C: Hardening & Final QA (Coordinated)

*   **T26: Launching Flow Stepper (`frontend/src/screens/Launching.tsx`)**
    *   Stepper panel checking off Core Engine runs (Track A) and Tunnel/Vercel creations (Track B).
*   **T27: IPC WebView Hardening (`main.go`)**
    *   WebView configuration flags securing navigation context and blocking resource drops.
*   **T28: Bindings Registration & Validation (`main.go`)**
    *   Register all app bindings inside `main.go` and run final `wails build` package check.
