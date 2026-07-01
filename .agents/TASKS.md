# LocalCloud Implementation Task List (Feature-Vertical Tracks)

This document groups tasks by independent, end-to-end features so that two AI agents can work concurrently on both Go backend and React frontend parts of their respective features. Refer to [.agents/HANDOVER.md](file:///e:/PoorCloud/.agents/HANDOVER.md) for specs and APIs.

---

## 🟩 Phase 1-4: Scaffold & Preparation (Completed)
- [x] Setup universal AI rules (.agents/AGENTS.md, .cursorrules, .claudeprompt)
- [x] Initialized Wails scaffolding and git repository
- [x] Setup simplified engine stubs and Go bindings
- [x] Configured TailwindCSS v4 inside React frontend

---

## ⚡ FEATURE TRACK A: Core Engine & Project Launcher (Agent 1)
*Focuses on directories scan, runtimes installer, sliders inputs, process running, resource limiters, and setup screens.*

- [x] **Phase A1: Scanning & Validation**
  - [x] **T1:** Create `engine/scanner/scanner.go` (extract scripts, framework, port & memory cache)
  - [x] **T2:** Create `engine/core/sysinfo.go` (read system CPU cores and physical memory)
  - [x] **T3:** Create `engine/core/validate.go` (validate port bounds, clean path traversals, whitelist script keys)
- [x] **Phase A2: Local Process Controller & Limits**
  - [x] **T4:** Create `engine/process/runner.go` (spawn subprocess with multi-pipe logging, OOM tracking)
  - [x] **T5:** Create `engine/process/os_limiter_windows.go` (Windows Job Objects memory & CPU limits)
  - [x] **T6:** Create `engine/process/os_limiter_linux.go` (systemd scope v2, cgroups v1, prlimit/taskset fallbacks)
  - [x] **T7:** Create `engine/process/processguard.go` (anti-zombie clean exit codes, process group cleanup)
  - [x] **T8:** Create `engine/process/bundler.go` (Download Bun portable ZIP, unpack via stdlib, chmod)
- [x] **Phase A3: Core UI Screens & Routing**
  - [x] **T9:** Create Wails Engine Bindings `app_engine.go` (exposes scan/run methods)
  - [x] **T10:** Create `DropZone.tsx` screen (drag-drop overlay, folder picker, error shake animation, install Bun banner)
  - [x] **T11:** Create `ControlPanel.tsx` screen (dynamic sliders, script selector, Vercel/Cloudflare custom inputs)
  - [x] **T12:** Create `OOMModal.tsx` component (Indonesian error modal blocking dashboard interaction)
  - [x] **T13:** Rewrite `App.tsx` state machine router with Framer Motion transitions
- [ ] **Phase A4: Multi-Project Hub & Dashboard-First Flow**
  - [ ] **T29:** Create `engine/projects/project.go` (Project struct, registry singleton, lifecycle functions)
  - [ ] **T30:** Rewrite `Dashboard.tsx` as landing screen (project grid, status cards, per-project mini-charts)
  - [ ] **T31:** Create `ProjectCard.tsx` component (project status, port, URL, mini status dot, stop/start controls)
  - [ ] **T32:** Create `AddProjectModal.tsx` (embeds DropZone → ControlPanel → Launching as a modal flow)
  - [ ] **T33:** Rewrite `App.tsx` as dashboard-first state machine (landing = dashboard, add-project as modal)
  - [ ] **T34:** Create `app_projects.go` (Wails bindings for project registry: ListProjects, StartProject, StopProject, RemoveProject)

---

## ⚡ FEATURE TRACK B: Tunnels, Sync & Telemetry Dashboard (Agent 2)
*Focuses on secure keyring storage, Cloudflare reverse tunnels, Vercel REST integrations, log batching pipelines, telemetry monitors, and live dashboards.*

- [x] **Phase B1: Secure Storage & REST Syncer**
  - [x] **T14:** Create `engine/keyring/keyring.go` & `keyring_*.go` (Windows DPAPI, Linux D-Bus Secret Service, local AES fallback)
  - [x] **T15:** Create `engine/vercel/vercel.go` (patch environment variables, trigger rebuilds, error mapping)
  - [x] **T16:** Create `engine/core/config.go` (JSON storage for UI size, last project path, settings)
- [x] **Phase B2: Reverse Tunnel Managers**
  - [x] **T17:** Create `engine/tunnel/tunnel.go` (cloudflared sniffer, Ephemeral Tunnel stdout/stderr URL regex parsing)
  - [x] **T18:** Implement Auto-Reconnect loop (5 attempts with exponential backoff)
  - [x] **T19:** Create `engine/tunnel/tunnel_api.go` (Cloudflare API v4 DNS CNAME configuration)
- [x] **Phase B3: Log Pipes & Real-time Graphs**
  - [x] **T20:** Create `engine/process/logpipe.go` (Log Batcher using 100ms ticks, slice memory reuse)
  - [x] **T21:** Create `engine/process/monitor.go` (direct /proc parsing and WinAPI memory checks every 1s)
  - [x] **T22:** Create Wails Telemetry Bindings `app_telemetry.go` (exposes tunnel/vercel/keyring/config methods)
  - [x] **T23:** Create `LogTerminal.tsx` component (1000-line ring buffer, react-window virtualizer, keyword colors)
  - [x] **T24:** Create `ResourceChart.tsx` component (Recharts Area charts, 60-point circular window)
  - [x] **T25:** Create `Dashboard.tsx` screen (glass-morphism URL card, charts/terminal panel, stop button)
- [ ] **Phase B4: Per-Project Resource Isolation**
  - [ ] **T35:** Refactor `engine/tunnel/tunnel.go` for per-project tunnel instances (remove global singleton state)
  - [ ] **T36:** Refactor `engine/process/monitor.go` for per-project resource polling (key monitors by projectID)
  - [ ] **T37:** Refactor `engine/process/logpipe.go` for per-project log streams (key log channels by projectID)
  - [ ] **T38:** Update `app_telemetry.go` for project-aware tunnel bindings (pass projectID through all calls)

---

## 🔗 TRACK C: Hardening & Final QA (Coordinated)
*To be completed after Track A & B are fully green.*

- [x] **T26:** Create `Launching.tsx` screen (stepper indicator waiting on backend confirmation events)
- [x] **T27:** Implement IPC WebView2 hardening options in Wails initialization (`main.go`)
- [x] **T28:** Connect final bindings in `main.go` and verify full system build (`wails build`)
