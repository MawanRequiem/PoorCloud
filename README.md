# PoorCloud / LocalCloud

**"The Minimalist Hypervisor"**

> 🚧 **Alpha — Active Development**

A Wails desktop app (Go + React) that turns local dev servers into cloud-accessible endpoints with resource limits, Cloudflare tunnels, and Vercel sync.

→ [Full README](localcloud/README.md)

## Quick Build

```bash
cd localcloud
wails build -tags webkit2_41   # Linux
wails build                     # Windows
```

## Test App

```bash
cd test-note-app
node server.js     # minimal note app on :3000 for testing
```
