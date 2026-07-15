# LocalCloud Implementation Task List (Feature-Vertical Tracks)

This document groups tasks by independent, end-to-end features. Refer to [HANDOVER.md](./HANDOVER.md) for specs and APIs.

---

## 🟩 Phase 1-4: Scaffold & Preparation (Completed)
- [x] Setup universal AI rules (.agents/AGENTS.md, .cursorrules, .claudeprompt)
- [x] Initialized Wails scaffolding and git repository
- [x] Setup simplified engine stubs and Go bindings
- [x] Configured TailwindCSS v4 inside React frontend

---

## ⚡ FEATURE TRACK A: Core Engine & Project Launcher (Agent 1)

- [x] **Phase A1: Scanning & Validation** (T1–T3)
- [x] **Phase A2: Local Process Controller & Limits** (T4–T8)
- [x] **Phase A3: Core UI Screens & Routing** (T9–T13)
- [x] **Phase A4: Multi-Project Hub & Dashboard-First Flow**
  - [x] **T29a:** Create `engine/projects/project.go` — `Project` struct (projectID UUIDv4, ScanResult, RunConfig, RunningProcess, tunnel state, monitor cancel, timestamps)
  - [x] **T29b:** Create `ProjectRegistry` singleton — `sync.RWMutex`-protected map, `RegisterProject`, `UnregisterProject`, `GetProject`
  - [x] **T29c:** Add lifecycle methods — `StartProject(projectID)`, `StopProject(projectID)`, `RemoveProject(projectID)` with independent contexts per project
  - [x] **T29d:** Add snapshot method — `ListProjects() []ProjectState` for rendering the dashboard grid
  - [x] **T30a:** Rewrite `Dashboard.tsx` layout — responsive project grid with cards + expanded detail panel
  - [x] **T30b:** Add "Add New Project" button + empty state ("Belum ada project...")
  - [x] **T30c:** Implement selected/expanded state — clicking card shows full charts, log terminal, URL card
  - [x] **T31a:** Create `ProjectCard.tsx` — compact card with name, framework badge, status dot
  - [x] **T31b:** Add mini sparklines — RAM/CPU inline Recharts AreaChart (60s window)
  - [x] **T31c:** Add action buttons — Stop (red), Start (green), Remove (gray, 2-click confirm)
  - [x] **T32a:** Create `AddProjectModal.tsx` — full-screen modal overlay (z-300)
  - [x] **T32b:** Embed DropZone step — drag-and-drop folder, shake animation on invalid package.json
  - [x] **T32c:** Embed ControlPanel step — pre-filled config, sliders, selectors
  - [x] **T32d:** Embed Launching step — progress stepper with event listeners
  - [x] **T32e:** Wire modal completion — register project, close modal, project appears in grid
  - [x] **T33a:** Rewrite `App.tsx` — dashboard-first, no screen state machine
  - [x] **T33b:** Wire App.tsx to registry — on mount `ListProjects()`, render grid, `AnimatePresence`
  - [x] **T33c:** Wire per-project event listeners — tunnel-status, process-oom, refresh on events
  - [x] **T34a:** Create `app_projects.go` — `ListProjects`, `StartProject`, `StopProject`, `RemoveProject`, `RegisterAndStartProject`
  - [x] **T34b:** Wire AddProjectModal → `RegisterAndStartProject(scan, config)` — single call registered + start
  - [x] **T34c:** Thread-safety — all registry ops under `sync.RWMutex`, independent contexts

---

## ⚡ FEATURE TRACK B: Tunnels, Sync & Telemetry Dashboard (Agent 2)

- [x] **Phase B1: Secure Storage & REST Syncer** (T14–T16)
- [x] **Phase B2: Reverse Tunnel Managers** (T17–T19)
- [x] **Phase B3: Log Pipes & Real-time Graphs** (T20–T25)
- [x] **Phase B4: Per-Project Resource Isolation**
  - [x] **T35a:** Refactor `engine/tunnel/tunnel.go` — remove global state, create `TunnelInstance` struct
  - [x] **T35b:** Create `TunnelManager` — `sync.Map` of `projectID → *TunnelInstance`
  - [x] **T35c:** Add `StartTunnelForProject` / `StopTunnelForProject` / `GetTunnelStatusForProject`
  - [x] **T35d:** All tunnel functions accept projectID, backward-compatible wrappers for single-project
  - [x] **T36a:** Refactor `engine/process/monitor.go` — `StartResourceMonitorForProject` with projectID
  - [x] **T36b:** Create `MonitorManager` — `sync.Map` of `projectID → cancel func`
  - [x] **T37a:** Refactor `engine/process/logpipe.go` — `StartLogPipeForProject` with projectID
  - [x] **T37b:** Create `LogPipeManager` — `sync.Map` of `projectID → cancel func`
  - [x] **T38a:** Update `app_telemetry.go` — all events include projectID
  - [x] **T38b:** Update frontend — LogTerminal, ResourceChart filter by projectID, events routed correctly

---

## 🔗 TRACK C: Hardening & Final QA (Completed)

- [x] **T26:** Launching screen (stepper indicator)
- [x] **T27:** IPC WebView2 hardening in `main.go`
- [x] **T28:** Bindings registration and verification

---

## 🆕 TRACK D: Sidebar + Settings + Health (Completed 2026-07-15)

- [x] **D1:** Sidebar component — collapsible (56px/220px), project list, settings icon, logo
- [x] **D2:** SettingsPanel component — right slide-out, default tunnel/RAM/CPU/cloudflared path
- [x] **D3:** AppConfig extension — `DefaultRunConfig` field for defaults persistence
- [x] **D4:** Health alert badges — OOM red badge, tunnel disconnect amber badge on ProjectCard
- [x] **D5:** Settings defaults pre-fill ControlPanel on new project creation
- [x] **D6:** OnShutdown stops all running projects
