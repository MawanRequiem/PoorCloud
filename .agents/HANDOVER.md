# LocalCloud Parallel Handover & Context Chaining Protocol

> **ponytail: full** — Keep it simple, focused, and standard-library first.
> This document governs the parallel execution of the build phases by splitting development into two independent tracks: **Track A (Local Engine & Inputs)** and **Track B (Cloud Services & Telemetry)**.

---

## 🗺️ Parallel Execution Architecture

To allow two AI agents to work concurrently without merge conflicts, tasks are separated into distinct domain files.

```
                  [ T1: Scanner & Env Sniffer ] (Dependency for both)
                               |
            +------------------+------------------+
            |                                     |
    [ TRACK A: Local Engine ]             [ TRACK B: Cloud & Telemetry ]
            |                                     |
    T2: Validate Port/Path                T14: Keyring (DPAPI/D-Bus)
    T3: SysInfo (RAM/CPU cores)           T11: cloudflared Sniffer
    T4: Runner (Process execution)        T12: Ephemeral Tunnel
    T5: Windows Job Objects               T13: Tunnel Reconnect
    T6: Linux cgroups v2/v1/prlimit       T15: Vercel Sync REST API
    T7: OOM Monitor                       T16: Permanent Tunnel (CF API)
    T8: Process Guard (Anti-Zombie)       T9:  Log Batcher (100ms ticks)
    T18: Bun Installer (Auto-download)    T10: Resource Monitor (/proc)
            |                                     |
      [ Frontend ]                          [ Frontend ]
    T19: DropZone UI (Drag-Drop)          T22: LogTerminal UI (Virtualized)
    T20: ControlPanel UI (Sliders)        T23: ResourceChart UI (Recharts)
    T26: App Router (Framer Motion)       T24: OOMModal UI
                                          T25: Dashboard UI
            |                                     |
            +------------------+------------------+
                               |
                  [ T28: Final Bindings & Build ]
```

---

## Track A: Local Engine & Inputs (Agent 1)

This track focuses on scanner sniffer, OS limits, process creation, and the start of the user flow.

### Task 1: Scanner & Cache (`scanner.go`)
* **Input Context:** Raw folder path.
* **Implementation:** `ScanProject(path)` parses `package.json` and sniffs runtime versions. Caches by `ModTime`.
* **Output Interface:** `engine.ScanResult` struct.
* **Verification:** `go test ./engine -run TestScanProject` with mock package files.

### Task 2: Input Validator (`validate.go`)
* **Input Context:** Settings from UI.
* **Implementation:** Clean path traversal (`..` block), validate port bounds `> 1024 && <= 65535`, script name whitelist.
* **Output Interface:** Returns clean, typed errors.
* **Verification:** Test cases for invalid ports/paths.

### Task 3: SysInfo (`sysinfo.go`)
* **Input Context:** Hardware limits request.
* **Implementation:** `GetSystemInfo()`. CPU via `runtime.NumCPU()`. RAM via `/proc/meminfo` or `GlobalMemoryStatusEx`.
* **Output Interface:** `SystemInfo` struct.
* **Verification:** Log values, ensure they match physical host specs.

### Task 4: Process Runner (`runner.go`)
* **Input Context:** Outputs from T1 and T2.
* **Implementation:** Launches subprocess with raw args array. Merges stdout/stderr.
* **Output Interface:** `RunningProcess` struct, `logChan` (buffered 512 lines), and exit code watcher.
* **Verification:** Run a dummy server script, confirm it starts cleanly.

### Task 5: Windows Limiter (`os_limiter_windows.go`)
* **Input Context:** Process PID from T4.
* **Implementation:** `//go:build windows`. Anonymous Job Object, `AssignProcessToJobObject`, sets memory limit and CPU hard-cap rates.
* **Output Interface:** `applyWindowsLimits(pid, memMB, cpuPercent)`.
* **Verification:** Run memory-heavy test script inside job, confirm process is terminated when limit is exceeded.

