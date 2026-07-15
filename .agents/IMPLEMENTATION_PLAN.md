# LocalCloud Grand Implementation Plan v2

> **ponytail: full** — Every task below passes the YAGNI ladder before it earns a line of code.
> YAGNI → stdlib → native platform → one line → minimum that works.
> But every feature from the SCAD IS needed. ponytail governs HOW, not WHETHER.

**All AI coding assistants** (Antigravity, Claude Code, Cursor, Kimchi, OpenCode) MUST read this plan before implementing any feature. Cross-reference with [AGENTS.md](./AGENTS.md) for architecture rules, [DESIGN.md](../DESIGN.md) for the design system spec, and [PRODUCT.md](../PRODUCT.md) for product vision and anti-references.

---

## Current State (What Already Exists)

| Layer | File | Status |
|---|---|---|
| Go entry | `localcloud/main.go` | Wails bootstrap, embeds frontend, binds `App` struct, IPC hardening |
| Go bridge | `localcloud/app.go` | Exposes `ScanProject`, `LimitResources` |
| Go bridge | `localcloud/app_engine.go` | Exposes `GetSystemInfo`, `DownloadBunPortable`, `GetEngineStatus` |
| Go bridge | `localcloud/app_telemetry.go` | Tunnel/vercel/keyring/config bindings |
| Engine: Scanner | `localcloud/engine/scanner/` | **Done** — framework detection, port sniffing, runtime detection, caching |
| Engine: Validate | `localcloud/engine/core/validate.go` | **Done** — port/path/script validation |
| Engine: SysInfo | `localcloud/engine/core/sysinfo*.go` | **Done** — platform-specific RAM/CPU detection |
| Engine: Runner | `localcloud/engine/process/runner.go` | **Done** — spawns dev server, pipes logs, tracks process |
| Engine: Limiter | `localcloud/engine/process/os_limiter*.go` | **Done** — Windows Job Objects, Linux cgroups v2/v1/posix, dispatcher |
| Engine: Tunnel | `localcloud/engine/tunnel/tunnel.go` | **Done** — ephemeral tunnel with 5× reconnect, URL parsing |
| Engine: Tunnel API | `localcloud/engine/tunnel/tunnel_api.go` | **Done** — permanent tunnel + CF API v4 DNS CNAME |
| Engine: Vercel | `localcloud/engine/vercel/vercel.go` | **Done** — real HTTP calls, env upsert, redeploy trigger |
| Engine: Keyring | `localcloud/engine/keyring/keyring*.go` | **Done** — DPAPI (Windows), D-Bus Secret Service (Linux), AES fallback |
| Engine: Bundler | `localcloud/engine/process/bundler.go` | **Done** — Bun portable download + unzip |
| Engine: LogPipe | `localcloud/engine/process/logpipe.go` | **Done** — 100ms batched log emitter |
| Engine: Monitor | `localcloud/engine/process/monitor*.go` | **Done** — platform-specific /proc and WinAPI resource polling |
| Engine: ProcessGuard | `localcloud/engine/process/processguard.go` | **Done** — PID tracking, shutdown cleanup, zombie prevention |
| Engine: Config | `localcloud/engine/core/config.go` | **Done** — JSON config persistence |
| Engine: Projects | `localcloud/engine/projects/project.go` | **Not started** — Project registry, lifecycle functions |
| React UI | `localcloud/frontend/src/App.tsx` | Single-project state machine (dropzone → control → launching → dashboard) |
| React UI | `localcloud/frontend/src/screens/DropZone.tsx` | **Done** — drag-drop + file picker + shake animation |
| React UI | `localcloud/frontend/src/screens/ControlPanel.tsx` | **Done** — sliders, selectors, config |
| React UI | `localcloud/frontend/src/screens/Dashboard.tsx` | **Done** — single-project: URL card + charts + logs + stop |
| React UI | `localcloud/frontend/src/screens/Launching.tsx` | **Done** — progress stepper |
| React UI | `localcloud/frontend/src/components/OOMModal.tsx` | **Done** — OOM warning dialog |
| React UI | `localcloud/frontend/src/components/LogTerminal.tsx` | **Done** — virtualized log list with color coding |
| React UI | `localcloud/frontend/src/components/ResourceChart.tsx` | **Done** — Recharts area charts, 60-point window |
| React UI | `localcloud/frontend/src/components/StatusDot.tsx` | **Done** — connection status indicator |
| Styling | `localcloud/frontend/src/index.css` | Tailwind v4 CSS-first import + Nunito font |
| Config | `localcloud/wails.json` | Author: MawanRequiem, npm install/build wired |

**What is NOT done yet:** Everything in Phase A4 (multi-project hub) and B4 (per-project resource isolation). T29–T38 are the remaining work.

---

## Complete Feature Checklist (from SCAD)

Every feature below MUST be implemented. Nothing is optional.

| # | Feature | SCAD Section | Status |
|---|---|---|---|
| F1 | Project Scanner & Environment Sniffer | §3.1 | Done |
| F2 | Runtime Detection (Node/Bun) | §3.1 | Done |
| F3 | Bun Portable Auto-Download | §3.1 | Done |
| F4 | Windows Job Objects Resource Limiter | §3.2 | Done |
| F5 | Linux cgroups v2 (systemd-run) Limiter | §3.2 | Done |
| F6 | Linux cgroups v1 Fallback | §3.2 | Done |
| F7 | Linux Non-Systemd (taskset/prlimit) Fallback | §3.2 | Done |
| F8 | OOM Detection & UI Alert | §3.2 | Done |
| F9 | Ephemeral Cloudflare Tunnel (Free Domain) | §3.3 | Done |
| F10 | Permanent Cloudflare Tunnel (Custom DNS CNAME) | §3.3 | Done |
| F11 | Cloudflare API v4 Authentication | §3.3 | Done |
| F12 | Tunnel Auto-Reconnect (5 attempts) | §3.3 | Done |
| F13 | Tunnel Connection Drop Detection | §3.3 | Done |
| F14 | Vercel Env Variable Sync (PATCH) | §3.4 | Done |
| F15 | Vercel Redeployment Trigger (POST) | §3.4 | Done |
| F16 | Log Throttling & Backpressure (100ms batch) | §3.5 | Done |
| F17 | Log Ring Buffer (1000 lines in React) | §3.5 | Done |
| F18 | Virtualized Log List (react-window) | §3.5 | Done |
| F19 | Resource Usage Charts (Recharts) | §3.5 | Done |
| F20 | OS Keyring Secure Storage (DPAPI/D-Bus) | §4 | Done |
| F21 | Command Injection Guard | §4 | Done |
| F22 | Anti-Zombie Process Guard (Linux PGID + Windows Job) | §4 | Done |
| F23 | Go-Routine Lifecycle Guard (context.WithCancel) | §4 | Done |
| F24 | IPC Channel Hardening (WebView isolation) | §4 | Done |
| F25 | Drop-Zone Screen (drag-and-drop + file picker) | §UX | Done |
| F26 | Drop-Zone Shake Animation on Error | §UX | Done |
| F27 | Control Panel Screen (sliders, selectors) | §UX | Done |
| F28 | GO LIVE Button with Progress Transition | §UX | Done |
| F29 | Live Dashboard Screen (URL card + copy) | §UX | Done (single-project only) |
| F30 | Dev Server Process Runner (npm/bun) | — | Done |
| F31 | System Info (RAM/CPU detection for sliders) | — | Done |
| F32 | Project Config Persistence (last project, settings) | — | Done |
| F33 | cloudflared Binary Detection & Location | — | Done |

