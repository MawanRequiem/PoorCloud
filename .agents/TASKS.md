# LocalCloud Implementation Task List (Backend vs Frontend)

This document splits the tasks strictly between the Backend Go Engine developer (Agent 1) and the Frontend React UI developer (Agent 2). Refer to [.agents/HANDOVER.md](file:///e:/PoorCloud/.agents/HANDOVER.md) for full context and specifications.

---

## ⚡ TRACK A: Backend Go Engine (Agent 1)
*Focuses on engine packages, low-level OS APIs, processes, keyrings, network protocols, and config files.*

- [ ] **Phase A1: Scanning & Validation**
  - [ ] **T1:** Create `engine/scanner.go` (extract scripts, framework, port & memory cache)
  - [ ] **T2:** Create `engine/validate.go` (validate port bounds, clean path traversals, whitelist script keys)
  - [ ] **T3:** Create `engine/sysinfo.go` (read system cores and physical memory)
- [ ] **Phase A2: Execution & Resource Control**
  - [ ] **T4:** Create `engine/runner.go` (spawn subprocess with multi-pipe logging, OOM tracking)
  - [ ] **T5:** Create `engine/os_limiter_windows.go` (Windows Job Objects memory & CPU limits)
  - [ ] **T6:** Create `engine/os_limiter_linux.go` (systemd scope v2, cgroups v1, prlimit/taskset fallbacks)
  - [ ] **T7:** Implement OOM detection exit codes and trigger UI events
  - [ ] **T8:** Create `engine/processguard.go` (thread-safe map, clean up all process groups on Wails shutdown)
- [ ] **Phase A3: Networking & Storage**
  - [ ] **T11:** Implement PATH & appData check for cloudflared location Sniffer
  - [ ] **T12:** Implement Ephemeral Tunnel runner (stdout/stderr regex parsing for URL)
  - [ ] **T13:** Implement Auto-Reconnect loop (5 attempts with exponential backoff)
  - [ ] **T14:** Create `engine/keyring.go` (Windows DPAPI, Linux D-Bus Secret Service, local AES fallback)
  - [ ] **T15:** Implement Vercel Sync client (patch environment variables, trigger rebuilds, error mapping)
  - [ ] **T16:** Implement Permanent Tunnel creation (Cloudflare API v4 DNS CNAME configuration)
  - [ ] **T17:** Create `engine/config.go` (JSON storage for UI size, last project path, settings)
  - [ ] **T18:** Create `engine/bundler.go` (Download Bun portable ZIP, unpack via stdlib, chmod)

---

## ⚡ TRACK B: Frontend React UI (Agent 2)
*Focuses on user screens, visual animations, log ring buffers, charts, modal boxes, and state management.*

- [ ] **Phase B1: Drop-Zone & Setup Flow**
  - [ ] **T19:** Create `DropZone.tsx` screen (drag-drop overlay, folder picker, error shake animation, install Bun banner)
  - [ ] **T20:** Create `ControlPanel.tsx` screen (dynamic sliders, script selector, Vercel/Cloudflare custom inputs)
- [ ] **Phase B2: Launching & Telemetry Charts**
  - [ ] **T21:** Create `Launching.tsx` screen (stepper indicator waiting on backend confirmation events)
  - [ ] **T22:** Create `LogTerminal.tsx` component (1000-line ring buffer, react-window virtualizer, keyword colors)
  - [ ] **T23:** Create `ResourceChart.tsx` component (Recharts Area charts, 60-point circular window)
  - [ ] **T24:** Create `OOMModal.tsx` component (Indonesian error modal blocking dashboard interaction)
- [ ] **Phase B3: Monitoring & Routing**
  - [ ] **T25:** Create `Dashboard.tsx` screen (glass-morphism URL card, charts/terminal panel, stop button)
  - [ ] **T26:** Rewrite `App.tsx` state machine router with Framer Motion transitions

---

## 🔗 TRACK C: Integration & Hardening (Coordinated)
*To be completed after Track A & B are fully green.*

- [ ] **T27:** Implement IPC WebView2 hardening options in Wails initialization (`main.go`)
- [ ] **T28:** Connect final bindings in `app.go` and verify full system build (`wails build`)