### Task 6: Linux Limiter (`os_limiter_linux.go`)
* **Input Context:** Process PID from T4.
* **Implementation:** `//go:build linux`. Fallback layers: `systemd-run --user` -> `/sys/fs/cgroup/` v1 write -> `taskset` + `prlimit`.
* **Output Interface:** `applyLinuxLimits(pid, memMB, cpuCores)`.
* **Verification:** Verify scope creation or cgroup folder creation on Linux.

### Task 7: OOM Monitor (Exit Handler)
* **Input Context:** Subprocess exit codes from T4.
* **Implementation:** Intercept code 137 (Linux) or Windows job limits exit codes.
* **Output Interface:** Emits `"process-oom"` event to Wails.
* **Verification:** Trigger exit code 137, confirm event is received by UI.

### Task 8: Process Guard (`processguard.go`)
* **Input Context:** Active PIDs and cancel funcs from T4.
* **Implementation:** Thread-safe `sync.Map` of process groups. Calls `syscall.Kill(-pgid)` or closes Job Object handles on Wails `OnShutdown`.
* **Output Interface:** `KillAllProcesses()`.
* **Verification:** Terminate Wails, ensure no orphaned node/bun/cloudflared processes remain.

### Task 18: Bun Installer (`bundler.go`)
* **Input Context:** Missing runtimes from T1.
* **Implementation:** Download zip via stdlib `net/http` to `{appDataDir}/runtimes/bun`, unzip, mark executable.
* **Output Interface:** `DownloadBunPortable(onProgress)`.
* **Verification:** Trigger installer download, verify bun runs correctly from destination.

### Task 19: UI Drop-Zone (`DropZone.tsx`)
* **Input Context:** T1 scan outcome.
* **Implementation:** Wails `OnFileDrop` callback integration. Red shake frame animations on invalid project directory.
* **Output Interface:** Triggers `onScanned` screen shift.
* **Verification:** Drop invalid path, check shake animation works.

### Task 20: UI Control Panel (`ControlPanel.tsx`)
* **Input Context:** T3 hardware capacity.
* **Implementation:** Configures script, port, CPU cores, RAM slider (green -> amber -> red track).
* **Output Interface:** Emits `RunConfig` values.
* **Verification:** Check sliders respect limits returned by `GetSystemInfo`.

### Task 26: UI State Routing (`App.tsx`)
* **Input Context:** Transistions between DropZone (T19), ControlPanel (T20), Launching (T21), Dashboard (T25).
* **Implementation:** Simple state-router wrapped in Framer Motion `<AnimatePresence>`.
* **Output Interface:** React entry point.
* **Verification:** Walk through UI stages smoothly.

---

## Track B: Cloud Services & Telemetry (Agent 2)

This track focuses on keyrings, Cloudflare tunnels, Vercel synchronization, metrics, and logs rendering.

### Task 14: Secure Keyring (`keyring.go`)
* **Input Context:** Plaintext secret tokens from user config inputs.
* **Implementation:** Windows uses DPAPI (`CryptProtectData`). Linux uses `godbus` session connection to D-Bus Secret Service. Local file AES encryption fallback.
* **Output Interface:** `StoreSecret`, `GetSecret`, `DeleteSecret`. Secrets never exposed to WebView.
* **Verification:** Save and read tokens, verify the physical storage file contains ciphertext.

### Task 11: cloudflared Sniffer (`tunnel.go` lookup)
* **Input Context:** Search PATH and `{appDataDir}/bin/` for the `cloudflared` binary.
* **Output Interface:** Path string or missing error.
* **Verification:** Confirm path detection is correct.

### Task 12: Ephemeral Tunnel (`tunnel.go` runner)
* **Input Context:** Binary from T11, local port.
* **Implementation:** Runs `cloudflared tunnel --url http://localhost:{port}`. Scans stderr using regex for `trycloudflare.com`.
* **Output Interface:** Emits `"CONNECTED"`, `"RECONNECTING"`, `"FAILED"`.
* **Verification:** Verify public URL parser catches mock tunnel output.

