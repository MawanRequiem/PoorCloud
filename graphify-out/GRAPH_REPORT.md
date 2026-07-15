# Graph Report - .  (2026-07-10)

## Corpus Check
- Corpus is ~33,909 words - fits in a single context window. You may not need a graph.

## Summary
- 426 nodes · 501 edges · 41 communities (30 shown, 11 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- React UI App & Screens
- OS Resource Limiting & Validation
- Backend Runtime & Tunnels Orchestration
- TypeScript Frontend Tooling Configuration
- NPM Dependencies Config
- Application Config & Vercel Sync
- Wails JS Go Bindings
- Dashboard Log & Metrics UI Components
- Wails Runtime NPM Package Metadata
- NPM DevDependencies Configuration
- Linux Secret Service & OS Keyring API
- Wails Go App Configuration Manifest
- LocalCloud Project Scanner
- Go Context Helpers
- TypeScript Node Build Configuration
- Wails JS Runtime Declarations
- Core Application Configuration Structures
- Core System Information Utilities
- Process Bundling & Execution Orchestrator
- Systemd Scope Resource Limiter (Linux)
- Windows DPAPI OS Keyring API
- Windows Job Objects Resource Limiter
- Windows Memory Status Structures
- Linux System Process Control Utilities
- Windows System Process Control Utilities
- Log Pipeline Streaming
- Process Monitor & Performance Metrics
- Windows Process Performance Metrics
- System Process Attributes Default Config
- System Process Attributes Linux Config
- Wails Events Once Handler
- LocalCloud Core Go Package Entrypoint

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `EventsOn()` - 12 edges
3. `App` - 9 edges
4. `RunDevServer()` - 9 edges
5. `RunningProcess` - 8 edges
6. `App` - 7 edges
7. `StartPermanentTunnel()` - 7 edges
8. `App()` - 7 edges
9. `AppConfig` - 5 edges
10. `applyLinuxLimits()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `RunDevServer()` --calls--> `ValidatePort()`  [INFERRED]
  localcloud/engine/process/runner.go → localcloud/engine/core/validate.go
- `RunDevServer()` --calls--> `ValidatePath()`  [INFERRED]
  localcloud/engine/process/runner.go → localcloud/engine/core/validate.go
- `RunDevServer()` --calls--> `LimitResources()`  [INFERRED]
  localcloud/engine/process/runner.go → localcloud/engine/process/os_limiter.go
- `RunDevServer()` --calls--> `UntrackProcess()`  [INFERRED]
  localcloud/engine/process/runner.go → localcloud/engine/process/processguard.go
- `main()` --calls--> `CleanupZombies()`  [INFERRED]
  localcloud/main.go → localcloud/engine/process/processguard.go

## Import Cycles
- None detected.

## Communities (41 total, 11 thin omitted)

### Community 1 - "React UI App & Screens"
Cohesion: 0.09
Nodes (26): App(), AppScreen, ScanResult, OOMModal(), OOMModalProps, container, root, ControlPanel() (+18 more)

### Community 2 - "OS Resource Limiting & Validation"
Cohesion: 0.09
Nodes (19): ValidatePath(), ValidatePort(), LimitResources(), CleanupZombies(), CancelFunc, KillAllProcesses(), TrackProcess(), UntrackProcess() (+11 more)

### Community 3 - "Backend Runtime & Tunnels Orchestration"
Cohesion: 0.11
Nodes (14): App, deleteDNSRecordAPI(), deleteTunnelAPI(), Context, permReset(), StartPermanentTunnel(), StopPermanentTunnel(), findCloudflared() (+6 more)

### Community 4 - "TypeScript Frontend Tooling Configuration"
Cohesion: 0.09
Nodes (22): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+14 more)

### Community 5 - "NPM Dependencies Config"
Cohesion: 0.09
Nodes (21): framer-motion, dependencies, framer-motion, lucide-react, react, react-dom, react-window, recharts (+13 more)

### Community 6 - "Application Config & Vercel Sync"
Cohesion: 0.13
Nodes (11): AppConfig, App, DeleteSecret(), GetSecret(), StoreSecret(), checkVercelResponse(), Context, SyncVercelEnv() (+3 more)

### Community 7 - "Wails JS Go Bindings"
Cohesion: 0.13
Nodes (7): AppConfig, core, RunConfigSave, scanner, ScanResult, SystemInfo, WindowBounds

### Community 8 - "Dashboard Log & Metrics UI Components"
Cohesion: 0.16
Nodes (14): LogEntry, LogTerminal(), parseLogLine(), DataPoint, ResourceChart(), ResourceChartProps, ResourceEvent, StatusDot() (+6 more)

### Community 9 - "Wails Runtime NPM Package Metadata"
Cohesion: 0.11
Nodes (18): author, bugs, url, description, homepage, keywords, license, main (+10 more)

### Community 10 - "NPM DevDependencies Configuration"
Cohesion: 0.12
Nodes (17): devDependencies, tailwindcss, @tailwindcss/vite, @types/react, @types/react-dom, @types/react-window, typescript, vite (+9 more)

### Community 11 - "Linux Secret Service & OS Keyring API"
Cohesion: 0.36
Nodes (10): decryptAES(), deleteSecretDBus(), deleteSecretPlatform(), encryptAES(), getFallbackKey(), getSecretDBus(), getSecretPlatform(), getSecretsDirLinux() (+2 more)

### Community 12 - "Wails Go App Configuration Manifest"
Cohesion: 0.18
Nodes (10): author, email, name, frontend:build, frontend:dev:serverUrl, frontend:dev:watcher, frontend:install, name (+2 more)

### Community 13 - "LocalCloud Project Scanner"
Cohesion: 0.31
Nodes (8): cleanVersion(), detectDefaultPort(), detectDevCommand(), detectFramework(), ScanProject(), sniffRuntimes(), rawPackage, ScanResult

### Community 14 - "Go Context Helpers"
Cohesion: 0.28
Nodes (5): Context, App, NewApp(), main(), ScanResult

### Community 15 - "TypeScript Node Build Configuration"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, include, vite.config.ts

### Community 16 - "Wails JS Runtime Declarations"
Cohesion: 0.25
Nodes (7): EnvironmentInfo, NotificationAction, NotificationCategory, NotificationOptions, Position, Screen, Size

### Community 17 - "Core Application Configuration Structures"
Cohesion: 0.57
Nodes (6): AppConfig, RunConfigSave, WindowBounds, getConfigFile(), LoadConfig(), SaveConfig()

### Community 18 - "Core System Information Utilities"
Cohesion: 0.60
Nodes (5): SystemInfo, detectTotalRAM(), GetSystemInfo(), readMemTotalLinux(), readTotalMemWindows()

### Community 19 - "Process Bundling & Execution Orchestrator"
Cohesion: 0.40
Nodes (3): DownloadBunPortable(), Context, countingWriter

### Community 20 - "Systemd Scope Resource Limiter (Linux)"
Cohesion: 0.60
Nodes (5): applyCgroupsV1(), applyCgroupsV2(), applyLinuxLimits(), applyPosixLimits(), detectLinuxLimiter()

### Community 21 - "Windows DPAPI OS Keyring API"
Cohesion: 0.70
Nodes (4): deleteSecretPlatform(), getSecretPlatform(), getSecretsDir(), storeSecretPlatform()

## Knowledge Gaps
- **101 isolated node(s):** `memoryStatusEx`, `processMemoryCounters`, `jobObjectExtendedLimitInfo`, `jobObjectCpuRateControlInfo`, `rawPackage` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App` connect `Application Config & Vercel Sync` to `Backend Runtime & Tunnels Orchestration`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `NPM DevDependencies Configuration` to `NPM Dependencies Config`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `RunDevServer()` (e.g. with `ValidatePath()` and `ValidatePort()`) actually correct?**
  _`RunDevServer()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `memoryStatusEx`, `processMemoryCounters`, `jobObjectExtendedLimitInfo` to the rest of the system?**
  _101 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Wails JS Runtime Bindings` be split into smaller, more focused modules?**
  _Cohesion score 0.03125 - nodes in this community are weakly interconnected._
- **Should `React UI App & Screens` be split into smaller, more focused modules?**
  _Cohesion score 0.08636977058029689 - nodes in this community are weakly interconnected._
- **Should `OS Resource Limiting & Validation` be split into smaller, more focused modules?**
  _Cohesion score 0.09259259259259259 - nodes in this community are weakly interconnected._