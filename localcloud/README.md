# PoorCloud / LocalCloud

> **"The Minimalist Hypervisor"** — A lightweight desktop orchestrator that turns local dev servers into cloud-accessible endpoints.

## Status

🚧 **Active Development — Alpha** (v0.1.0-dev)

[![Build](https://github.com/MawanRequiem/PoorCloud/actions/workflows/build.yml/badge.svg)](https://github.com/MawanRequiem/PoorCloud/actions/workflows/build.yml)

## What It Does

LocalCloud is a Wails-based desktop app (Go + React/TypeScript) that lets you:

1. **Scan** any Node.js project folder — auto-detects framework (Next.js, Vite, Remix, CRA), dev command, and port
2. **Launch** dev servers with OS-level resource limits (RAM + CPU caps via cgroups on Linux, Job Objects on Windows)
3. **Expose** local servers to the internet via Cloudflare Tunnels (free `trycloudflare.com` domain or custom CNAME)
4. **Sync** environment variables to Vercel and trigger redeployments
5. **Monitor** live RAM/CPU usage with real-time charts and streaming logs
6. **Manage** multiple projects from a single dashboard with per-project isolation

## Implementation Progress

| Phase | Status |
|---|---|
| **P1-2:** Project scanner, runtime detection, Bun portable download, dev server runner, OS resource limiters (Linux cgroups v1/v2/posix + Windows Job Objects) | ✅ Done |
| **P3:** Cloudflare tunnels (ephemeral + permanent with auto-reconnect) | ✅ Done |
| **P4-5:** Vercel env sync + deploy triggers, OS keyring secret storage (DPAPI/D-Bus) | ✅ Done |
| **P6:** Log pipeline (100ms batched), resource monitor (/proc + WinAPI) | ✅ Done |
| **P7:** Full React UI — DropZone, ControlPanel, Launching screen, live Dashboard with charts/terminal | ✅ Done |
| **P8-9:** Config persistence, security hardening (command injection guard, zombie prevention, IPC lockdown) | ✅ Done |
| **A4:** Multi-project hub — project registry, dashboard-first landing page, sidebar navigation, settings panel, health alert badges, per-project tunnel/monitor/log isolation | ✅ Done |

**All 33 planned features are implemented. Current focus: stability testing and UX polish.**

## Quick Start (Development)

```bash
# Prerequisites: Go 1.23+, Node.js 22+, Wails CLI v2.12
go install github.com/wailsapp/wails/v2/cmd/wails@v2.12.0

# Linux: install system deps
sudo apt-get install libgtk-3-dev libwebkit2gtk-4.1-dev

# Run in dev mode (hot reload)
cd localcloud
wails dev -tags webkit2_41

# Build production binary
wails build -tags webkit2_41
```

## Tech Stack

- **Backend:** Go 1.23+ (stdlib-first — no ORM, no framework)
- **Frontend:** React 19, TypeScript, TailwindCSS v4, Recharts, Framer Motion, react-window
- **Desktop: **[Wails](https://wails.io/) v2.12 — Go ↔ React bindings via CGO/memory mapping, no HTTP server
- **Tunnels:** Cloudflare `cloudflared` CLI (ephemeral + permanent)
- **Secrets:** OS Keyring (DPAPI on Windows, Freedesktop Secret Service via D-Bus on Linux)

## Architecture

```
Dashboard (Landing)
├── Sidebar — project list + settings
├── Project Grid — cards with status, mini sparklines, health badges
│   └── Expanded Detail — full charts, log terminal, tunnel URL
├── AddProjectModal — DropZone → ControlPanel → Launching
├── SettingsPanel — default RAM/CPU/tunnel mode
└── OOMModal — crash recovery

Go Engine
├── engine/scanner/    — package.json parsing, framework detection
├── engine/process/    — dev server runner, OS limiters, monitor, logpipe
├── engine/tunnel/     — TunnelManager (per-project cloudflared instances)
├── engine/vercel/     — Vercel API (env upsert + redeploy)
├── engine/keyring/    — OS keyring (DPAPI + D-Bus)
├── engine/projects/   — ProjectRegistry (multi-project lifecycle)
└── engine/core/       — config, sysinfo, validation
```

## Test Project

A minimal test app is included at `test-note-app/` — a zero-dependency Node.js note-taking server on port 3000.

## License

Private development — not yet licensed.
