# LocalCloud Parallel Handover & Context Chaining Protocol

> **ponytail: full** — Keep it simple, focused, and standard-library first.
> This document splits development into **Feature-Vertical Tracks**. Each agent implements both the Go backend and React frontend parts of their respective features.
>
> To eliminate merge conflicts on Wails binding files, Wails `App` methods are partitioned into separate files under the same `main` package (e.g., `app_engine.go`, `app_telemetry.go`, `app_projects.go`).

---

## 🤝 Feature-Vertical Partitioning Strategy

```
                                  [ PROJECT ROOT ]
                                         |
            +----------------------------+----------------------------+
            |                                                         |
    [ TRACK A: Core Engine + Multi-Project ]    [ TRACK B: Tunnel & Telemetry ]
            |                                                         |
    * Go Engine Files:                        * Go Engine Files:
      - engine/scanner/scanner.go               - engine/tunnel/tunnel.go
      - engine/core/validate.go                 - engine/tunnel/tunnel_api.go
      - engine/core/sysinfo.go                  - engine/keyring/keyring.go / keyring_*.go
      - engine/process/runner.go                - engine/vercel/vercel.go
      - engine/process/os_limiter*.go           - engine/process/logpipe.go
      - engine/process/processguard.go          - engine/process/monitor.go
      - engine/process/bundler.go               - engine/core/config.go
      - engine/core/config.go                   - engine/core/sysinfo.go (shared)
      - engine/projects/project.go    [NEW]     |
            |                                                         |
    * Go Binding Files:                        * Go Binding File:
      - app_engine.go (scan/run/sysinfo)         - app_telemetry.go [EXISTS]
      - app_projects.go [NEW] (project CRUD)     - (per-project tunnel refactor T35-T38)
            |                                                         |
    * React Screens & Components:              * React Components (shared):
      - screens/Dashboard.tsx [REWRITE]          - components/LogTerminal.tsx
        → Landing page with project grid         - components/ResourceChart.tsx
      - screens/DropZone.tsx                     - components/StatusDot.tsx
        → Embedded in AddProjectModal            - components/OOMModal.tsx
      - screens/ControlPanel.tsx                * React Screens:
        → Embedded in AddProjectModal            - screens/Dashboard.tsx (shared)
      - screens/Launching.tsx                    - screens/AddProjectModal.tsx (shared)
        → Embedded in AddProjectModal
      - components/ProjectCard.tsx    [NEW]
      - components/AddProjectModal.tsx [NEW]
      - App.tsx [REWRITE]
        → dashboard-first state machine
```

---

## ⚡ FEATURE TRACK A: Core Engine & Project Launcher (Agent 1)

This track owns the entry-to-launch flow: checking project directories, verifying runtime binaries (Node/Bun), downloading portable Bun, specifying CPU/RAM slider parameters, applying kernel-level limits, and managing the child process lifecycle. With the **multi-project refactor**, Track A also owns the **Project Registry** — the in-memory store of all managed projects, their lifecycle, and the Dashboard landing page.

### A1. Scanner & System Diagnostics
*   **T1: Scanner & Environment Sniffer (`engine/scanner/scanner.go`)**
    *   Reads `package.json`, framework detection, best dev script guess, and default port identification. Sniffs Node/Bun versions.
*   **T2: Hardware Profiler (`engine/core/sysinfo.go`)**
    *   Direct read of CPU cores (`runtime.NumCPU()`) and total physical memory on Windows/Linux.
*   **T3: Input Guard (`engine/core/validate.go`)**
    *   Validates port numbers (1025-65535), cleans path traversal issues, and ensures scripts exist in package manifest.

### A2. Local Process Controller & Limits
*   **T4: Process Launcher (`engine/process/runner.go`)**
    *   Spawns local server subprocess using raw arguments (no shell interpreter). Gathers stdout/stderr pipe.
*   **T5: Windows Kernel Limiter (`engine/process/os_limiter_windows.go`)**
    *   Creates anonymous Job Objects, assigns subprocess PID, applies CPU Rate control and memory limit caps.
