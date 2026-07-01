package main

import (
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
	"localcloud/engine/core"
	"localcloud/engine/process"
	"localcloud/engine/tunnel"
)

// GetSystemInfo returns system RAM and CPU info.
func (a *App) GetSystemInfo() core.SystemInfo {
	return core.GetSystemInfo()
}

// DownloadBunPortable downloads bun portable, emits progress, returns path to binary.
func (a *App) DownloadBunPortable(destDir string) (string, error) {
	return process.DownloadBunPortable(a.ctx, destDir, func(percent int) {
		wailsRuntime.EventsEmit(a.ctx, "bun-download-progress", map[string]int{
			"percent": percent,
		})
	})
}

// GetEngineStatus returns the current engine operational status.
func (a *App) GetEngineStatus() map[string]interface{} {
	status, url := tunnel.GetTunnelStatus()
	return map[string]interface{}{
		"tunnelStatus": status,
		"tunnelURL":    url,
	}
}