---

## Phase 1: Core Engine — Project Scanner & Process Runner

### 1.1 Project Scanner & Environment Sniffer [F1, F2]

**File:** `localcloud/engine/scanner.go` [NEW]

**Struct:**
```go
type ScanResult struct {
    Name          string            `json:"name"`
    Version       string            `json:"version"`
    Scripts       map[string]string `json:"scripts"`
    Dependencies  map[string]string `json:"dependencies"`
    DevCommand    string            `json:"devCommand"`    // auto-detected best dev script key
    DefaultPort   int               `json:"defaultPort"`   // parsed from script or 3000
    Framework     string            `json:"framework"`     // "next", "vite", "remix", "cra", "unknown"
    HasNode       bool              `json:"hasNode"`
    NodeVersion   string            `json:"nodeVersion"`   // e.g. "v22.15.0"
    HasBun        bool              `json:"hasBun"`
    BunVersion    string            `json:"bunVersion"`
    ProjectPath   string            `json:"projectPath"`
}
```

**Function:** `ScanProject(folderPath string) (*ScanResult, error)`

**Implementation details:**
- Read `package.json` via `os.ReadFile` + `encoding/json.Unmarshal` into a raw struct
- Parse `name`, `version`, `scripts`, `dependencies`, `devDependencies`
- **Framework detection:** Check `dependencies` keys: `"next"` → next, `"vite"` → vite, `"@remix-run/dev"` → remix, `"react-scripts"` → cra
- **Dev command detection:** Priority order: `scripts["dev"]` → `scripts["start"]` → `scripts["serve"]`. Store the key name.
- **Port detection:** Regex-scan the selected script value for `--port (\d+)` or `-p (\d+)`. Default to 3000 if not found. For Next.js, default 3000. For Vite, default 5173.
- **Runtime sniffing:**
  - `exec.Command("node", "-v")` — capture `CombinedOutput()`, parse version string
  - `exec.Command("bun", "-v")` — capture `CombinedOutput()`, parse version string
  - **Security:** Do NOT run these through shell interpreters. Raw argument array only.
  - **Timeout:** Use `exec.CommandContext` with 3-second timeout to prevent hanging if the binary exists but is stuck

**ponytail: one function, one struct, zero external deps. All stdlib.**

### 1.2 Bun Portable Auto-Download [F3]

**File:** `localcloud/engine/bundler.go` [NEW]

**Function:** `DownloadBunPortable(ctx context.Context, destDir string, onProgress func(percent int)) error`

**Implementation details:**
- Download URL: `https://github.com/oven-sh/bun/releases/latest/download/bun-{platform}-{arch}.zip`
  - Windows: `bun-windows-x64.zip`
  - Linux: `bun-linux-x64.zip`
- Use `net/http.Get` with context for cancellation
- Stream body into a temp file using `io.Copy` with a `countingWriter` that calls `onProgress`
- Extract zip using `archive/zip` stdlib
- Place binary into `{appDataDir}/runtimes/bun/` (use Wails `Environment()` or `os.UserConfigDir()`)
- Mark executable on Linux: `os.Chmod(bunPath, 0755)`
- Return the full path to the bun binary
- **Security:** Validate downloaded file size is reasonable (< 100MB). Verify zip contains exactly one executable.
- **Cache:** If `{appDataDir}/runtimes/bun/bun` already exists and is valid, skip download.

**ponytail: stdlib net/http + archive/zip. Zero external deps.**

### 1.3 Dev Server Process Runner [F30]

**File:** `localcloud/engine/runner.go` [NEW]

This is the **central nervous system** — it launches the user's dev server and manages its lifecycle.

**Struct:**
```go
type RunConfig struct {
    ProjectPath string
    Runtime     string  // "node", "bun", or absolute path to portable bun
    ScriptName  string  // e.g. "dev"
    Port        int
    MemoryMB    int64
    CPUCores    float64
}

type RunningProcess struct {
    Cmd       *exec.Cmd
    PID       int
    PGID      int // Linux only, for anti-zombie
    LogChan   chan string
    Cancel    context.CancelFunc
    StartedAt time.Time
}
```

**Function:** `RunDevServer(ctx context.Context, cfg RunConfig, onEvent func(event string, data interface{})) (*RunningProcess, error)`

**Implementation details:**
1. **Validate inputs:**
   - `ValidatePort(cfg.Port)` → error if ≤ 1024 or > 65535
   - Check `cfg.ProjectPath` exists via `os.Stat`
   - Check `cfg.Runtime` binary exists via `exec.LookPath`
2. **Build command:**
   - `exec.CommandContext(ctx, cfg.Runtime, "run", cfg.ScriptName)`
   - Set `cmd.Dir = cfg.ProjectPath`
   - Set environment: `cmd.Env = append(os.Environ(), fmt.Sprintf("PORT=%d", cfg.Port))`
   - **Security:** NEVER use `sh -c` or `cmd.exe /c`. Raw argument array only.
3. **Platform-specific process attributes:**
   - **Linux:** `cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}` — creates a new process group for anti-zombie cleanup
   - **Windows:** Job Object assignment happens AFTER `cmd.Start()` via `os_limiter_windows.go`
4. **Pipe stdout + stderr:**
   - `cmd.StdoutPipe()` and `cmd.StderrPipe()` → merge into a single `io.MultiReader`
   - Goroutine reads via `bufio.NewScanner(merged)` and pushes each line into `logChan`
   - **Backpressure:** If channel is full (buffered 512 lines), drop oldest line. Never block the subprocess.
5. **Start process:** `cmd.Start()`
6. **Apply resource limits AFTER start:**
   - Call `LimitResources(cmd.Process.Pid, cfg.MemoryMB, cfg.CPUCores)`
   - This avoids needing to wrap the command on Linux (applies limits to running PID)
7. **Monitor exit in goroutine:**
   - `cmd.Wait()` — check exit code
   - Exit code 137 on Linux → OOM killed → emit `process-oom` event
   - Exit code 0 → clean exit → emit `process-exit` event
   - Other codes → emit `process-exit` with error details
8. **Emit events via `onEvent` callback:**
   - `"process-started"` → `{pid, port}`
   - `"process-log"` → `{line, timestamp}`
   - `"process-exit"` → `{code, reason}`
   - `"process-oom"` → `{memoryLimit, message: "Server Lokal Terhenti: Penggunaan memori melewati batas..."}`

**ponytail: one file, one function, one struct. The Runner is the glue between scanner, limiter, and tunnel.**

---

## Phase 2: OS Resource Limiters — Make Kernel Calls Real

### 2.1 Resource Limiter Dispatcher [F4, F5, F6, F7]

**File:** `localcloud/engine/os_limiter.go` [MODIFY]

Keep as the dispatcher. Add Linux fallback tier detection with cached result:

```go
var linuxLimiterType string // "cgroupsv2", "cgroupsv1", "posix"
var linuxLimiterOnce sync.Once

func detectLinuxLimiter() string {
    // 1. Check systemd + cgroups v2
    // 2. Check cgroups v1 path exists
    // 3. Fallback to posix (taskset + prlimit)
}
```

### 2.2 Windows Job Objects [F4]

**File:** `localcloud/engine/os_limiter_windows.go` [NEW, `//go:build windows`]

**Function:** `applyWindowsLimits(pid int, memMB int64, cpuPercent int) error`

**Implementation details:**
- Import `golang.org/x/sys/windows` (stdlib-adjacent, maintained by Go team)
- Call `windows.CreateJobObject(nil, nil)` to create an anonymous Job Object
- Open the target process: `windows.OpenProcess(windows.PROCESS_SET_QUOTA|windows.PROCESS_TERMINATE, false, uint32(pid))`
- Assign process: `windows.AssignProcessToJobObject(job, processHandle)`
- **Memory limit:** Set `JOBOBJECT_EXTENDED_LIMIT_INFORMATION`:
  - `info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_PROCESS_MEMORY`
  - `info.ProcessMemoryLimit = uintptr(memMB * 1024 * 1024)`
  - Call `windows.SetInformationJobObject(job, JobObjectExtendedLimitInformation, ...)`
- **CPU limit:** Set `JOBOBJECT_CPU_RATE_CONTROL_INFORMATION`:
  - `info.ControlFlags = JOB_OBJECT_CPU_RATE_CONTROL_ENABLE | JOB_OBJECT_CPU_RATE_CONTROL_HARD_CAP`
  - `info.CpuRate = uint32(cpuPercent * 100)` (in hundredths of a percent)
  - Call `windows.SetInformationJobObject(job, JobObjectCpuRateControlInformation, ...)`
- **Auto-cleanup:** Store Job Object handle. When parent process (Wails) exits, Windows automatically terminates all processes in the Job Object.
- Store the job handle in a package-level map: `var activeJobs sync.Map // pid → windows.Handle`

**Security:** All syscall operations wrapped in error checks. No silent failures.

### 2.3 Linux cgroups v2 via systemd-run [F5]

**File:** `localcloud/engine/os_limiter_linux.go` [NEW, `//go:build linux`]

**Function:** `applyLinuxLimits(pid int, memMB int64, cpuCores float64) error`

**Implementation — Tier 1 (cgroups v2, Modern Systemd):**
```go
// Check: exec.Command("systemctl", "--user", "--version").Run() == nil
// Apply: exec.Command("systemd-run", "--user", "--scope",
//   "-p", fmt.Sprintf("MemoryMax=%dM", memMB),
//   "-p", fmt.Sprintf("CPUQuota=%d%%", int(cpuCores*100)),
//   "--", "cat", fmt.Sprintf("/proc/%d/cmdline", pid),
// ).Start()
```
Note: For systemd-run to work on an existing PID, we need to move the PID into a new scope. Alternative: launch the process already inside the scope.

**Better approach:** Instead of applying to a running PID, the runner should launch the dev server INSIDE the systemd scope:
```go
// In runner.go, when linuxLimiterType == "cgroupsv2":
cmd = exec.CommandContext(ctx,
    "systemd-run", "--user", "--scope",
    "-p", fmt.Sprintf("MemoryMax=%dM", memMB),
    "-p", fmt.Sprintf("CPUQuota=%d%%", int(cpuCores*100)),
    "--", runtime, "run", scriptName,
)
```
No sudo. No root. 100% user-session cgroups v2.

**Implementation — Tier 2 (cgroups v1, Old Systemd):**
```go
// Write memory limit to /sys/fs/cgroup/memory/user.slice/localcloud-{pid}/memory.limit_in_bytes
// Write CPU to /sys/fs/cgroup/cpu/user.slice/localcloud-{pid}/cpu.cfs_quota_us
// Must create the cgroup directory first
cgroupPath := fmt.Sprintf("/sys/fs/cgroup/memory/user.slice/localcloud-%d", pid)
os.MkdirAll(cgroupPath, 0755)
os.WriteFile(filepath.Join(cgroupPath, "memory.limit_in_bytes"), []byte(fmt.Sprintf("%d", memMB*1024*1024)), 0644)
os.WriteFile(filepath.Join(cgroupPath, "tasks"), []byte(fmt.Sprintf("%d", pid)), 0644)
```

**Implementation — Tier 3 (Non-Systemd: Alpine, Artix, Void):**
```go
// CPU affinity: taskset -c 0-{N-1} -p {pid}
exec.Command("taskset", "-c", fmt.Sprintf("0-%d", int(cpuCores)-1), "-p", fmt.Sprintf("%d", pid)).Run()
// Memory limit: prlimit --pid={pid} --as={bytes}
exec.Command("prlimit", fmt.Sprintf("--pid=%d", pid), fmt.Sprintf("--as=%d", memMB*1024*1024)).Run()
```

**Security:** All `exec.Command` use raw argument arrays. No shell interpretation.

### 2.4 OOM Detection & UI Alert [F8]

**Handled in:** `localcloud/engine/runner.go` (exit code monitoring goroutine)

**Implementation details:**
- **Linux:** Exit code 137 = SIGKILL (typically OOM). Also check 139 = SIGSEGV.
- **Windows:** Job Object emits `ERROR_NOT_ENOUGH_MEMORY` or the process exits with code that signals memory failure. Check with `windows.GetExitCodeProcess`.
- On OOM detection, emit to UI via Wails event:
  ```go
  wailsRuntime.EventsEmit(ctx, "process-oom", map[string]interface{}{
      "message":     "Server Lokal Terhenti: Penggunaan memori melewati batas yang Anda tentukan.",
      "memoryLimit": cfg.MemoryMB,
      "exitCode":    exitCode,
  })
  ```
- Frontend shows a **modal dialog** with:
  - Warning icon + amber/red gradient background
  - Indonesian text from SCAD
  - Suggestion: "Naikkan limit slider Anda atau periksa memory leak pada kode Anda."
  - "Restart" button + "Change Settings" button

---

## Phase 3: Cloudflare Tunnel Manager — Full Implementation

### 3.1 cloudflared Binary Detection [F33]

**File:** `localcloud/engine/tunnel.go` [MODIFY — add detection function]

**Function:** `findCloudflared() (string, error)`

**Implementation details:**
- Step 1: Check `exec.LookPath("cloudflared")` — if found in PATH, return it
- Step 2: Check bundled location: `{appDataDir}/bin/cloudflared` (or `.exe` on Windows)
- Step 3: If not found anywhere, return error with user-friendly message for the UI to show a download prompt
- **Cache:** Store the result in a package-level variable after first detection

### 3.2 Ephemeral Tunnel (Free Domain) [F9]

**File:** `localcloud/engine/tunnel.go` [MODIFY]

**Function:** `StartEphemeralTunnel(ctx context.Context, localPort int, onStatus func(status, url string, err error)) error`

