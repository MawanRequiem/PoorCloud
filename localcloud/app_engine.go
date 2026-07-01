package main

import (
	"localcloud/engine"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// GetSystemInfo returns system RAM and CPU info.
func (a *App) GetSystemInfo() engine.SystemInfo {
	return engine.GetSystemInfo()
}

// DownloadBunPortable downloads bun portable, emits progress, returns path to binary.
func (a *App) DownloadBunPortable(destDir string) (string, error) {
	return engine.DownloadBunPortable(a.ctx, destDir, func(percent int) {
		wailsRuntime.EventsEmit(a.ctx, "bun-download-progress", map[string]int{
			"percent": percent,
		})
	})
}

// GetEngineStatus returns the current engine operational status.
func (a *App) GetEngineStatus() map[string]interface{} {
	status, url := engine.GetTunnelStatus()
	return map[string]interface{}{
		"tunnelStatus": status,
		"tunnelURL":    url,
	}
}
