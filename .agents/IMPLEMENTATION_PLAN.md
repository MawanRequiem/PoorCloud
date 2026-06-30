# LocalCloud Grand Implementation Plan

> **ponytail: full** — Every task below passes the YAGNI ladder before it earns a line of code.
> YAGNI → stdlib → native platform → one line → minimum that works.

**All AI coding assistants** (Antigravity, Claude Code, Cursor, Kimchi, OpenCode) MUST read this plan before implementing any feature. Cross-reference with [AGENTS.md](file:///.agents/AGENTS.md) for architecture rules.

---

## Current State (What Already Exists)

| Layer | File | Status |
|---|---|---|
| Go entry | `localcloud/main.go` | Wails bootstrap, embeds frontend, binds `App` struct |
| Go bridge | `localcloud/app.go` | Exposes `ScanProject`, `LimitResources`, `StartTunnel`, `StopTunnel`, `SyncVercel` |
| Engine: Limiter | `localcloud/engine/os_limiter.go` | **Stub** — prints to console, no real kernel calls |
| Engine: Tunnel | `localcloud/engine/tunnel.go` | **Stub** — simulates cloudflared with sleep + mock URL |
| Engine: Vercel | `localcloud/engine/vercel.go` | **Stub** — builds HTTP requests but discards them (`_ = req`) |
| React UI | `localcloud/frontend/src/App.tsx` | Test dashboard with scan input + tunnel status card |
| Styling | `localcloud/frontend/src/index.css` | Tailwind v4 CSS-first import + Nunito font |
| Config | `localcloud/wails.json` | Author: MawanRequiem, npm install/build wired |

**What is NOT done yet:** Everything below.

---

## Phase 1: Core Engine — Make Stubs Real

> Priority: Without real engine logic, the app is a shell. Ship this first.

### 1.1 Real Project Scanner

**File:** `localcloud/engine/scanner.go` [NEW]

Move scan logic out of `app.go` into engine. The scanner must:
- Accept a folder path, read `package.json` via `os.ReadFile` + `encoding/json`
- Extract `name`, `scripts`, `dependencies` (detect framework: next, vite, remix, etc.)
- Auto-detect the best dev script and default port by inspecting script values
- Sniff runtimes: `exec.Command("node", "-v")`, `exec.Command("bun", "-v")`
- Return a typed `ScanResult` struct (not `map[string]interface{}`)

**ponytail: one function, one struct, zero external deps.**

### 1.2 Real OS Resource Limiter — Windows

**File:** `localcloud/engine/os_limiter_windows.go` [NEW, build-tagged]

- Use `golang.org/x/sys/windows` (stdlib-adjacent, maintained by Go team) to call `CreateJobObjectW`, `AssignProcessToJobObject`, `SetInformationJobObject`
- Set `JOBOBJECT_EXTENDED_LIMIT_INFORMATION` for memory limit
- Set `JOBOBJECT_CPU_RATE_CONTROL_INFORMATION` for CPU cap
- Single function: `applyWindowsLimits(pid int, memMB int64, cpuPercent int) error`

### 1.3 Real OS Resource Limiter — Linux

**File:** `localcloud/engine/os_limiter_linux.go` [NEW, build-tagged]

Three-tier fallback detection (run once at startup, cache result):
1. Check `systemctl --user --version` → cgroups v2 path via `systemd-run --user --scope`
2. Check `/sys/fs/cgroup/memory/user.slice` exists → cgroups v1 path
3. Fallback → `taskset -c` + `prlimit --pid --as`

Single function: `applyLinuxLimits(pid int, memMB int64, cpuCores float64) error`

**ponytail: Keep `os_limiter.go` as the dispatcher. Platform files only contain platform code.**

### 1.4 Real Cloudflare Tunnel

**File:** `localcloud/engine/tunnel.go` [MODIFY]

Replace mock simulation with:
- Locate `cloudflared` binary: check PATH, then check bundled location
- `exec.CommandContext(ctx, "cloudflared", "tunnel", "--url", fmt.Sprintf("http://localhost:%d", port))`
- Set `SysProcAttr.Setpgid = true` on Linux for anti-zombie
- Pipe `cmd.StderrPipe()` (cloudflared writes URL to stderr) through `bufio.NewScanner`
- Parse URL with `regexp.MustCompile("https://[a-zA-Z0-9-]+\\.trycloudflare\\.com")`
- On scanner EOF or error → set status RECONNECTING, retry up to 5×
- On context cancel → `syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)` on Linux

### 1.5 Real Vercel Sync

**File:** `localcloud/engine/vercel.go` [MODIFY]

Remove `_ = req` stubs, actually execute:
- `resp, err := client.Do(req)` + check `resp.StatusCode`
- Return typed errors: `ErrVercelAuth`, `ErrVercelRateLimit`, `ErrVercelDeploy`
- **ponytail: no retry logic yet — YAGNI until users report flaky deploys.**

### 1.6 Process Runner (Dev Server Launcher)

**File:** `localcloud/engine/runner.go` [NEW]

This is the missing piece — the thing that actually runs `bun run dev` or `npm run dev`:
- Accept: project path, script name, runtime ("node"/"bun"), resource limits
- Create the subprocess with `exec.CommandContext`
- On Windows: assign to Job Object before starting
- On Linux: wrap with `systemd-run` or apply `prlimit`/`taskset` after start
- Pipe stdout/stderr into a Go channel for log streaming
- Detect OOM exit codes (137 on Linux, specific Job Object signals on Windows)
- Emit structured events: `process-log`, `process-exit`, `process-oom`

**ponytail: This is the central nervous system. One file, one `RunDevServer` function.**

---

## Phase 2: Secure Storage

> Tokens must never touch disk as plaintext. No config files with secrets.

### 2.1 OS Keyring Abstraction

**File:** `localcloud/engine/keyring.go` [NEW]

- **Windows:** Use `golang.org/x/sys/windows` to call `CryptProtectData` / `CryptUnprotectData` (DPAPI)
- **Linux:** Use `github.com/godbus/dbus/v5` (already in go.mod as indirect dep of Wails) to talk to `org.freedesktop.secrets` via D-Bus Secret Service API
- Two functions: `StoreSecret(service, key, value string) error` and `GetSecret(service, key string) (string, error)`
- Service name: `"localcloud"`

**ponytail: godbus is already in go.mod. Zero new deps.**

---

## Phase 3: Log Pipeline & Dashboard

> The SCAD demands 100ms batched log dispatch and a 1000-line ring buffer in the UI.

### 3.1 Log Batcher (Go)

**File:** `localcloud/engine/logpipe.go` [NEW]

- Accept a `<-chan string` from the process runner
- Buffer into a `[]string` slice
- Every 100ms (via `time.NewTicker`), flush the batch to Wails via `EventsEmit(ctx, "process-log", batch)`
- If batch is empty, skip the emit
- Bound to `context.WithCancel` for lifecycle management

**ponytail: one goroutine, one ticker, one channel. No ring buffer on the Go side — UI handles that.**

### 3.2 Log Terminal (React)

**File:** `localcloud/frontend/src/components/LogTerminal.tsx` [NEW]

- Subscribe to `process-log` events via `EventsOn`
- Maintain state with ring buffer: `setLogs(prev => [...prev, ...newLogs].slice(-1000))`
- Render with `react-window` `FixedSizeList` for virtualization
- Color-code by content: green for 2xx, red for 4xx/5xx, gray for info
- Auto-scroll to bottom unless user scrolls up

### 3.3 Resource Charts (React)

**File:** `localcloud/frontend/src/components/ResourceChart.tsx` [NEW]

- Subscribe to `resource-usage` events (emitted by Go every 1s)
- Use Recharts `AreaChart` with gradient fill
- Show RAM usage line + red threshold line at the user-set limit
- Show CPU percentage area
- Keep last 60 data points (1 minute window)

**ponytail: Recharts and react-window are already in package.json.**

---

## Phase 4: UI Screens (The Real UX Journey)

> The SCAD defines 4 screens. Build them as route-less state transitions with Framer Motion.

### 4.1 App State Machine

**File:** `localcloud/frontend/src/App.tsx` [REWRITE]

Replace the test dashboard with a state machine:
```
type AppScreen = "dropzone" | "control" | "launching" | "dashboard"
```
Use `useState<AppScreen>("dropzone")` and render the matching component. Wrap transitions in `<AnimatePresence>` from Framer Motion.

### 4.2 Screen 1: Drop-Zone

**File:** `localcloud/frontend/src/screens/DropZone.tsx` [NEW]

- Full-screen centered drop area with dashed border
- Use `OnFileDrop` from Wails runtime for native drag-and-drop
- Also show a "Browse" button using Wails `OpenDirectoryDialog`
- On drop/select → call `ScanProject(path)`
- If valid → transition to "control" screen with scan result
- If invalid → shake animation + red error text (Framer Motion `animate={{ x: [0,-10,10,-10,0] }}`)

### 4.3 Screen 2: Control Panel

**File:** `localcloud/frontend/src/screens/ControlPanel.tsx` [NEW]

- Display project name, detected runtime, available scripts
- RAM slider: min 128 MB, max = system RAM (get from Go), step 128 MB
- CPU cores selector: 1 to N (get available cores from Go)
- Port input: pre-filled from scan, validated 1025–65535
- Script dropdown: populated from `package.json` scripts
- Vercel sync toggle + token/project input (optional)
- **"GO LIVE"** button at bottom

### 4.4 Screen 3: Launching

**File:** `localcloud/frontend/src/screens/Launching.tsx` [NEW]

- Shows a vertical progress stepper with animated checkmarks:
  1. "Memulai server lokal..." → fires `RunDevServer`
  2. "Menerapkan batasan resource..." → fires `LimitResources`
  3. "Membuka terowongan aman..." → fires `StartTunnel`
  4. "Menyelaraskan Vercel..." → fires `SyncVercel` (if enabled)
- Each step subscribes to events and marks complete when the backend confirms
- On all complete → transition to "dashboard"

### 4.5 Screen 4: Live Dashboard

**File:** `localcloud/frontend/src/screens/Dashboard.tsx` [NEW]

- Top: URL card with copy button (use `ClipboardSetText` from Wails runtime)
- Middle: `ResourceChart` (RAM + CPU) side by side
- Bottom: `LogTerminal` full-width
- Floating "STOP" button (red, fixed bottom-right)
- Status indicator dot in top-right (green = live, amber = reconnecting, gray = dead)

---

## Phase 5: System Hardening

> These are non-negotiable constraints from the SCAD. Not optional.

### 5.1 Anti-Zombie Process Guard

**File:** `localcloud/main.go` [MODIFY]

- Add `OnShutdown` handler to Wails options
- In `OnShutdown`: call `engine.KillAllProcesses()` which:
  - Linux: `syscall.Kill(-pgid, syscall.SIGKILL)` for every tracked process group
  - Windows: Job Object auto-terminates (already handled)
- Also call `StopTunnel()` and cancel all contexts

### 5.2 Port Validation

**File:** `localcloud/engine/validate.go` [NEW]

- `ValidatePort(port int) error` — must be > 1024 and ≤ 65535
- Called in `app.go` before any tunnel or server start
- **ponytail: one function, 4 lines.**

### 5.3 IPC Hardening

**File:** `localcloud/main.go` [MODIFY]

- Set `options.App.Windows.WebviewDisableRendererCodeIntegrity` and other WebView2 security options as available in Wails v2
- Disable external navigation in the WebView

---

## Phase 6: System Info Bindings

> The UI needs to know system RAM and CPU count for the sliders.

### 6.1 System Info

**File:** `localcloud/engine/sysinfo.go` [NEW]

- `GetSystemInfo() (totalRAM int64, cpuCount int)`
- Use `runtime.NumCPU()` for cores (stdlib, zero deps)
- For total RAM: read `/proc/meminfo` on Linux, `GlobalMemoryStatusEx` on Windows via `golang.org/x/sys/windows`
- **ponytail: avoids importing gopsutil for just two numbers.**

---

## File Map Summary

```
localcloud/
├── main.go                      [MODIFY] — add OnShutdown, IPC hardening
├── app.go                       [MODIFY] — add new bindings, typed returns
├── engine/
│   ├── scanner.go               [NEW]    — project scanner
│   ├── runner.go                [NEW]    — dev server process launcher
│   ├── os_limiter.go            [KEEP]   — dispatcher (switch runtime.GOOS)
│   ├── os_limiter_windows.go    [NEW]    — Job Objects via x/sys/windows
│   ├── os_limiter_linux.go      [NEW]    — cgroups / taskset / prlimit
│   ├── tunnel.go                [MODIFY] — real cloudflared exec
│   ├── vercel.go                [MODIFY] — real HTTP calls
│   ├── keyring.go               [NEW]    — DPAPI + D-Bus secret storage
│   ├── logpipe.go               [NEW]    — 100ms batched log emitter
│   ├── sysinfo.go               [NEW]    — RAM + CPU count
│   └── validate.go              [NEW]    — port validation
├── frontend/src/
│   ├── App.tsx                  [REWRITE] — state machine router
│   ├── screens/
│   │   ├── DropZone.tsx         [NEW]
│   │   ├── ControlPanel.tsx     [NEW]
│   │   ├── Launching.tsx        [NEW]
│   │   └── Dashboard.tsx        [NEW]
│   ├── components/
│   │   ├── LogTerminal.tsx      [NEW]
│   │   └── ResourceChart.tsx    [NEW]
│   └── index.css                [KEEP]
```

---

## Implementation Order

> Ship in this order. Each phase produces a working `wails build`.

| Order | Phase | Depends On | Deliverable |
|---|---|---|---|
| 1 | 1.1 Scanner | — | Typed scan results |
| 2 | 1.6 Runner | 1.1 | Local dev server starts |
| 3 | 1.2 + 1.3 Limiter | 1.6 | Process runs under resource caps |
| 4 | 1.4 Tunnel | 1.6 | Real public URL appears |
| 5 | 3.1 + 3.2 Log Pipeline | 1.6 | Logs stream to UI |
| 6 | 4.1–4.5 UI Screens | 1–5 | Full UX journey |
| 7 | 2.1 Keyring | — | Secrets stored securely |
| 8 | 1.5 Vercel | 1.4, 2.1 | Env sync works |
| 9 | 3.3 Resource Charts | 1.6, 6.1 | Live RAM/CPU graphs |
| 10 | 5.1–5.3 Hardening | All | Anti-zombie, validation, IPC |
| 11 | 6.1 System Info | — | Sliders know system limits |

---

## Rules for All AI Assistants Implementing This Plan

1. **ponytail: full** is active. Question every abstraction. If stdlib does it, use stdlib.
2. **No `Co-authored-by`** in git commits.
3. **No shell interpreters.** All `exec.Command` must use raw argument arrays.
4. **No placeholders.** Every stub must have functional fallback logic.
5. **Build-tag platform code.** `//go:build windows` / `//go:build linux`.
6. **Test with `wails build`** after every phase to catch compile errors early.
7. **`context.WithCancel`** on every goroutine. No fire-and-forget.
8. **Ring buffer** in frontend log state: `logs.slice(-1000)`.
9. **Batch logs** from Go every 100ms, not per-line.
10. **Validate ports** before use: `> 1024 && <= 65535`.