**Implementation details:**
- Locate cloudflared binary via `findCloudflared()`
- Build command: `exec.CommandContext(ctx, cloudflaredPath, "tunnel", "--url", fmt.Sprintf("http://localhost:%d", localPort))`
- **Linux anti-zombie:** `cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}`
- **Windows anti-zombie:** Assign to an existing Job Object if one was created by the runner
- Pipe `cmd.StderrPipe()` — cloudflared writes URL to **stderr**, not stdout
- Start goroutine with `bufio.NewScanner(stderrPipe)`:
  ```go
  urlRegex := regexp.MustCompile(`https://[a-zA-Z0-9-]+\.trycloudflare\.com`)
  for scanner.Scan() {
      line := scanner.Text()
      if match := urlRegex.FindString(line); match != "" {
          onStatus("CONNECTED", match, nil)
      }
      // Also forward cloudflared logs to the log pipeline
  }
  ```
- On scanner end (process died): enter reconnection loop
- Store `cmd.Process.Pid` for cleanup

### 3.3 Tunnel Auto-Reconnect [F12, F13]

**File:** `localcloud/engine/tunnel.go` [within StartEphemeralTunnel]

**Implementation details:**
- When the scanner goroutine detects EOF (cloudflared process died) or explicit connection error strings:
  ```go
  maxRetries := 5
  for attempt := 0; attempt < maxRetries; attempt++ {
      onStatus("RECONNECTING", "", fmt.Errorf("attempt %d/%d", attempt+1, maxRetries))
      
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      select {
      case <-ctx.Done():
          return
      case <-time.After(time.Duration(1<<attempt) * time.Second):
      }
      
      // Restart cloudflared process
      err := startCloudflaredProcess(ctx, localPort, onStatus)
      if err == nil {
          return // successfully reconnected
      }
  }
  onStatus("FAILED", "", fmt.Errorf("exhausted %d reconnection attempts", maxRetries))
  ```
- **Connection drop detection:** Scan stderr for known error strings:
  - `"connection reset"`, `"EOF"`, `"tunnel disconnected"`, `"context canceled"`
  - Immediately emit `"RECONNECTING"` status to UI

### 3.4 Permanent Tunnel with Custom DNS [F10, F11]

**File:** `localcloud/engine/tunnel_api.go` [NEW]

**Function:** `StartPermanentTunnel(ctx context.Context, cfg TunnelConfig) error`

**Struct:**
```go
type TunnelConfig struct {
    LocalPort   int
    Domain      string // e.g. "api.mysite.com"
    AccountID   string // Cloudflare account ID
    APIToken    string // from OS keyring
    TunnelName  string // unique name for this tunnel
}
```

**Implementation details using Cloudflare API v4:**
1. **Create named tunnel:**
   - `POST https://api.cloudflare.com/client/v4/accounts/{account_id}/tunnels`
   - Body: `{"name": tunnelName, "tunnel_secret": base64EncodedSecret}`
   - Headers: `Authorization: Bearer {apiToken}`
2. **Create DNS CNAME record:**
   - `POST https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records`
   - Body: `{"type": "CNAME", "name": domain, "content": "{tunnel_id}.cfargotunnel.com", "proxied": true}`
3. **Run tunnel with credentials:**
   - `exec.CommandContext(ctx, cloudflaredPath, "tunnel", "run", "--credentials-file", credFile, tunnelName)`
4. **Clean up on stop:** Delete DNS record and tunnel via API
5. **Security:**
   - API token retrieved from OS keyring, NEVER stored in plaintext
   - Tunnel secret generated with `crypto/rand`
   - Credentials file written to temp dir with `0600` permissions, deleted on process end

**ponytail: All HTTP calls use stdlib `net/http`. Cloudflare API v4 is simple REST.**

---

## Phase 4: Vercel Synchronization — Full Implementation

### 4.1 Vercel API Client [F14, F15]

**File:** `localcloud/engine/vercel.go` [REWRITE]

**Implementation details:**

**Function 1: `SyncVercelEnv(ctx context.Context, cfg VercelConfig, tunnelURL string) error`**

```go
type VercelConfig struct {
    Token     string // from OS keyring
    ProjectID string
    TeamID    string // optional
    EnvKey    string // e.g. "NEXT_PUBLIC_API_URL"
}
```

**Step 1: Upsert environment variable**
- `POST https://api.vercel.com/v9/projects/{projectId}/env?upsert=true`
- If teamId: add `&teamId={teamId}` to URL
- Body: `{"key": envKey, "value": tunnelURL, "type": "plain", "target": ["development","preview","production"]}`
- Headers: `Authorization: Bearer {token}`, `Content-Type: application/json`
- **Execute:** `resp, err := client.Do(req)` — actually call the API
- **Handle responses:**
  - 200/201 → success
  - 401 → return `ErrVercelAuth` — token expired or invalid
  - 403 → return `ErrVercelForbidden` — wrong project/team permissions
  - 429 → return `ErrVercelRateLimit` — rate limited, include Retry-After header value
  - 5xx → return `ErrVercelServer` — Vercel is down

**Step 2: Trigger redeployment**
- First, get the latest deployment to find the git source:
  - `GET https://api.vercel.com/v6/deployments?projectId={projectId}&limit=1`
- Then create a redeployment from the latest:
  - `POST https://api.vercel.com/v13/deployments`
  - Body: `{"name": projectName, "deploymentId": latestDeploymentId}` (redeploy from latest)
- **Handle responses** same as above

**Error types:**
```go
var (
    ErrVercelAuth      = errors.New("vercel: authentication failed — check your API token")
    ErrVercelForbidden = errors.New("vercel: access denied — check project and team permissions")
    ErrVercelRateLimit = errors.New("vercel: rate limited — try again later")
    ErrVercelServer    = errors.New("vercel: server error — Vercel may be experiencing issues")
    ErrVercelDeploy    = errors.New("vercel: deployment trigger failed")
)
```

**Security:**
- Token comes from OS keyring (Phase 5), never stored in config files
- HTTP client timeout: 15 seconds
- Close response bodies: `defer resp.Body.Close()`

---

## Phase 5: Secure Storage & Secret Management

### 5.1 OS Keyring — Windows DPAPI [F20]

**File:** `localcloud/engine/keyring_windows.go` [NEW, `//go:build windows`]

**Implementation details:**
- Use `golang.org/x/sys/windows` to call `CryptProtectData` / `CryptUnprotectData`
- These are DPAPI functions — encrypt data with the current Windows user's login credentials
- Even if the encrypted blob is stolen, it cannot be decrypted on another machine or by another user
- **Functions:**
  ```go
  func storeSecretWindows(service, key, value string) error {
      // Combine service+key as description
      // Call CryptProtectData with the value bytes
      // Store the encrypted blob in %APPDATA%/localcloud/secrets/{service}/{key}.enc
      // File permissions: user-only access via Windows ACLs
  }
  
  func getSecretWindows(service, key string) (string, error) {
      // Read encrypted blob from %APPDATA%/localcloud/secrets/{service}/{key}.enc
      // Call CryptUnprotectData to decrypt
      // Return plaintext string
  }
  ```
- **Storage location:** `os.UserConfigDir()` + `/localcloud/secrets/`
- **File permissions:** Only current user can read (NTFS ACLs via `os.Chmod` or `windows.SetNamedSecurityInfo`)

### 5.2 OS Keyring — Linux D-Bus Secret Service [F20]

**File:** `localcloud/engine/keyring_linux.go` [NEW, `//go:build linux`]