*   **T6: Linux Kernel Limiter (`engine/process/os_limiter_linux.go`)**
    *   Launches inside modern systemd scope, or writes limits directly to cgroups files, or uses `taskset`/`prlimit`.
*   **T7: Process Guard & OOM Handler (`engine/process/processguard.go`)**
    *   Cleans up all tracked process groups on Wails `OnShutdown`. Intercepts exit code 137, throwing `"process-oom"` events to UI.
*   **T8: Bun Portable Bundler (`engine/process/bundler.go`)**
    *   Downloads, unzips portable Bun executable, and reports progress updates to Wails listeners.

### A3. Core UI Screens & Routing (Legacy)
*   **T9-T13 (Completed):** Original single-project state machine with DropZone → ControlPanel → Launching → Dashboard flow. Now superseded by A4 multi-project flow.

### A4. Multi-Project Hub & Dashboard-First Flow [NEW]
*   **T29: Project Registry (`engine/projects/project.go`)**
    *   `Project` struct with projectID (UUIDv4), ScanResult, RunConfig, RunningProcess reference, tunnel status, resource monitor cancel func, timestamps.
    *   `ProjectRegistry` singleton with `sync.RWMutex`: `RegisterProject`, `StartProject`, `StopProject`, `RemoveProject`, `ListProjects`, `GetProject`.
    *   Each project gets an isolated context with independent cancel functions.
*   **T30: Dashboard as Landing (`frontend/src/screens/Dashboard.tsx` — REWRITE)**
    *   Multi-project grid as the app landing page. Shows all registered projects as cards.
    *   Each card: project name, framework badge, status dot, port, tunnel URL snippet, RAM/CPU mini sparkline.
    *   "Add New Project" button → opens AddProjectModal.
    *   Click on a running project → opens full detail overlay (charts, logs, URL card).
    *   Empty state: "Belum ada project. Klik 'Add Project' untuk memulai."
*   **T31: ProjectCard Component (`frontend/src/components/ProjectCard.tsx`)**
    *   Card with project name, framework badge, status indicator (green/amber/gray dot), port, tunnel URL (truncated), mini resource sparklines, and action buttons (Stop/Start/Remove).
*   **T32: AddProjectModal (`frontend/src/components/AddProjectModal.tsx`)**
    *   Full-screen modal overlay that embeds the existing DropZone → ControlPanel → Launching flow.
    *   On successful launch → closes modal, project appears in Dashboard grid.
    *   On cancel → returns to Dashboard with no changes.
*   **T33: App Router (`frontend/src/App.tsx` — REWRITE)**
    *   Dashboard as the first and primary screen.
    *   State: `projects: ProjectState[]`, `addProjectOpen: boolean`.
    *   `AnimatePresence` wraps the Dashboard and AddProjectModal.
*   **T34: Wails Project Bindings (`app_projects.go`)**
    *   `ListProjects()` → returns `[]ProjectState` for dashboard render.
    *   `StartProject(projectID string)` → launches registered project's server + tunnel.
    *   `StopProject(projectID string)` → kills process, stops tunnel, stops monitor.
    *   `RemoveProject(projectID string)` → full cleanup and deregistration.

---

## ⚡ FEATURE TRACK B: Tunnels, Sync & Telemetry Dashboard (Agent 2)

This track owns everything that happens after a project's local server starts: creating reverse tunnels, secure credential persistence, updating Vercel variables, buffering logs at 100ms, polling system metrics, and presenting real-time data.

### B1. Secure Storage & REST Syncer
*   **T14: Secure Keyring (`engine/keyring/keyring.go`, `keyring_windows.go`, `keyring_linux.go`)**
    *   DPAPI (Windows) and D-Bus Secret Service (Linux) secure credentials manager with AES encrypted file fallback.
*   **T15: Vercel REST Client (`engine/vercel/vercel.go`)**
    *   Sends PATCH calls to environment variables API and triggers POST deployments API on redeploys.