### Task 13: Tunnel Reconnect (`tunnel.go` backoff)
* **Input Context:** Process EOF from T12.
* **Implementation:** Reconnection retry loop up to 5× with exponential backoff (1s, 2s, 4s, 8s, 16s).
* **Output Interface:** Emits `"RECONNECTING"` states.
* **Verification:** Kill cloudflared manually, check if reconnect loop starts.

### Task 15: Vercel Sync (`vercel.go`)
* **Input Context:** Credentials from Keyring (T14), tunnel URL (T12).
* **Implementation:** Patch env endpoint `POST /v9/projects/...` and Deployments endpoint `POST /v13/...`.
* **Output Interface:** `SyncVercelEnv(key, val)`. Maps HTTP errors (401, 403, 429).
* **Verification:** Run sync, verify env update is registered on Vercel Dashboard.

### Task 16: Permanent Tunnel (`tunnel_api.go`)
* **Input Context:** Keyring CF token (T14), Domain, Account ID.
* **Implementation:** CF API v4 calls to create named tunnel, write credentials file, add CNAME records, run tunnel.
* **Output Interface:** `StartPermanentTunnel(cfg)`.
* **Verification:** Check DNS CNAME updates on Cloudflare DNS configuration.

### Task 9: Log Batcher (`logpipe.go`)
* **Input Context:** Subprocess log channel from T4.
* **Implementation:** Ticks every 100ms. Aggregates lines into a slice, flushes to Wails `"process-log"`. Reuses slices.
* **Output Interface:** Background loop.
* **Verification:** Feed logs, verify UI updates are throttled.

### Task 10: Resource Monitor (`monitor.go`)
* **Input Context:** Running PID from T4.
* **Implementation:** Polling every 1s. Reads `/proc/{pid}/stat` + `/proc/{pid}/statm` on Linux, WinAPI on Windows.
* **Output Interface:** Emits `"resource-usage"` metrics.
* **Verification:** Confirm CPU/RAM stats fluctuate with actual process workload.

### Task 17: Config Persistence (`config.go`)
* **Input Context:** UI settings (T20) and window size.
* **Implementation:** Read/write JSON config file at `{os.UserConfigDir()}/localcloud/config.json`.
* **Output Interface:** `LoadConfig()`, `SaveConfig()`.
* **Verification:** Confirm settings persist across application restarts.

### Task 22: UI Log Terminal (`LogTerminal.tsx`)
* **Input Context:** Log events from T9.
* **Implementation:** Capped state array (`slice(-1000)`). Virtualized using `react-window` `FixedSizeList`. Highlight status keywords (2xx green, errors red).
* **Output Interface:** Scrolling log output.
* **Verification:** Print 5000 lines, ensure no UI frame drops.

### Task 23: UI Resource Chart (`ResourceChart.tsx`)
* **Input Context:** Resource usage metrics from T10.
* **Implementation:** Recharts `AreaChart` with gradient fill. circular queue of 60 points (1 min window).
* **Output Interface:** Graph dashboard panel.
* **Verification:** Check lines correctly plot memory usage vs memory slider threshold.

### Task 24: UI OOM Modal (`OOMModal.tsx`)
* **Input Context:** T7 OOM event.
* **Implementation:** Warning dialog with Indonesian translation from SCAD.
* **Output Interface:** Overlay Modal.
* **Verification:** Confirm modal blocks interaction when OOM event fires.

### Task 25: UI Dashboard (`Dashboard.tsx`)
* **Input Context:** Integrated components (T22, T23, T24, T25).
* **Implementation:** Displays URL card, copy clipboard button, charts, terminal, and global red Stop button.
* **Output Interface:** Monitor page.
* **Verification:** Stop button exits tunnel and runner cleanly.

---

## Integration Phase (Both Agents)

### Task 27: IPC WebView Hardening (`main.go`)
* **Input Context:** WebView2 configuration options.
* **Implementation:** Disable browser hotkeys, block external navigation and drop operations.
* **Verification:** Confirm drag-drop of web resources is ignored by compiled app.

### Task 28: Final Bindings & Build (`app.go`)
* **Input Context:** All backend functions and bindings.
* **Implementation:** Register all struct bindings in `main.go`. Run `wails build` and execute final verification flow.