**Implementation details:**
- Use `github.com/godbus/dbus/v5` (already in go.mod as indirect Wails dependency — zero new deps)
- Connect to the Secret Service API via D-Bus session bus
- **Store:**
  ```go
  func storeSecretLinux(service, key, value string) error {
      conn, _ := dbus.SessionBus()
      // Call org.freedesktop.secrets.Service.CreateItem
      // Collection: "default" (user's default keyring)
      // Label: "LocalCloud - {service}/{key}"
      // Secret: value bytes
      // Attributes: {"service": service, "key": key, "application": "localcloud"}
  }
  ```
- **Retrieve:**
  ```go
  func getSecretLinux(service, key string) (string, error) {
      conn, _ := dbus.SessionBus()
      // Call org.freedesktop.secrets.Service.SearchItems with attributes
      // Unlock if needed
      // Call GetSecret on the item
      // Return plaintext
  }
  ```
- **Fallback:** If no secret service is running (minimal Linux installs), fall back to DPAPI-style file encryption using `crypto/aes` with a key derived from machine ID (`/etc/machine-id`) + user UID. Mark with `// ponytail: fallback encryption`.

### 5.3 Keyring Dispatcher

**File:** `localcloud/engine/keyring.go` [NEW]

```go
func StoreSecret(service, key, value string) error  // dispatches to platform
func GetSecret(service, key string) (string, error)  // dispatches to platform
func DeleteSecret(service, key string) error          // dispatches to platform
```

**Services used:**
- `"cloudflare"` — stores API token
- `"vercel"` — stores API token
- `"vercel-project"` — stores project ID + team ID (not secret, but grouped here for consistency)

---

## Phase 6: Log Pipeline & Performance Monitoring

### 6.1 Log Batcher (Go) [F16]

**File:** `localcloud/engine/logpipe.go` [NEW]

**Function:** `StartLogPipe(ctx context.Context, logChan <-chan string, emitFn func(eventName string, data interface{}))`

**Implementation details:**
```go
func StartLogPipe(ctx context.Context, logChan <-chan string, emitFn func(string, interface{})) {
    ticker := time.NewTicker(100 * time.Millisecond)
    defer ticker.Stop()
    
    var batch []string
    for {
        select {
        case <-ctx.Done():
            return
        case line := <-logChan:
            batch = append(batch, line)
        case <-ticker.C:
            if len(batch) == 0 {
                continue
            }
            emitFn("process-log", batch)
            batch = batch[:0] // reset slice, keep capacity
        }
    }
}
```

**Optimization details:**
- `batch = batch[:0]` reuses the underlying array allocation — zero garbage collection pressure
- Ticker at 100ms = max 10 UI updates per second — keeps React at 60fps
- Channel read is non-blocking within the select — never blocks the subprocess
- **Backpressure:** The runner's log channel is buffered (512 lines). If full, the runner drops old lines instead of blocking.

### 6.2 Resource Usage Monitor (Go) [F19]

**File:** `localcloud/engine/monitor.go` [NEW]

**Function:** `StartResourceMonitor(ctx context.Context, pid int, emitFn func(string, interface{}))`

**Implementation details:**
- Run in a goroutine, poll every 1 second
- **Linux:** Read `/proc/{pid}/statm` for memory, `/proc/{pid}/stat` for CPU time
  ```go
  // Memory: read /proc/{pid}/statm, field 1 = resident pages
  // Multiply by os.Getpagesize() to get bytes
  // CPU: read /proc/{pid}/stat, fields 14+15 = utime+stime
  // Calculate delta between polls to get CPU percentage
  ```
- **Windows:** Use `windows.GetProcessMemoryInfo` for memory, `windows.GetProcessTimes` for CPU
- **Emit:**
  ```go
  emitFn("resource-usage", map[string]interface{}{
      "ramMB":      currentRAM,
      "ramPercent": float64(currentRAM) / float64(limitMB) * 100,
      "cpuPercent": cpuPercent,
      "timestamp":  time.Now().UnixMilli(),
  })
  ```
- **ponytail: reads /proc directly on Linux. Uses Windows API on Windows. Zero deps like gopsutil.**

### 6.3 System Info (Go) [F31]

**File:** `localcloud/engine/sysinfo.go` [NEW]

**Function:** `GetSystemInfo() SystemInfo`

```go
type SystemInfo struct {
    TotalRAMMB int64 `json:"totalRamMB"`
    CPUCores   int   `json:"cpuCores"`
    OS         string `json:"os"`      // "windows" or "linux"
    Arch       string `json:"arch"`    // "amd64", "arm64"
}
```

**Implementation:**
- CPU cores: `runtime.NumCPU()` — stdlib
- Total RAM:
  - **Linux:** Parse `/proc/meminfo`, regex for `MemTotal:\s+(\d+) kB`, convert to MB
  - **Windows:** `windows.GlobalMemoryStatusEx()` → `stat.TotalPhys / 1024 / 1024`
- OS/Arch: `runtime.GOOS`, `runtime.GOARCH`

**ponytail: avoids importing gopsutil for just two numbers.**

---

## Phase 7: Frontend — Complete UX Journey (Dashboard-First, Multi-Project)

**Key design change:** The Dashboard is now the **landing page**, not the final destination. DropZone, ControlPanel, and Launching are embedded in a modal flow for adding new projects.

### 7.1 App State Machine — Dashboard First [F25–F29] [REWRITE]

**File:** `localcloud/frontend/src/App.tsx` [REWRITE]

```tsx
type AppScreen = "dashboard" // single primary screen
// DropZone → ControlPanel → Launching is a modal flow within dashboard

function App() {
  const [projects, setProjects] = useState<ProjectState[]>([])
  const [addProjectOpen, setAddProjectOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

  return (
    <>
      <Dashboard
        projects={projects}
        onAddProject={() => setAddProjectOpen(true)}
        onSelectProject={(id) => setSelectedProject(id)}
      />
      <AddProjectModal
        open={addProjectOpen}
        onComplete={(project) => {
          setProjects(prev => [...prev, project])
          setAddProjectOpen(false)
        }}
        onClose={() => setAddProjectOpen(false)}
      />
      <OOMModal ... />
    </>
  )
}
```

### 7.2 Screen 1: Dashboard (Landing Page) [F29] [REWRITE]

**File:** `localcloud/frontend/src/screens/Dashboard.tsx` [REWRITE]

**Implementation details:**
- **Landing page** of the application — shown immediately on launch
- **Header:** "LocalCloud" title, "Add New Project" button (prominent, indigo)
- **Project Grid:** Responsive card grid (`repeat(auto-fit, minmax(320px, 1fr))`) showing all managed projects
- **Each Project Card:**
  - Project name, framework badge, version
  - Status indicator dot (green = running, amber = launching, gray = stopped, red = error)
  - Port number and tunnel URL (truncated with copy button)
  - RAM/CPU mini sparkline charts (60-second window, compact height)
  - Action buttons: Stop (red), Start (green), Remove (gray, with confirmation)
- **Empty State:** Centered message "Belum ada project. Klik 'Add Project' untuk memulai." with a large icon and CTA button
- **Selected/Expanded State:** Clicking a running project card expands it to full detail view (large charts, log terminal, URL card with copy/open)
- **Framer Motion:** `AnimatePresence` for card enter/exit, `layoutId` for expand/collapse transitions