*   **T16: Config Persistence (`engine/core/config.go`)**
    *   Saves/loads UI window dimensions, last folder path, and non-sensitive options.

### B2. Reverse Tunnel Managers
*   **T17: cloudflared Finder & Ephemeral Tunnel (`engine/tunnel/tunnel.go`)**
    *   Locates binary on system, executes command, and scans stderr for trycloudflare.com URL pattern.
*   **T18: Tunnel Reconnector (within `engine/tunnel/tunnel.go`)**
    *   Monitors EOF, starts a 5× reconnect loop with exponential backoff, and updates connection states.
*   **T19: Permanent Tunnel (`engine/tunnel/tunnel_api.go`)**
    *   Registers named tunnels and configures DNS CNAME records via Cloudflare API v4.

### B3. Log Pipes & Real-time Graphs
*   **T20: Log Batcher (`engine/process/logpipe.go`)**
    *   100ms ticker buffering log line slices to avoid UI rendering lockup.
*   **T21: System Load Monitor (`engine/process/monitor.go`)**
    *   Direct `/proc` stats reader (Linux) and memory status API calls (Windows) polling CPU/RAM every 1s.
*   **T22: Wails Telemetry Bindings (`app_telemetry.go`)**
    *   Implements `StartEphemeralTunnel`, `StartPermanentTunnel`, `StopTunnel`, `SyncVercel`, `StoreCredential`, `HasCredential`, `LoadConfig`, and `SaveConfig`.
*   **T23: Log Terminal Component (`frontend/src/components/LogTerminal.tsx`)**
    *   Virtualized list mapping batched logs. Circular ring buffer state (`slice(-1000)`). Color coding rules.
*   **T24: Resource Chart Component (`frontend/src/components/ResourceChart.tsx`)**
    *   Recharts Area charts rendering RAM limits vs load and CPU usage (rolling 60-point window).
*   **T25: Live Dashboard Screen (`frontend/src/screens/Dashboard.tsx`)**
    *   Original single-project dashboard. Will be superseded by T30 multi-project dashboard.

### B4. Per-Project Resource Isolation [NEW]
*   **T35: Per-Project Tunnel Instances (`engine/tunnel/tunnel.go` — REFACTOR)**
    *   Remove global singleton state (`tunnelStatus`, `publicURL`, `cancelFunc`, `tunnelCmd`).
    *   Create `TunnelInstance` struct keyed by projectID with its own context, cancel func, status, URL.
    *   `TunnelManager` with `sync.Map` of `projectID → *TunnelInstance`.
*   **T36: Per-Project Resource Monitors (`engine/process/monitor.go` — REFACTOR)**
    *   Key resource monitors by projectID so each project gets its own `/proc` (or WinAPI) polling loop.
    *   Events emitted with `projectID` so the frontend routes them to the correct project card.
*   **T37: Per-Project Log Streams (`engine/process/logpipe.go` — REFACTOR)**
    *   Key log channels by projectID. Each project's runner creates its own log channel.
    *   Frontend receives `{projectID, lines[]}` events and routes to the correct terminal.
*   **T38: Project-Aware Telemetry Bindings (`app_telemetry.go` — UPDATE)**
    *   All tunnel/monitor/log bindings accept `projectID` as first parameter.
    *   Frontend passes `projectID` for all operations (start tunnel, stop tunnel, poll metrics).

---

## 🔗 TRACK C: Hardening & Final QA (Coordinated)

*   **T26: Launching Flow Stepper (`frontend/src/screens/Launching.tsx`)**
    *   Stepper panel checking off Core Engine runs (Track A) and Tunnel/Vercel creations (Track B).
*   **T27: IPC WebView Hardening (`main.go`)**
    *   WebView configuration flags securing navigation context and blocking resource drops.
*   **T28: Bindings Registration & Validation (`main.go`)**
    *   Register all app bindings inside `main.go` and run final `wails build` package check.
