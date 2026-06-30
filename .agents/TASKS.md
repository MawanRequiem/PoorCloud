# LocalCloud Implementation Task List (Parallel Tracks)

This document tracks the tasks being implemented by the concurrent AI agents. Refer to [.agents/HANDOVER.md](file:///e:/PoorCloud/.agents/HANDOVER.md) for full context.

## 🟩 Phase 1-4: Scaffold & Preparation (Completed)
- [x] Setup universal AI rules (.agents/AGENTS.md, .cursorrules, .claudeprompt)
- [x] Initialized Wails scaffolding and git repository
- [x] Setup simplified engine stubs and Go bindings
- [x] Configured TailwindCSS v4 inside React frontend

---

## ⚡ TRACK A: Local Engine & Inputs (Agent 1)
*Focuses on scanner, process execution, OS limiters, local runtimes, and local settings inputs.*

- [ ] **T1:** Create `scanner.go` (extract scripts, framework, port & memory cache)
- [ ] **T2:** Create `validate.go` (validate port bounds, clean path traversals, whitelist script keys)
- [ ] **T3:** Create `sysinfo.go` (read system cores and physical memory)
- [ ] **T4:** Create `runner.go` (spawn subprocess with multi-pipe logging, OOM tracking)
- [ ] **T5:** Create `os_limiter_windows.go` (Windows Job Objects memory & CPU limits)
- [ ] **T6:** Create `os_limiter_linux.go` (systemd scope v2, cgroups v1, prlimit/taskset fallbacks)
- [ ] **T7:** Implement OOM detection and trigger UI event
- [ ] **T8:** Create `processguard.go` (thread-safe map, clean up all process groups on Wails shutdown)
- [ ] **T18:** Create `bundler.go` (Download Bun portable ZIP, unpack via stdlib, chmod)
- [ ] **T19:** Create `DropZone.tsx` screen (drag-drop overlay, folder picker, error shake animation, install Bun banner)
- [ ] **T20:** Create `ControlPanel.tsx` screen (dynamic sliders, script selector, Vercel/Cloudflare custom inputs)
- [ ] **T26:** Rewrite `App.tsx` state machine router with Framer Motion transitions

---

## ⚡ TRACK B: Cloud Services & Telemetry (Agent 2)
*Focuses on secure storage, Cloudflare tunnels, Vercel REST APIs, logging pipelines, and telemetry UI.*

- [ ] **T14:** Create `keyring.go` (Windows DPAPI, Linux D-Bus Secret Service, local AES fallback)
- [ ] **T11:** Implement PATH & appData check for cloudflared location Sniffer
- [ ] **T12:** Implement Ephemeral Tunnel runner (stdout/stderr regex parsing for URL)
- [ ] **T13:** Implement Auto-Reconnect loop (5 attempts with exponential backoff)
- [ ] **T15:** Implement Vercel Sync client (patch environment variables, trigger rebuilds, error mapping)
- [ ] **T16:** Implement Permanent Tunnel creation (Cloudflare API v4 DNS CNAME configuration)
- [ ] **T9:** Implement Log Batcher (100ms ticks, slice memory reuse)
- [ ] **T10:** Implement Resource Usage Monitor (direct /proc parsing and WinAPI memory checks)
- [ ] **T17:** Create `config.go` (JSON storage for UI size, last project path, settings)
- [ ] **T22:** Create `LogTerminal.tsx` component (1000-line ring buffer, react-window virtualizer, keyword colors)
- [ ] **T23:** Create `ResourceChart.tsx` component (Recharts Area charts, 60-point circular window)
- [ ] **T24:** Create `OOMModal.tsx` component (Indonesian error modal blocking dashboard interaction)
- [ ] **T25:** Create `Dashboard.tsx` screen (glass-morphism URL card, charts/terminal panel, stop button)

---

## 🔗 TRACK C: Integration & Finalization (Coordinated)
*To be completed after Track A & B are fully green.*

- [ ] **T27:** Implement IPC WebView2 hardening options in Wails initialization (`main.go`)
- [ ] **T28:** Connect final bindings in `app.go` and verify full system build (`wails build`)