### 7.3 AddProjectModal (DropZone + ControlPanel + Launching) [F25, F26, F27, F28]

**File:** `localcloud/frontend/src/components/AddProjectModal.tsx` [NEW]

**Implementation details:**
- Full-screen modal overlay (`fixed inset-0 z-300`) with dark backdrop (`bg-black/80 backdrop-blur-sm`)
- Embeds a 3-step flow using internal state:
  1. **DropZone step:** Full-screen dark background with centered dashed border drop area
     - Use Wails runtime `OnFileDrop` for native drag-and-drop
     - "Browse Folder" button (or manual path input)
     - On folder select → call `ScanProject(path)`
     - **If invalid:** Shake animation + error text: *"Berkas package.json tidak ditemukan..."*
     - **If no runtime:** Amber warning banner with Bun download button + progress bar
  2. **Control Panel step:** Project info card, script selector, port input, RAM slider, CPU cores, Vercel sync toggle, Cloudflare mode selector, "GO LIVE" button
  3. **Launching step:** Vertical stepper with animated icons (server start → resource limits → tunnel → Vercel sync)
- **On success:** Modal closes, new project appears in Dashboard grid
- **On cancel/close:** Returns to Dashboard with no changes

### 7.4 Project Card Component

**File:** `localcloud/frontend/src/components/ProjectCard.tsx` [NEW]

**Implementation details:**
```tsx
interface ProjectCardProps {
  project: ProjectState
  onStart: (id: string) => void
  onStop: (id: string) => void
  onRemove: (id: string) => void
  onSelect: (id: string) => void
}
```
- Compact card with project identity, status, port, tunnel URL, mini sparklines
- Green/amber/gray/red status dot using StatusDot component
- RAM usage mini sparkline (Recharts AreaChart, 100px wide, no axes)
- CPU usage mini sparkline (same, different color)
- Stop/Start icon buttons, Remove (trash) icon button with confirmation tooltip
- Click to expand for full detail view

### 7.5 Live Dashboard Detail View [F29]

**File:** Embedded in `Dashboard.tsx` when a project card is expanded

**Implementation details:**
- **Expanded panel** below the clicked project card (or as a side panel on wide screens)
- **URL Card:** Glass-morphism card with public URL, Copy button, "Open in Browser" button
  - Green glow border when connected, gray when reconnecting
- **Resource Charts (middle):** Two side-by-side ResourceChart components (RAM + CPU)
  - Recharts AreaChart with gradient fill, red dashed threshold line at user-set limit
  - 60-second scrolling window
- **Log Terminal (bottom):** Full-width LogTerminal component, takes 50% of remaining height
  - Virtualized with react-window, 1000-line ring buffer
- **Floating controls:** Red "STOP" button (fixed bottom-right)

### 7.6 Log Terminal Component [F17, F18]

**File:** `localcloud/frontend/src/components/LogTerminal.tsx` [NEW]

**Implementation details:**
```tsx
function LogTerminal({ projectID }: { projectID: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const listRef = useRef<FixedSizeList>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    const unsub = EventsOn("process-log", (data: { projectID: string; lines: string[] }) => {
      if (data.projectID !== projectID) return
      setLogs(prev => {
        const newLogs = [...prev, ...data.lines.map(line => parseLogLine(line))]
        return newLogs.slice(-1000)
      })
    })
    return unsub
  }, [projectID])
  // ... rest of virtualized list with auto-scroll
}
```

**LogLine color rules:**
- Contains "200", "201", "304" → green text
- Contains "404", "500", "503", "error", "Error" → red bold text
- Contains "warn", "Warning" → amber text
- Default → gray text
- Timestamp prefix in dim color

### 7.7 Resource Chart Component [F19]

**File:** `localcloud/frontend/src/components/ResourceChart.tsx` [NEW]

**Implementation details:**
```tsx
function ResourceChart({ type, limit, projectID }: { type: "ram" | "cpu", limit: number, projectID: string }) {
  const [data, setData] = useState<DataPoint[]>([])

  useEffect(() => {
    const unsub = EventsOn("resource-usage", (data: { projectID: string; ramMB: number; cpuPercent: number; timestamp: number }) => {
      if (data.projectID !== projectID) return
      // ... update 60-point window
    })
    return unsub
  }, [type, projectID])
  // ... Recharts AreaChart with gradient fill and threshold line
}
```

### 7.8 OOM Modal [F8]

**File:** `localcloud/frontend/src/components/OOMModal.tsx` [KEEP, unchanged]

- Warning icon + amber/red gradient background
- Indonesian text: *"Server Lokal Terhenti: Penggunaan memori melewati batas..."*
- "Restart" button + "Change Settings" button
- Modal blocks interaction with the rest of the UI
```

---

## Phase 8: Project Config Persistence & Caching

### 8.1 App Config Storage [F32]

**File:** `localcloud/engine/config.go` [NEW]

**Purpose:** Remember the user's last project path, settings, and preferences between sessions.

**Implementation details:**
```go
type AppConfig struct {
    LastProjectPath string          `json:"lastProjectPath"`
    LastRunConfig   *RunConfigSave  `json:"lastRunConfig,omitempty"`
    WindowBounds    *WindowBounds   `json:"windowBounds,omitempty"`
}

type RunConfigSave struct {
    ScriptName  string  `json:"scriptName"`
    Port        int     `json:"port"`
    MemoryMB    int64   `json:"memoryMB"`
    CPUCores    float64 `json:"cpuCores"`
    VercelSync  bool    `json:"vercelSync"`
    VercelEnvKey string `json:"vercelEnvKey"`
    TunnelMode  string  `json:"tunnelMode"` // "ephemeral" or "permanent"
}

type WindowBounds struct {
    X      int `json:"x"`
    Y      int `json:"y"`
    Width  int `json:"width"`
    Height int `json:"height"`
}
```

**Storage location:** `{os.UserConfigDir()}/localcloud/config.json`
- Windows: `%APPDATA%/localcloud/config.json`
- Linux: `~/.config/localcloud/config.json`

**Functions:**
```go
func LoadConfig() (*AppConfig, error)  // os.ReadFile + json.Unmarshal
func SaveConfig(cfg *AppConfig) error  // json.MarshalIndent + os.WriteFile
```

**Security:** This file stores NO secrets. API tokens go in the OS keyring. Config only stores paths, ports, and UI preferences.

**ponytail: stdlib encoding/json + os. No database, no SQLite, no external config library.**

### 8.2 Scanner Result Cache

**File:** `localcloud/engine/scanner.go` [add caching within existing file]

**Implementation details:**
- After scanning, cache the `ScanResult` in memory (package-level `var lastScan *ScanResult`)
- Include `ModTime` of `package.json` in the cache
- On re-scan of the same path, check if `package.json` was modified (via `os.Stat().ModTime()`)
- If not modified, return cached result instantly
- **ponytail: in-memory cache only. No file-based cache. YAGNI.**

### 8.3 Runtime Detection Cache

**File:** `localcloud/engine/scanner.go` [add caching within existing file]

- Cache runtime detection results (`hasNode`, `hasBun`, versions) with a `sync.Once`
- Runtimes don't change during a session — detect once, cache forever
- User can trigger a "re-detect" from the UI which resets the cache

---

## Phase 9: System Hardening & Security

### 9.1 Anti-Zombie Process Guard [F22]

**File:** `localcloud/engine/processguard.go` [NEW]

**Implementation details:**
```go
var (
    trackedPIDs   sync.Map // pid → pgid (Linux) or jobHandle (Windows)
    trackedCancel sync.Map // pid → context.CancelFunc
)

