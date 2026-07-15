# LocalCloud Parallel Handover & Context Chaining Protocol

> **ponytail: full** — Keep it simple, focused, and standard-library first.
> This document splits development into **Feature-Vertical Tracks**. Each agent implements both the Go backend and React frontend parts of their respective features.
>
> To eliminate merge conflicts on Wails binding files, Wails `App` methods are partitioned into separate files under the same `main` package (e.g., `app_engine.go`, `app_telemetry.go`, `app_projects.go`).
>
> **Current status (2026-07-15):** All single-project functionality is production-ready. Multi-project hub (Phase A4 + B4) is complete. UI has been changed to dashboard-first with sidebar navigation, Settings panel, and health alert badges.

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
      - engine/scanner/scanner.go               - engine/tunnel/tunnel.go (TunnelManager)
      - engine/core/validate.go                 - engine/tunnel/tunnel_api.go
      - engine/core/sysinfo.go                  - engine/keyring/keyring.go / keyring_*.go
      - engine/core/config.go                   - engine/vercel/vercel.go
      - engine/process/runner.go                - engine/process/logpipe.go (LogPipeManager)
      - engine/process/os_limiter*.go           - engine/process/monitor.go (MonitorManager)
      - engine/process/processguard.go          - engine/process/monitor_*.go
      - engine/process/bundler.go              |
      - engine/projects/project.go              |
            |                                                         |
    * Go Binding Files:                        * Go Binding File:
      - app.go (base + scan/limit)              - app_telemetry.go (tunnel/vercel/keyring/config)
      - app_engine.go (sysinfo/bun)             
      - app_projects.go (project CRUD)          
            |                                                         |
    * React Screens & Components:              * React Components:
      - App.tsx (dashboard-first router)         - components/LogTerminal.tsx (projectID filter)
      - screens/Dashboard.tsx (multi-project)    - components/ResourceChart.tsx (projectID filter)
      - screens/DropZone.tsx (used in modal)     - components/StatusDot.tsx
      - screens/ControlPanel.tsx (used in modal) - components/OOMModal.tsx
      - screens/Launching.tsx (used in modal)    - components/SettingsPanel.tsx
      - components/Sidebar.tsx                   - components/ProjectCard.tsx
      - components/AddProjectModal.tsx           
```

---

## Current Architecture

### Dashboard-First Flow
1. App launches → **Dashboard** (landing page with project grid)
2. Click "Add Project" → **AddProjectModal** opens (full-screen overlay)
   - Step 1: DropZone (drag/browse folder, scan package.json)
   - Step 2: ControlPanel (auto-filled config from scan, sliders, Vercel/CF options)
   - Step 3: Launching (progress stepper with event listeners)
3. Project appears in grid with live RAM/CPU mini sparklines
4. Click a card → expands detail panel (full charts + logs + tunnel URL card)
5. **Sidebar** (left) — project list, add project, settings icon
6. **Settings Panel** (right slide-out) — default tunnel mode, RAM, CPU, cloudflared path

### Per-Project Isolation
- **TunnelManager** (`engine/tunnel/tunnel.go`): `sync.Map` of `projectID → *TunnelInstance`
- **MonitorManager** (`engine/process/monitor.go`): `sync.Map` of `projectID → context.CancelFunc`
- **LogPipeManager** (`engine/process/logpipe.go`): `sync.Map` of `projectID → context.CancelFunc`
- All events include `projectID` — frontend components filter by it
- Stopping one project does not affect others
- `OnShutdown` stops all running projects + kills zombies

### Project Registry
- **File:** `engine/projects/project.go`
- `Project` struct: projectID (UUIDv4), ScanResult, RunConfig, RunningProcess, tunnel state, monitor cancel, timestamps
- `ProjectRegistry` singleton with `sync.RWMutex`
- Lifecycle: `RegisterProject`, `UnregisterProject`, `StartProject`, `StopProject`, `RemoveProject`, `ListProjects`
- Wails bindings: `app_projects.go` — `ListProjects`, `StartProject`, `StopProject`, `RemoveProject`, `RegisterAndStartProject`

### Settings
- **File:** `engine/core/config.go`
- `AppConfig.DefaultRunConfig *RunConfigSave` — default RAM, CPU, tunnel mode for new projects
- SettingsPanel component writes to this via `SaveConfig`
- ControlPanel reads defaults to pre-fill sliders on new project creation

## File Map
```
localcloud/
├── main.go                              [MODIFIED] — OnShutdown stops all projects
├── app.go                               [KEPT]    — ScanProject, LimitResources
├── app_engine.go                        [KEPT]    — GetSystemInfo, DownloadBunPortable, GetEngineStatus
├── app_telemetry.go                     [KEPT]    — tunnel/vercel/keyring/config bindings
├── app_projects.go                      [NEW]     — project CRUD bindings
├── engine/
│   ├── projects/
│   │   └── project.go                   [NEW]     — Project struct, ProjectRegistry, lifecycle
│   ├── tunnel/
│   │   ├── tunnel.go                    [REFACTORED] — TunnelManager, per-project instances
│   │   └── tunnel_api.go               [KEPT]    — permanent tunnel + CF API v4
│   ├── process/
│   │   ├── monitor.go                   [REFACTORED] — MonitorManager, projectID param
│   │   ├── logpipe.go                   [REFACTORED] — LogPipeManager, projectID param
│   │   ├── runner.go                    [KEPT]    — dev server process launcher
│   │   ├── os_limiter.go etc.          [KEPT]    — platform-specific resource limiters
│   │   ├── processguard.go             [KEPT]    — zombie prevention
│   │   └── bundler.go                  [KEPT]    — Bun portable download
│   ├── core/
│   │   ├── config.go                    [MODIFIED] — added DefaultRunConfig
│   │   ├── sysinfo*.go                 [KEPT]    — system info
│   │   └── validate.go                 [KEPT]    — input validation
│   ├── keyring/
│   │   └── keyring*.go                 [KEPT]    — DPAPI + D-Bus + AES
│   ├── vercel/
│   │   └── vercel.go                   [KEPT]    — Vercel API client
│   └── scanner/
│       └── scanner.go                   [KEPT]    — project scanner + cache
└── frontend/src/
    ├── App.tsx                           [REWRITTEN] — dashboard-first + Sidebar + modals
    ├── types.ts                          [NEW]     — shared TypeScript types
    ├── screens/
    │   ├── Dashboard.tsx                 [REWRITTEN] — multi-project grid + landing
    │   ├── DropZone.tsx                  [KEPT]    — drag-drop (used in AddProjectModal)
    │   ├── ControlPanel.tsx              [KEPT]    — config sliders (used in AddProjectModal)
    │   └── Launching.tsx                 [KEPT]    — progress stepper (used in AddProjectModal)
    ├── components/
    │   ├── Sidebar.tsx                   [NEW]     — left navigation + project list
    │   ├── SettingsPanel.tsx             [NEW]     — right slide-out settings
    │   ├── ProjectCard.tsx               [NEW]     — project card with sparklines + health badges
    │   ├── AddProjectModal.tsx           [NEW]     — modal embedding DropZone→ControlPanel→Launching
    │   ├── LogTerminal.tsx               [MODIFIED] — projectID filtering
    │   ├── ResourceChart.tsx             [MODIFIED] — projectID filtering
    │   ├── OOMModal.tsx                  [KEPT]    — OOM warning dialog
    │   └── StatusDot.tsx                 [KEPT]    — connection status indicator
    └── index.css                         [KEPT]
```
