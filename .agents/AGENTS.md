# LocalCloud System Concepts & Architecture Design (SCAD) & AI Coding Rules

This repository contains **LocalCloud**, a minimalist self-hosting desktop engine designed to orchestrate reverse tunnels and control local OS resources. All AI coding assistants (including Antigravity, Claude Code, Cursor, Kimchi, OpenCode, and others) MUST adhere strictly to the rules and architecture outlined in this document.

> **📋 Implementation Plan:** Before writing any feature code, read [IMPLEMENTATION_PLAN.md](file:///.agents/IMPLEMENTATION_PLAN.md) for the phased build order, file map, and ponytail rules.

---

## 🚀 1. SYSTEM OVERVIEW & STACK

* **Target Platforms:** Windows 10/11 & Linux (Multi-Distribution Agnostic)
* **Architecture:** Wails Single-Binary (Go 1.22+ Core & React 19 + TypeScript)
* **Communication:** Internal bindings based on Wails CGO / memory mapping (No loopback HTTP REST or WebSockets).
  * **Go to UI:** `wails.EventsEmit(ctx, eventName, data)`
  * **UI to Go:** Registered struct functions returned as JS async Promises.

---

## 🎨 2. DESIGN PHILOSOPHY & UX JOURNEY

* **Philosophy:** "Heavy Control Backend, High-End Visual Frontend, Frictionless UX (Zero Terminal Mindset)"
* **User Flow:**
  1. **Dashboard (Landing):** Multi-project management hub. Shows all managed projects in a card grid with status (running/stopped/error), port, tunnel URL, and live resource mini-charts. "Add New Project" button to onboard a new project. Click on a running project to expand its full detail panel.
  2. **Add Project (Modal/Page):** Select project folder via drag-and-drop or browse. Validate `package.json`. If invalid, trigger a visual shake animation and show error: *"Berkas package.json tidak ditemukan..."*.
  3. **Control Panel (Modal/Page):** Auto-config port and dev script. GUI controls (sliders, selectors) for RAM/CPU cores limit allocation. Vercel sync and Cloudflare tunnel configuration.
  4. **GO LIVE:** Simple, prominent activation button that transitions into a launching progress stepper.
  5. **Back to Dashboard:** After successful launch, the new project appears in the dashboard grid with its live tunnel URL, resource charts, and log terminal. User can launch more projects, stop individual ones, or remove them.

---

## ⚙️ 3. CORE TECHNICAL SPECIFICATIONS & IMPLEMENTATION RULES

### 3.1 Project Scanner & Environment Sniffer (Go Engine)
- Check `package.json` in selected folder using native Go `os.ReadFile` and `encoding/json`.
- Detect runtime availability using `exec.Command("node", "-v")` and `exec.Command("bun", "-v")`.
- If no node/bun runtime is detected, show a warning banner to download bun portable.

### 3.2 Linux/Windows Kernel Resource Limiter (VPS Emulator)
- **Windows:** Use Job Objects via `kernel32.dll` to restrict processes CPU and Memory.
- **Linux Fallback Strategy:**
  - *Systemd (cgroups v2):* Use `--scope` under user session: `systemd-run --user --scope -p MemoryMax=[X]M -p CPUQuota=[Y]% bun run dev` (No sudo required).
  - *Old Systemd (cgroups v1):* Fallback to `/sys/fs/cgroup/memory/user/` paths.
  - *Non-Systemd (Alpine/Artix/Void):* Use `taskset -c [core_range]` for CPU and `prlimit --pid=[PID] --as=[Bytes]` for Memory limits.
- **Out of Memory (OOM) Handling:** Go must capture sub-process exit codes. If killed due to OOM, emit alert to UI to show warning modal: *"Server Lokal Terhenti: Penggunaan memori melewati batas..."*.

### 3.3 Cloudflare Tunnel Manager
- Run native `cloudflared` executable via `os/exec.Command`.
- Stream `stdout` live using `bufio.NewScanner`. Parse public tunnel URL (`https://*.trycloudflare.com`) via Regex.
- Support API v4 authentication for custom DNS CNAME registration.
- Detect connection drops. On drop, immediately update status in UI to grey out and show reconnecting state. Max 5 auto-reconnect attempts.

### 3.4 Vercel Environment Synchronization
- Use Go standard library `net/http` to send `PATCH` requests to Vercel Environment Variables API and `POST` requests to Deployments API to trigger frontend rebuilds.

### 3.5 Logging & Performance Dashboard
- **Backend:** Throttling & Backpressure. Batch logs into a Go-channel buffer and dispatch to UI every 100ms in chunks.
- **Frontend:** Maintain max 1000 logs in state using a ring-buffer (`logs.slice(-1000)`). Use virtualized lists (`react-window`) to only render visible lines and protect CPU/RAM.

### 3.6 Multi-Project Manager (Go Engine)
- **Project Registry:** In-memory map of managed projects keyed by `projectID` (UUID generated at scan time). Each entry stores `ScanResult`, `RunConfig`, `RunningProcess`, tunnel state, and resource monitor reference.
- **Lifecycle Functions:**
  - `RegisterProject(scan *ScanResult, cfg RunConfig) string` — generates projectID, stores in registry
  - `StartProject(projectID string) error` — calls RunDevServer, starts tunnel, starts monitor
  - `StopProject(projectID string) error` — kills process, stops tunnel, stops monitor
  - `RemoveProject(projectID string)` — full cleanup and removal from registry
  - `ListProjects() []ProjectState` — returns snapshot of all projects for dashboard
  - `GetProject(projectID string) *ProjectState` — returns single project detail
- **Thread Safety:** All registry operations protected by `sync.RWMutex`.

---

## 🔒 4. SECURITY & ROBUSTNESS CONSTRAINTS

- **Secure Storage:** Store Vercel and Cloudflare API tokens using OS Keyring via CGO: DPAPI on Windows (`CryptProtectData`) and Freedesktop Secret Service API via D-Bus on Linux. No plain-text secret storage.
- **Command Injection Guard:** NEVER execute shell commands through shell interpreters (`sh -c` or `cmd.exe /c`). Validate ports strictly as integers ($> 1024$ and $\le 65535$). Pass execution binaries and parameters as raw arguments array in `exec.Command(cmd, args...)`.
- **Anti-Zombie Process Guard:**
  - *Linux:* Set `Setpgid: true` on `SysProcAttr`. On Wails shutdown (`OnShutdown`), kill the entire group: `syscall.Kill(-PGID, syscall.SIGKILL)`.
  - *Windows:* Processes assigned to the Job Object are automatically terminated when the parent process exits.
- **Go-Routine Lifecycles:** Bind all routines to `context.WithCancel`. Call `cancel()` on stop to instantly release all resources.
- **Project Isolation:** Each project's processes, tunnels, and monitors operate independently. Stopping one project must not affect others.

---

## 💡 5. CODING GUIDELINES & AI ASSISTANCE RULES

- **Code Quality:** Prioritize Go standard library over external dependencies. Use React functional components, hooks, TailwindCSS v4, TypeScript.
- **TailwindCSS v4 styling:** No `tailwind.config.js`. Use CSS-first config using `@import "tailwindcss";` in `src/index.css`.
- **Git Commits:** Ensure commits are clean and authored directly by the user. Do NOT add `Co-authored-by` metadata headers to commits.
- **Placeholders:** Avoid using placeholders in code. All stubs must have functional mock logic or type-safe defaults.