func TrackProcess(pid, pgid int, cancel context.CancelFunc)
func UntrackProcess(pid int)

func KillAllProcesses() {
    trackedPIDs.Range(func(key, value interface{}) bool {
        pid := key.(int)
        // Platform-specific kill
        killProcess(pid, value)
        return true
    })
    trackedCancel.Range(func(key, value interface{}) bool {
        cancel := value.(context.CancelFunc)
        cancel()
        return true
    })
}
```

**Wiring in `main.go`:**
```go
OnShutdown: func(ctx context.Context) {
    engine.KillAllProcesses()
    engine.StopTunnel()
},
```

**Linux-specific:**
```go
// Kill entire process group, not just the PID
syscall.Kill(-pgid, syscall.SIGKILL)
```

**Windows-specific:**
```go
// Close Job Object handle — Windows auto-terminates all processes in the job
windows.CloseHandle(jobHandle)
```

### 9.2 Command Injection Prevention [F21]

**Enforced across ALL files.** Not a single file — a coding rule.

**Rules:**
1. **NEVER** use `sh -c`, `bash -c`, `cmd.exe /c`, or `powershell -Command`
2. **ALWAYS** use `exec.Command("binary", "arg1", "arg2", ...)` with separated arguments
3. **ALWAYS** validate user-provided values before passing to exec:
   - Ports: integer, > 1024, ≤ 65535
   - Paths: must exist via `os.Stat`, no path traversal (`..`)
   - Script names: must be a key in the parsed `package.json` scripts map
   - Runtime names: must be "node", "bun", or an absolute path verified via `exec.LookPath`

**File:** `localcloud/engine/validate.go` [NEW]

```go
func ValidatePort(port int) error {
    if port <= 1024 || port > 65535 {
        return fmt.Errorf("port must be between 1025 and 65535, got %d", port)
    }
    return nil
}

func ValidatePath(path string) error {
    // Prevent path traversal
    cleaned := filepath.Clean(path)
    if strings.Contains(cleaned, "..") {
        return fmt.Errorf("path traversal not allowed")
    }
    info, err := os.Stat(cleaned)
    if err != nil {
        return fmt.Errorf("path does not exist: %s", cleaned)
    }
    if !info.IsDir() {
        return fmt.Errorf("path is not a directory: %s", cleaned)
    }
    return nil
}

func ValidateScriptName(name string, scripts map[string]string) error {
    if _, ok := scripts[name]; !ok {
        return fmt.Errorf("script '%s' not found in package.json", name)
    }
    return nil
}
```

### 9.3 IPC Channel Hardening [F24]

**File:** `localcloud/main.go` [MODIFY]

**Implementation details:**
- Disable drag-and-drop of URLs into the WebView (we handle file drops ourselves via Wails API)
- Set Content Security Policy headers if Wails supports them
- Configure Wails options:
  ```go
  Windows: &windows.Options{
      WebviewIsStatusBarEnabled: false,
      WebviewBrowserAcceleratorKeyIsEnabled: false,
      // Disable external navigation
  },
  ```
- Prevent navigation to external URLs from within the WebView
- **ponytail: use what Wails v2 exposes. Don't fight the framework.**

### 9.4 Go-Routine Lifecycle Guard [F23]

**Enforced in ALL goroutines across ALL files.**

**Rule:** Every goroutine MUST:
1. Accept a `context.Context` parameter
2. Have a `case <-ctx.Done(): return` in its select loop
3. Call `defer cleanup()` for any resources it manages
4. Be tracked in `processguard.go` if it manages an external process

**No fire-and-forget goroutines allowed.**

---

## Phase 10: Additional App Bindings & Bridge Layer

### 10.1 Updated App Struct & Bindings

**File:** `localcloud/app.go` [REWRITE]

All functions exposed to the frontend:

```go
// Project management
func (a *App) ScanProject(path string) (*engine.ScanResult, error)
func (a *App) OpenDirectoryDialog() (string, error)  // uses wailsRuntime.OpenDirectoryDialog

// Dev server lifecycle
func (a *App) StartDevServer(cfg engine.RunConfig) error
func (a *App) StopDevServer() error

// Resource management
func (a *App) GetSystemInfo() engine.SystemInfo

// Tunnel management
func (a *App) StartEphemeralTunnel(port int) error
func (a *App) StartPermanentTunnel(cfg engine.TunnelConfig) error
func (a *App) StopTunnel()
func (a *App) GetTunnelStatus() (string, string)

// Vercel sync
func (a *App) SyncVercel(envKey, tunnelURL string) error  // uses stored keyring creds

// Secret management
func (a *App) StoreCredential(service, key, value string) error
func (a *App) HasCredential(service, key string) bool
func (a *App) DeleteCredential(service, key string) error
// Note: NO GetCredential exposed to frontend — secrets stay in Go

// Config persistence
func (a *App) LoadConfig() (*engine.AppConfig, error)
func (a *App) SaveConfig(cfg engine.AppConfig) error

// Bun portable
func (a *App) DownloadBunPortable() error  // emits progress events
```

**Security note:** `GetCredential` is NOT exposed to the frontend. Secrets should only be used server-side (Go) and never sent to the WebView JavaScript context.

---

## Complete File Map

```
localcloud/
├── main.go                          [MODIFY] — OnShutdown, IPC hardening
├── app.go                           [KEEP]   — base App struct, ScanProject, LimitResources
├── app_engine.go                    [KEEP]   — GetSystemInfo, DownloadBunPortable
├── app_telemetry.go                 [KEEP]   — tunnel/vercel/keyring/config bindings
├── app_projects.go                  [NEW]    — project registry bindings (ListProjects, StartProject, StopProject, RemoveProject)
├── engine/
│   ├── scanner/
│   │   └── scanner.go               [KEEP]  — project scanner + cache
│   ├── core/
│   │   ├── sysinfo.go               [KEEP]  — RAM + CPU (stdlib)
│   │   ├── sysinfo_windows.go       [KEEP]  — Windows GlobalMemoryStatusEx
│   │   ├── sysinfo_linux.go         [KEEP]  — Linux stub
│   │   ├── sysproc_windows.go       [KEEP]  — Windows SysProcAttr
│   │   ├── sysproc_linux.go         [KEEP]  — Linux SysProcAttr (Setpgid)
│   │   ├── validate.go              [KEEP]  — port, path, script validation
│   │   └── config.go                [KEEP]  — JSON config persistence
│   ├── process/
│   │   ├── runner.go                [KEEP]  — dev server process launcher
│   │   ├── os_limiter.go            [KEEP]  — dispatcher (switch runtime.GOOS)
│   │   ├── os_limiter_windows.go    [KEEP]  — Job Objects via kernel32
│   │   ├── os_limiter_linux.go      [KEEP]  — cgroups v2/v1/posix fallback
│   │   ├── os_limiter_nonlinux.go   [KEEP]  — Linux stub for non-Linux builds
│   │   ├── os_limiter_nonwindows.go [KEEP]  — Windows stub for non-Windows builds
│   │   ├── processguard.go          [KEEP]  — anti-zombie PID tracker
│   │   ├── bundler.go               [KEEP]  — Bun portable auto-download
│   │   ├── logpipe.go               [KEEP]  — 100ms batched log emitter
│   │   ├── monitor.go               [KEEP]  — /proc or WinAPI resource poller
│   │   ├── monitor_windows.go       [KEEP]  — Windows GetProcessMemoryInfo
│   │   ├── monitor_linux.go         [KEEP]  — Linux /proc/statm + /proc/stat
│   │   ├── sysprocattr_linux.go     [KEEP]  — Linux Setpgid
│   │   └── sysprocattr_default.go   [KEEP]  — non-Linux SysProcAttr stub
│   ├── tunnel/
│   │   ├── tunnel.go                [REFACTOR] — per-project tunnel instances (remove global state)
│   │   └── tunnel_api.go            [KEEP]    — permanent tunnel + CF API v4
│   ├── keyring/
│   │   ├── keyring.go               [KEEP]  — dispatcher
│   │   ├── keyring_windows.go       [KEEP]  — DPAPI
│   │   └── keyring_linux.go         [KEEP]  — D-Bus Secret Service + AES fallback
│   ├── vercel/
│   │   └── vercel.go                [KEEP]  — real HTTP calls + error types
│   └── projects/
│       └── project.go               [NEW]   — Project struct, ProjectRegistry, lifecycle functions
├── frontend/src/
│   ├── App.tsx                      [REWRITE] — dashboard-first state machine
│   ├── screens/
│   │   ├── DropZone.tsx             [KEEP]    — drag-drop + file picker (embedded in modal)
│   │   ├── ControlPanel.tsx         [KEEP]    — sliders, selectors, config (embedded in modal)
│   │   ├── Dashboard.tsx            [REWRITE] — multi-project hub, landing page
│   │   └── Launching.tsx            [KEEP]    — progress stepper (embedded in modal)
│   ├── components/
│   │   ├── AddProjectModal.tsx      [NEW]    — embeds DropZone→ControlPanel→Launching
│   │   ├── ProjectCard.tsx          [NEW]    — project status card with mini sparklines
│   │   ├── LogTerminal.tsx          [UPDATE] — accept projectID for per-project log routing
│   │   ├── ResourceChart.tsx        [UPDATE] — accept projectID for per-project routing
│   │   ├── OOMModal.tsx             [KEEP]   — OOM warning dialog
│   │   └── StatusDot.tsx            [KEEP]   — connection status indicator
│   └── index.css                    [KEEP]
```

---

## Implementation Order

> Ship in this order. Each phase produces a working `wails build`.

| # | Task | Phase | Depends On | Deliverable |
|---|---|---|---|---|
| 1 | Scanner + cache | P1 | — | Typed `ScanResult` with framework/port detection |
| 2 | Validate (port, path, script) | P9 | — | Input validation functions |
| 3 | System Info | P6 | — | RAM + CPU count for sliders |
| 4 | Runner (dev server) | P1 | 1, 2 | `bun run dev` actually starts |
| 5 | OS Limiter Windows | P2 | 4 | Job Objects restrict process |
| 6 | OS Limiter Linux | P2 | 4 | cgroups/taskset/prlimit restrict process |
| 7 | OOM detection | P2 | 4, 5, 6 | Exit code 137 triggers UI alert |
| 8 | Process Guard | P9 | 4 | Anti-zombie: all PIDs tracked + killed on shutdown |
| 9 | Log Pipe | P6 | 4 | 100ms batched log stream |
| 10 | Resource Monitor | P6 | 4 | /proc or WinAPI polling every 1s |
| 11 | cloudflared detection | P3 | — | Find binary in PATH or bundled |
| 12 | Ephemeral Tunnel | P3 | 11 | Free domain URL appears |
| 13 | Tunnel Reconnect | P3 | 12 | 5× retry with exponential backoff |
| 14 | Keyring (DPAPI + D-Bus) | P5 | — | Secrets stored in OS keyring |
| 15 | Vercel Sync (real HTTP) | P4 | 14 | Env variable updated + deploy triggered |
| 16 | Permanent Tunnel (CF API) | P3 | 14 | Custom domain CNAME registered |
| 17 | Config persistence | P8 | — | Last project + settings remembered |
| 18 | Bun portable download | P1 | — | Bun downloaded to app data dir |
| 19 | Drop-Zone screen | P7 | 1, 18 | Drag-drop + file picker + shake animation |
| 20 | Control Panel screen | P7 | 3, 17 | Sliders, selectors, pre-filled config |
| 21 | Launching screen | P7 | 4, 12, 15 | Progress stepper with event listeners |
| 22 | Log Terminal component | P7 | 9 | Virtualized 1000-line ring buffer |
| 23 | Resource Chart component | P7 | 10 | Recharts area chart with threshold |
| 24 | OOM Modal component | P7 | 7 | Warning dialog with restart option |
| 25 | Dashboard screen (single-project) | P7 | 22, 23, 24 | URL card + charts + logs + stop button |
| 26 | App state machine (single-project) | P7 | 19–25 | Full UX journey wired together |
| 27 | IPC hardening | P9 | — | WebView lockdown |
| 28 | App bindings finalization | P10 | All | All Go functions exposed to frontend |
| 29 | **Project Registry** | A4 | 1–28 | `Project` struct, `ProjectRegistry` singleton, lifecycle functions |
| 30 | **Per-Project Tunnel Instances** | B4 | 29 | `TunnelInstance` per projectID, `TunnelManager` |
| 31 | **Per-Project Resource Monitors** | B4 | 29 | Key monitors by projectID, events include projectID |
| 32 | **Per-Project Log Streams** | B4 | 29 | Log channels keyed by projectID |
| 33 | **Dashboard rewrite (multi-project hub)** | A4 | 29–32 | Landing page with project grid, cards, sparklines |
| 34 | **ProjectCard component** | A4 | 33 | Status card with mini charts, stop/start/remove |
| 35 | **AddProjectModal** | A4 | 33 | Modal embedding DropZone→ControlPanel→Launching |
| 36 | **Project bindings (app_projects.go)** | A4 | 29, 33 | ListProjects, StartProject, StopProject, RemoveProject |
| 37 | **App router rewrite (dashboard-first)** | A4 | 33–36 | Dashboard as landing, AddProjectModal |
| 38 | **Project-aware telemetry bindings** | B4 | 30–32 | All bindings accept projectID |

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
11. **Secrets stay in Go.** Never expose `GetCredential` to the frontend WebView.
12. **Close HTTP response bodies.** Always `defer resp.Body.Close()`.
13. **Cache expensive operations.** Runtime detection, scanner results, system info.
14. **Reuse slice capacity.** `batch = batch[:0]` instead of `batch = nil`.
15. **Platform files.** Use `//go:build` tags, never `runtime.GOOS` switch in a single file for platform-heavy code.
